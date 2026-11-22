/**
 * admin-center.service.ts
 * -----------------------------------------------------------------------------
 * Settings & Roles (Organization Administration Center).
 *
 * Reuses the existing services for everything they already own — and their
 * rules:
 *   - name / type            OrganizationsService.update        (UpdateOrganization)
 *   - discoverable           OrganizationsService.updateSettings
 *   - status                 OrganizationsService.updateStatus
 *   - roles                  MembersService.updateRole          (no self-promotion,
 *                                                                one admin kept…)
 *   - permissions            MembersService.updateMembershipPermissions
 *                            (ManagePermissions, no self-grant, dangerous
 *                            permissions owner-only)
 *   - online giving on/off   ChurchGivingService.saveSettings
 *
 * Adds only what didn't exist: preferences (time zone, language, formats,
 * currencies, notifications, public switches), the audit log, exchange-rate
 * snapshots and ownership transfer. Every change made here is audited.
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { Membership, MembershipDocument } from '../members/schemas/membership.schema';
import { MembersService } from '../members/services/members.service';
import { OrganizationsService } from '../organizations/services/organizations.service';
import { ChurchPermission } from '../enums/permission.enum';
import { MemberRole } from '../enums/member-role.enum';
import { MembershipStatus } from '../enums/membership-status.enum';
import { OrganizationStatus } from '../enums/organization-status.enum';
import { ExchangeRateService } from '../../payments/services/exchange-rate.service';
import { ChurchGivingService } from '../giving/church-giving.service';
import {
  NOTIFICATION_KEYS,
  OrganizationAuditLog,
  OrganizationAuditLogDocument,
  OrganizationPreferences,
  OrganizationPreferencesDocument,
} from './admin-center.schemas';

type Lean = Record<string, any>;

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D MMM YYYY'];
const TIME_FORMATS = ['24h', '12h'];
const TEAM_ROLES: string[] = [MemberRole.Administrator, MemberRole.PastorDirector, MemberRole.Leader, MemberRole.DepartmentManager, MemberRole.GroupLeader];
const ALL_ROLES: string[] = Object.values(MemberRole);
const ALL_PERMISSIONS = new Set<string>(Object.values(ChurchPermission));
const AUDIT_CATEGORIES = ['settings', 'team', 'permissions', 'security', 'finance', 'profile', 'organization'];

// Maintained lists from the runtime (ICU): every valid ISO 4217 currency and IANA time zone.
const supported = (key: 'currency' | 'timeZone'): Set<string> => {
  try {
    return new Set((Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf(key));
  } catch {
    return new Set();
  }
};
const CURRENCIES = supported('currency');
const TIME_ZONES = supported('timeZone');

const isCurrency = (c: string) => /^[A-Z]{3}$/.test(c) && (CURRENCIES.size === 0 || CURRENCIES.has(c));
const isTimeZone = (z: string) => {
  if (!z) return false;
  if (TIME_ZONES.has(z)) return true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: z });
    return true;
  } catch {
    return false;
  }
};
const isLanguage = (l: string) => {
  try {
    return Intl.getCanonicalLocales(l).length === 1 && l.length <= 20;
  } catch {
    return false;
  }
};

/** Suggestions from the main location's country, used until preferences are saved. */
const COUNTRY_DEFAULTS: Record<string, { currency: string; accepted: string[]; timeZone: string; language: string }> = {
  haiti: { currency: 'HTG', accepted: ['HTG', 'USD', 'EUR'], timeZone: 'America/Port-au-Prince', language: 'fr' },
  ht: { currency: 'HTG', accepted: ['HTG', 'USD', 'EUR'], timeZone: 'America/Port-au-Prince', language: 'fr' },
  'dominican republic': { currency: 'DOP', accepted: ['DOP', 'USD'], timeZone: 'America/Santo_Domingo', language: 'es' },
  'république dominicaine': { currency: 'DOP', accepted: ['DOP', 'USD'], timeZone: 'America/Santo_Domingo', language: 'es' },
  do: { currency: 'DOP', accepted: ['DOP', 'USD'], timeZone: 'America/Santo_Domingo', language: 'es' },
  canada: { currency: 'CAD', accepted: ['CAD', 'USD'], timeZone: 'America/Toronto', language: 'en' },
  france: { currency: 'EUR', accepted: ['EUR'], timeZone: 'Europe/Paris', language: 'fr' },
  'united states': { currency: 'USD', accepted: ['USD'], timeZone: 'America/New_York', language: 'en' },
  usa: { currency: 'USD', accepted: ['USD'], timeZone: 'America/New_York', language: 'en' },
  us: { currency: 'USD', accepted: ['USD'], timeZone: 'America/New_York', language: 'en' },
};

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? new Date(String(d)).toISOString() : null);
const sameId = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);
const pick = (o: Lean | null | undefined, keys: string[]) => {
  const out: Lean = {};
  for (const k of keys) if (o && o[k] !== undefined) out[k] = o[k];
  return out;
};
/** Only the keys whose values changed. */
function diff(before: Lean, after: Lean) {
  const b: Lean = {};
  const a: Lean = {};
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  return Object.keys(a).length ? { before: b, after: a } : null;
}

