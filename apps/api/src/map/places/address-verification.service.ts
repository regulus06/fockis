import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

import { NotificationsService } from "../../notifications/notifications.service";
import { actorId, isSuperAdmin, type Actor } from "../../reports/utils/actor";
import { haversineMeters } from "../geo/geo-utils";
import { SavedLocation, SavedLocationDocument, VERIFICATION_STATUSES, type VerificationStatus } from "./place.schemas";

/* ============================================================================
   SMART ADDRESS VERIFICATION
   Every address a user adds goes to Fockis staff as a request. A reviewer
   checks the pin against the map and satellite imagery, the written details
   and nearby duplicates, then verifies it, rejects it, or asks the owner for
   more information. The owner is notified of each decision.

   Reviewers are users with map.addresses.view (admins, super admins and
   custom admin roles that include it). Precise coordinates are shown only to
   them and to the owner.
============================================================================ */

export type ReviewAction = "verify" | "needs_info" | "reject";

const PAGE_SIZE = 20;
const NEARBY_METERS = 30;
const REVIEWER_ROLES = ["admin", "super_admin"];
const NOTIFICATION_TYPE = "SYSTEM";
const iso = (d?: Date | string | null) => (d ? new Date(d).toISOString() : null);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A missing status (addresses saved before reviews existed) counts as pending. */
export const statusOf = (doc: any): VerificationStatus => (VERIFICATION_STATUSES as readonly string[]).includes(doc?.verificationStatus) ? doc.verificationStatus : "pending";

const STATUS_FILTER: Record<VerificationStatus, Record<string, unknown>> = {
  pending: { verificationStatus: { $nin: ["verified", "needs_info", "rejected"] } },
  verified: { verificationStatus: "verified" },
  needs_info: { verificationStatus: "needs_info" },
  rejected: { verificationStatus: "rejected" },
};

export interface ReviewPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

@Injectable()
export class AddressVerificationService {
  private readonly logger = new Logger(AddressVerificationService.name);
  private reviewerCache: { at: number; ids: string[] } | null = null;

