import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { HELP_SEED } from "../data/help-seed";
import type { ArticleStatus } from "../support.constants";
import type { ListArticlesQueryDto, SaveArticleDto } from "../dto/support.dto";
import { HelpArticle, HelpArticleDocument } from "../schemas/help-article.schema";
import { escapeRegex } from "./support.service";

const plain = (doc: any): Record<string, any> => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc);

/** Help Center content: public reads for users, CRUD for the Help Articles Manager. */
@Injectable()
export class HelpArticlesService implements OnModuleInit {
  private readonly logger = new Logger(HelpArticlesService.name);

  constructor(@InjectModel(HelpArticle.name) private readonly articles: Model<HelpArticleDocument>) {}

  /** Moves the starting Help Center content into the database once. */
  async onModuleInit() {
    try {
      if ((await this.articles.estimatedDocumentCount().exec()) > 0) return;
      const now = new Date();
      await this.articles.insertMany(
        HELP_SEED.map((item) => ({ ...item, status: "published", publishedAt: now })),
        { ordered: false },
      );
      this.logger.log(`Seeded ${HELP_SEED.length} Help Center items.`);
    } catch (error) {
      this.logger.warn(`Help Center seed skipped: ${String(error)}`);
    }
  }

  private view(raw: any, admin = false) {
    const a = plain(raw);
    return {
      id: String(a._id),
      slug: a.slug,
      kind: a.kind,
      topic: a.topic,
      title: a.title,
      summary: a.summary ?? "",
      body: (a.body ?? []).map((b: any) => ({ heading: b.heading ?? "", text: b.text ?? "", steps: b.steps ?? [], imageUrl: b.imageUrl ?? "" })),
      links: (a.links ?? []).map((l: any) => ({ label: l.label, to: l.to })),
      keywords: a.keywords ?? [],
      featured: Boolean(a.featured),
      order: a.order ?? 0,
      updatedAt: a.updatedAt,
      publishedAt: a.publishedAt ?? null,
      ...(admin ? { status: a.status as ArticleStatus, createdAt: a.createdAt } : {}),
    };
  }

  /* ---------------- public ---------------- */

  async published() {
    const items = await this.articles.find({ status: "published" }).sort({ featured: -1, order: 1, title: 1 }).limit(1000).exec();
    return { items: items.map((a) => this.view(a)) };
  }

  async publishedBySlug(slug: string) {
    const a = await this.articles.findOne({ slug: String(slug).toLowerCase(), status: "published" }).exec();
    if (!a) throw new NotFoundException("That article was not found.");
    return this.view(a);
  }

  /* ---------------- admin ---------------- */

  async list(query: ListArticlesQueryDto) {
    const filter: Record<string, unknown> = {};
    if (query.status && query.status !== "all") filter.status = query.status;
    else filter.status = { $ne: "archived" };
    if (query.status === "all") delete filter.status;
    if (query.kind) filter.kind = query.kind;
    if (query.topic) filter.topic = query.topic;
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ title: pattern }, { slug: pattern }, { summary: pattern }];
    }
    const items = await this.articles.find(filter).sort({ kind: 1, topic: 1, order: 1 }).limit(1000).exec();
    const counts = await Promise.all(
      (["draft", "published", "archived"] as ArticleStatus[]).map(async (s) => [s, await this.articles.countDocuments({ status: s }).exec()]),
    );
    return { items: items.map((a) => this.view(a, true)), counts: Object.fromEntries(counts) };
  }

  async get(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("That article was not found.");
    const a = await this.articles.findById(id).exec();
    if (!a) throw new NotFoundException("That article was not found.");
    return this.view(a, true);
  }

  private payload(dto: SaveArticleDto, editorId: string) {
    if (dto.kind === "article" && !(dto.body ?? []).some((b) => b.text?.trim() || b.steps?.length)) {
      throw new BadRequestException("Add at least one paragraph or list of steps.");
    }
    if (dto.kind === "faq" && !dto.summary?.trim()) throw new BadRequestException("Write the answer.");
    return {
      slug: dto.slug,
      kind: dto.kind,
      topic: dto.topic,
      title: dto.title,
      summary: dto.summary ?? "",
      body: dto.kind === "faq" ? [] : (dto.body ?? []).map((b) => ({ heading: b.heading ?? "", text: b.text ?? "", steps: (b.steps ?? []).map((s) => s.trim()).filter(Boolean), imageUrl: b.imageUrl ?? "" })),
      links: dto.links ?? [],
      keywords: (dto.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean),
      featured: Boolean(dto.featured),
      order: dto.order ?? 0,
      updatedBy: new Types.ObjectId(editorId),
    };
  }

  async create(editorId: string, dto: SaveArticleDto) {
    try {
      const a = await this.articles.create({ ...this.payload(dto, editorId), status: "draft" });
      return this.view(a, true);
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException("An article with that address already exists.");
      throw error;
    }
  }

  async update(editorId: string, id: string, dto: SaveArticleDto) {
    await this.get(id);
    try {
      const a = await this.articles.findByIdAndUpdate(id, { $set: this.payload(dto, editorId) }, { returnDocument: "after" }).exec();
      return this.view(a, true);
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException("An article with that address already exists.");
      throw error;
    }
  }

  async setStatus(editorId: string, id: string, status: ArticleStatus) {
    const current = await this.get(id);
    const a = await this.articles
      .findByIdAndUpdate(
        id,
        { $set: { status, updatedBy: new Types.ObjectId(editorId), ...(status === "published" && !current.publishedAt ? { publishedAt: new Date() } : {}) } },
        { returnDocument: "after" },
      )
      .exec();
    return this.view(a, true);
  }

  /** Only drafts can be deleted; published content is archived instead. */
  async remove(id: string) {
    const a = await this.get(id);
    if (a.status !== "draft") throw new ConflictException("Only drafts can be deleted. Archive published articles instead.");
    await this.articles.deleteOne({ _id: new Types.ObjectId(id) }).exec();
    return { deleted: true };
  }
}
