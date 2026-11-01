import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";
import type { Request } from "express";

import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { ModerationEventsService } from "../services/moderation-events.service";
import { PostModerationService } from "../services/post-moderation.service";
import type { Actor } from "../utils/actor";

type AuthenticatedRequest = Omit<Request, "user"> & { user: Actor };
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

class PostListQueryDto {
  @IsOptional()
  @IsIn(["visible", "hidden", "all"])
  status?: "visible" | "hidden" | "all";

  @IsOptional()
  @IsIn(["post", "wave", "reel", "story", "photo", "video"])
  type?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  escalated?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
}

class ReasonDto {
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: "Record a reason (at least 3 characters)." })
  @MaxLength(1000)
  reason!: string;
}

class PurgeDto extends ReasonDto {
  @IsString()
  confirm!: string;
}

class HistoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  action?: string;

  @IsOptional()
  @IsIn(["post", "account", "case"])
  targetType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;
}

/**
 * Admin Center → Support & Moderation: user posts across Fockis, Hidden
 * Posts and Moderation History. Permission-checked by RbacGuard; permanent
 * removal is additionally limited to super admins in the service.
 */
@Controller("admin/moderation")
@UseGuards(RbacGuard)
export class PostModerationAdminController {
  constructor(
    private readonly posts: PostModerationService,
    private readonly events: ModerationEventsService,
  ) {}

  @Get("posts")
  @Permissions(Permission.MODERATION_VIEW)
  list(@Query() query: PostListQueryDto) {
    return this.posts.list(query);
  }

  @Get("posts/:id")
  @Permissions(Permission.MODERATION_VIEW)
  one(@Param("id") id: string) {
    return this.posts.get(id);
  }

  @Post("posts/:id/hide")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_CONTENT_REMOVE)
  hide(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.posts.hide(req.user, id, dto.reason);
  }

  @Post("posts/:id/restore")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_RESTORE)
  restore(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.posts.restore(req.user, id, dto.reason);
  }

  @Post("posts/:id/warn")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_WARN)
  warn(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.posts.warn(req.user, id, dto.reason);
  }

  @Post("posts/:id/escalate")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_REVIEW)
  escalate(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.posts.escalate(req.user, id, dto.reason);
  }

  @Post("posts/:id/purge")
  @Permissions(Permission.MODERATION_VIEW, Permission.MODERATION_CONTENT_REMOVE)
  purge(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: PurgeDto) {
    return this.posts.purge(req.user, id, dto.reason, dto.confirm);
  }

  @Get("history")
  @Permissions(Permission.MODERATION_VIEW)
  history(@Query() query: HistoryQueryDto) {
    return this.events.list(query);
  }

  @Get("history/verify")
  @Permissions(Permission.MODERATION_VIEW)
  verify() {
    return this.events.verify();
  }
}
