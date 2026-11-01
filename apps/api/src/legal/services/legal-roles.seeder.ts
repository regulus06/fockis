import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

/**
 * "Legal / Compliance" staff role, created once in admin_roles. Ordinary
 * admins and moderators never get legal.* permissions; super admins assign
 * this role to named compliance staff.
 */
export const LEGAL_ROLE_TEMPLATE = {
  slug: "legal-compliance",
  name: "Legal / Compliance",
  description: "Legal requests, legal holds, evidence archive and exports, retention policies and evidence access logs.",
  permissions: [
    "legal.view",
    "legal.evidence.view",
    "legal.evidence.preserve",
    "legal.evidence.export",
    "legal.holds.manage",
    "legal.requests.manage",
    "legal.requests.approve",
    "legal.retention.manage",
    "legal.audit.view",
    "legal.deletions.view",
  ],
};

@Injectable()
export class LegalRolesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(LegalRolesSeeder.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onApplicationBootstrap() {
    const roles = this.connection.models["AdminRole"];
    if (!roles) return;
    try {
      await roles
        .updateOne({ slug: LEGAL_ROLE_TEMPLATE.slug }, { $setOnInsert: { ...LEGAL_ROLE_TEMPLATE, isActive: true, isSystemRole: true } }, { upsert: true })
        .exec();
    } catch (error) {
      this.logger.warn(`Could not create the Legal / Compliance role: ${String(error)}`);
    }
  }
}