@Injectable()
export class AdminCenterService {
  private readonly logger = new Logger('AdminCenter');
  private readonly rateCache = new Map<string, { rate: number; fetchedAt: Date }>();

  constructor(
    @InjectModel(OrganizationPreferences.name) private readonly prefsModel: Model<OrganizationPreferencesDocument>,
    @InjectModel(OrganizationAuditLog.name) private readonly auditModel: Model<OrganizationAuditLogDocument>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<OrganizationDocument>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly members: MembersService,
    private readonly organizations: OrganizationsService,
    private readonly exchangeRates: ExchangeRateService,
    private readonly giving: ChurchGivingService,
  ) {}

  /* ======================================================================
     Helpers
     ====================================================================== */

  private oid(v: unknown, label: string) {
    const s = String(v ?? '');
    if (!/^[a-f0-9]{24}$/i.test(s)) throw new BadRequestException(`${label} is not valid.`);
    return new Types.ObjectId(s);
  }

  private async org(organizationId: string): Promise<Lean> {
    const o = (await this.organizationModel
      .findById(this.oid(organizationId, 'Organization ID'))
      .select('name organizationType status isDiscoverable requireApproval createdByUserId domain logoUrl')
      .lean()
      .exec()) as Lean | null;
    if (!o) throw new NotFoundException('Organization not found.');
    return o;
  }

  private async can(organizationId: string, userId: string, permission: ChurchPermission) {
    return this.members.hasPermission(organizationId, userId, permission);
  }

  private async require(organizationId: string, userId: string, permission: ChurchPermission, message: string) {
    if (!(await this.can(organizationId, userId, permission))) throw new ForbiddenException(message);
  }

  async access(organizationId: string, userId: string) {
    const [isOwner, isAdmin, settings, profile, administrators, permissions, archive, del] = await Promise.all([
      this.members.isOrganizationOwner(organizationId, userId),
      this.members.isAdmin(organizationId, userId),
      this.can(organizationId, userId, ChurchPermission.ManageSettings),
      this.can(organizationId, userId, ChurchPermission.UpdateOrganization),
      this.can(organizationId, userId, ChurchPermission.ManageAdministrators),
      this.can(organizationId, userId, ChurchPermission.ManagePermissions),
      this.can(organizationId, userId, ChurchPermission.ArchiveOrganization),
      this.can(organizationId, userId, ChurchPermission.DeleteOrganization),
    ]);
    return {
      isOwner,
      isAdmin: isAdmin || isOwner,
      canEditSettings: settings,
      canEditProfile: profile,
      canManageTeam: administrators || permissions,
      canManagePermissions: permissions,
      canViewAudit: settings || isOwner,
      canArchive: archive,
      canDelete: del,
    };
  }

  private async requireAdmin(organizationId: string, userId: string) {
    const a = await this.access(organizationId, userId);
    if (!a.isAdmin) throw new ForbiddenException('Only organization administrators can open Settings & Roles.');
    return a;
  }

