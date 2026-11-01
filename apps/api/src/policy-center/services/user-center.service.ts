import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { UpdateConsentDto, UpdatePrivacyDto } from "../dto/policy.dto";
import { CONSENT_VERSION, OPTIONAL_CONSENTS } from "../policy.constants";
import {
  UserConsent,
  UserConsentDocument,
  UserConsentEvent,
  UserConsentEventDocument,
  UserDataRequest,
  UserDataRequestDocument,
  UserPrivacySettings,
  UserPrivacySettingsDocument,
} from "../schemas/policy.schemas";
import { PolicyAcceptanceService } from "./policy-acceptance.service";
import { PolicyCommonService, escapeRegex } from "./policy-common.service";
import { UserActivityService } from "./user-activity.service";

const DAY = 86_400_000;
const LABELS: Record<string, string> = {
  analytics_cookies: "Analytics cookies",
  personalization_cookies: "Personalization cookies",
  advertising_cookies: "Advertising cookies",
  marketing_emails: "Marketing emails",
  product_announcements: "Product announcements",
  promotional_notifications: "Promotional notifications",
  personalized_recommendations: "Personalized recommendations",
  optional_analytics: "Optional analytics",
};

/** The signed-in user's own Policy Center data. Every method is scoped to that user. */
@Injectable()
export class UserCenterService {
  constructor(
    @InjectModel(UserPrivacySettings.name) private readonly privacy: Model<UserPrivacySettingsDocument>,
    @InjectModel(UserConsent.name) private readonly consents: Model<UserConsentDocument>,
    @InjectModel(UserConsentEvent.name) private readonly consentEvents: Model<UserConsentEventDocument>,
    @InjectModel(UserDataRequest.name) private readonly dataRequests: Model<UserDataRequestDocument>,
    private readonly acceptance: PolicyAcceptanceService,
    private readonly common: PolicyCommonService,
    private readonly activity: UserActivityService,
  ) {}

  private async user(userId: string, fields: string) {
    if (!Types.ObjectId.isValid(userId) || !this.common.users) throw new NotFoundException("Account not found.");
    const u: any = await this.common.users.findById(userId).select(fields).lean().exec();
    if (!u) throw new NotFoundException("Account not found.");
    return u;
  }

  /* ---------------- overview ---------------- */

  async overview(userId: string) {
    const [policies, privacy, consent, requests, appeals, recent] = await Promise.all([
      this.acceptance.forUser(userId),
      this.getPrivacy(userId),
      this.getConsent(userId),
      this.dataRequests.find({ userId, status: { $in: ["pending", "processing"] } }).select("type").lean().exec(),
      this.appealCounts(userId),
      this.activity.list(userId, 6),
    ]);
    const required = policies.filter((p) => p.requiredAcceptance);
    return {
      policies: {
        required: required.length,
        accepted: required.filter((p) => p.status === "accepted").length,
        actionNeeded: required.filter((p) => p.status === "action_needed").map((p) => ({ slug: p.slug, title: p.title, version: p.version })),
        published: policies.length,
      },
      privacy: { configured: privacy.configured, profileVisibility: privacy.profileVisibility, optionalConsents: Object.values(consent.choices).filter(Boolean).length },
      dataRequests: { exports: requests.filter((r) => r.type === "export").length, corrections: requests.filter((r) => r.type === "correction").length, active: requests.length },
      appeals,
      recent,
    };
  }

  private async appealCounts(userId: string) {
    const cases = this.common.model("ModerationCase");
    if (!cases || !Types.ObjectId.isValid(userId)) return { open: 0, resolved: 0, appealable: 0 };
    const base = { reportedUserId: new Types.ObjectId(userId), "decision.outcome": "violation" };
    const [open, resolved, appealable] = await Promise.all([
      cases.countDocuments({ ...base, appealStatus: "pending" }).exec(),
      cases.countDocuments({ ...base, appealStatus: { $in: ["upheld", "overturned"] } }).exec(),
      cases.countDocuments({ ...base, appealStatus: "none", "decision.reversedAt": { $in: [null] } }).exec(),
    ]);
    return { open, resolved, appealable };
  }

