import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SiteContent } from '../content/content.types';
import { normalizeSlug, validateSiteContent } from '../content/content.validation';
import { cloneJson } from '../content/content.utils';
import { WS_MODEL, WebsiteCategoryDocument, WebsiteDocument, WebsiteTemplateDocument } from '../schemas/website-studio.schemas';
import { OFFICIAL_TEMPLATE_FACTORIES } from '../seed/official-templates';
import { alternativeTemplates } from '../seed/alternative-templates';
import { categorySeeds } from '../seed/categories.seed';

/** Bump when the official seed templates change so un-modified copies are refreshed. */
const SEED_VERSION = 1;

@Injectable()
export class TemplatesService implements OnModuleInit {
  private readonly logger = new Logger('WebsiteStudioTemplates');

  constructor(
    @InjectModel(WS_MODEL.template) private readonly templates: Model<WebsiteTemplateDocument>,
    @InjectModel(WS_MODEL.category) private readonly categories: Model<WebsiteCategoryDocument>,
    @InjectModel(WS_MODEL.website) private readonly websites: Model<WebsiteDocument>,
  ) {}

  /* ===================================================================== */
  /* SEEDING — idempotent; never overwrites admin changes                  */
  /* ===================================================================== */
  async onModuleInit() {
    try {
      await this.seed();
    } catch (err) {
      this.logger.error('Website Studio seed failed (the API keeps running).', err instanceof Error ? err.stack : String(err));
    }
  }

  async seed() {
    const seeds = categorySeeds();
    const existingCount = await this.categories.estimatedDocumentCount();
    for (const [i, c] of seeds.entries()) {
      await this.categories.updateOne(
        { slug: c.slug },
        { $setOnInsert: { name: c.name, slug: c.slug, group: c.group, icon: c.icon, order: existingCount ? 1000 + i : i, status: 'active', isSeeded: true } },
        { upsert: true },
      );
    }
    const catDocs = await this.categories.find().lean();
    const bySlug = new Map(catDocs.map((c) => [c.slug, c]));

    const defs = [...OFFICIAL_TEMPLATE_FACTORIES.map((f) => f()), ...alternativeTemplates()];
    const covered = new Set<string>();
    defs.forEach((d) => d.categorySlugs.forEach((s) => covered.add(s)));

    for (const [order, def] of defs.entries()) {
      const isUniversal = def.slug === 'fockis-business';
      const catSlugs = isUniversal ? catDocs.map((c) => c.slug).filter((s) => !covered.has(s)) : def.categorySlugs;
      const categoryIds = catSlugs.map((s) => bySlug.get(s)?._id).filter(Boolean) as Types.ObjectId[];
      const defaultFor = (isUniversal ? catSlugs : def.isDefaultFor).map((s) => bySlug.get(s)?._id).filter(Boolean) as Types.ObjectId[];
      const existing = await this.templates.findOne({ slug: def.slug });
      const content = validateSiteContent(def.content);
      const base = {
        name: def.name,
        description: def.description,
        thumbnail: def.thumbnail,
        previewImages: def.previewImages,
        tags: def.tags,
        content,
        isOfficial: true,
        accessLevel: def.accessLevel,
        isFeatured: def.isFeatured,
        seedVersion: SEED_VERSION,
        order,
      };
      if (!existing) {
        await this.templates.create({
          ...base,
          slug: def.slug,
          categoryIds,
          defaultForCategoryIds: defaultFor,
          visibility: def.slug === 'blank' ? 'private' : 'public',
          status: 'published',
          version: 1,
        });
      } else if (existing.isOfficial && !existing.modifiedByAdmin && existing.seedVersion < SEED_VERSION) {
        Object.assign(existing, base, { version: existing.version + 1 });
        existing.markModified('content');
        await existing.save();
      }
    }

    // Default template per category (only where no admin choice exists yet).
    const tpls = await this.templates.find({ isOfficial: true }).select('_id defaultForCategoryIds').lean();
    for (const t of tpls) {
      for (const cid of t.defaultForCategoryIds ?? []) {
        await this.categories.updateOne({ _id: cid, defaultTemplateId: null }, { $set: { defaultTemplateId: t._id } });
      }
    }
    this.logger.log(`Website Studio ready: ${catDocs.length} categories, ${await this.templates.countDocuments()} templates.`);
  }

