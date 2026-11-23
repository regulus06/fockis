import { EventEmitter2 } from "@nestjs/event-emitter";
import { ADMIN_NOTIFICATION_EVENT } from "../../notifications/admin-notification.types";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

import { RedisService } from "../../../redis/redis.service";

import {
  PlatformSecurityPolicy,
  PlatformSecurityPolicyDocument,
  SecurityPolicyRevision,
  SecurityPolicyRevisionDocument,
} from "./platform-security-policy.schema";

import {
  POLICY_FIELDS,
  POLICY_FIELD_MAP,
  PolicyFieldDefinition,
  PolicyProfile,
  PolicyValues,
  defaultDelegatedFields,
  defaultsFor,
  isWeaker,
  stricterValue,
  validateFieldValue,
} from "./security-policy.definitions";

import { SecurityEventsService } from "./security-events.service";

// ============================================================================
// TYPES
// ============================================================================

export interface ResolvedPlatformPolicy {
  accounts: PolicyValues;
  managed: PolicyValues;
  delegatedFields: string[];
  version: number;
  updatedAt: string | null;
  updatedByName: string;
  /** True when the database could not be read and secure defaults are used. */
  fallback: boolean;
}

export interface ResolvedOrganizationPolicy {
  organizationId: string;
  values: PolicyValues;
  delegatedFields: string[];
  lockedFields: string[];
  /** Fields where the organization's own value is in effect. */
  overriddenFields: string[];
  /** False when the organization never saved its own security settings. */
  customized: boolean;
  platformVersion: number;
}

export interface UserSecurityContext {
  organizationId: string;
  isOrganizationAdmin: boolean;
}

export interface EffectiveUserPolicy {
  values: PolicyValues;
  requiresTwoFactor: boolean;
  isManagedIdentity: boolean;
  organizations: UserSecurityContext[];
  platformVersion: number;
}

export interface PolicyActor {
  id: string | null;
  name: string;
  isSuperAdmin: boolean;
  permissions: string[];
}

export interface PolicyUpdateInput {
  expectedVersion?: number;
  accounts?: Record<string, unknown>;
  managed?: Record<string, unknown>;
  delegatedFields?: string[];
  reason?: string;
  confirmHighRisk?: boolean;
}

export interface PolicyChange {
  profile: PolicyProfile | "delegation";
  field: string;
  from: unknown;
  to: unknown;
}

export interface PolicyRisk {
  profile: PolicyProfile;
  field: string;
  label: string;
  note: string;
}

const CACHE_TTL_MS = 30_000;
const USER_CONTEXT_TTL_MS = 60_000;
const ORG_CACHE_TTL_MS = 60_000;
const INVALIDATION_CHANNEL = "fockis:security-policy";

/** Permissions that may edit each section. "security.manage" grants all. */
export const SECTION_EDIT_PERMISSIONS: Record<string, string> = {
  password: "security.policies.manage",
  login: "security.policies.manage",
  alerts: "security.policies.manage",
  protection: "security.policies.manage",
  auditing: "security.policies.manage",
  sessions: "security.sessions.manage",
  twoFactor: "security.mfa.manage",
};

export const ORG_DEFAULTS_PERMISSION = "security.org_defaults.manage";
export const SECURITY_MANAGE_ALL = "security.manage";

export function actorCan(actor: PolicyActor, permission: string): boolean {
  if (actor.isSuperAdmin) return true;

  const granted = new Set(actor.permissions.map((p) => p.toLowerCase()));

  return granted.has(permission) || granted.has(SECURITY_MANAGE_ALL);
}

// ============================================================================
// PURE HELPERS (unit-tested)
// ============================================================================

/**
 * Fill missing values with defaults, drop unknown fields, replace invalid
 * values with the secure default and pin locked/unavailable fields.
 */
