import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { SiteContent } from '../content/content.types';
import { RESERVED_SLUGS, normalizeSlug, validateSiteContent } from '../content/content.validation';
import { cloneJson, personalize, reassignIds } from '../content/content.utils';
import { applyTemplateDesign, SwitchReport } from '../content/template-switch';
import { RequestUser, isPlatformAdmin, oid } from '../common/request-user';
import { websiteUrl, wsConfig } from '../common/website-studio.config';
import {
  WS_MODEL,
  WebsiteDocument,
  WebsiteDomainDocument,
  WebsiteVersionDocument,
} from '../schemas/website-studio.schemas';
import { TemplatesService } from '../templates/templates.service';

export type AccessLevel = 'view' | 'edit' | 'publish' | 'owner';
type Role = 'owner' | 'admin' | 'editor' | 'organization' | 'platform-admin';

const RANK: Record<Role, number> = { editor: 1, admin: 2, organization: 3, owner: 3, 'platform-admin': 0 };
const NEEDED: Record<AccessLevel, number> = { view: 1, edit: 1, publish: 2, owner: 3 };
const MAX_VERSIONS = 80;

@Injectable()
export class WebsitesService {
  constructor(
    @InjectModel(WS_MODEL.website) private readonly websites: Model<WebsiteDocument>,
    @InjectModel(WS_MODEL.version) private readonly versions: Model<WebsiteVersionDocument>,
    @InjectModel(WS_MODEL.domain) private readonly domains: Model<WebsiteDomainDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly templates: TemplatesService,
  ) {}

  /* ===================================================================== */
  /* ACCESS CONTROL                                                         */
  /* ===================================================================== */
  private async organizationIdsOwnedBy(userId: string): Promise<Types.ObjectId[]> {
    const Org = this.connection.models['Organization'];
    if (!Org) return [];
    const orgs = await Org.find({ createdByUserId: oid(userId) }).select('_id').lean();
    return orgs.map((o: any) => o._id);
  }

  private async roleFor(user: RequestUser, w: WebsiteDocument): Promise<Role | null> {
    if (String(w.ownerId) === user.id) return 'owner';
    const m = w.managers.find((x) => String(x.userId) === user.id);
    if (m) return m.role;
    if (w.organizationId) {
      const orgs = await this.organizationIdsOwnedBy(user.id);
      if (orgs.some((o) => String(o) === String(w.organizationId))) return 'organization';
    }
    if (isPlatformAdmin(user)) return 'platform-admin';
    return null;
  }

