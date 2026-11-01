import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

import { ARTICLE_KINDS, ARTICLE_STATUSES, HELP_TOPICS } from "../support.constants";
import type { ArticleKind, ArticleStatus } from "../support.constants";

@Schema({ _id: false })
export class HelpArticleBlock {
  @Prop({ type: String, trim: true, maxlength: 200, default: "" })
  heading!: string;

  @Prop({ type: String, trim: true, maxlength: 5000, default: "" })
  text!: string;

  @Prop({ type: [String], default: [] })
  steps!: string[];

  /** Public image (/uploads/media/help/images/…) shown under the block. */
  @Prop({ type: String, trim: true, maxlength: 500, default: "" })
  imageUrl!: string;
}
export const HelpArticleBlockSchema = SchemaFactory.createForClass(HelpArticleBlock);

@Schema({ _id: false })
export class HelpArticleLink {
  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  label!: string;

  /** In-app path such as /settings. */
  @Prop({ type: String, required: true, trim: true, maxlength: 300 })
  to!: string;
}
export const HelpArticleLinkSchema = SchemaFactory.createForClass(HelpArticleLink);

/**
 * Help Center content. kind "article" is a guide; kind "faq" is a quick
 * question (title) and answer (summary). Only published items reach users.
 */
@Schema({ collection: "help_articles", timestamps: true })
export class HelpArticle {
  @Prop({ type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 })
  slug!: string;

  @Prop({ type: String, enum: ARTICLE_KINDS, default: "article", index: true })
  kind!: ArticleKind;

  @Prop({ type: String, enum: HELP_TOPICS, required: true, index: true })
  topic!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ type: String, trim: true, maxlength: 1000, default: "" })
  summary!: string;

  @Prop({ type: [HelpArticleBlockSchema], default: [] })
  body!: HelpArticleBlock[];

  @Prop({ type: [HelpArticleLinkSchema], default: [] })
  links!: HelpArticleLink[];

  @Prop({ type: [String], default: [] })
  keywords!: string[];

  @Prop({ type: String, enum: ARTICLE_STATUSES, default: "draft", index: true })
  status!: ArticleStatus;

  @Prop({ type: Boolean, default: false, index: true })
  featured!: boolean;

  @Prop({ type: Number, default: 0 })
  order!: number;

  @Prop({ type: Date, default: null })
  publishedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  updatedBy!: Types.ObjectId | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type HelpArticleDocument = HydratedDocument<HelpArticle>;
export const HelpArticleSchema = SchemaFactory.createForClass(HelpArticle);
HelpArticleSchema.index({ status: 1, kind: 1, topic: 1, order: 1 });
