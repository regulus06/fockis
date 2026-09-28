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
    //
    // Provides:
    //
    //   GET    /admin/roles
    //   GET    /admin/roles/permissions
    //   GET    /admin/roles/:id
    //   POST   /admin/roles
    //   PATCH  /admin/roles/:id
    //   DELETE /admin/roles/:id
    //
    // Roles are stored in MongoDB instead of being hard-coded.
    //
    AdminRoleModule,

    // ========================================================================
    // MUSIC PLATFORM RULES
    // ========================================================================

    MusicRulesModule,

    // ========================================================================
    // DOMAIN ADMINISTRATION
    // ========================================================================
    //
    // Handles:
    //
    //   GET    /admin/domains
    //   GET    /admin/domains/overview
    //   GET    /admin/domains/stats
    //   GET    /admin/domains/policy
    //   PATCH  /admin/domains/policy
    //
    //   GET    /admin/domains/campaigns
    //   POST   /admin/domains/campaigns
    //   PATCH  /admin/domains/campaigns/:id
    //   POST   /admin/domains/campaigns/:id/pause
    //   POST   /admin/domains/campaigns/:id/activate
    //   DELETE /admin/domains/campaigns/:id
    //
    //   GET    /admin/domains/authorizations
    //   POST   /admin/domains/authorizations
    //   DELETE /admin/domains/authorizations/:id
    //
    //   POST   /admin/domains/:id/assign-free
    //   POST   /admin/domains/:id/suspend
    //   POST   /admin/domains/:id/activate
    //
    DomainAdminModule,

    // Complete Users Admin module. All /admin/users routes live here.
    UsersAdminModule,
  ],

  // ========================================================================
  // ADMIN CONTROLLERS
  // ========================================================================

  controllers: [
    AdminController,
    AdminDashboardController,
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