  private async userName(userId: string): Promise<string> {
    const User = this.connection.models['User'];
    if (!User || !Types.ObjectId.isValid(userId)) return '';
    const u = (await User.findById(userId).select('name fullName username displayName').lean().exec()) as Lean | null;
    return String(u?.name || u?.fullName || u?.displayName || u?.username || '');
  }

  private async actorName(organizationId: string, userId: string) {
    const m = (await this.members.getMembershipOrNull(organizationId, userId)) as unknown as Lean | null;
    return String(m?.profile?.displayName || '') || (await this.userName(userId));
  }

  /** Append one audit entry. Never throws (an audit failure must not undo the change). */
  async audit(organizationId: string, actorUserId: string | null, entry: { action: string; category: string; targetType?: string; targetId?: string; targetLabel?: string; before?: Lean | null; after?: Lean | null; details?: string }) {
    try {
      await this.auditModel.create({
        organizationId: new Types.ObjectId(organizationId),
        actorUserId: actorUserId && Types.ObjectId.isValid(actorUserId) ? new Types.ObjectId(actorUserId) : null,
        actorName: actorUserId ? await this.actorName(organizationId, actorUserId) : 'System',
        action: entry.action,
        category: entry.category,
        targetType: entry.targetType ?? '',
        targetId: entry.targetId ?? '',
        targetLabel: (entry.targetLabel ?? '').slice(0, 200),
        before: entry.before ?? null,
        after: entry.after ?? null,
        details: (entry.details ?? '').slice(0, 500),
      });
    } catch (err) {
      this.logger.error(`Audit entry not written (${entry.action}): ${String(err)}`);
    }
  }

  /* ======================================================================
     Preferences
     ====================================================================== */

  private async mainCountry(orgId: Types.ObjectId): Promise<string> {
    const Branch = this.connection.models['Branch'];
    if (!Branch) return '';
    const b = (await Branch.findOne({ organizationId: orgId }).sort({ isMainLocation: -1 }).select('address').lean().exec()) as Lean | null;
    return String(b?.address?.countryCode || b?.address?.country || '').trim().toLowerCase();
  }

  private async preferences(orgId: Types.ObjectId) {
    const found = (await this.prefsModel.findOne({ organizationId: orgId }).lean().exec()) as Lean | null;
    // A record created only by the Events catalog (event types, locations…) is not saved settings yet.
    const doc = found && found.catalogOnly === true ? null : found;
    const suggestion = doc ? null : COUNTRY_DEFAULTS[await this.mainCountry(orgId)] ?? null;
    const currency = doc?.currency ?? {};
    const def = currency.defaultCurrency || suggestion?.currency || 'USD';
    const accepted: string[] = currency.acceptedCurrencies?.length ? currency.acceptedCurrencies : (suggestion?.accepted ?? [def]);
    return {
      saved: Boolean(doc),
      suggested: !doc && Boolean(suggestion),
      timeZone: doc?.timeZone || suggestion?.timeZone || '',
      language: doc?.language || suggestion?.language || 'en',
      dateFormat: doc?.dateFormat || 'DD/MM/YYYY',
      timeFormat: doc?.timeFormat || '24h',
      currency: {
        defaultCurrency: def,
        acceptedCurrencies: accepted.includes(def) ? accepted : [def, ...accepted],
        multiCurrency: doc ? Boolean(currency.multiCurrency) : accepted.length > 1,
        showConverted: currency.showConverted !== false,
      },
      exchangeRates: doc?.exchangeRates
        ? { base: doc.exchangeRates.base, rates: doc.exchangeRates.rates ?? {}, fetchedAt: iso(doc.exchangeRates.fetchedAt), provider: doc.exchangeRates.provider ?? '' }
        : null,
      allowMembershipRequests: doc ? doc.allowMembershipRequests !== false : true,
      showLocationsPublicly: doc ? doc.showLocationsPublicly !== false : true,
      publicEvents: doc ? doc.publicEvents !== false : true,
      memberDirectory: doc ? doc.memberDirectory !== false : true,
      notifications: Object.fromEntries(NOTIFICATION_KEYS.map((k) => [k, doc?.notifications?.[k] !== false])) as Record<string, boolean>,
      updatedAt: iso(doc?.updatedAt),
    };
  }

