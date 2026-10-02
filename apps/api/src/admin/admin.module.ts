import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

import { AdminDashboardController } from "./dashboard/admin-dashboard.controller";
import { AdminDashboardService } from "./dashboard/admin-dashboard.service";

import { AuditService } from "./audit/audit.service";
import {
  AuditLog,
  AuditLogSchema,
} from "./audit/audit-log.schema";

import { DbAdminController } from "./tools/db-admin.controller";
import { DbAdminService } from "./tools/db-admin.service";
import { MediaCleanupService } from "./tools/media.cleanup.service";

import { DestructiveGuard } from "./safety/destructive.guard";
import { SuperAdminGuard } from "./safety/super-admin.guard";

// ============================================================================
// MUSIC RULES
// ============================================================================

import { MusicRulesModule } from "./music-rules/music-rules.module";

// ============================================================================
// DOMAIN ADMINISTRATION
// ============================================================================

import { DomainAdminModule } from "./domains/domain-admin.module";

// ============================================================================
// ADMIN ROLES / RBAC
// ============================================================================

import { AdminRoleModule } from "./roles/admin-role.module";
import { UsersAdminModule } from "./users/users-admin.module";

// ============================================================================
// SECURITY / SESSION POLICIES
// ============================================================================

import { SessionPolicyModule } from "./security/session-policies/session-policy.module";

// ============================================================================
// USER / POST / COMMENT
// ============================================================================

import { User, UserSchema } from "../users/user.schema";

import { Post, PostSchema } from "../posts/post.schema";

import {
  Comment,
  CommentSchema,
} from "../comments/comment.schema";

@Module({
  imports: [
    // ========================================================================
    // ADMIN DATABASE MODELS
    // ========================================================================

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },

      {
        name: Post.name,
        schema: PostSchema,
      },

      {
        name: Comment.name,
        schema: CommentSchema,
      },

      {
        name: AuditLog.name,
        schema: AuditLogSchema,
      },
    ]),

    // ========================================================================
    // ADMIN RBAC / DYNAMIC ROLES
    // ========================================================================

    AdminRoleModule,

    // ========================================================================
    // MUSIC PLATFORM RULES
    // ========================================================================

    MusicRulesModule,

    // ========================================================================
    // DOMAIN ADMINISTRATION
    // ========================================================================

    DomainAdminModule,

    // ========================================================================
    // USER ADMINISTRATION
    // ========================================================================

    UsersAdminModule,

    // ========================================================================
    // SECURITY / SESSION POLICIES
    // ========================================================================

    SessionPolicyModule,
  ],

  // ========================================================================
  // ADMIN CONTROLLERS
  // ========================================================================

  controllers: [
    AdminController,
    AdminDashboardController,

    // Database administration
    DbAdminController,
  ],

  // ========================================================================
  // ADMIN SERVICES / GUARDS
  // ========================================================================

  providers: [
    AdminService,

    AdminDashboardService,

    AuditService,

    DbAdminService,

    MediaCleanupService,

    DestructiveGuard,

    SuperAdminGuard,
  ],
})
export class AdminModule {}