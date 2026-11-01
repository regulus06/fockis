import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

/**
 * Staff role templates for Policy & Compliance, created once in admin_roles.
 * Ordinary admins can draft policies; approving, publishing and reading
 * acceptance records need one of these roles (or super admin).
 */
export const POLICY_ROLE_TEMPLATES = [
  {
    slug: "policy-editor",
    name: "Policy Editor",
    description: "Drafts policies and operational rules and submits them for approval.",
    permissions: ["policy.view", "policy.edit", "policy.rules.manage"],
  },
  {
    slug: "policy-approver",
    name: "Policy Approver",
    description: "Reviews, approves and publishes policies and operational rules.",
    permissions: ["policy.view", "policy.review", "policy.publish", "policy.audit.view"],
  },
  {
    slug: "compliance-officer",
    name: "Compliance Officer",
    description: "Acceptance records, privacy requests, policy audit log and policy settings.",
    permissions: ["policy.view", "policy.acceptance.view", "policy.audit.view", "policy.settings", "legal.view", "legal.retention.manage"],
  },
];

@Injectable()
export class PolicyRolesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(PolicyRolesSeeder.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onApplicationBootstrap() {
    const roles = this.connection.models["AdminRole"];
    if (!roles) return;
    for (const template of POLICY_ROLE_TEMPLATES) {
      try {
        await roles.updateOne({ slug: template.slug }, { $setOnInsert: { ...template, isActive: true, isSystemRole: true } }, { upsert: true }).exec();
      } catch (error) {
        this.logger.warn(`Could not create role ${template.slug}: ${String(error)}`);
      }
    }
  }
}