  /** Public switches the website needs (no private data). */
  async publicSettings(organizationId: string) {
    const org = await this.org(organizationId);
    const p = await this.preferences(org._id);
    return {
      allowMembershipRequests: p.allowMembershipRequests,
      showLocationsPublicly: p.showLocationsPublicly,
      publicEvents: p.publicEvents,
      memberDirectory: p.memberDirectory,
      defaultCurrency: p.currency.defaultCurrency,
      timeZone: p.timeZone,
      language: p.language,
    };
  }

  /** Used by the join endpoint: "Allow membership requests" off blocks new requests. */
  async assertJoinAllowed(organizationId: string) {
    if (!Types.ObjectId.isValid(organizationId)) return;
    const doc = (await this.prefsModel.findOne({ organizationId: new Types.ObjectId(organizationId) }).select('allowMembershipRequests').lean().exec()) as Lean | null;
    if (doc && doc.allowMembershipRequests === false) throw new ForbiddenException('This organization is not accepting membership requests right now.');
  }

  async overview(organizationId: string, userId: string) {
    const access = await this.requireAdmin(organizationId, userId);
    const org = await this.org(organizationId);
    const [preferences, roleRows, pending] = await Promise.all([
      this.preferences(org._id),
      this.membershipModel.aggregate([{ $match: { organizationId: org._id, status: MembershipStatus.Active } }, { $group: { _id: '$role', count: { $sum: 1 } } }]).exec(),
      this.membershipModel.countDocuments({ organizationId: org._id, status: MembershipStatus.Pending }).exec(),
    ]);
    let giving: { enabled: boolean } | null = null;
    try {
      const g = await this.giving.publicInfo(organizationId, userId);
      giving = { enabled: g.enabled };
    } catch {
      giving = null;
    }
    return {
      organization: {
        id: String(org._id),
        name: org.name,
        organizationType: org.organizationType,
        status: org.status ?? 'active',
        domain: org.domain ?? '',
        isDiscoverable: org.isDiscoverable !== false,
        requireApproval: Boolean(org.requireApproval),
      },
      access,
      preferences,
      giving,
      roleCounts: Object.fromEntries(roleRows.map((r: Lean) => [String(r._id), r.count])),
      pendingRequests: pending,
    };
  }

