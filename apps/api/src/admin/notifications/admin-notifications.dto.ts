import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import {
  ADMIN_NOTIFICATION_CATEGORIES,
  ADMIN_NOTIFICATION_PRIORITIES,
} from "./admin-notification.types";

export class AdminNotificationListQueryDto {
  @IsOptional() @IsIn(["all", "unread", "read"]) status?: "all" | "unread" | "read";
  @IsOptional() @IsIn(ADMIN_NOTIFICATION_CATEGORIES as unknown as string[]) category?: string;
  @IsOptional() @IsIn(ADMIN_NOTIFICATION_PRIORITIES as unknown as string[]) priority?: string;
  @IsOptional() @IsIn(["none", "open", "resolved"]) actionState?: string;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class MarkAllReadDto {
  @IsOptional() @IsIn(ADMIN_NOTIFICATION_CATEGORIES as unknown as string[]) category?: string;
}

export class AdminNotificationPreferencesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(ADMIN_NOTIFICATION_CATEGORIES as unknown as string[], { each: true })
  mutedCategories?: string[];

  @IsOptional() @IsBoolean() realtimeToasts?: boolean;
}
