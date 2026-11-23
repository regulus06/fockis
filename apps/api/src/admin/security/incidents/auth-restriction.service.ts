import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  AuthRestriction,
  AuthRestrictionDocument,
} from "./security-incident.schema";

// ============================================================================
// AUTHENTICATION RESTRICTIONS
//
// A restriction never blocks an account permanently: it only requires one
// extra verification at the next sign-in, and it expires on its own.
// ============================================================================

const DAY_MS = 86_400_000;
/** Contact details changed this recently are not trusted for verification. */
export const RECENT_CONTACT_CHANGE_DAYS = 7;

export type VerificationMethod = "totp" | "email" | "recovery";

export interface MethodSubject {
  mfaEnabled?: unknown;
  mfaSecret?: unknown;
  mfaEnabledAt?: unknown;
  email?: unknown;
  emailChangedAt?: unknown;
}

/**
 * Methods the account can use to verify. Recovery is always offered, so no
 * account can end up without a way back in.
 */
export function availableMethods(
  user: MethodSubject,
  options: { emailCodesAllowed: boolean; now?: number },
): VerificationMethod[] {
  const now = options.now ?? Date.now();
  const recentLimit = now - RECENT_CONTACT_CHANGE_DAYS * DAY_MS;
  const methods: VerificationMethod[] = [];

  const mfaSince = user.mfaEnabledAt ? new Date(String(user.mfaEnabledAt)).getTime() : 0;

  if (user.mfaEnabled === true && user.mfaSecret && !(mfaSince && mfaSince > recentLimit)) {
    methods.push("totp");
  }

  const emailSince = user.emailChangedAt ? new Date(String(user.emailChangedAt)).getTime() : 0;

  if (
    options.emailCodesAllowed &&
    typeof user.email === "string" &&
    user.email.includes("@") &&
    !(emailSince && emailSince > recentLimit)
  ) {
    methods.push("email");
  }

  methods.push("recovery");

  return methods;
}