  async savePreferences(organizationId: string, userId: string, input: Lean) {
    await this.require(organizationId, userId, ChurchPermission.ManageSettings, 'You need the Settings permission to change these settings.');
    const org = await this.org(organizationId);
    const before = await this.preferences(org._id);
    const set: Lean = { updatedByUserId: new Types.ObjectId(userId) };

    if (input.timeZone !== undefined) {
      const z = String(input.timeZone);
      if (!isTimeZone(z)) throw new BadRequestException('Choose a valid time zone.');
      set.timeZone = z;
    }
    if (input.language !== undefined) {
      const l = String(input.language);
      if (!isLanguage(l)) throw new BadRequestException('Choose a valid language.');
      set.language = Intl.getCanonicalLocales(l)[0];
    }
    if (input.dateFormat !== undefined) {
      if (!DATE_FORMATS.includes(String(input.dateFormat))) throw new BadRequestException('Choose a valid date format.');
      set.dateFormat = String(input.dateFormat);
    }
    if (input.timeFormat !== undefined) {
      if (!TIME_FORMATS.includes(String(input.timeFormat))) throw new BadRequestException('Choose a valid time format.');
      set.timeFormat = String(input.timeFormat);
    }
    if (input.currency !== undefined) {
      const c = input.currency ?? {};
      const def = String(c.defaultCurrency ?? before.currency.defaultCurrency).toUpperCase();
      if (!isCurrency(def)) throw new BadRequestException(`${def} is not a valid ISO 4217 currency code.`);
      const list = (Array.isArray(c.acceptedCurrencies) ? c.acceptedCurrencies : before.currency.acceptedCurrencies).map((x: unknown) => String(x).toUpperCase());
      for (const x of list) if (!isCurrency(x)) throw new BadRequestException(`${x} is not a valid ISO 4217 currency code.`);
      const accepted = [...new Set([def, ...list])].slice(0, 30);
      const multi = c.multiCurrency !== undefined ? Boolean(c.multiCurrency) : before.currency.multiCurrency;
      set.currency = {
        defaultCurrency: def,
        acceptedCurrencies: multi ? accepted : [def],
        multiCurrency: multi,
        showConverted: c.showConverted !== undefined ? Boolean(c.showConverted) : before.currency.showConverted,
      };
    }
    if (input.notifications !== undefined) {
      const n: Lean = {};
      for (const k of NOTIFICATION_KEYS) n[k] = input.notifications?.[k] !== undefined ? Boolean(input.notifications[k]) : before.notifications[k];
      set.notifications = n;
    }
    for (const k of ['allowMembershipRequests', 'showLocationsPublicly', 'publicEvents', 'memberDirectory'] as const) {
      if (input[k] !== undefined) set[k] = Boolean(input[k]);
    }

    await this.prefsModel.updateOne({ organizationId: org._id }, { $set: set, $unset: { catalogOnly: 1 }, $setOnInsert: { organizationId: org._id } }, { upsert: true, strict: false }).exec();
    const after = await this.preferences(org._id);

    const general = diff(pick(before, ['timeZone', 'language', 'dateFormat', 'timeFormat']), pick(after, ['timeZone', 'language', 'dateFormat', 'timeFormat']));
    if (general) await this.audit(organizationId, userId, { action: 'settings.updated', category: 'settings', targetType: 'organization', targetId: organizationId, targetLabel: org.name, ...general });
    const money = diff(before.currency as Lean, after.currency as Lean);
    if (money) await this.audit(organizationId, userId, { action: 'currency.updated', category: 'finance', targetType: 'organization', targetId: organizationId, targetLabel: org.name, ...money, details: 'Existing transactions keep their original currency and amount.' });
    const notif = diff(before.notifications, after.notifications);
    if (notif) await this.audit(organizationId, userId, { action: 'notifications.updated', category: 'settings', targetType: 'organization', targetId: organizationId, targetLabel: org.name, ...notif });
    const vis = diff(
      pick(before, ['allowMembershipRequests', 'showLocationsPublicly', 'publicEvents', 'memberDirectory']),
      pick(after, ['allowMembershipRequests', 'showLocationsPublicly', 'publicEvents', 'memberDirectory']),
    );
    if (vis) await this.audit(organizationId, userId, { action: 'quick_settings.updated', category: 'settings', targetType: 'organization', targetId: organizationId, targetLabel: org.name, ...vis });
    return after;
  }

  /** Quick Settings: public page (existing discoverable flag), donations (existing giving switch) + preferences. */
  async saveQuick(organizationId: string, userId: string, input: Lean) {
    await this.require(organizationId, userId, ChurchPermission.ManageSettings, 'You need the Settings permission to change these settings.');
    const org = await this.org(organizationId);
    if (input.allowPublicPage !== undefined) {
      const value = Boolean(input.allowPublicPage);
      await this.organizations.updateSettings(organizationId, { isDiscoverable: value }, userId);
      await this.audit(organizationId, userId, { action: 'quick_settings.updated', category: 'settings', targetType: 'organization', targetId: organizationId, targetLabel: org.name, before: { allowPublicPage: org.isDiscoverable !== false }, after: { allowPublicPage: value } });
    }
    if (input.enableDonations !== undefined) {
      const value = Boolean(input.enableDonations);
      await this.giving.saveSettings(organizationId, userId, { enabled: value });
      await this.audit(organizationId, userId, { action: 'giving.toggled', category: 'finance', targetType: 'organization', targetId: organizationId, targetLabel: org.name, after: { onlineGiving: value } });
    }
    const rest = pick(input, ['allowMembershipRequests', 'showLocationsPublicly', 'publicEvents', 'memberDirectory']);
    if (Object.keys(rest).length) await this.savePreferences(organizationId, userId, rest);
    return this.overview(organizationId, userId);
  }

