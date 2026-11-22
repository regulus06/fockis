import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  UpdateSecurityPolicyDto,
} from "../dto/update-security-policy.dto";

import {
  OrganizationIdentityCommonService,
} from "./organization-identity-common.service";

import type {
  SecurityPolicyResponse,
} from "./organization-identity.service";

import {
  PlatformSecurityPolicyService,
  organizationUpdateProblems,
} from "../../admin/security/platform-security/platform-security-policy.service";

import {
  POLICY_FIELDS,
  POLICY_FIELD_MAP,
} from "../../admin/security/platform-security/security-policy.definitions";

// ============================================================================
// ORGANIZATION SECURITY POLICY
//
// Platform security is governed by the Fockis Admin Center. An organization
// administrator can only make the settings Fockis delegates *stricter* than
// the Fockis baseline for the organization's managed users. Every other
// setting is shown read-only ("Locked by Fockis").
// ============================================================================

/** Organization fields that map onto a platform setting with another key. */
const ALIASES: Record<string, string> = {
  lockoutAlerts: "notifyUserOnAccountLockout",
};

@Injectable()
export class OrganizationIdentitySecurityService {
  constructor(
    private readonly common: OrganizationIdentityCommonService,
    private readonly platformSecurity: PlatformSecurityPolicyService,
  ) {}

  // ==========================================================================
  // GET
  // ==========================================================================

  async getSecurityPolicy(
    organizationId: string,
    actorUserId: string,
  ): Promise<SecurityPolicyResponse> {
    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    // Make sure the organization has a stored policy document.
    const stored =
      await this.common.getOrCreateSecurityPolicy(
        organization._id,
      );

    return this.buildResponse(
      String(organization._id),
      stored,
    );
  }

  private async buildResponse(
    organizationId: string,
    stored: any,
  ): Promise<SecurityPolicyResponse> {
    const [resolved, platform] = await Promise.all([
      this.platformSecurity.getOrganizationPolicy(organizationId),
      this.platformSecurity.getPlatform(),
    ]);

    const base =
      this.common.toPolicyResponse(stored) as unknown as Record<string, unknown>;

    // Managed-identity settings: effective values.
    for (const [key, value] of Object.entries(resolved.values)) {
      if (key in base) base[key] = value;
    }

    // Settings only the platform controls: show the platform value.
    for (const key of Object.keys(base)) {
      const target = ALIASES[key] ?? key;
      const field = POLICY_FIELD_MAP.get(target);

      if (!field) continue;

      if (!field.profiles.includes("managed")) {
        base[key] = platform.accounts[target] ?? base[key];
      } else if (target !== key) {
        base[key] = resolved.values[target];
      }
    }

    return {
      ...(base as unknown as SecurityPolicyResponse),
      governance: {
        delegatedFields: resolved.delegatedFields,
        lockedFields: resolved.lockedFields,
        overriddenFields: resolved.overriddenFields,
        customized: resolved.customized,
        platformVersion: resolved.platformVersion,
        platformBaseline: platform.managed,
        fields: POLICY_FIELDS.filter((field) => field.profiles.includes("managed")),
      },
    };
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  async updateSecurityPolicy(
    organizationId: string,
    dto: UpdateSecurityPolicyDto,
    actorUserId: string,
  ): Promise<SecurityPolicyResponse> {
    const organization =
      await this.common.getOrganization(
        organizationId,
      );

    await this.common.requireAdministrator(
      organizationId,
      actorUserId,
    );

    const orgId = String(organization._id);

    const existingPolicy =
      await this.common.getOrCreateSecurityPolicy(
        organization._id,
      );

    const current =
      await this.buildResponse(orgId, existingPolicy);

    const platform =
      await this.platformSecurity.getPlatform();

    const resolved =
      await this.platformSecurity.getOrganizationPolicy(orgId);

    // ------------------------------------------------------------------------
    // Split the request: managed-identity settings vs. platform-only ones.
    // Older clients send every field; unchanged platform-only values are
    // ignored, changed ones are refused.
    // ------------------------------------------------------------------------

    const requested: Record<string, unknown> = {};
    const problems: string[] = [];

    for (const [rawKey, value] of Object.entries(dto ?? {})) {
      if (value === undefined) continue;

      const key = ALIASES[rawKey] ?? rawKey;
      const field = POLICY_FIELD_MAP.get(key);

      if (!field) continue;

      if (!field.profiles.includes("managed")) {
        if (value !== (current as any)[rawKey]) {
          problems.push(
            `"${field.label}" is managed by Fockis and cannot be changed by organizations.`,
          );
        }

        continue;
      }

      requested[key] = value;
    }

    problems.push(
      ...organizationUpdateProblems(platform, resolved.values, requested),
    );

    if (problems.length) {
      throw new BadRequestException({
        message: problems[0],
        errors: problems,
      });
    }

    // ------------------------------------------------------------------------
    // Only delegated settings are stored for the organization.
    // ------------------------------------------------------------------------

    const delegated = new Set(platform.delegatedFields);
    const update: Record<string, unknown> = {};
    const changes: Array<{ profile: "managed"; field: string; from: unknown; to: unknown }> = [];

    for (const [key, value] of Object.entries(requested)) {
      if (!delegated.has(key)) continue;

      if (value !== resolved.values[key]) {
        changes.push({
          profile: "managed",
          field: key,
          from: resolved.values[key],
          to: value,
        });
      }

      update[key] = value;
    }

    if (!Object.keys(update).length) {
      return current;
    }

    const policy =
      await this.common.securityPolicyModel
        .findOneAndUpdate(
          {
            _id:
              existingPolicy._id,

            organizationId:
              organization._id,
          } as any,
          {
            $set:
              update,
          },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

    if (!policy) {
      throw new NotFoundException(
        "Unable to save organization security policy.",
      );
    }

    // Change history, audit record and cache invalidation (all instances).
    // This also marks the policy as explicitly configured by the organization.
    await this.platformSecurity.recordOrganizationChange(
      orgId,
      changes,
      { id: actorUserId, name: "Organization administrator" },
    );

    return this.buildResponse(
      orgId,
      policy,
    );
  }
}