export function serializeRestriction(doc: any) {
  if (!doc) return null;

  return {
    id: String(doc._id),
    userId: String(doc.userId),
    incidentId: doc.incidentId ? String(doc.incidentId) : null,
    level: doc.level,
    status: doc.status,
    active: Boolean(doc.active),
    reasonCodes: doc.reasonCodes ?? [],
    expiresAt: doc.expiresAt,
    verifiedMethod: doc.verifiedMethod ?? null,
    verifiedAt: doc.verifiedAt ?? null,
    liftedBy: doc.liftedBy ?? null,
    liftedAt: doc.liftedAt ?? null,
    reviewNote: doc.reviewNote ?? "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

@Injectable()
export class AuthRestrictionService {
  private readonly logger = new Logger(AuthRestrictionService.name);

  constructor(
    @InjectModel(AuthRestriction.name)
    private readonly restrictions: Model<AuthRestrictionDocument>,
  ) {}

  /** The pending restriction for this account, if any (expired ones are ignored). */
  async activeFor(userId: string): Promise<AuthRestrictionDocument | null> {
    if (!Types.ObjectId.isValid(userId)) return null;

    return this.restrictions
      .findOne({
        userId: new Types.ObjectId(userId),
        active: true,
        status: "verification_pending",
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async findById(id: string): Promise<AuthRestrictionDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    return this.restrictions.findById(id).exec();
  }

  /**
   * Create the pending restriction, or raise an existing one to critical.
   * Returns the restriction and whether it was newly created.
   */
  async ensure(input: {
    userId: string;
    incidentId: string;
    level: "step_up" | "critical";
    reasonCodes: string[];
    durationHours: number;
  }): Promise<{ restriction: any; created: boolean; raised: boolean }> {
    const userId = new Types.ObjectId(input.userId);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.max(1, input.durationHours) * 3_600_000);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const before: any = await this.restrictions.collection.findOneAndUpdate(
          { userId, active: true },
          {
            $setOnInsert: {
              userId,
              incidentId: new Types.ObjectId(input.incidentId),
              status: "verification_pending",
              active: true,
              verifiedMethod: null,
              verifiedAt: null,
              liftedBy: null,
              liftedAt: null,
              reviewNote: "",
              createdAt: now,
              level: input.level,
            },
            $addToSet: { reasonCodes: { $each: input.reasonCodes } },
            $max: { expiresAt },
            $set: { updatedAt: now },
          },
          { upsert: true, returnDocument: "before" },
        );

        const previous = before && "value" in before && "ok" in before ? before.value : before;
        let raised = false;

        if (previous && previous.level === "step_up" && input.level === "critical") {
          await this.restrictions.collection.updateOne(
            { _id: previous._id, level: "step_up" },
            { $set: { level: "critical" } },
          );
          raised = true;
        }

        const restriction = await this.restrictions
          .findOne({ userId, active: true })
          .lean()
          .exec();

        return { restriction, created: !previous, raised };
      } catch (error: any) {
        if (error?.code !== 11000 || attempt === 1) throw error;
      }
    }

    throw new Error("Restriction could not be created.");
  }

  /** Atomically complete the pending restriction (single use). */
  async markVerified(restrictionId: string, method: VerificationMethod): Promise<any | null> {
    if (!Types.ObjectId.isValid(restrictionId)) return null;

    return this.restrictions
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(restrictionId),
          active: true,
          status: "verification_pending",
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            status: "verified",
            active: false,
            verifiedMethod: method,
            verifiedAt: new Date(),
          },
        },
        { new: true },
      )
      .lean()
      .exec();
  }

  /** Administrator lifted the restriction after review. */
  async lift(restrictionId: string, actorId: string, note: string): Promise<any | null> {
    return this.restrictions
      .findOneAndUpdate(
        { _id: new Types.ObjectId(restrictionId), active: true },
        {
          $set: {
            status: "lifted",
            active: false,
            liftedBy: actorId,
            liftedAt: new Date(),
            reviewNote: note.slice(0, 1000),
          },
        },
        { new: true },
      )
      .lean()
      .exec();
  }

  /** Administrator kept the restriction, optionally extending it. */
  async keep(restrictionId: string, note: string, extendHours: number): Promise<any | null> {
    const doc = await this.restrictions.findOne({ _id: new Types.ObjectId(restrictionId), active: true }).exec();

    if (!doc) return null;

    const update: Record<string, unknown> = { reviewNote: note.slice(0, 1000) };

    if (extendHours > 0) {
      update.expiresAt = new Date(
        Math.max(doc.expiresAt.getTime(), Date.now()) + Math.min(extendHours, 168) * 3_600_000,
      );
    }

    return this.restrictions
      .findOneAndUpdate({ _id: doc._id, active: true }, { $set: update }, { new: true })
      .lean()
      .exec();
  }

  /** Expire restrictions past their time. Returns the expired documents. */
  async expireDue(): Promise<any[]> {
    const due = await this.restrictions
      .find({ active: true, expiresAt: { $lte: new Date() } })
      .limit(500)
      .lean()
      .exec();

    const expired: any[] = [];

    for (const doc of due) {
      const result = await this.restrictions
        .updateOne({ _id: doc._id, active: true }, { $set: { status: "expired", active: false } })
        .exec();

      if (result.modifiedCount) expired.push(doc);
    }

    return expired;
  }

  async list(query: { status?: string; userId?: string; page?: number; pageSize?: number }) {
    const filter: Record<string, unknown> = {};

    if (query.status === "active") {
      filter.active = true;
      filter.expiresAt = { $gt: new Date() };
    } else if (query.status) {
      filter.status = query.status;
    }

    if (query.userId && Types.ObjectId.isValid(query.userId)) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    const pageSize = Math.min(Math.max(1, Number(query.pageSize) || 20), 100);
    const page = Math.max(1, Number(query.page) || 1);

    const [rows, total] = await Promise.all([
      this.restrictions
        .find(filter)
        .sort({ active: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
      this.restrictions.countDocuments(filter).exec(),
    ]);

    return { rows, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}
