import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

/**
 * Staff role templates for Help & Support, created once in the existing
 * custom admin roles (admin_roles). Super admins assign them to people
 * from Admin Center → Roles; editing or deactivating them later is kept.
 */
export const SUPPORT_ROLE_TEMPLATES = [
  {
    slug: "support-agent",
    name: "Support Agent",
    description: "Feedback inbox, support tickets and live chat. No moderation or evidence access.",
    permissions: ["support.view", "support.respond", "support.assign", "support.resolve"],
  },
  {
    slug: "read-only-staff",
    name: "Read-only Staff",
    description: "Can view support and moderation dashboards and records. Cannot take actions.",
    permissions: ["support.view", "moderation.view", "audit.view"],
  },
];

@Injectable()
export class SupportRolesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SupportRolesSeeder.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onApplicationBootstrap() {
    const roles = this.connection.models["AdminRole"];
    if (!roles) return;
    for (const template of SUPPORT_ROLE_TEMPLATES) {
      try {
        await roles
          .updateOne(
            { slug: template.slug },
            { $setOnInsert: { ...template, isActive: true, isSystemRole: true } },
            { upsert: true },
          )
          .exec();
      } catch (error) {
        this.logger.warn(`Could not create role ${template.slug}: ${String(error)}`);
      }
    }
  }
}