  /* ---------------- privacy ---------------- */

  async getPrivacy(userId: string) {
    const [u, doc] = await Promise.all([this.user(userId, "isPrivate"), this.privacy.findOne({ userId }).lean().exec()]);
    return {
      configured: Boolean(doc),
      profileVisibility: u.isPrivate ? "private" : "public",
      messaging: doc?.messaging ?? "everyone",
      comments: doc?.comments ?? "everyone",
      searchable: doc?.searchable ?? true,
      mutedCount: (doc?.mutedUserIds ?? []).length,
      updatedAt: doc?.updatedAt ?? null,
    };
  }

  async updatePrivacy(userId: string, dto: UpdatePrivacyDto) {
    const changed: string[] = [];
    if (dto.profileVisibility) {
      await this.common.users.updateOne({ _id: new Types.ObjectId(userId) }, { $set: { isPrivate: dto.profileVisibility === "private" } }).exec();
      changed.push(`profile ${dto.profileVisibility}`);
    }
    const set: Record<string, unknown> = {};
    if (dto.messaging) set.messaging = dto.messaging;
    if (dto.comments) set.comments = dto.comments;
    if (dto.searchable !== undefined) set.searchable = dto.searchable;
    if (Object.keys(set).length) {
      await this.privacy.findOneAndUpdate({ userId }, { $set: set, $setOnInsert: { userId, mutedUserIds: [] } }, { upsert: true }).exec();
      if (dto.messaging) changed.push(`messages from ${dto.messaging}`);
      if (dto.comments) changed.push(`comments from ${dto.comments}`);
      if (dto.searchable !== undefined) changed.push(dto.searchable ? "visible in search" : "hidden from search");
    } else if (dto.profileVisibility) {
      await this.privacy.findOneAndUpdate({ userId }, { $setOnInsert: { userId, mutedUserIds: [] } }, { upsert: true }).exec();
    }
    if (!changed.length) throw new BadRequestException("Nothing to change.");
    await this.activity.add(userId, "privacy_updated", "Privacy settings updated", changed.join(", "));
    return this.getPrivacy(userId);
  }

  /* ---------------- muted accounts ---------------- */

  async muted(userId: string) {
    const doc = await this.privacy.findOne({ userId }).select("mutedUserIds").lean().exec();
    const ids = doc?.mutedUserIds ?? [];
    const people = await this.common.people(ids);
    return ids.map((id) => this.common.person(people, id)).filter((p) => p && (p.username || p.name));
  }

  async mute(userId: string, value: string) {
    const term = String(value ?? "").trim().replace(/^@/, "");
    if (!term) throw new BadRequestException("Enter a username.");
    const target: any = await this.common.users
      .findOne(Types.ObjectId.isValid(term) ? { _id: new Types.ObjectId(term) } : { username: new RegExp(`^${escapeRegex(term)}$`, "i") })
      .select("_id username")
      .lean()
      .exec();
    if (!target) throw new NotFoundException("No account matches that username.");
    if (String(target._id) === userId) throw new BadRequestException("You can't mute yourself.");
    await this.privacy.findOneAndUpdate({ userId }, { $addToSet: { mutedUserIds: String(target._id) }, $setOnInsert: { userId } }, { upsert: true }).exec();
    await this.activity.add(userId, "account_muted", "Account muted", `@${target.username}`);
    return this.muted(userId);
  }

  async unmute(userId: string, targetId: string) {
    await this.privacy.updateOne({ userId }, { $pull: { mutedUserIds: String(targetId) } } as any).exec();
    return this.muted(userId);
  }

  /* ---------------- consent ---------------- */