export function normalizeProfile(
  profile: PolicyProfile,
  stored: Record<string, unknown> | null | undefined,
): PolicyValues {
  const defaults = defaultsFor(profile);
  const values: PolicyValues = {};

  for (const field of POLICY_FIELDS) {
    if (!field.profiles.includes(profile)) continue;

    const fallback = defaults[field.key];

    if (field.enforcement !== "enforced") {
      values[field.key] = fallback;
      continue;
    }

    const candidate = stored?.[field.key];

    values[field.key] =
      candidate !== undefined && validateFieldValue(field, candidate) === null
        ? (candidate as boolean | number)
        : fallback;
  }

  return values;
}

export function normalizeDelegation(stored: unknown): string[] {
  if (!Array.isArray(stored)) return defaultDelegatedFields();

  return Array.from(
    new Set(
      stored
        .map(String)
        .filter((key) => {
          const field = POLICY_FIELD_MAP.get(key);

          return Boolean(
            field && field.delegable && field.profiles.includes("managed"),
          );
        }),
    ),
  );
}

/**
 * Resolve an organization's effective managed-identity policy.
 *
 * - Non-delegated fields always use the platform baseline.
 * - Delegated fields use the organization's value only when it is at least as
 *   strict as the platform baseline.
 * - Organizations that never saved their own settings inherit the baseline
 *   (their stored values are only the old defaults).
 */
export function resolveOrganizationValues(
  platform: Pick<ResolvedPlatformPolicy, "managed" | "delegatedFields" | "version">,
  organizationId: string,
  stored: Record<string, unknown> | null,
): ResolvedOrganizationPolicy {
  const createdAt = stored?.createdAt ? new Date(String(stored.createdAt)).getTime() : 0;
  const updatedAt = stored?.updatedAt ? new Date(String(stored.updatedAt)).getTime() : 0;

  const customized =
    Boolean(stored) &&
    (Boolean(stored?.platformManagedAt) ||
      (createdAt > 0 && updatedAt - createdAt > 1000));

  const delegated = new Set(platform.delegatedFields);
  const values: PolicyValues = {};
  const lockedFields: string[] = [];
  const overriddenFields: string[] = [];

  for (const field of POLICY_FIELDS) {
    if (!field.profiles.includes("managed")) continue;

    const floor = platform.managed[field.key];

    if (!delegated.has(field.key)) {
      lockedFields.push(field.key);
      values[field.key] = floor;
      continue;
    }

    const candidate = stored?.[field.key];

    if (
      !customized ||
      candidate === undefined ||
      validateFieldValue(field, candidate) !== null ||
      isWeaker(field, candidate as boolean | number, floor)
    ) {
      values[field.key] = floor;
      continue;
    }

    values[field.key] = candidate as boolean | number;

    if (candidate !== floor) overriddenFields.push(field.key);
  }

  return {
    organizationId,
    values,
    delegatedFields: Array.from(delegated),
    lockedFields,
    overriddenFields,
    customized,
    platformVersion: platform.version,
  };
}

/**
 * Merge the platform account policy with every organization policy that
 * applies to the user. The strictest value of each field wins.
 */
export function mergeStrictest(
  base: PolicyValues,
  others: PolicyValues[],
): PolicyValues {
  const values: PolicyValues = { ...base };

  for (const other of others) {
    for (const field of POLICY_FIELDS) {
      if (!(field.key in other)) continue;

      const merged = stricterValue(field, values[field.key], other[field.key]);

      if (merged !== undefined) values[field.key] = merged;
    }
  }

  return values;
}

/**
 * Validate an organization's requested changes against the platform.
 * Returns a list of human-readable problems (empty when allowed).
 */
export function organizationUpdateProblems(
  platform: Pick<ResolvedPlatformPolicy, "managed" | "delegatedFields">,
  current: PolicyValues,
  requested: Record<string, unknown>,
): string[] {
  const problems: string[] = [];
  const delegated = new Set(platform.delegatedFields);

  for (const [key, value] of Object.entries(requested)) {
    if (value === undefined) continue;

    const field = POLICY_FIELD_MAP.get(key);

    if (!field || !field.profiles.includes("managed")) continue;

    const error = validateFieldValue(field, value);

    if (error) {
      problems.push(error);
      continue;
    }

    if (!delegated.has(key)) {
      if (value !== current[key]) {
        problems.push(
          `"${field.label}" is managed by Fockis and cannot be changed by organizations.`,
        );
      }

      continue;
    }

    const floor = platform.managed[key];

    if (isWeaker(field, value as boolean | number, floor)) {
      problems.push(
        `"${field.label}" cannot be weaker than the Fockis requirement (${String(
          floor,
        )}).`,
      );
    }
  }

  return problems;
}