  /* ======================================================================
     Exchange rates (existing provider; stored snapshot with timestamp)
     ====================================================================== */

  async rates(organizationId: string, userId: string, baseInput?: string) {
    await this.requireAdmin(organizationId, userId);
    const org = await this.org(organizationId);
    const prefs = await this.preferences(org._id);
    const base = String(baseInput || prefs.currency.defaultCurrency).toUpperCase();
    if (!isCurrency(base)) throw new BadRequestException('Choose a valid currency.');
    const targets = prefs.currency.acceptedCurrencies.filter((c) => c !== base);
    const rates: Record<string, number> = {};
    let fetchedAt = new Date();
    for (const t of targets) {
      const key = `${base}:${t}`;
      const cached = this.rateCache.get(key);
      if (cached && Date.now() - cached.fetchedAt.getTime() < 5 * 60 * 1000) {
        rates[t] = cached.rate;
        fetchedAt = cached.fetchedAt < fetchedAt ? cached.fetchedAt : fetchedAt;
        continue;
      }
      const rate = await this.exchangeRates.getRate(base, t);
      const now = new Date();
      this.rateCache.set(key, { rate, fetchedAt: now });
      rates[t] = rate;
    }
    const provider = (() => {
      try {
        return new URL(String(process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest')).host;
      } catch {
        return 'exchange-rate provider';
      }
    })();
    // Keep the latest snapshot (rate + time) so reports can show what was used.
    await this.prefsModel.updateOne({ organizationId: org._id }, { $set: { exchangeRates: { base, rates, fetchedAt, provider } }, $setOnInsert: { organizationId: org._id } }, { upsert: true }).exec();
    return { base, rates, fetchedAt: fetchedAt.toISOString(), provider, note: 'Indicative rates for reports only. Converting an amount never creates or changes a payment.' };
  }

  /* ======================================================================
     Team & roles, permissions (existing rules in MembersService)
     ====================================================================== */

  async team(organizationId: string, userId: string) {
    await this.requireAdmin(organizationId, userId);
    const org = await this.org(organizationId);
    const ownerId = String(org.createdByUserId ?? '');
    const rows = (await this.membershipModel
      .find({ organizationId: org._id, status: { $in: [MembershipStatus.Active, MembershipStatus.Inactive, MembershipStatus.Pending] }, $or: [{ role: { $in: TEAM_ROLES } }, { userId: org.createdByUserId }] } as Lean)
      .select('userId role permissions status profile joinedAt createdAt')
      .limit(300)
      .lean()
      .exec()) as Lean[];
    const names = await Promise.all(rows.map(async (m) => String(m.profile?.displayName || '') || (await this.userName(String(m.userId)))));
    const history = (await this.auditModel
      .find({ organizationId: org._id, action: { $in: ['role.changed', 'permissions.changed', 'access.removed', 'ownership.transferred'] } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec()) as Lean[];
    const pending = (await this.membershipModel
      .find({ organizationId: org._id, status: MembershipStatus.Pending })
      .select('profile userId createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec()) as Lean[];
    return {
      ownerUserId: ownerId,
      items: rows.map((m, i) => ({
        memberId: String(m._id),
        userId: String(m.userId),
        name: names[i] || 'Member',
        email: m.profile?.email ?? '',
        avatarUrl: m.profile?.avatarUrl ?? null,
        role: String(m.role ?? 'member'),
        isOwner: sameId(m.userId, ownerId),
        status: String(m.status),
        permissions: Array.isArray(m.permissions) ? m.permissions : [],
        joinedAt: iso(m.joinedAt ?? m.createdAt),
      })),
      pending: await Promise.all(pending.map(async (m) => ({ memberId: String(m._id), name: String(m.profile?.displayName || '') || (await this.userName(String(m.userId))) || 'Member', requestedAt: iso(m.createdAt) }))),
      history: history.map((h) => this.auditView(h)),
    };
  }

  private async memberLabel(organizationId: string, memberId: string) {
    const m = (await this.members.getMembershipByIdOrNull(organizationId, memberId)) as unknown as Lean | null;
    if (!m) throw new NotFoundException('Member not found.');
    return { m, label: String(m.profile?.displayName || '') || (await this.userName(String(m.userId))) || 'Member' };
  }

  async changeRole(organizationId: string, userId: string, memberId: string, roleInput: unknown) {
    const role = String(roleInput ?? '');
    if (!ALL_ROLES.includes(role)) throw new BadRequestException('Choose a valid role.');
    const { m, label } = await this.memberLabel(organizationId, memberId);
    const before = String(m.role ?? '');
    await this.members.updateRole(organizationId, memberId, role as MemberRole, userId);
    if (before !== role) await this.audit(organizationId, userId, { action: 'role.changed', category: 'team', targetType: 'member', targetId: memberId, targetLabel: label, before: { role: before }, after: { role } });
    return this.team(organizationId, userId);
  }

  async setPermissions(organizationId: string, userId: string, memberId: string, input: unknown) {
    if (!Array.isArray(input)) throw new BadRequestException('Permissions must be a list.');
    const next = [...new Set(input.map(String))];
    for (const p of next) if (!ALL_PERMISSIONS.has(p)) throw new BadRequestException(`Unknown permission: ${p}.`);
    const { m, label } = await this.memberLabel(organizationId, memberId);
    const before: string[] = Array.isArray(m.permissions) ? m.permissions.map(String) : [];
    await this.members.updateMembershipPermissions(organizationId, memberId, next as ChurchPermission[], userId);
    const added = next.filter((p) => !before.includes(p));
    const removed = before.filter((p) => !next.includes(p));
    if (added.length || removed.length)
      await this.audit(organizationId, userId, { action: 'permissions.changed', category: 'permissions', targetType: 'member', targetId: memberId, targetLabel: label, before: { removed }, after: { added } });
    return this.team(organizationId, userId);
  }

  /** Remove administrative access: back to Member with no permissions (membership kept). */
  async removeAccess(organizationId: string, userId: string, memberId: string) {
    const { m, label } = await this.memberLabel(organizationId, memberId);
    const org = await this.org(organizationId);
    if (sameId(m.userId, org.createdByUserId)) throw new ForbiddenException("The owner's access can't be removed. Transfer ownership first.");
    if (sameId(m.userId, userId)) throw new ForbiddenException("You can't remove your own access.");
    const beforeRole = String(m.role ?? '');
    const beforePerms: string[] = Array.isArray(m.permissions) ? m.permissions.map(String) : [];
    if (beforePerms.length) await this.members.updateMembershipPermissions(organizationId, memberId, [], userId);
    if (beforeRole !== MemberRole.Member) await this.members.updateRole(organizationId, memberId, MemberRole.Member, userId);
    await this.audit(organizationId, userId, { action: 'access.removed', category: 'team', targetType: 'member', targetId: memberId, targetLabel: label, before: { role: beforeRole, permissions: beforePerms.length }, after: { role: MemberRole.Member, permissions: 0 } });
    return this.team(organizationId, userId);
  }

  /* ======================================================================
     Organization profile + status (existing service) — audited
     ====================================================================== */

  async updateProfile(organizationId: string, userId: string, input: Lean) {
    const org = await this.org(organizationId);
    const dto: Lean = {};
    if (input.name !== undefined) dto.name = String(input.name).trim();
    if (input.organizationType !== undefined) dto.organizationType = String(input.organizationType);
    if (!Object.keys(dto).length) return this.overview(organizationId, userId);
    await this.organizations.update(organizationId, dto, userId);
    const change = diff(pick(org, Object.keys(dto)), dto);
    if (change) await this.audit(organizationId, userId, { action: 'profile.updated', category: 'profile', targetType: 'organization', targetId: organizationId, targetLabel: org.name, ...change });
    return this.overview(organizationId, userId);
  }

  async setStatus(organizationId: string, userId: string, statusInput: unknown) {
    const status = String(statusInput ?? '');
    if (![OrganizationStatus.Active, OrganizationStatus.Archived].includes(status as OrganizationStatus)) throw new BadRequestException('Choose active or archived.');
    const org = await this.org(organizationId);
    await this.require(organizationId, userId, ChurchPermission.ArchiveOrganization, 'You need the Archive permission to change the organization status.');
    await this.organizations.updateStatus(organizationId, status as OrganizationStatus, userId);
    await this.audit(organizationId, userId, { action: 'status.changed', category: 'organization', targetType: 'organization', targetId: organizationId, targetLabel: org.name, before: { status: org.status ?? 'active' }, after: { status } });
    return this.overview(organizationId, userId);
  }

  /* ======================================================================
     Ownership transfer (owner only)
     ====================================================================== */

  async transferOwnership(organizationId: string, userId: string, input: Lean) {
    const org = await this.org(organizationId);
    if (!sameId(org.createdByUserId, userId)) throw new ForbiddenException('Only the owner can transfer ownership.');
    if (String(input.confirmName ?? '').trim() !== String(org.name).trim()) throw new BadRequestException('Type the organization name exactly to confirm.');
    const { m, label } = await this.memberLabel(organizationId, String(input.memberId ?? ''));
    if (sameId(m.userId, userId)) throw new BadRequestException('Choose another member.');
    if (m.status !== MembershipStatus.Active) throw new BadRequestException('The new owner must be an active member.');

    // The new owner becomes Administrator; the previous owner stays Administrator.
    await this.membershipModel.updateOne({ _id: m._id }, { $set: { role: MemberRole.Administrator } }).exec();
    await this.membershipModel.updateOne({ organizationId: org._id, userId: new Types.ObjectId(userId) }, { $set: { role: MemberRole.Administrator, status: MembershipStatus.Active } }).exec();
    await this.organizationModel.updateOne({ _id: org._id }, { $set: { createdByUserId: m.userId } }).exec();
    await this.audit(organizationId, userId, {
      action: 'ownership.transferred',
      category: 'security',
      targetType: 'member',
      targetId: String(m._id),
      targetLabel: label,
      before: { ownerUserId: userId },
      after: { ownerUserId: String(m.userId) },
      details: 'Previous owner kept as Administrator.',
    });
    return { ok: true, newOwner: label };
  }

  /* ======================================================================
     Audit log (read-only)
     ====================================================================== */

  private auditView(h: Lean) {
    return {
      id: String(h._id),
      actorName: h.actorName || 'Someone',
      action: h.action,
      category: h.category,
      targetType: h.targetType,
      targetLabel: h.targetLabel,
      before: h.before ?? null,
      after: h.after ?? null,
      details: h.details ?? '',
      createdAt: iso(h.createdAt),
    };
  }

  async auditLog(organizationId: string, userId: string, query: Lean) {
    const a = await this.access(organizationId, userId);
    if (!a.canViewAudit) throw new ForbiddenException('You need the Settings permission to view the audit log.');
    const org = await this.org(organizationId);
    const filter: Lean = { organizationId: org._id };
    const category = String(query.category ?? '');
    if (AUDIT_CATEGORIES.includes(category)) filter.category = category;
    const q = String(query.q ?? '').trim().slice(0, 80);
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ actorName: rx }, { targetLabel: rx }, { action: rx }];
    }
    const page = Math.max(1, Math.min(500, Number(query.page) || 1));
    const pageSize = 30;
    const [rows, total] = await Promise.all([
      this.auditModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean().exec() as Promise<Lean[]>,
      this.auditModel.countDocuments(filter).exec(),
    ]);
    return { items: rows.map((h) => this.auditView(h)), total, page, pageSize, hasMore: page * pageSize < total };
  }
}
