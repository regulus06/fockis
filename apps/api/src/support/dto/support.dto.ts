import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import {
  ARTICLE_KINDS,
  ARTICLE_STATUSES,
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  HELP_TOPICS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MESSAGE_MAX,
  NOTE_MAX,
  SUBJECT_MAX,
  SUPPORT_CATEGORIES,
  SUPPORT_KINDS,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
} from "../support.constants";
import type {
  ArticleKind,
  ArticleStatus,
  FeedbackCategory,
  FeedbackStatus,
  SupportCategory,
  SupportKind,
  SupportPriority,
  SupportStatus,
} from "../support.constants";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const toInt = ({ value }: { value: unknown }) => (value === undefined || value === "" ? undefined : Number(value));

/** Reference to a file uploaded with POST /support/attachments. */
export class AttachmentRefDto {
  @IsString()
  @MaxLength(300)
  key!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsInt()
  @Min(1)
  size!: number;
}

class WithAttachments {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ATTACHMENTS_PER_MESSAGE)
  @ValidateNested({ each: true })
  @Type(() => AttachmentRefDto)
  attachments?: AttachmentRefDto[];
}

/* ---------------- tickets (user) ---------------- */

export class CreateTicketDto extends WithAttachments {
  @IsIn(SUPPORT_KINDS)
  kind!: SupportKind;

  @IsIn(SUPPORT_CATEGORIES)
  category!: SupportCategory;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: "Add a short subject (at least 3 characters)." })
  @MaxLength(SUBJECT_MAX)
  subject!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Write a message." })
  @MaxLength(MESSAGE_MAX)
  message!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  affectedFeature?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  deviceInfo?: string;
}

export class TicketMessageDto extends WithAttachments {
  @Transform(trim)
  @IsString()
  @MaxLength(MESSAGE_MAX)
  body!: string;
}

export class ListMyTicketsQueryDto {
  @IsOptional()
  @IsIn(["active", "closed", "all"])
  filter?: "active" | "closed" | "all";

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;
}

/* ---------------- tickets (staff) ---------------- */

export class AgentReplyDto extends TicketMessageDto {
  /** Status after the reply; defaults to awaiting_user. */
  @IsOptional()
  @IsIn(SUPPORT_STATUSES)
  status?: SupportStatus;
}

export class SetStatusDto {
  @IsIn(SUPPORT_STATUSES)
  status!: SupportStatus;
}

export class SetPriorityDto {
  @IsIn(SUPPORT_PRIORITIES)
  priority!: SupportPriority;
}

export class AssignDto {
  /** Staff member to assign; null unassigns. */
  @IsOptional()
  @IsMongoId()
  assigneeId?: string | null;
}

export class NoteDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(NOTE_MAX)
  body!: string;
}

export class ListTicketsQueryDto {
  @IsOptional()
  @IsIn([...SUPPORT_STATUSES, "active", "all"])
  status?: SupportStatus | "active" | "all";

  @IsOptional()
  @IsIn(SUPPORT_KINDS)
  kind?: SupportKind;

  @IsOptional()
  @IsIn(SUPPORT_PRIORITIES)
  priority?: SupportPriority;

  @IsOptional()
  @IsIn(["me", "unassigned"])
  assigned?: "me" | "unassigned";

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateSupportSettingsDto {
  @IsBoolean()
  liveChatOnline!: boolean;
}

/* ---------------- feedback ---------------- */

export class CreateFeedbackDto extends WithAttachments {
  @IsIn(FEEDBACK_CATEGORIES)
  category!: FeedbackCategory;

  @Transform(trim)
  @IsString()
  @MinLength(3, { message: "Add a short subject (at least 3 characters)." })
  @MaxLength(SUBJECT_MAX)
  subject!: string;

  @Transform(trim)
  @IsString()
  @MinLength(10, { message: "Describe your feedback in at least 10 characters." })
  @MaxLength(MESSAGE_MAX)
  description!: string;
}

export class FeedbackResponseDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(MESSAGE_MAX)
  body!: string;

  @IsOptional()
  @IsIn(FEEDBACK_STATUSES)
  status?: FeedbackStatus;
}

export class FeedbackStatusDto {
  @IsIn(FEEDBACK_STATUSES)
  status!: FeedbackStatus;
}

export class ArchiveDto {
  @IsBoolean()
  archived!: boolean;
}

export class ListFeedbackQueryDto {
  @IsOptional()
  @IsIn([...FEEDBACK_STATUSES, "open", "all"])
  status?: FeedbackStatus | "open" | "all";

  @IsOptional()
  @IsIn(FEEDBACK_CATEGORIES)
  category?: FeedbackCategory;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsIn(["me", "unassigned"])
  assigned?: "me" | "unassigned";

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  page?: number;
}

/* ---------------- help articles ---------------- */

export class HelpBlockDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  heading?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  steps?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(|\/uploads\/media\/help\/images\/[\w./-]+|https:\/\/[^\s]+)$/, { message: "Use an uploaded image." })
  imageUrl?: string;
}

export class HelpLinkDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^\/[^\s]*$/, { message: "Links must be Fockis paths starting with /." })
  @MaxLength(300)
  to!: string;
}

export class SaveArticleDto {
  @Transform(trim)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Use lowercase letters, numbers and dashes." })
  @MaxLength(80)
  slug!: string;

  @IsIn(ARTICLE_KINDS)
  kind!: ArticleKind;

  @IsIn(HELP_TOPICS)
  topic!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => HelpBlockDto)
  body?: HelpBlockDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => HelpLinkDto)
  links?: HelpLinkDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  keywords?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  order?: number;
}

export class ArticleStatusDto {
  @IsIn(ARTICLE_STATUSES)
  status!: ArticleStatus;
}

export class ListArticlesQueryDto {
  @IsOptional()
  @IsIn([...ARTICLE_STATUSES, "all"])
  status?: ArticleStatus | "all";

  @IsOptional()
  @IsIn(ARTICLE_KINDS)
  kind?: ArticleKind;

  @IsOptional()
  @IsIn(HELP_TOPICS)
  topic?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}