/** Changes between two normalized profiles. */
export function diffProfile(
  profile: PolicyProfile,
  before: PolicyValues,
  after: PolicyValues,
): PolicyChange[] {
  const changes: PolicyChange[] = [];

  for (const key of Object.keys(after)) {
    if (before[key] !== after[key]) {
      changes.push({ profile, field: key, from: before[key], to: after[key] });
    }
  }

  return changes;
}

/** High-risk changes in a set of profile changes. */
export function highRiskChanges(changes: PolicyChange[]): PolicyRisk[] {
  const risks: PolicyRisk[] = [];

  for (const change of changes) {
    if (change.profile === "delegation") continue;

    const field = POLICY_FIELD_MAP.get(change.field);

    if (!field?.highRisk) continue;

    const from = change.from as boolean | number;
    const to = change.to as boolean | number;

    let risky = false;

    switch (field.highRisk) {
      case "enable":
        risky = to === true && from !== true;
        break;
      case "disable":
        risky = to === false && from !== false;
        break;
      case "decrease":
        risky =
          field.strictness === "lower_stricter_zero_off"
            ? Number(to) > 0 && (Number(from) === 0 || Number(to) < Number(from))
            : Number(to) < Number(from);
        break;
      case "increase":
        risky = Number(to) > Number(from);
        break;
      case "any":
        risky = true;
        break;
    }

    if (risky) {
      risks.push({
        profile: change.profile,
        field: field.key,
        label: field.label,
        note: field.riskNote ?? "This change can affect many users at once.",
      });
    }
  }

  return risks;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class PlatformSecurityPolicyService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PlatformSecurityPolicyService.name);

  private cached: ResolvedPlatformPolicy | null = null;
  private cachedAt = 0;
  private loading: Promise<ResolvedPlatformPolicy> | null = null;

  private readonly orgCache = new Map<
    string,
    { at: number; version: number; value: ResolvedOrganizationPolicy }
  >();

  private readonly userContextCache = new Map<
    string,
    { at: number; value: UserSecurityContext[] }
  >();

  private readonly onInvalidate = () => this.invalidateLocal();

  constructor(
    @InjectModel(PlatformSecurityPolicy.name)
    private readonly policyModel: Model<PlatformSecurityPolicyDocument>,

    @InjectModel(SecurityPolicyRevision.name)
    private readonly revisionModel: Model<SecurityPolicyRevisionDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    private readonly redis: RedisService,

    private readonly events: SecurityEventsService,

    private readonly emitter: EventEmitter2,
  ) {}

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  async onModuleInit(): Promise<void> {
    try {
      await this.ensurePolicyDocument();
      await this.reload();
    } catch (error) {
      this.logger.error(
        `Platform security policy could not be loaded; secure defaults are in use: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      this.redis.subscribe(INVALIDATION_CHANNEL, this.onInvalidate as any);
    } catch {
      // Redis is optional; the 30-second cache TTL still propagates changes.
    }
  }

  onModuleDestroy(): void {
    try {
      this.redis.unsubscribe(INVALIDATION_CHANNEL, this.onInvalidate as any);
    } catch {
      // ignore
    }
  }

  /**
   * Create the platform policy on first start. Initial values come from the
   * definitions (which match the behaviour Fockis had before this module).
   */
  private async ensurePolicyDocument(): Promise<void> {
    await this.policyModel
      .updateOne(
        { key: "platform" },
        {
          $setOnInsert: {
            key: "platform",
            accounts: defaultsFor("accounts"),
            managed: defaultsFor("managed"),
            delegatedFields: defaultDelegatedFields(),
            version: 1,
            updatedByName: "System (initial configuration)",
          },
        },
        { upsert: true },
      )
      .exec();
  }

  // ==========================================================================
  // CACHE
  // ==========================================================================

  invalidateLocal(): void {
    this.cachedAt = 0;
    this.orgCache.clear();
    this.userContextCache.clear();
  }

  /** Drop cached organization context for a user (e.g. after role changes). */
  invalidateUser(userId: string): void {
    this.userContextCache.delete(String(userId));
  }

  invalidateOrganization(organizationId: string): void {
    this.orgCache.delete(String(organizationId));
    this.userContextCache.clear();
  }

  async publishInvalidation(): Promise<void> {
    this.invalidateLocal();

    try {
      await this.redis.publish(INVALIDATION_CHANNEL, { at: Date.now() });
    } catch {
      // Other instances pick the change up within the cache TTL.
    }
  }

  private async reload(): Promise<ResolvedPlatformPolicy> {
    const doc = await this.policyModel.findOne({ key: "platform" }).lean().exec();

    const resolved: ResolvedPlatformPolicy = {
      accounts: normalizeProfile("accounts", doc?.accounts ?? null),
      managed: normalizeProfile("managed", doc?.managed ?? null),
      delegatedFields: normalizeDelegation(doc ? doc.delegatedFields : undefined),
      version: Number(doc?.version ?? 1),
      updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      updatedByName: String(doc?.updatedByName ?? ""),
      fallback: !doc,
    };

    this.cached = resolved;
    this.cachedAt = Date.now();

    return resolved;
  }

  /**
   * Current platform policy. Served from memory; refreshed every 30 seconds
   * and immediately when any API instance publishes a change.
   *
   * If MongoDB cannot be read, the last known policy is used; before the
   * first successful read, secure defaults are used.
   */
  async getPlatform(): Promise<ResolvedPlatformPolicy> {
    if (this.cached && Date.now() - this.cachedAt < CACHE_TTL_MS) {
      return this.cached;
    }

    if (!this.loading) {
      this.loading = this.reload()
        .catch((error) => {
          this.logger.warn(
            `Security policy refresh failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );

          if (this.cached) {
            this.cachedAt = Date.now() - CACHE_TTL_MS + 5_000;
            return this.cached;
          }

          return {
            accounts: defaultsFor("accounts"),
            managed: defaultsFor("managed"),
            delegatedFields: defaultDelegatedFields(),
            version: 0,
            updatedAt: null,
            updatedByName: "",
            fallback: true,
          };
        })
        .finally(() => {
          this.loading = null;
        });
    }

    return this.loading;
  }

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  async getOrganizationPolicy(
    organizationId: string,
  ): Promise<ResolvedOrganizationPolicy> {
    const platform = await this.getPlatform();
    const key = String(organizationId);

    const hit = this.orgCache.get(key);

    if (
      hit &&
      hit.version === platform.version &&
      Date.now() - hit.at < ORG_CACHE_TTL_MS
    ) {
      return hit.value;
    }

    let stored: Record<string, unknown> | null = null;

    if (Types.ObjectId.isValid(key)) {
      stored = (await this.connection
        .collection("organization_security_policies")
        .findOne({ organizationId: new Types.ObjectId(key) })) as Record<
        string,
        unknown
      > | null;
    }

    const value = resolveOrganizationValues(platform, key, stored);

    this.orgCache.set(key, { at: Date.now(), version: platform.version, value });

    return value;
  }

  /**
   * Organizations (with role) in which the user has a managed identity.
   */
  async getUserContext(userId: string): Promise<UserSecurityContext[]> {
    const key = String(userId);
    const hit = this.userContextCache.get(key);

    if (hit && Date.now() - hit.at < USER_CONTEXT_TTL_MS) return hit.value;

    if (!Types.ObjectId.isValid(key)) return [];

    const identities = await this.connection
      .collection("organization_identities")
      .find(
        {
          userId: new Types.ObjectId(key),
          status: { $ne: "disabled" },
        },
        { projection: { organizationId: 1, role: 1 } },
      )
      .limit(20)
      .toArray();

    const value = identities
      .filter((identity) => identity.organizationId)
      .map((identity) => {
        const role = String(identity.role ?? "").toLowerCase();

        return {
          organizationId: String(identity.organizationId),
          isOrganizationAdmin:
            role === "owner" || role === "admin" || role === "administrator",
        };
      });

    if (this.userContextCache.size > 5000) this.userContextCache.clear();

    this.userContextCache.set(key, { at: Date.now(), value });

    return value;
  }

  /**
   * The policy that applies to one user: platform account policy plus every
   * organization policy for the user's managed identities (strictest wins).
   */
  async getEffectiveForUser(user: {
    _id?: unknown;
    id?: unknown;
    role?: unknown;
    isSuperAdmin?: unknown;
    mfaRequired?: unknown;
  }): Promise<EffectiveUserPolicy> {
    const platform = await this.getPlatform();
    const userId = String(user._id ?? user.id ?? "");

    let organizations: UserSecurityContext[] = [];

    try {
      organizations = await this.getUserContext(userId);
    } catch (error) {
      this.logger.warn(
        `Organization security context unavailable for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const orgPolicies = await Promise.all(
      organizations.map((org) => this.getOrganizationPolicy(org.organizationId)),
    );

    const values = mergeStrictest(
      platform.accounts,
      orgPolicies.map((policy) => policy.values),
    );

    const role = String(user.role ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const isPlatformAdmin =
      role === "admin" ||
      role === "super_admin" ||
      role === "superadmin" ||
      user.isSuperAdmin === true;

    const orgAdminRequires = organizations.some(
      (org, index) =>
        org.isOrganizationAdmin &&
        orgPolicies[index]?.values.requireTwoFactorForAdministrators === true,
    );

    const requiresTwoFactor =
      Boolean(user.mfaRequired) ||
      values.requireTwoFactor === true ||
      (isPlatformAdmin &&
        platform.accounts.requireTwoFactorForAdministrators === true) ||
      orgAdminRequires;

    return {
      values,
      requiresTwoFactor,
      isManagedIdentity: organizations.length > 0,
      organizations,
      platformVersion: platform.version,
    };
  }

  // ==========================================================================
  // ADMIN VIEW
  // ==========================================================================

  async getAdminView() {
    const platform = await this.getPlatform();

    return {
      policy: platform,
      fields: POLICY_FIELDS,
    };
  }

  async getHistory(scope: string | undefined, page = 1, pageSize = 20) {
    const filter: Record<string, any> = {};

    if (scope) filter.scope = scope;

    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(100, Math.max(5, Math.floor(pageSize)));

    const [items, total] = await Promise.all([
      this.revisionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeSize)
        .limit(safeSize)
        .lean()
        .exec(),
      this.revisionModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item: any) => ({
        id: String(item._id),
        scope: item.scope,
        organizationId: item.organizationId ? String(item.organizationId) : null,
        version: item.version,
        changes: item.changes,
        actorId: item.actorId ? String(item.actorId) : null,
        actorName: item.actorName,
        reason: item.reason,
        highRisk: Boolean(item.highRisk),
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      })),
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Validate a requested change without saving it. Returns the normalized
   * next policy, the change list and any high-risk changes.
   */
  async planUpdate(input: PolicyUpdateInput, actor: PolicyActor) {
    const current = await this.reload();

    const errors: string[] = [];
    const forbidden: string[] = [];

    const nextAccounts = { ...current.accounts };
    const nextManaged = { ...current.managed };

    const apply = (
      profile: PolicyProfile,
      target: PolicyValues,
      requested: Record<string, unknown> | undefined,
    ) => {
      if (!requested || typeof requested !== "object") return;

      for (const [key, value] of Object.entries(requested)) {
        const field = POLICY_FIELD_MAP.get(key);

        if (!field || !field.profiles.includes(profile)) {
          errors.push(`Unknown setting "${key}" for ${profile}.`);
          continue;
        }

        if (value === target[key]) continue;

        if (field.enforcement !== "enforced") {
          errors.push(
            `"${field.label}" cannot be changed: ${field.enforcementNote}`,
          );
          continue;
        }

        const error = validateFieldValue(field, value);

        if (error) {
          errors.push(error);
          continue;
        }

        const permission =
          profile === "managed"
            ? ORG_DEFAULTS_PERMISSION
            : SECTION_EDIT_PERMISSIONS[field.section];

        if (!actorCan(actor, permission)) {
          forbidden.push(`${field.label} (${permission})`);
          continue;
        }

        target[key] = value as boolean | number;
      }
    };

    apply("accounts", nextAccounts, input.accounts);
    apply("managed", nextManaged, input.managed);

    // Monitoring thresholds must rise: warning < high risk < critical.
    {
      const warn = Number(nextAccounts.loginWarningThreshold);
      const high = Number(nextAccounts.loginHighRiskThreshold);
      const critical = Number(nextAccounts.loginCriticalThreshold);

      if (Number.isFinite(warn) && Number.isFinite(high) && Number.isFinite(critical)) {
        if (!(warn < high && high < critical)) {
          errors.push(
            "Monitoring thresholds must increase: warning < high risk < critical.",
          );
        }
      }
    }

    let nextDelegation = current.delegatedFields;

    if (Array.isArray(input.delegatedFields)) {
      const invalid = input.delegatedFields.filter((key) => {
        const field = POLICY_FIELD_MAP.get(String(key));

        return !field || !field.delegable || !field.profiles.includes("managed");
      });

      if (invalid.length) {
        errors.push(
          `These settings cannot be delegated to organizations: ${invalid.join(", ")}.`,
        );
      } else {
        const requested = normalizeDelegation(input.delegatedFields);
        const changed =
          requested.length !== current.delegatedFields.length ||
          requested.some((key) => !current.delegatedFields.includes(key));

        if (changed) {
          if (!actorCan(actor, ORG_DEFAULTS_PERMISSION)) {
            forbidden.push(`Organization delegation (${ORG_DEFAULTS_PERMISSION})`);
          } else {
            nextDelegation = requested;
          }
        }
      }
    }

    const changes: PolicyChange[] = [
      ...diffProfile("accounts", current.accounts, nextAccounts),
      ...diffProfile("managed", current.managed, nextManaged),
    ];

    const removed = current.delegatedFields.filter((key) => !nextDelegation.includes(key));
    const added = nextDelegation.filter((key) => !current.delegatedFields.includes(key));

    for (const key of added) {
      changes.push({ profile: "delegation", field: key, from: false, to: true });
    }

    for (const key of removed) {
      changes.push({ profile: "delegation", field: key, from: true, to: false });
    }

    return {
      current,
      next: {
        accounts: nextAccounts,
        managed: nextManaged,
        delegatedFields: nextDelegation,
      },
      changes,
      risks: highRiskChanges(changes),
      errors,
      forbidden,
    };
  }

  /**
   * Estimate how many accounts a set of high-risk changes affects, using
   * current data. Used by the confirmation dialog.
   */
  async estimateImpact(risks: PolicyRisk[], next: { accounts: PolicyValues; managed: PolicyValues }) {
    const users = this.connection.collection("users");
    const impact: Array<{ field: string; profile: string; label: string; affectedAccounts: number | null; note: string }> = [];

    let managedIds: Types.ObjectId[] | null = null;

    const managedFilter = async (): Promise<Record<string, any>> => {
      if (!managedIds) {
        const ids = await this.connection
          .collection("organization_identities")
          .distinct("userId", { status: { $ne: "disabled" } });

        managedIds = ids.filter(Boolean).slice(0, 50_000) as Types.ObjectId[];
      }

      return { _id: { $in: managedIds } };
    };

    for (const risk of risks) {
      const profileValues = risk.profile === "accounts" ? next.accounts : next.managed;
      const scope = risk.profile === "managed" ? await managedFilter() : {};
      const active = { isActive: { $ne: false }, ...scope };

      let count: number | null = null;

      try {
        switch (risk.field) {
          case "requireTwoFactor":
            count = await users.countDocuments({ ...active, mfaEnabled: { $ne: true } });
            break;

          case "requireTwoFactorForAdministrators":
            count =
              risk.profile === "accounts"
                ? await users.countDocuments({
                    ...active,
                    role: { $in: ["admin", "super_admin", "superadmin"] },
                  })
                : null;
            break;

          case "passwordExpirationEnabled": {
            const days = Number(profileValues.passwordExpirationDays || 90);
            const cutoff = new Date(Date.now() - days * 86_400_000);

            count = await users.countDocuments({
              ...active,
              $or: [
                { passwordChangedAt: { $lt: cutoff } },
                { passwordChangedAt: null, createdAt: { $lt: cutoff } },
              ],
            });
            break;
          }

          case "inactivityTimeoutMinutes": {
            const minutes = Number(profileValues.inactivityTimeoutMinutes || 0);
            const cutoff = new Date(Date.now() - minutes * 60_000);
            const recent = new Date(Date.now() - 7 * 86_400_000);

            count = await users.countDocuments({
              ...active,
              lastActiveAt: { $lt: cutoff, $gte: recent },
            });
            break;
          }

          case "maximumSessionHours": {
            const hours = Number(profileValues.maximumSessionHours || 0);
            const cutoff = new Date(Date.now() - hours * 3_600_000);
            const recent = new Date(Date.now() - 7 * 86_400_000);

            count = await users.countDocuments({
              ...active,
              lastLoginAt: { $lt: cutoff },
              lastActiveAt: { $gte: recent },
            });
            break;
          }

          case "allowRecoveryCodes":
            count = await users.countDocuments({ ...active, mfaEnabled: true });
            break;

          default:
            count = await users.countDocuments(active);
        }
      } catch {
        count = null;
      }

      impact.push({
        field: risk.field,
        profile: risk.profile,
        label: risk.label,
        affectedAccounts: count,
        note: risk.note,
      });
    }

    return impact;
  }

  async applyUpdate(
    input: PolicyUpdateInput,
    actor: PolicyActor,
    options: { reauthenticated: boolean; ip?: string | null; userAgent?: string | null },
  ) {
    const plan = await this.planUpdate(input, actor);

    if (plan.errors.length) {
      throw new BadRequestException({
        message: "Some settings are invalid.",
        errors: plan.errors,
      });
    }

    if (plan.forbidden.length) {
      await this.events.record({
        action: "security.policy.update_denied",
        outcome: "denied",
        severity: "medium",
        actorId: actor.id,
        actorName: actor.name,
        targetType: "policy",
        targetId: "platform",
        ip: options.ip,
        userAgent: options.userAgent,
        metadata: { forbidden: plan.forbidden },
      });

      throw new BadRequestException({
        message: "You do not have permission to change some of these settings.",
        forbidden: plan.forbidden,
      });
    }

    if (!plan.changes.length) {
      return { policy: plan.current, changes: [], version: plan.current.version };
    }

    if (
      typeof input.expectedVersion === "number" &&
      input.expectedVersion !== plan.current.version
    ) {
      throw new ConflictException(
        "The security policy was changed by someone else. Reload to see the latest values.",
      );
    }

    if (plan.risks.length) {
      if (!input.confirmHighRisk) {
        throw new BadRequestException({
          code: "HIGH_RISK_CONFIRMATION_REQUIRED",
          message: "These changes need explicit confirmation.",
          risks: plan.risks,
        });
      }

      if (!options.reauthenticated) {
        throw new BadRequestException({
          code: "REAUTH_REQUIRED",
          message: "Confirm your password to apply high-risk security changes.",
        });
      }
    }

    const reason = String(input.reason ?? "").trim().slice(0, 500);

    const updated = await this.policyModel
      .findOneAndUpdate(
        { key: "platform", version: plan.current.version },
        {
          $set: {
            accounts: plan.next.accounts,
            managed: plan.next.managed,
            delegatedFields: plan.next.delegatedFields,
            updatedBy:
              actor.id && Types.ObjectId.isValid(actor.id)
                ? new Types.ObjectId(actor.id)
                : null,
            updatedByName: actor.name,
          },
          $inc: { version: 1 },
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new ConflictException(
        "The security policy was changed by someone else. Reload and try again.",
      );
    }

    await this.revisionModel.create({
      scope: "platform",
      organizationId: null,
      version: Number(updated.version),
      changes: plan.changes,
      actorId:
        actor.id && Types.ObjectId.isValid(actor.id)
          ? new Types.ObjectId(actor.id)
          : null,
      actorName: actor.name,
      reason,
      highRisk: plan.risks.length > 0,
    });

    await this.events.record({
      action: "security.policy.updated",
      outcome: "success",
      severity: plan.risks.length ? "high" : "medium",
      actorId: actor.id,
      actorName: actor.name,
      targetType: "policy",
      targetId: "platform",
      ip: options.ip,
      userAgent: options.userAgent,
      metadata: {
        version: updated.version,
        changes: plan.changes,
        highRisk: plan.risks.map((risk) => `${risk.profile}.${risk.field}`),
        reason,
      },
    });

    if (plan.risks.length) {
      const labels = plan.risks
        .map((risk) => POLICY_FIELD_MAP.get(risk.field)?.label ?? risk.field)
        .slice(0, 5)
        .join(", ");

      this.emitter.emit(ADMIN_NOTIFICATION_EVENT, {
        type: "security.policy_high_risk_change",
        category: "security",
        priority: "high",
        title: "High-risk security policy change",
        message: `${actor.name} changed: ${labels} (version ${updated.version}).`,
        groupKey: `security_policy:v${updated.version}`,
        entityType: "security_policy",
        entityId: `v${updated.version}`,
        link: "/admin/security/audit",
        requiredPermissions: ["security.manage", "security.policies.manage"],
        actionRequired: false,
        excludeUserIds: actor.id ? [actor.id] : [],
        metadata: { version: Number(updated.version), changes: plan.risks.length },
      });
    }

    await this.publishInvalidation();

    const policy = await this.reload();

    return { policy, changes: plan.changes, version: policy.version };
  }

  // ==========================================================================
  // ORGANIZATION POLICY CHANGES
  // ==========================================================================

  /**
   * Record an organization's change in the shared change history and audit
   * log, then drop cached values.
   */
  async recordOrganizationChange(
    organizationId: string,
    changes: PolicyChange[],
    actor: { id: string | null; name: string },
  ): Promise<void> {
    if (!changes.length) return;

    const doc = await this.connection
      .collection("organization_security_policies")
      .findOneAndUpdate(
        { organizationId: new Types.ObjectId(organizationId) },
        { $inc: { policyVersion: 1 }, $set: { platformManagedAt: new Date() } },
        { returnDocument: "after" },
      );

    const version = Number(((doc as any)?.value ?? doc)?.policyVersion ?? 1);

    await this.revisionModel.create({
      scope: "organization",
      organizationId: new Types.ObjectId(organizationId),
      version,
      changes,
      actorId: actor.id && Types.ObjectId.isValid(actor.id) ? new Types.ObjectId(actor.id) : null,
      actorName: actor.name,
      reason: "",
      highRisk: false,
    });

    await this.events.record({
      action: "security.organization_policy.updated",
      outcome: "success",
      severity: "medium",
      actorId: actor.id,
      actorName: actor.name,
      targetType: "organization",
      targetId: organizationId,
      organizationId,
      metadata: { changes, version },
    });

    this.invalidateOrganization(organizationId);

    try {
      await this.redis.publish(INVALIDATION_CHANNEL, { organizationId });
    } catch {
      // ignore
    }
  }

  /** Field definition helper for other services. */
  field(key: string): PolicyFieldDefinition | undefined {
    return POLICY_FIELD_MAP.get(key);
  }
}
