import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RequestUser, oid } from '../common/request-user';
import { validateSiteContent } from '../content/content.validation';
import { WS_MODEL, WebsiteAnalyticsDayDocument, WebsiteAssetDocument, WebsiteSavedSectionDocument, WebsiteOrderDocument, WebsiteSubmissionDocument } from '../schemas/website-studio.schemas';
import { WebsitesService } from '../websites/websites.service';

const ALLOWED_TYPES = /^(image\/(jpeg|jpg|png|gif|webp|avif|svg\+xml)|video\/(mp4|webm|quicktime))$/;

/**
 * Media library, reusable sections and analytics.
 * Files themselves are uploaded through the existing Fockis /uploads pipeline
 * (Google Cloud Storage); Website Studio only stores the library metadata.
 */
@Injectable()
export class MediaService {
  constructor(
    @InjectModel(WS_MODEL.asset) private readonly assets: Model<WebsiteAssetDocument>,
    @InjectModel(WS_MODEL.savedSection) private readonly saved: Model<WebsiteSavedSectionDocument>,
    @InjectModel(WS_MODEL.analytics) private readonly analytics: Model<WebsiteAnalyticsDayDocument>,
    @InjectModel(WS_MODEL.order) private readonly orders: Model<WebsiteOrderDocument>,
    @InjectModel(WS_MODEL.submission) private readonly submissions: Model<WebsiteSubmissionDocument>,
    private readonly sites: WebsitesService,
  ) {}

  private view(a: any) {
    return { id: String(a._id), url: a.url, filename: a.filename, fileType: a.fileType, folder: a.folder, alt: a.alt, size: a.size, createdAt: a.createdAt };
  }

  async list(user: RequestUser, websiteId: string, folder?: string, q?: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'view');
    const filter: any = { websiteId: website._id };
    if (folder !== undefined && folder !== '') filter.folder = String(folder).slice(0, 80);
    if (q) filter.$or = [{ filename: new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i') }, { alt: new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i') }];
    const list = await this.assets.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    return list.map((a) => this.view(a));
  }

  async register(user: RequestUser, websiteId: string, dto: { url: string; filename?: string; fileType?: string; size?: number; folder?: string; alt?: string }) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'edit');
    const url = String(dto.url ?? '').trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) throw new BadRequestException('Invalid file URL.');
    const fileType = String(dto.fileType ?? '').toLowerCase();
    if (fileType && !ALLOWED_TYPES.test(fileType)) throw new BadRequestException('Only images and videos can be added to the media library.');
    const count = await this.assets.countDocuments({ websiteId: website._id });
    if (count >= 2000) throw new BadRequestException('Media library limit reached (2,000 files).');
    const a = await this.assets.create({
      websiteId: website._id,
      url: url.slice(0, 2000),
      filename: String(dto.filename ?? '').replace(/[<>"]/g, '').slice(0, 255),
      fileType,
      size: Math.max(0, Number(dto.size) || 0),
      folder: String(dto.folder ?? '').replace(/[^\w\- ]/g, '').slice(0, 80),
      alt: String(dto.alt ?? '').slice(0, 300),
      uploadedBy: oid(user.id),
    });
    return this.view(a.toObject());
  }

  async update(user: RequestUser, websiteId: string, assetId: string, dto: { alt?: string; folder?: string; filename?: string }) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'edit');
    if (!Types.ObjectId.isValid(assetId)) throw new NotFoundException('File not found.');
    const a = await this.assets.findOne({ _id: assetId, websiteId: website._id });
    if (!a) throw new NotFoundException('File not found.');
    if (dto.alt !== undefined) a.alt = String(dto.alt).slice(0, 300);
    if (dto.folder !== undefined) a.folder = String(dto.folder).replace(/[^\w\- ]/g, '').slice(0, 80);
    if (dto.filename !== undefined) a.filename = String(dto.filename).replace(/[<>"]/g, '').slice(0, 255) || a.filename;
    await a.save();
    return this.view(a.toObject());
  }

  async remove(user: RequestUser, websiteId: string, assetId: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'edit');
    if (!Types.ObjectId.isValid(assetId)) throw new NotFoundException('File not found.');
    const res = await this.assets.deleteOne({ _id: assetId, websiteId: website._id });
    if (!res.deletedCount) throw new NotFoundException('File not found.');
    return { deleted: true };
  }

  /* ---------------- reusable sections ---------------- */
  async listSaved(user: RequestUser) {
    const list = await this.saved.find({ userId: oid(user.id) }).sort({ createdAt: -1 }).limit(200).lean();
    return list.map((s) => ({ id: String(s._id), name: s.name, section: s.section }));
  }

  async addSaved(user: RequestUser, name: string, section: Record<string, any>) {
    // Validate the section by wrapping it in a minimal document.
    const probe: any = {
      theme: {}, header: { id: 'h', type: 'header', props: {}, style: {} }, footer: { id: 'f', type: 'footer', props: {}, style: {} },
      navigation: [], catalog: {}, settings: {},
      pages: [{ id: 'p', title: 'p', slug: 'p', sections: [section], seo: {}, isHomepage: true }],
    };
    const clean = validateSiteContent(probe).pages[0].sections[0];
    const count = await this.saved.countDocuments({ userId: oid(user.id) });
    if (count >= 200) throw new BadRequestException('You can save up to 200 sections.');
    const s = await this.saved.create({ userId: oid(user.id), name: String(name || 'Saved section').slice(0, 120), section: clean });
    return { id: String(s._id), name: s.name, section: s.section };
  }

  async removeSaved(user: RequestUser, id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Section not found.');
    await this.saved.deleteOne({ _id: id, userId: oid(user.id) });
    return { deleted: true };
  }

  /* ---------------- analytics ---------------- */
  async trackView(websiteId: Types.ObjectId, path: string) {
    const date = new Date().toISOString().slice(0, 10);
    const key = String(path || '/').slice(0, 120).replace(/[.$]/g, '_') || '/';
    await this.analytics.updateOne({ websiteId, date }, { $inc: { views: 1, [`paths.${key}`]: 1 } }, { upsert: true });
  }

  async summary(user: RequestUser, websiteId: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'view');
    const since = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const days = await this.analytics.find({ websiteId: website._id, date: { $gte: since } }).sort({ date: 1 }).lean();
    const byDate = new Map(days.map((d) => [d.date, d]));
    const out: { date: string; views: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      out.push({ date: d, views: byDate.get(d)?.views ?? 0 });
    }
    const pathTotals: Record<string, number> = {};
    days.forEach((d) => Object.entries(d.paths ?? {}).forEach(([p, n]) => (pathTotals[p] = (pathTotals[p] ?? 0) + Number(n))));
    const paid = await this.orders.aggregate([
      { $match: { websiteId: website._id, paidAt: { $ne: null } } },
      { $group: { _id: null, n: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]);
    return {
      days: out,
      totalViews: out.reduce((n, d) => n + d.views, 0),
      topPaths: Object.entries(pathTotals).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, views]) => ({ path, views })),
      orders: paid[0]?.n ?? 0,
      revenue: Math.round((paid[0]?.revenue ?? 0) * 100) / 100,
      submissions: await this.submissions.countDocuments({ websiteId: website._id }),
    };
  }
}