  async getAccessible(user: RequestUser, id: string, level: AccessLevel): Promise<{ website: WebsiteDocument; role: Role }> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Website not found.');
    const w = await this.websites.findOne({ _id: id, deletedAt: null });
    if (!w) throw new NotFoundException('Website not found.');
    const role = await this.roleFor(user, w);
    if (!role) throw new NotFoundException('Website not found.'); // never reveal other users' private websites
    if (role === 'platform-admin') {
      if (level !== 'view') throw new ForbiddenException('Administrators can view but not edit customer websites.');
      return { website: w, role };
    }
    if (RANK[role] < NEEDED[level]) throw new ForbiddenException('You do not have permission for this action on this website.');
    if (w.status === 'suspended' && (level === 'publish' || level === 'edit')) {
      if (level === 'publish') throw new ForbiddenException(`This website is suspended${w.suspendedReason ? `: ${w.suspendedReason}` : ''}.`);
    }
    return { website: w, role };
  }

  /* ===================================================================== */
  /* SERIALIZATION                                                          */
  /* ===================================================================== */
  summary(w: any, role: string = 'owner') {
    const content = w.draftContent as SiteContent;
    return {
      id: String(w._id),
      name: w.name,
      slug: w.slug,
      status: w.status,
      categorySlug: w.categorySlug ?? null,
      categoryName: w.settings?.categoryName ?? null,
      templateSlug: w.templateSlug ?? null,
      templateName: w.settings?.templateName ?? null,
      organizationId: w.organizationId ? String(w.organizationId) : null,
      thumbnail: w.thumbnail || content?.settings?.seo?.ogImage || '',
      url: websiteUrl(w.slug, w.domain),
      primaryDomain: w.domain ?? null,
      updatedAt: w.updatedAt,
      publishedAt: w.publishedAt ?? null,
      role: role === 'platform-admin' ? 'admin' : role,
    };
  }

  detail(w: WebsiteDocument, role: string) {
    return {
      ...this.summary(w.toObject(), role),
      content: w.draftContent,
      revision: w.draftRevision,
      hasUnpublishedChanges: w.hasUnpublishedChanges,
      publishedVersion: w.publishedVersion,
    };
  }

  /* ===================================================================== */
  /* LIST / CREATE / UPDATE / DELETE                                        */
  /* ===================================================================== */
  async listMine(user: RequestUser) {
    const orgs = await this.organizationIdsOwnedBy(user.id);
    const list = await this.websites
      .find({
        deletedAt: null,
        $or: [{ ownerId: oid(user.id) }, { 'managers.userId': oid(user.id) }, ...(orgs.length ? [{ organizationId: { $in: orgs } }] : [])],
      })
      .select('-draftContent.pages -draftContent.catalog -publishedContent')
      .sort({ updatedAt: -1 })
      .lean();
    return list.map((w) => {
      const role = String(w.ownerId) === user.id ? 'owner' : w.managers?.find((m: any) => String(m.userId) === user.id)?.role ?? 'organization';
      return this.summary(w, role);
    });
  }

  private async uniqueSlug(base: string, excludeId?: Types.ObjectId): Promise<string> {
    let root = normalizeSlug(base) || 'site';
    if (RESERVED_SLUGS.has(root)) root = `${root}-site`;
    if (root.length < 3) root = `${root}-site`;
    let slug = root;
    for (let i = 2; await this.websites.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) {
      slug = `${root.slice(0, 58)}-${i}`;
    }
    return slug;
  }

  private async assertOrganization(user: RequestUser, organizationId?: string | null): Promise<Types.ObjectId | null> {
    if (!organizationId) return null;
    if (!Types.ObjectId.isValid(organizationId)) throw new BadRequestException('Invalid organization.');
    const owned = await this.organizationIdsOwnedBy(user.id);
    if (!owned.some((o) => String(o) === organizationId)) {
      throw new ForbiddenException('Only the organization owner can create or attach organization websites.');
    }
    return oid(organizationId);
  }

  async createFromContent(
    user: RequestUser,
    input: {
      name: string;
      content: SiteContent;
      templateId?: Types.ObjectId | null;
      templateSlug?: string | null;
      templateName?: string | null;
      templateVersion?: number | null;
      categoryId?: Types.ObjectId | null;
      categorySlug?: string | null;
      categoryName?: string | null;
      organizationId?: string | null;
      versionLabel?: string;
      versionKind?: string;
    },
  ) {
    const name = String(input.name ?? '').trim().slice(0, 120);
    if (!name) throw new BadRequestException('Website name is required.');
    if (wsConfig.maxWebsitesPerUser > 0) {
      const count = await this.websites.countDocuments({ ownerId: oid(user.id), deletedAt: null });
      if (count >= wsConfig.maxWebsitesPerUser) throw new BadRequestException(`You can have up to ${wsConfig.maxWebsitesPerUser} websites.`);
    }
    const organizationId = await this.assertOrganization(user, input.organizationId);
    const content = validateSiteContent(input.content);
    const slug = await this.uniqueSlug(name);
    const w = await this.websites.create({
      ownerId: oid(user.id),
      organizationId,
      templateId: input.templateId ?? null,
      templateSlug: input.templateSlug ?? null,
      templateVersion: input.templateVersion ?? null,
      categoryId: input.categoryId ?? null,
      categorySlug: input.categorySlug ?? null,
      name,
      slug,
      settings: { categoryName: input.categoryName ?? null, templateName: input.templateName ?? null },
      theme: content.theme,
      status: 'draft',
      draftContent: content,
      draftRevision: 1,
      hasUnpublishedChanges: true,
      thumbnail: '',
    });
    await this.snapshot(w, user, input.versionLabel ?? 'Website created', input.versionKind ?? 'manual');
    return this.detail(w, 'owner');
  }

  private assertPremiumAllowed(user: RequestUser, accessLevel: string, rawUser: any) {
    if (accessLevel !== 'premium' || !wsConfig.enforcePremium) return;
    const premium = rawUser?.isPremium === true || rawUser?.premium === true || ['active', 'trialing'].includes(String(rawUser?.subscriptionStatus ?? ''));
    if (!premium && !isPlatformAdmin(user)) throw new ForbiddenException('This is a premium template. Upgrade your Fockis plan to use it.');
  }

  async create(user: RequestUser, rawUser: any, dto: { name: string; mode: string; templateSlug?: string; categorySlug?: string; organizationId?: string; importContent?: unknown }) {
    const category = await this.templates.findCategory(dto.categorySlug);
    if (dto.mode === 'import') {
      const imported: any = dto.importContent;
      const content = imported?.content ?? imported;
      if (!content || typeof content !== 'object') throw new BadRequestException('Upload a Fockis website export (.json).');
      return this.createFromContent(user, {
        name: dto.name,
        content: reassignIds(validateSiteContent(content)),
        categoryId: category?._id ?? null,
        categorySlug: category?.slug ?? null,
        categoryName: category?.name ?? null,
        organizationId: dto.organizationId,
        versionLabel: 'Imported design',
      });
    }
    let template;
    if (dto.mode === 'scratch') {
      template = await this.templates.getForUse('blank');
    } else if (dto.templateSlug) {
      template = await this.templates.getForUse(dto.templateSlug);
    } else {
      template = (await this.templates.defaultForCategory(dto.categorySlug)).template;
    }
    this.assertPremiumAllowed(user, template.accessLevel, rawUser);
    // Independent deep copy of the master template — the master is never modified.
    const content = personalize(reassignIds(cloneJson(template.content as SiteContent)), dto.name);
    return this.createFromContent(user, {
      name: dto.name,
      content,
      templateId: template._id,
      templateSlug: template.slug,
      templateName: template.name,
      templateVersion: template.version,
      categoryId: category?._id ?? template.categoryIds[0] ?? null,
      categorySlug: category?.slug ?? null,
      categoryName: category?.name ?? null,
      organizationId: dto.organizationId,
      versionLabel: `Created from ${template.name}`,
    });
  }

  async update(user: RequestUser, id: string, dto: { name?: string; slug?: string; organizationId?: string | null }) {
    const { website: w, role } = await this.getAccessible(user, id, 'publish');
    if (dto.name !== undefined) {
      const n = String(dto.name).trim().slice(0, 120);
      if (!n) throw new BadRequestException('Name cannot be empty.');
      w.name = n;
    }
    if (dto.slug !== undefined && dto.slug !== w.slug) {
      const slug = normalizeSlug(dto.slug);
      if (slug.length < 3) throw new BadRequestException('The site address must have at least 3 characters.');
      if (RESERVED_SLUGS.has(slug)) throw new BadRequestException('This address is reserved.');
      if (await this.websites.exists({ slug, _id: { $ne: w._id } })) throw new ConflictException('This address is already taken.');
      w.slug = slug;
    }
    if (dto.organizationId !== undefined) {
      if (role !== 'owner') throw new ForbiddenException('Only the owner can change the organization.');
      w.organizationId = await this.assertOrganization(user, dto.organizationId);
    }
    await w.save();
    return this.detail(w, role);
  }

  async remove(user: RequestUser, id: string) {
    const { website: w } = await this.getAccessible(user, id, 'owner');
    w.deletedAt = new Date();
    w.status = 'draft';
    w.slug = `${w.slug.slice(0, 30)}-deleted-${String(w._id).slice(-8)}`;
    w.domain = null;
    await w.save();
    await this.domains.deleteMany({ websiteId: w._id });
    return { deleted: true };
  }

  async duplicate(user: RequestUser, id: string) {
    const { website: w } = await this.getAccessible(user, id, 'edit');
    return this.createFromContent(user, {
      name: `${w.name} (Copy)`,
      content: reassignIds(w.draftContent as SiteContent),
      templateId: w.templateId,
      templateSlug: w.templateSlug,
      templateName: w.settings?.templateName ?? null,
      categoryId: w.categoryId,
      categorySlug: w.categorySlug,
      categoryName: w.settings?.categoryName ?? null,
      versionLabel: `Duplicated from ${w.name}`,
    });
  }

  /* ===================================================================== */
  /* DRAFT + VERSIONS                                                       */
  /* ===================================================================== */
  async saveDraft(user: RequestUser, id: string, content: unknown, revision: number) {
    const { website: w } = await this.getAccessible(user, id, 'edit');
    if (Number(revision) !== w.draftRevision) {
      throw new ConflictException('This website was changed in another window or by another manager. Reload to get the latest version.');
    }
    const clean = validateSiteContent(content);
    // Atomic compare-and-set on the revision so concurrent saves can never overwrite each other.
    const res = await this.websites.updateOne(
      { _id: w._id, draftRevision: w.draftRevision },
      { $set: { draftContent: clean, theme: clean.theme, hasUnpublishedChanges: true }, $inc: { draftRevision: 1 } },
    );
    if (!res.modifiedCount) throw new ConflictException('This website was changed in another window. Reload to continue.');
    return { revision: w.draftRevision + 1, updatedAt: new Date().toISOString() };
  }

  private async snapshot(w: WebsiteDocument, user: RequestUser | null, label: string, kind: string, content?: unknown) {
    const last = await this.versions.findOne({ websiteId: w._id }).sort({ versionNumber: -1 }).select('versionNumber').lean();
    const v = await this.versions.create({
      websiteId: w._id,
      versionNumber: (last?.versionNumber ?? 0) + 1,
      label: label.slice(0, 160),
      kind,
      contentSnapshot: content ?? w.draftContent,
      createdBy: user ? oid(user.id) : null,
      createdByName: user?.name ?? 'System',
    });
    // Prune old non-publish versions so history stays bounded.
    const extra = await this.versions
      .find({ websiteId: w._id, kind: { $ne: 'publish' } })
      .sort({ versionNumber: -1 })
      .skip(MAX_VERSIONS)
      .select('_id')
      .lean();
    if (extra.length) await this.versions.deleteMany({ _id: { $in: extra.map((x) => x._id) } });
    return v;
  }

  versionView(v: any) {
    return { id: String(v._id), versionNumber: v.versionNumber, label: v.label, kind: v.kind, createdAt: v.createdAt, createdByName: v.createdByName };
  }

  async listVersions(user: RequestUser, id: string) {
    const { website: w } = await this.getAccessible(user, id, 'view');
    const list = await this.versions.find({ websiteId: w._id }).select('-contentSnapshot').sort({ versionNumber: -1 }).limit(100).lean();
    return list.map((v) => this.versionView(v));
  }

  async createVersion(user: RequestUser, id: string, label: string) {
    const { website: w } = await this.getAccessible(user, id, 'edit');
    const v = await this.snapshot(w, user, label || 'Saved version', 'manual');
    return this.versionView(v.toObject());
  }

  async restoreVersion(user: RequestUser, id: string, versionId: string) {
    const { website: w } = await this.getAccessible(user, id, 'edit');
    if (!Types.ObjectId.isValid(versionId)) throw new NotFoundException('Version not found.');
    const v = await this.versions.findOne({ _id: versionId, websiteId: w._id }).lean();
    if (!v) throw new NotFoundException('Version not found.');
    await this.snapshot(w, user, `Before restoring version ${v.versionNumber}`, 'before-restore');
    const content = validateSiteContent(v.contentSnapshot);
    w.draftContent = content as any;
    w.theme = content.theme as any;
    w.draftRevision += 1;
    w.hasUnpublishedChanges = true;
    w.markModified('draftContent');
    await w.save();
    return { content, revision: w.draftRevision };
  }

  /* ===================================================================== */
  /* PUBLISHING                                                             */
  /* ===================================================================== */
  async publish(user: RequestUser, id: string) {
    const { website: w } = await this.getAccessible(user, id, 'publish');
    if (w.status === 'suspended') throw new ForbiddenException('This website is suspended and cannot be published.');
    const content = validateSiteContent(w.draftContent);
    const v = await this.snapshot(w, user, 'Published', 'publish', content);
    const res = await this.websites.updateOne(
      { _id: w._id },
      { $set: { publishedContent: content, publishedVersion: v.versionNumber, publishedAt: new Date(), status: 'published', hasUnpublishedChanges: false } },
    );
    if (!res.acknowledged || !res.matchedCount) throw new ConflictException('Publishing failed. Please try again.');
    const fresh = await this.websites.findById(w._id).select('status publishedAt slug domain').lean();
    if (fresh?.status !== 'published') throw new ConflictException('Publishing could not be confirmed. Please try again.');
    return { status: fresh.status, publishedAt: fresh.publishedAt, url: websiteUrl(fresh.slug, fresh.domain), versionNumber: v.versionNumber };
  }

  async unpublish(user: RequestUser, id: string) {
    const { website: w } = await this.getAccessible(user, id, 'publish');
    if (w.status === 'suspended') throw new ForbiddenException('This website is suspended.');
    w.status = 'draft';
    w.hasUnpublishedChanges = true;
    await w.save();
    return { status: w.status };
  }

  /* ===================================================================== */
  /* DESIGN SWITCHING                                                       */
  /* ===================================================================== */
  private async computeSwitch(w: WebsiteDocument, templateSlug: string): Promise<{ content: SiteContent; report: SwitchReport; template: any }> {
    const template = await this.templates.getForUse(templateSlug);
    const original = await this.templates.originalContent(w.templateSlug);
    const { content, report } = applyTemplateDesign(
      w.draftContent as SiteContent,
      reassignIds(template.content as SiteContent),
      original,
      { slug: template.slug, name: template.name },
    );
    return { content: validateSiteContent(content), report, template };
  }

  async previewSwitch(user: RequestUser, id: string, templateSlug: string) {
    const { website: w } = await this.getAccessible(user, id, 'edit');
    const { report } = await this.computeSwitch(w, templateSlug);
    return report;
  }

  async switchTemplate(user: RequestUser, rawUser: any, id: string, templateSlug: string) {
    const { website: w } = await this.getAccessible(user, id, 'edit');
    const { content, report, template } = await this.computeSwitch(w, templateSlug);
    this.assertPremiumAllowed(user, template.accessLevel, rawUser);
    const backup = await this.snapshot(w, user, `Before switching design to ${template.name}`, 'before-template-switch');
    w.draftContent = content as any;
    w.theme = content.theme as any;
    w.templateId = template._id;
    w.templateSlug = template.slug;
    w.templateVersion = template.version;
    w.settings = { ...(w.settings ?? {}), templateName: template.name };
    w.draftRevision += 1;
    w.hasUnpublishedChanges = true;
    w.markModified('draftContent');
    w.markModified('settings');
    await w.save();
    return { content, revision: w.draftRevision, backupVersionId: String(backup._id), report };
  }

  async exportWebsite(user: RequestUser, id: string) {
    const { website: w } = await this.getAccessible(user, id, 'edit');
    return { format: 'fockis-website-studio/v1', name: w.name, exportedAt: new Date().toISOString(), content: w.draftContent };
  }

  /* ===================================================================== */
  /* MANAGERS (website-level permissions)                                   */
  /* ===================================================================== */
  private async findUser(identifier: string) {
    const User = this.connection.models['User'];
    if (!User) throw new BadRequestException('User lookup is unavailable.');
    const v = String(identifier ?? '').trim();
    if (!v) throw new BadRequestException('Enter a username, email or user id.');
    const or: any[] = [{ email: v.toLowerCase() }, { username: v.replace(/^@/, '') }];
    if (Types.ObjectId.isValid(v)) or.push({ _id: oid(v) });
    const u = await User.findOne({ $or: or }).select('_id name fullName username email').lean();
    if (!u) throw new NotFoundException('No Fockis user matches that username or email.');
    return { id: String((u as any)._id), name: (u as any).name || (u as any).fullName || (u as any).username || 'User' };
  }

  async listManagers(user: RequestUser, id: string) {
    const { website: w } = await this.getAccessible(user, id, 'view');
    return w.managers.map((m) => ({ userId: String(m.userId), role: m.role, name: m.name }));
  }

  async addManager(user: RequestUser, id: string, identifier: string, role: 'editor' | 'admin') {
    const { website: w } = await this.getAccessible(user, id, 'owner');
    const target = await this.findUser(identifier);
    if (target.id === String(w.ownerId)) throw new BadRequestException('The owner already has full access.');
    const existing = w.managers.find((m) => String(m.userId) === target.id);
    if (existing) existing.role = role === 'admin' ? 'admin' : 'editor';
    else w.managers.push({ userId: oid(target.id), role: role === 'admin' ? 'admin' : 'editor', name: target.name } as any);
    await w.save();
    return this.listManagers(user, id);
  }

  async removeManager(user: RequestUser, id: string, userId: string) {
    const { website: w } = await this.getAccessible(user, id, 'owner');
    w.managers = w.managers.filter((m) => String(m.userId) !== userId) as any;
    await w.save();
    return this.listManagers(user, id);
  }

  /* ===================================================================== */
  /* PUBLIC LOOKUPS                                                         */
  /* ===================================================================== */
  publicView(w: any) {
    return { id: String(w._id), slug: w.slug, name: w.name, content: w.publishedContent, primaryDomain: w.domain ?? null, publishedAt: w.publishedAt };
  }

  async publicBySlug(slug: string) {
    const w = await this.websites.findOne({ slug: String(slug).toLowerCase(), status: 'published', deletedAt: null }).select('slug name publishedContent domain publishedAt').lean();
    if (!w || !w.publishedContent) throw new NotFoundException('This website is not published.');
    return this.publicView(w);
  }

  async publicByHost(rawHost: string) {
    const host = String(rawHost ?? '').toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
    const root = wsConfig.rootDomain;
    if (host.endsWith(`.${root}`)) {
      const sub = host.slice(0, -(root.length + 1));
      if (!sub.includes('.') && !RESERVED_SLUGS.has(sub)) return this.publicBySlug(sub);
    }
    const bare = host.replace(/^www\./, '');
    const d = await this.domains.findOne({ domain: { $in: [host, bare, `www.${bare}`] }, verificationStatus: 'verified' }).lean();
    if (!d) throw new NotFoundException('No website is connected to this domain.');
    const w = await this.websites.findOne({ _id: d.websiteId, status: 'published', deletedAt: null }).select('slug name publishedContent domain publishedAt').lean();
    if (!w || !w.publishedContent) throw new NotFoundException('This website is not published.');
    return this.publicView(w);
  }

  async publishedById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Website not found.');
    const w = await this.websites.findOne({ _id: id, status: 'published', deletedAt: null });
    if (!w || !w.publishedContent) throw new NotFoundException('This website is not published.');
    return w;
  }

  /* ===================================================================== */
  /* ADMIN                                                                  */
  /* ===================================================================== */
  async adminList(q?: string, status?: string) {
    const filter: any = { deletedAt: null };
    if (status && ['draft', 'published', 'suspended'].includes(status)) filter.status = status;
    if (q) {
      const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i');
      filter.$or = [{ name: rx }, { slug: rx }, { domain: rx }];
    }
    const list = await this.websites.find(filter).select('-draftContent -publishedContent').sort({ updatedAt: -1 }).limit(300).lean();
    const User = this.connection.models['User'];
    const owners = User ? await User.find({ _id: { $in: list.map((w) => w.ownerId) } }).select('name fullName username email').lean() : [];
    const names = new Map(owners.map((u: any) => [String(u._id), u.name || u.fullName || u.username || u.email || 'User']));
    const Report = this.connection.models[WS_MODEL.report];
    const reports = Report ? await Report.aggregate([{ $match: { status: 'open' } }, { $group: { _id: '$websiteId', n: { $sum: 1 } } }]) : [];
    const rmap = new Map(reports.map((r: any) => [String(r._id), r.n]));
    return list.map((w) => ({ ...this.summary(w, 'admin'), ownerId: String(w.ownerId), ownerName: names.get(String(w.ownerId)) ?? 'Unknown', reports: rmap.get(String(w._id)) ?? 0, suspendedReason: w.suspendedReason }));
  }

  async adminSuspend(id: string, suspended: boolean, reason?: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Website not found.');
    const w = await this.websites.findOne({ _id: id, deletedAt: null });
    if (!w) throw new NotFoundException('Website not found.');
    if (suspended && w.status !== 'suspended') {
      w.statusBeforeSuspension = w.status;
      w.status = 'suspended';
      w.suspendedReason = String(reason ?? '').slice(0, 500) || null;
    } else if (!suspended && w.status === 'suspended') {
      w.status = (w.statusBeforeSuspension as any) === 'published' && w.publishedContent ? 'published' : 'draft';
      w.suspendedReason = null;
    }
    await w.save();
    return this.summary(w.toObject(), 'admin');
  }
}