  constructor(
    @InjectModel(SavedLocation.name) private readonly locations: Model<SavedLocationDocument>,
    @Optional() @InjectConnection() private readonly connection?: Connection,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /* ---------------------------------------------------------------- people */

  private person(user: any): ReviewPerson | null {
    if (!user) return null;
    return {
      id: String(user._id),
      username: String(user.username ?? ""),
      name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || String(user.username ?? ""),
      avatar: String(user.profilePicture ?? user.avatar ?? ""),
    };
  }

  private async usersById(ids: unknown[]): Promise<Map<string, any>> {
    const userModel = this.connection?.models["User"];
    const valid = Array.from(new Set(ids.map((id) => String(id ?? "")).filter((id) => Types.ObjectId.isValid(id))));
    if (!userModel || !valid.length) return new Map();
    const rows = await userModel
      .find({ _id: { $in: valid.map((id) => new Types.ObjectId(id)) } })
      .select("username firstName lastName name profilePicture avatar createdAt")
      .lean()
      .exec()
      .catch(() => [] as any[]);
    return new Map((rows as any[]).map((row) => [String(row._id), row]));
  }

  private async reviewerIds(): Promise<string[]> {
    if (this.reviewerCache && Date.now() - this.reviewerCache.at < 5 * 60_000) return this.reviewerCache.ids;
    const userModel = this.connection?.models["User"];
    if (!userModel) return [];
    const roleModel = this.connection?.models["AdminRole"];
    const roleIds = roleModel
      ? ((await roleModel.find({ isActive: true, permissions: "map.addresses.view" }).select("_id").lean().exec().catch(() => [])) as any[]).map((r) => r._id)
      : [];
    const rows = (await userModel
      .find({
        isActive: { $ne: false },
        $or: [{ role: { $in: REVIEWER_ROLES } }, { isSuperAdmin: true }, ...(roleIds.length ? [{ adminRoleId: { $in: roleIds } }] : [])],
      })
      .select("_id")
      .limit(50)
      .lean()
      .exec()
      .catch(() => [])) as any[];
    const ids = rows.map((r) => String(r._id));
    this.reviewerCache = { at: Date.now(), ids };
    return ids;
  }

  private async notify(recipientId: string, title: string, message: string, link: string, entityId: string) {
    if (!this.notifications || !Types.ObjectId.isValid(recipientId)) return;
    try {
      await this.notifications.create({ recipientId, type: NOTIFICATION_TYPE, title, message, link, entityId, entityType: "smart_address" });
    } catch (error) {
      // A notification failure never fails the address change itself.
      this.logger.warn(`Could not notify ${recipientId}: ${String(error)}`);
    }
  }

  /** Tells reviewers a request is waiting. Never throws. */
  async notifyReviewers(doc: any, action: "submitted" | "resubmitted" | "changed") {
    try {
      const owner = String(doc.userId ?? "");
      const ids = (await this.reviewerIds()).filter((id) => id !== owner);
      const title = action === "submitted" ? "New address to verify" : action === "resubmitted" ? "Address sent back for review" : "Verified address changed";
      const place = [doc.neighborhood, doc.commune, doc.country].filter(Boolean).join(", ");
      const message = `${doc.smartAddressId} · ${doc.label}${place ? ` — ${place}` : ""}`;
      await Promise.all(ids.map((id) => this.notify(id, title, message, `/admin/map/addresses/${String(doc._id)}`, String(doc._id))));
    } catch (error) {
      this.logger.warn(`Could not notify reviewers: ${String(error)}`);
    }
  }

  /* ---------------------------------------------------------------- views */

  private itemView(doc: any, owner: any) {
    const [lon, lat] = doc.location?.coordinates ?? [0, 0];
    return {
      id: String(doc._id),
      label: doc.label,
      kind: doc.kind,
      smartAddressId: doc.smartAddressId,
      plusCode: doc.plusCode,
      latitude: lat,
      longitude: lon,
      country: doc.country ?? "",
      countryCode: doc.countryCode ?? "",
      department: doc.department ?? "",
      commune: doc.commune ?? "",
      neighborhood: doc.neighborhood ?? "",
      locality: doc.locality ?? "",
      streetAddress: doc.streetAddress ?? "",
      captureMethod: doc.captureMethod ?? "pin",
      accuracyM: doc.accuracyM ?? 0,
      hasBuilding: doc.building?.source === "osm",
      status: statusOf(doc),
      requestedAt: iso(doc.verificationRequestedAt ?? doc.createdAt),
      reviewedAt: iso(doc.verificationReviewedAt),
      owner: this.person(owner),
    };
  }

  /* ---------------------------------------------------------------- queue */

  async counts() {
    const entries = await Promise.all(
      VERIFICATION_STATUSES.map(async (s) => [s, await this.locations.countDocuments(STATUS_FILTER[s] as any).exec()] as const),
    );
    return Object.fromEntries(entries) as Record<VerificationStatus, number>;
  }

  async list(query: { status?: string; q?: string; country?: string; page?: number | string }) {
    const status = (VERIFICATION_STATUSES as readonly string[]).includes(String(query.status)) ? (query.status as VerificationStatus) : null;
    const page = Math.max(1, Math.min(500, Number(query.page) || 1));
    const filter: Record<string, unknown> = status ? { ...STATUS_FILTER[status] } : {};
    const cc = String(query.country ?? "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cc)) filter.countryCode = cc;
    const q = String(query.q ?? "").trim().slice(0, 80);
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ label: re }, { smartAddressId: re }, { plusCode: re }, { neighborhood: re }, { commune: re }, { locality: re }, { streetAddress: re }];
    }
    // Oldest requests first while waiting; most recent decisions first otherwise.
    const sort: Record<string, 1 | -1> = !status || status === "pending" ? { verificationRequestedAt: 1, createdAt: 1 } : { verificationReviewedAt: -1, updatedAt: -1 };
    const [rows, total, counts] = await Promise.all([
      this.locations.find(filter as any).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec() as Promise<any[]>,
      this.locations.countDocuments(filter as any).exec(),
      this.counts(),
    ]);
    const owners = await this.usersById(rows.map((r) => r.userId));
    return {
      items: rows.map((r) => this.itemView(r, owners.get(String(r.userId)))),
      page,
      total,
      hasMore: page * PAGE_SIZE < total,
      counts,
    };
  }

  private async findDoc(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Address not found.");
    const doc = (await this.locations.findOne({ _id: new Types.ObjectId(id) }).lean().exec()) as any;
    if (!doc) throw new NotFoundException("Address not found.");
    return doc;
  }

  /** Other saved addresses within 30 m: possible duplicates or a shared building. */
  private async nearby(doc: any) {
    const [lon, lat] = doc.location?.coordinates ?? [0, 0];
    try {
      const rows = (await this.locations
        .find({
          _id: { $ne: doc._id },
          location: { $geoWithin: { $centerSphere: [[lon, lat], NEARBY_METERS / 6_378_137] } },
        } as any)
        .limit(10)
        .lean()
        .exec()) as any[];
      return rows.map((r) => ({
        id: String(r._id),
        smartAddressId: r.smartAddressId,
        label: r.label,
        status: statusOf(r),
        distanceM: Math.round(haversineMeters({ lat, lon }, { lat: r.location.coordinates[1], lon: r.location.coordinates[0] })),
        sameOwner: String(r.userId) === String(doc.userId),
        latitude: r.location.coordinates[1],
        longitude: r.location.coordinates[0],
      }));
    } catch {
      return [];
    }
  }

  async detail(id: string) {
    const doc = await this.findDoc(id);
    const history: any[] = doc.verificationHistory ?? [];
    const people = await this.usersById([doc.userId, doc.verificationReviewedBy, ...history.map((h) => h.by)]);
    const ownerId = String(doc.userId);
    const [ownerTotal, ownerVerified, ownerRejected, nearby] = await Promise.all([
      this.locations.countDocuments({ userId: doc.userId } as any).exec(),
      this.locations.countDocuments({ userId: doc.userId, verificationStatus: "verified" } as any).exec(),
      this.locations.countDocuments({ userId: doc.userId, verificationStatus: "rejected" } as any).exec(),
      this.nearby(doc),
    ]);
    const owner = people.get(ownerId);
    return {
      ...this.itemView(doc, owner),
      communalSection: doc.communalSection ?? "",
      building: doc.building ?? { source: "pin" },
      landmarks: doc.landmarks ?? [],
      directions: doc.directions ?? "",
      note: doc.verificationNote ?? "",
      reviewedBy: this.person(people.get(String(doc.verificationReviewedBy ?? ""))),
      createdAt: iso(doc.createdAt),
      updatedAt: iso(doc.updatedAt),
      ownerStats: {
        memberSince: iso(owner?.createdAt),
        addresses: ownerTotal,
        verified: ownerVerified,
        rejected: ownerRejected,
      },
      nearby,
      history: history
        .slice()
        .reverse()
        .map((h) => ({ action: h.action, at: iso(h.at), note: h.note ?? "", by: this.person(people.get(String(h.by ?? ""))) })),
    };
  }

  /* ---------------------------------------------------------------- decide */

  async decide(actor: Actor, id: string, action: ReviewAction, rawNote?: string) {
    const reviewer = actorId(actor);
    if (!Types.ObjectId.isValid(reviewer)) throw new ForbiddenException("Sign in again.");
    const note = String(rawNote ?? "").trim().slice(0, 500);
    if (action !== "verify" && note.length < 5) {
      throw new BadRequestException(action === "reject" ? "Tell the owner why this address can't be verified." : "Tell the owner what information is missing.");
    }
    const doc = await this.findDoc(id);
    const current = statusOf(doc);
    // Reviewing your own address needs a second person (super admins excepted).
    if (String(doc.userId) === reviewer && !isSuperAdmin(actor)) {
      throw new ForbiddenException("Another reviewer must check your own address.");
    }
    const next: VerificationStatus = action === "verify" ? "verified" : action === "reject" ? "rejected" : "needs_info";
    if (current === next) throw new ConflictException(`This address is already ${next === "needs_info" ? "waiting for more information" : next}.`);

    const now = new Date();
    // Only apply if nobody changed the status meanwhile (two reviewers, or the
    // owner editing the address while it was being reviewed).
    const guard = current === "pending" ? STATUS_FILTER.pending : { verificationStatus: current };
    const res: any = await this.locations
      .updateOne({ _id: doc._id, ...guard } as any, {
        $set: {
          verificationStatus: next,
          verificationReviewedAt: now,
          verificationReviewedBy: new Types.ObjectId(reviewer),
          verificationNote: note,
        },
        $push: { verificationHistory: { $each: [{ action: next, by: new Types.ObjectId(reviewer), at: now, note }], $slice: -50 } },
      } as any)
      .exec();
    if (!res?.matchedCount) throw new ConflictException("This address just changed. Reload it and review again.");

    const label = `“${doc.label}” (${doc.smartAddressId})`;
    const link = `/map?place=${String(doc._id)}`;
    if (next === "verified") await this.notify(String(doc.userId), "Address verified", `Fockis verified your address ${label}.${note ? ` ${note}` : ""}`, link, String(doc._id));
    else if (next === "needs_info") await this.notify(String(doc.userId), "More information needed for your address", `${label}: ${note}`, link, String(doc._id));
    else await this.notify(String(doc.userId), "Address not verified", `${label}: ${note}`, link, String(doc._id));

    return this.detail(id);
  }
}
