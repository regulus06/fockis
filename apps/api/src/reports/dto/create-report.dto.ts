import { Transform } from "class-transformer";
import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from "class-validator";

import { DESCRIPTION_MAX, ReportReason, ReportTargetType } from "../reports.constants";

const trim = () => Transform(({ value }) => (typeof value === "string" ? value.trim() : value));

/**
 * POST /reports
 *
 * There is intentionally no reporterId field: the reporter is always the
 * authenticated user. With the global ValidationPipe
 * (whitelist + forbidNonWhitelisted) a client that sends one is rejected.
 */
export class CreateReportDto {
  @IsEnum(ReportTargetType, { message: "targetType must be 'post' or 'account'." })
  targetType!: ReportTargetType;

  @IsMongoId({ message: "Invalid target ID." })
  targetId!: string;

  /**
   * Optional: the chat message being reported. Only valid with
   * targetType "account" (the message's sender); the message is attached
   * to the report as evidence.
   */
  @IsOptional()
  @IsMongoId({ message: "Invalid message ID." })
  messageId?: string;

  @IsEnum(ReportReason, { message: "Choose a reason for your report." })
  reason!: ReportReason;

  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(DESCRIPTION_MAX, { message: `Keep the explanation under ${DESCRIPTION_MAX} characters.` })
  description?: string;
}
