import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes, Types } from "mongoose";

export type LessonContentDocument = HydratedDocument<LessonContent>;

export interface QuizQuestion {
  prompt: string;
  options: string[];
  /** Index of the correct option. Never sent to learners. */
  answer: number;
  explain?: string;
}

export interface LessonQuiz {
  passPct: number;
  questions: QuizQuestion[];
}

/**
 * Protected material of one Creator Studio lesson. Kept out of the Course
 * document so the public catalog and course endpoints can never leak paid
 * videos, PDFs, quiz answers or live-class links.
 */
@Schema({ timestamps: true, collection: "academy_lesson_contents" })
export class LessonContent {
  _id!: Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  courseCode!: string;

  @Prop({ required: true, trim: true })
  lessonKey!: string;

  /** External video link (YouTube, Vimeo, MP4 URL…). */
  @Prop({ trim: true })
  videoUrl?: string;

  /** Uploaded file (video or PDF) in Fockis cloud storage. */
  @Prop({ trim: true })
  storageKey?: string;

  @Prop({ trim: true })
  fileName?: string;

  @Prop({ trim: true })
  mimeType?: string;

  @Prop({ min: 0 })
  size?: number;

  /** Lesson text / notes (plain text or simple markdown). */
  @Prop()
  body?: string;

  @Prop({ type: SchemaTypes.Mixed })
  quiz?: LessonQuiz;

  /** Live class: Fockis Meetings join link. */
  @Prop({ trim: true })
  joinUrl?: string;

  /** Live class: recording link added after the session. */
  @Prop({ trim: true })
  recordingUrl?: string;
}

export const LessonContentSchema = SchemaFactory.createForClass(LessonContent);
LessonContentSchema.index({ courseCode: 1, lessonKey: 1 }, { unique: true });