  async getConsent(userId: string) {
    const doc = await this.consents.findOne({ userId }).lean().exec();
    const choices: Record<string, boolean> = {};
    for (const key of OPTIONAL_CONSENTS) choices[key] = Boolean(doc?.choices?.[key]);
    const history = await this.consentEvents.find({ userId }).sort({ at: -1 }).limit(20).lean().exec();
    return {
      consentVersion: CONSENT_VERSION,
      recordedVersion: doc?.consentVersion ?? null,
      updatedAt: doc?.updatedAt ?? null,
      choices,
      history: history.map((h) => ({ changes: h.changes, consentVersion: h.consentVersion, at: h.at })),
    };
  }

  async updateConsent(userId: string, dto: UpdateConsentDto) {
    await this.consents.findOneAndUpdate({ userId }, { $set: { [`choices.${dto.key}`]: dto.value, consentVersion: CONSENT_VERSION }, $setOnInsert: { userId } }, { upsert: true }).exec();
    await this.consentEvents.create({ userId, changes: { [dto.key]: dto.value }, consentVersion: CONSENT_VERSION, at: new Date() });
    await this.activity.add(userId, "consent_changed", "Consent preferences changed", `${LABELS[dto.key] ?? dto.key}: ${dto.value ? "on" : "off"}`);
    return this.getConsent(userId);
  }

  /* ---------------- security ---------------- */

  async security(userId: string, record = false) {
    const u = await this.user(userId, "mfaEnabled mfaRequired lastLoginAt lastLoginUserAgent passwordChangedAt failedLoginAttempts lastFailedLoginAt lockedUntil email createdAt");
    const recommendations: { id: string; level: "good" | "warn"; text: string }[] = [];
    recommendations.push(u.mfaEnabled ? { id: "mfa", level: "good", text: "Two-factor authentication is on." } : { id: "mfa", level: "warn", text: "Turn on two-factor authentication for stronger protection." });
    const pwAge = u.passwordChangedAt ? Math.floor((Date.now() - new Date(u.passwordChangedAt).getTime()) / DAY) : null;
    recommendations.push(pwAge === null || pwAge > 365 ? { id: "password", level: "warn", text: "Your password hasn't been changed in over a year. Consider updating it." } : { id: "password", level: "good", text: "Your password was changed recently." });
    if (u.failedLoginAttempts > 0 && u.lastFailedLoginAt) recommendations.push({ id: "failed", level: "warn", text: `There ${u.failedLoginAttempts === 1 ? "was 1 failed sign-in attempt" : `were ${u.failedLoginAttempts} failed sign-in attempts`} since your last sign-in.` });
    const issues = recommendations.filter((r) => r.level === "warn").length;
    if (record) await this.activity.add(userId, "security_check", "Account security check", issues ? `${issues} recommendation${issues === 1 ? "" : "s"} to review.` : "No security issues found.");
    return {
      mfaEnabled: Boolean(u.mfaEnabled),
      mfaRequired: Boolean(u.mfaRequired),
      lastLoginAt: u.lastLoginAt ?? null,
      lastLoginDevice: String(u.lastLoginUserAgent ?? "").slice(0, 160),
      passwordChangedAt: u.passwordChangedAt ?? null,
      failedLoginAttempts: Number(u.failedLoginAttempts ?? 0),
      lastFailedLoginAt: u.lastFailedLoginAt ?? null,
      issues,
      recommendations,
    };
  }

  /** Everything the user sees under "View My Information". */
  async myInformation(userId: string) {
    const u = await this.user(userId, "username firstName lastName email phone birthDate gender location website bio createdAt fockisId isPrivate verified accountType");
    const [privacy, consent] = await Promise.all([this.getPrivacy(userId), this.getConsent(userId)]);
    return {
      account: {
        username: u.username ?? "",
        name: [u.firstName, u.lastName].filter(Boolean).join(" "),
        email: u.email ?? "",
        phone: u.phone ?? "",
        birthDate: u.birthDate ?? "",
        gender: u.gender ?? "",
        location: u.location ?? "",
        website: u.website ?? "",
        bio: u.bio ?? "",
        fockisId: u.fockisId ?? "",
        accountType: u.accountType ?? "",
        memberSince: u.createdAt ?? null,
      },
      privacy,
      consents: consent.choices,
    };
  }
}