  /* ===================================================================== */
  /* PUBLIC CATALOG                                                         */
  /* ===================================================================== */
  async listCategories(includeHidden = false) {
    const cats = await this.categories.find(includeHidden ? {} : { status: 'active' }).sort({ order: 1, name: 1 }).lean();
    const counts = await this.templates.aggregate([
      { $match: { status: 'published', visibility: 'public' } },
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds', n: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c: any) => [String(c._id), c.n]));
    const defaults = await this.templates.find({ _id: { $in: cats.map((c) => c.defaultTemplateId).filter(Boolean) } }).select('slug').lean();
    const defMap = new Map(defaults.map((d) => [String(d._id), d.slug]));
    return cats.map((c) => ({
      id: String(c._id),
      name: c.name,
      slug: c.slug,
      group: c.group,
      description: c.description,
      icon: c.icon,
      image: c.image,
      order: c.order,
      status: c.status,
      defaultTemplateId: c.defaultTemplateId ? String(c.defaultTemplateId) : null,
      defaultTemplateSlug: c.defaultTemplateId ? defMap.get(String(c.defaultTemplateId)) ?? null : null,
      templateCount: countMap.get(String(c._id)) ?? 0,
    }));
  }

  summary(t: any, catSlugMap: Map<string, string>) {
    return {
      id: String(t._id),
      name: t.name,
      slug: t.slug,
      categoryIds: (t.categoryIds ?? []).map(String),
      categorySlugs: (t.categoryIds ?? []).map((id: any) => catSlugMap.get(String(id))).filter(Boolean),
      description: t.description,
      thumbnail: t.thumbnail,
      previewImages: t.previewImages ?? [],
      tags: t.tags ?? [],
      version: t.version,
      isOfficial: t.isOfficial,
      isDefault: (t.defaultForCategoryIds ?? []).length > 0,
      isFeatured: t.isFeatured,
      accessLevel: t.accessLevel,
      visibility: t.visibility,
      status: t.status,
      theme: t.content?.theme,
      updatedAt: t.updatedAt,
    };
  }

  async catSlugMap() {
    const cats = await this.categories.find().select('slug').lean();
    return new Map(cats.map((c) => [String(c._id), c.slug]));
  }

  async listPublic(query: { category?: string; q?: string; featured?: string | boolean }) {
    const filter: Record<string, any> = { status: 'published', visibility: 'public' };
    let category: any = null;
    if (query.category) {
      category = await this.categories.findOne({ slug: String(query.category).toLowerCase() }).lean();
      if (!category) return [];
      filter.categoryIds = category._id;
    }
    if (String(query.featured) === 'true') filter.isFeatured = true;
    if (query.q) {
      const rx = new RegExp(String(query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { tags: rx }];
    }
    const list = await this.templates.find(filter).select('-content.pages -content.catalog -draftContent').sort({ isOfficial: -1, isFeatured: -1, order: 1, name: 1 }).lean();
    const map = await this.catSlugMap();
    const out = list.map((t) => this.summary(t, map));
    if (category?.defaultTemplateId) {
      const def = String(category.defaultTemplateId);
      out.sort((a, b) => Number(b.id === def) - Number(a.id === def));
    }
    return out;
  }

  async getPublic(slug: string) {
    const t = await this.templates.findOne({ slug: String(slug).toLowerCase(), status: 'published' }).lean();
    if (!t) throw new NotFoundException('Template not found.');
    const map = await this.catSlugMap();
    return { ...this.summary(t, map), content: t.content };
  }

  async getForUse(slug: string) {
    const t = await this.templates.findOne({ slug: String(slug).toLowerCase(), status: 'published' });
    if (!t) throw new NotFoundException('Template not found.');
    return t;
  }

  async defaultForCategory(categorySlug?: string | null) {
    if (categorySlug) {
      const cat = await this.categories.findOne({ slug: categorySlug.toLowerCase() }).lean();
      if (cat?.defaultTemplateId) {
        const t = await this.templates.findOne({ _id: cat.defaultTemplateId, status: 'published' });
        if (t) return { template: t, category: cat };
      }
      const any = cat ? await this.templates.findOne({ categoryIds: cat._id, status: 'published', visibility: 'public' }).sort({ isOfficial: -1, order: 1 }) : null;
      if (any) return { template: any, category: cat };
    }
    const fallback = await this.templates.findOne({ slug: 'fockis-business' });
    if (!fallback) throw new NotFoundException('No templates are available yet.');
    return { template: fallback, category: null };
  }

  async findCategory(slugOrId?: string | null) {
    if (!slugOrId) return null;
    return Types.ObjectId.isValid(slugOrId)
      ? this.categories.findById(slugOrId).lean()
      : this.categories.findOne({ slug: slugOrId.toLowerCase() }).lean();
  }

  /* ===================================================================== */
  /* ADMINISTRATION                                                         */
  /* ===================================================================== */
  async adminList() {
    const list = await this.templates.find().select('-content.pages -content.catalog -draftContent').sort({ order: 1, name: 1 }).lean();
    const usage = await this.websites.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$templateId', n: { $sum: 1 } } }]);
    const u = new Map(usage.map((x: any) => [String(x._id), x.n]));
    const map = await this.catSlugMap();
    return list.map((t) => ({ ...this.summary(t, map), usageCount: u.get(String(t._id)) ?? 0 }));
  }

  async adminGet(id: string) {
    const t = await this.byId(id);
    const map = await this.catSlugMap();
    return { ...this.summary(t.toObject(), map), content: t.content, draftContent: t.draftContent, draftRevision: t.draftRevision };
  }

  private async byId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid template id.');
    const t = await this.templates.findById(id);
    if (!t) throw new NotFoundException('Template not found.');
    return t;
  }

  private toCategoryIds(ids?: string[]) {
    return (ids ?? []).filter((x) => Types.ObjectId.isValid(x)).map((x) => new Types.ObjectId(x));
  }

  async adminCreate(dto: { name: string; slug?: string; categoryIds?: string[]; fromTemplateSlug?: string; description?: string }) {
    const slug = normalizeSlug(dto.slug || dto.name);
    if (!slug) throw new BadRequestException('A template slug is required.');
    if (await this.templates.exists({ slug })) throw new ConflictException('A template with this slug already exists.');
    const source = await this.templates.findOne({ slug: dto.fromTemplateSlug || 'blank' }).lean();
    if (!source) throw new NotFoundException('Source template not found.');
    const t = await this.templates.create({
      name: dto.name.trim().slice(0, 120),
      slug,
      description: dto.description ?? '',
      categoryIds: this.toCategoryIds(dto.categoryIds),
      content: cloneJson(source.content),
      draftContent: cloneJson(source.content),
      thumbnail: source.thumbnail,
      previewImages: source.previewImages,
      tags: [],
      isOfficial: false,
      status: 'draft',
      visibility: 'public',
      version: 1,
      modifiedByAdmin: true,
    });
    return this.adminGet(String(t._id));
  }

  async adminUpdate(id: string, dto: Record<string, any>) {
    const t = await this.byId(id);
    if (dto.name !== undefined) t.name = String(dto.name).slice(0, 120);
    if (dto.description !== undefined) t.description = String(dto.description).slice(0, 1000);
    if (dto.thumbnail !== undefined) t.thumbnail = String(dto.thumbnail).slice(0, 2000);
    if (Array.isArray(dto.previewImages)) t.previewImages = dto.previewImages.map((x: any) => String(x).slice(0, 2000)).slice(0, 12);
    if (Array.isArray(dto.tags)) t.tags = dto.tags.map((x: any) => String(x).slice(0, 40)).slice(0, 30);
    if (Array.isArray(dto.categoryIds)) t.categoryIds = this.toCategoryIds(dto.categoryIds);
    if (dto.isFeatured !== undefined) t.isFeatured = !!dto.isFeatured;
    if (['free', 'premium'].includes(dto.accessLevel)) t.accessLevel = dto.accessLevel;
    if (['public', 'private'].includes(dto.visibility)) t.visibility = dto.visibility;
    if (['draft', 'published', 'unpublished'].includes(dto.status)) {
      if (dto.status !== 'published' && (await this.categories.exists({ defaultTemplateId: t._id }))) {
        throw new BadRequestException('This template is the default for a category. Choose another default first.');
      }
      t.status = dto.status;
    }
    if (dto.order !== undefined && Number.isFinite(Number(dto.order))) t.order = Number(dto.order);
    t.modifiedByAdmin = true;
    await t.save();
    return this.adminGet(id);
  }

  async adminDuplicate(id: string) {
    const t = await this.byId(id);
    let slug = `${t.slug}-copy`;
    for (let i = 2; await this.templates.exists({ slug }); i++) slug = `${t.slug}-copy-${i}`;
    const copy = await this.templates.create({
      ...t.toObject(),
      _id: undefined,
      slug,
      name: `${t.name} (Copy)`,
      isOfficial: false,
      defaultForCategoryIds: [],
      status: 'draft',
      version: 1,
      modifiedByAdmin: true,
    });
    return this.adminGet(String(copy._id));
  }

  async adminDelete(id: string) {
    const t = await this.byId(id);
    if (t.isOfficial) throw new BadRequestException('Official templates cannot be deleted. Unpublish it instead.');
    if (await this.categories.exists({ defaultTemplateId: t._id })) throw new BadRequestException('This template is a category default.');
    await t.deleteOne();
    return { deleted: true };
  }

  async adminSaveDraft(id: string, content: unknown, revision: number) {
    const t = await this.byId(id);
    if (Number(revision) !== t.draftRevision) throw new ConflictException('This template was changed in another window. Reload to continue.');
    t.draftContent = validateSiteContent(content) as any;
    t.draftRevision += 1;
    t.modifiedByAdmin = true;
    t.markModified('draftContent');
    await t.save();
    return { revision: t.draftRevision, updatedAt: (t as any).updatedAt };
  }

  /** Publishing a template creates a new master version. Existing customer websites are never touched. */
  async adminPublish(id: string) {
    const t = await this.byId(id);
    const source = t.draftContent ?? t.content;
    t.content = validateSiteContent(source) as any;
    t.version += 1;
    t.status = 'published';
    t.modifiedByAdmin = true;
    t.markModified('content');
    await t.save();
    return this.adminGet(id);
  }

  async adminSetDefault(id: string, categoryId: string) {
    const t = await this.byId(id);
    if (t.status !== 'published') throw new BadRequestException('Publish the template before making it a default.');
    if (!Types.ObjectId.isValid(categoryId)) throw new BadRequestException('Invalid category.');
    const cat = await this.categories.findById(categoryId);
    if (!cat) throw new NotFoundException('Category not found.');
    cat.defaultTemplateId = t._id;
    await cat.save();
    if (!t.categoryIds.some((c) => String(c) === categoryId)) t.categoryIds.push(cat._id);
    if (!t.defaultForCategoryIds.some((c) => String(c) === categoryId)) t.defaultForCategoryIds.push(cat._id);
    await this.templates.updateMany({ _id: { $ne: t._id } }, { $pull: { defaultForCategoryIds: cat._id } });
    t.modifiedByAdmin = true;
    await t.save();
    return this.adminGet(id);
  }

  async adminCreateCategory(dto: Record<string, any>) {
    const name = String(dto.name ?? '').trim();
    if (!name) throw new BadRequestException('Category name is required.');
    const slug = normalizeSlug(dto.slug || name);
    if (await this.categories.exists({ slug })) throw new ConflictException('A category with this slug already exists.');
    const last = await this.categories.findOne().sort({ order: -1 }).lean();
    const c = await this.categories.create({
      name,
      slug,
      group: String(dto.group ?? 'Other').slice(0, 80),
      description: String(dto.description ?? '').slice(0, 500),
      icon: String(dto.icon ?? 'LayoutGrid').slice(0, 40),
      image: String(dto.image ?? '').slice(0, 2000),
      order: (last?.order ?? 0) + 1,
      status: dto.status === 'hidden' ? 'hidden' : 'active',
    });
    if (!c.defaultTemplateId) {
      const universal = await this.templates.findOne({ slug: 'fockis-business' });
      if (universal) {
        c.defaultTemplateId = universal._id;
        await c.save();
        await this.templates.updateOne({ _id: universal._id }, { $addToSet: { categoryIds: c._id } });
      }
    }
    return (await this.listCategories(true)).find((x) => x.id === String(c._id));
  }

  async adminUpdateCategory(id: string, dto: Record<string, any>) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid category id.');
    const c = await this.categories.findById(id);
    if (!c) throw new NotFoundException('Category not found.');
    if (dto.name !== undefined) c.name = String(dto.name).trim().slice(0, 80) || c.name;
    if (dto.group !== undefined) c.group = String(dto.group).slice(0, 80);
    if (dto.description !== undefined) c.description = String(dto.description).slice(0, 500);
    if (dto.icon !== undefined) c.icon = String(dto.icon).slice(0, 40);
    if (dto.image !== undefined) c.image = String(dto.image).slice(0, 2000);
    if (dto.status === 'active' || dto.status === 'hidden') c.status = dto.status;
    await c.save();
    return (await this.listCategories(true)).find((x) => x.id === id);
  }

  async adminDeleteCategory(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid category id.');
    const inUse = await this.websites.countDocuments({ categoryId: new Types.ObjectId(id), deletedAt: null });
    if (inUse) throw new BadRequestException(`${inUse} websites use this category. Hide it instead of deleting.`);
    await this.templates.updateMany({}, { $pull: { categoryIds: new Types.ObjectId(id), defaultForCategoryIds: new Types.ObjectId(id) } });
    await this.categories.deleteOne({ _id: id });
    return { deleted: true };
  }

  async adminReorderCategories(ids: string[]) {
    const valid = (ids ?? []).filter((x) => Types.ObjectId.isValid(x));
    await Promise.all(valid.map((id, i) => this.categories.updateOne({ _id: id }, { $set: { order: i } })));
    return { ok: true };
  }

  async usage() {
    const usage = await this.websites.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$templateId', n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
    const tpl = await this.templates.find({ _id: { $in: usage.map((u: any) => u._id).filter(Boolean) } }).select('name').lean();
    const names = new Map(tpl.map((t) => [String(t._id), t.name]));
    return usage.filter((u: any) => u._id).map((u: any) => ({ templateId: String(u._id), name: names.get(String(u._id)) ?? 'Deleted template', websites: u.n }));
  }

  /** Original (pristine) content of the template a website was created from — used for smart design switching. */
  async originalContent(slug?: string | null): Promise<SiteContent | null> {
    if (!slug) return null;
    const t = await this.templates.findOne({ slug }).select('content').lean();
    return (t?.content as SiteContent) ?? null;
  }
}
