import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";

import { NotificationsService } from "../../notifications/notifications.service";
import { actorId, isSuperAdmin, type Actor } from "../../reports/utils/actor";
import { GeoService } from "../geo/geo.service";
import { haversineMeters } from "../geo/geo-utils";
import { PUBLIC_PLACE_STATUSES, PublicPlace, PublicPlaceDocument, type PublicPlaceStatus } from "./public-place.schema";
import type { SavePublicPlaceDto, UpdatePublicPlaceDto } from "./public-places.dto";

/* ============================================================================
   PUBLIC PLACES
   People add places that aren't on the map (a bakery in Pétion-Ville, a
   church in Cap-Haïtien, a clinic in Jacmel). New and edited places wait for
   a Fockis reviewer (map.addresses.view / map.addresses.verify); approved
   places appear on the map and in search for everyone.
============================================================================ */

const PAGE_SIZE = 20;
const MAX_PENDING_PER_USER = 25;
const DUPLICATE_METERS = 80;
const REVIEWER_ROLES = ["admin", "super_admin"];
const iso = (d?: Date | string | null) => (d ? new Date(d).toISOString() : null);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Website must be http(s). A bare "bellbakery.ht" gets https://. */
function cleanWebsite(value?: string) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) throw new Error();
    return u.toString();
  } catch {
    throw new BadRequestException("The website address isn't valid.");
  }
}

export interface PublicPlaceView {
  id: string;
  name: string;
  category: string;
  description: string;
  phone: string;
  website: string;
  openingHours: string;
  addressText: string;
  countryCode: string;
  department: string;
  commune: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  status: PublicPlaceStatus;
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  mine: boolean;
}

@Injectable()
export class PublicPlacesService {
  private readonly logger = new Logger(PublicPlacesService.name);
  private reviewerCache: { at: number; ids: string[] } | null = null;

  constructor(
    @InjectModel(PublicPlace.name) private readonly places: Model<PublicPlaceDocument>,
    private readonly geo: GeoService,
    @Optional() @InjectConnection() private readonly connection?: Connection,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /* ---------------------------------------------------------------- views */

  view(doc: any, userId = ""): PublicPlaceView {
    const [lon, lat] = doc.location?.coordinates ?? [0, 0];
    const mine = Boolean(userId) && String(doc.createdBy) === userId;
    return {
      id: String(doc._id),
      name: doc.name,
      category: doc.category,
      description: doc.description ?? "",
      phone: doc.phone ?? "",
      website: doc.website ?? "",
      openingHours: doc.openingHours ?? "",
      addressText: doc.addressText ?? "",
      countryCode: doc.countryCode ?? "",
      department: doc.department ?? "",
      commune: doc.commune ?? "",
      neighborhood: doc.neighborhood ?? "",
      latitude: lat,
      longitude: lon,
      status: doc.status,
      // The reviewer's note is for the person who added the place.
      reviewNote: mine ? (doc.reviewNote ?? "") : "",
      submittedAt: iso(doc.submittedAt ?? doc.createdAt),
      reviewedAt: iso(doc.reviewedAt),
      mine,
    };
  }

  /* ---------------------------------------------------------------- notifications */

  private async notify(recipientId: string, title: string, message: string, link: string, entityId: string) {
    if (!this.notifications || !Types.ObjectId.isValid(recipientId)) return;
    try {
      await this.notifications.create({ recipientId, type: "SYSTEM", title, message, link, entityId, entityType: "map_public_place" });
    } catch (error) {
      this.logger.warn(`Could not notify ${recipientId}: ${String(error)}`);
    }
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
      .find({ isActive: { $ne: false }, $or: [{ role: { $in: REVIEWER_ROLES } }, { isSuperAdmin: true }, ...(roleIds.length ? [{ adminRoleId: { $in: roleIds } }] : [])] })
      .select("_id")
      .limit(50)
      .lean()
      .exec()
      .catch(() => [])) as any[];
    const ids = rows.map((r) => String(r._id));
    this.reviewerCache = { at: Date.now(), ids };
    return ids;
  }

  private async notifyReviewers(doc: any, edited: boolean) {
    try {
      const owner = String(doc.createdBy ?? "");
      const ids = (await this.reviewerIds()).filter((id) => id !== owner);
      const where = [doc.neighborhood, doc.commune, doc.countryCode].filter(Boolean).join(", ");
      await Promise.all(
        ids.map((id) =>
          this.notify(id, edited ? "Map place changed — review again" : "New place to review", `${doc.name}${where ? ` — ${where}` : ""}`, `/admin/map/places/${String(doc._id)}`, String(doc._id)),
        ),
      );
    } catch (error) {
      this.logger.warn(`Could not notify reviewers: ${String(error)}`);
    }
  }

  /* ---------------------------------------------------------------- helpers */

  private userObjectId(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new ForbiddenException("Sign in to add places.");
    return new Types.ObjectId(userId);
  }

  private async findDoc(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Place not found.");
    const doc = await this.places.findById(id).exec();
    if (!doc) throw new NotFoundException("Place not found.");
    return doc;
  }

  /** Fill department / commune / neighbourhood from the pin when they're empty. */
  private async fillArea(target: { countryCode?: string; department?: string; commune?: string; neighborhood?: string }, lat: number, lon: number) {
    if (target.countryCode && target.department && target.commune && target.neighborhood) return;
    try {
      const r = await this.geo.reverse(lat, lon);
      target.countryCode = target.countryCode || r.countryCode;
      target.department = target.department || r.department;
      target.commune = target.commune || r.commune;
      target.neighborhood = target.neighborhood || r.neighborhood;
    } catch {
      /* the address lookup is optional */
    }
  }

  /* ---------------------------------------------------------------- people */

  async create(userId: string, dto: SavePublicPlaceDto) {
    const createdBy = this.userObjectId(userId);
    const pending = await this.places.countDocuments({ createdBy, status: "pending" }).exec();
    if (pending >= MAX_PENDING_PER_USER) throw new BadRequestException(`You have ${pending} places waiting for review. Add more once some are reviewed.`);

    const area = { countryCode: dto.countryCode?.toUpperCase(), department: dto.department, commune: dto.commune, neighborhood: dto.neighborhood };
    await this.fillArea(area, dto.latitude, dto.longitude);
    const now = new Date();
    const doc = await this.places.create({
      name: dto.name,
      category: dto.category,
      description: dto.description ?? "",
      phone: dto.phone ?? "",
      website: cleanWebsite(dto.website),
      openingHours: dto.openingHours ?? "",
      addressText: dto.addressText ?? "",
      countryCode: String(area.countryCode ?? "").toUpperCase().slice(0, 2),
      department: area.department ?? "",
      commune: area.commune ?? "",
      neighborhood: area.neighborhood ?? "",
      location: { type: "Point", coordinates: [dto.longitude, dto.latitude] },
      createdBy,
      status: "pending",
      submittedAt: now,
      history: [{ action: "submitted", by: createdBy, at: now, note: "" }],
    });
    void this.notifyReviewers(doc, false);
    return this.view(doc.toObject(), userId);
  }

  async mine(userId: string) {
    const createdBy = this.userObjectId(userId);
    const rows = await this.places.find({ createdBy, status: { $ne: "removed" } }).sort({ submittedAt: -1 }).limit(200).lean().exec();
    return rows.map((r) => this.view(r, userId));
  }

  /** Editing sends the place back for review (it leaves the public map until approved again). */
  async update(userId: string, id: string, dto: UpdatePublicPlaceDto) {
    const doc = await this.findDoc(id);
    if (String(doc.createdBy) !== userId) throw new ForbiddenException("Only the person who added this place can change it.");
    if (doc.status === "removed") throw new BadRequestException("This place was removed from the map.");
    const set: Record<string, unknown> = {};
    for (const key of ["name", "category", "description", "phone", "openingHours", "addressText", "department", "commune", "neighborhood"] as const) {
      if (dto[key] !== undefined) set[key] = dto[key];
    }
    if (dto.website !== undefined) set.website = cleanWebsite(dto.website);
    if (dto.countryCode !== undefined) set.countryCode = dto.countryCode.toUpperCase();
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const [lon0, lat0] = doc.location.coordinates;
      set.location = { type: "Point", coordinates: [dto.longitude ?? lon0, dto.latitude ?? lat0] };
    }
    if (!Object.keys(set).length) return this.view(doc.toObject(), userId);
    const now = new Date();
    Object.assign(doc, set, { status: "pending", reviewNote: "", submittedAt: now });
    doc.history.push({ action: "edited", by: new Types.ObjectId(userId), at: now, note: "" });
    await doc.save();
    void this.notifyReviewers(doc, true);
    return this.view(doc.toObject(), userId);
  }

  async withdraw(userId: string, id: string) {
    const doc = await this.findDoc(id);
    if (String(doc.createdBy) !== userId) throw new ForbiddenException("Only the person who added this place can remove it.");
    doc.status = "removed";
    doc.history.push({ action: "withdrawn", by: new Types.ObjectId(userId), at: new Date(), note: "" });
    await doc.save();
    return { removed: true };
  }

  /** Approved places, or the viewer's own place in any state. */
  async getOne(id: string, userId = "") {
    const doc = await this.findDoc(id);
    const own = Boolean(userId) && String(doc.createdBy) === userId;
    if (doc.status !== "approved" && !own) throw new NotFoundException("Place not found.");
    return this.view(doc.toObject(), userId);
  }

  /** Approved places in the visible map area (most recently reviewed first). */
  async inBounds(b: { south: number; west: number; north: number; east: number }, category?: string) {
    const vals = [b.south, b.west, b.north, b.east];
    if (vals.some((v) => !Number.isFinite(v)) || b.south > b.north || Math.abs(b.south) > 90 || Math.abs(b.north) > 90) throw new BadRequestException("Invalid map area.");
    // Very large areas (a whole country) are capped; the map asks again as people zoom in.
    const west = Math.max(-180, b.west);
    const east = Math.min(180, b.east);
    const filter: Record<string, unknown> = {
      status: "approved",
      location: { $geoWithin: { $box: [[west, b.south], [east, b.north]] } },
    };
    if (category && /^[a-z]{2,20}$/.test(category)) filter.category = category;
    const rows = await this.places.find(filter as any).sort({ reviewedAt: -1 }).limit(300).lean().exec();
    return rows.map((r) => this.view(r));
  }

  /** Used by search: approved places whose name or description matches. */
  async search(query: string, cc?: string) {
    const q = query.trim().slice(0, 80);
    if (q.length < 2) return [];
    const re = new RegExp(escapeRegex(q), "i");
    const filter: Record<string, unknown> = { status: "approved", $or: [{ name: re }, { addressText: re }, { neighborhood: re }, { commune: re }] };
    if (cc && /^[a-z]{2}$/i.test(cc)) filter.countryCode = { $in: [cc.toUpperCase(), ""] };
    const rows = await this.places.find(filter as any).limit(6).lean().exec().catch(() => [] as any[]);
    return rows.map((r) => this.view(r));
  }

  /* ---------------------------------------------------------------- reviewers */

  private filterFor(status: PublicPlaceStatus | null) {
    return status ? { status } : { status: { $ne: "removed" } };
  }

  async counts() {
    const entries = await Promise.all(PUBLIC_PLACE_STATUSES.map(async (s) => [s, await this.places.countDocuments({ status: s }).exec()] as const));
    return Object.fromEntries(entries) as Record<PublicPlaceStatus, number>;
  }

  private async usersById(ids: unknown[]) {
    const userModel = this.connection?.models["User"];
    const valid = Array.from(new Set(ids.map((id) => String(id ?? "")).filter((id) => Types.ObjectId.isValid(id))));
    if (!userModel || !valid.length) return new Map<string, any>();
    const rows = (await userModel
      .find({ _id: { $in: valid.map((id) => new Types.ObjectId(id)) } })
      .select("username firstName lastName name profilePicture avatar")
      .lean()
      .exec()
      .catch(() => [])) as any[];
    return new Map(rows.map((r) => [String(r._id), r]));
  }

  private person(user: any) {
    if (!user) return null;
    return {
      id: String(user._id),
      username: String(user.username ?? ""),
      name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || String(user.username ?? ""),
      avatar: String(user.profilePicture ?? user.avatar ?? ""),
    };
  }

  async adminList(query: { status?: string; q?: string; country?: string; page?: string | number }) {
    const status = (PUBLIC_PLACE_STATUSES as readonly string[]).includes(String(query.status)) ? (query.status as PublicPlaceStatus) : null;
    const page = Math.max(1, Math.min(500, Number(query.page) || 1));
    const filter: Record<string, unknown> = { ...this.filterFor(status) };
    const cc = String(query.country ?? "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cc)) filter.countryCode = cc;
    const q = String(query.q ?? "").trim().slice(0, 80);
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: re }, { neighborhood: re }, { commune: re }, { addressText: re }, { description: re }];
    }
    const sort: Record<string, 1 | -1> = !status || status === "pending" ? { submittedAt: 1 } : { reviewedAt: -1, updatedAt: -1 };
    const [rows, total, counts] = await Promise.all([
      this.places.find(filter as any).sort(sort).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.places.countDocuments(filter as any).exec(),
      this.counts(),
    ]);
    const people = await this.usersById(rows.map((r: any) => r.createdBy));
    return {
      items: rows.map((r: any) => ({ ...this.view(r), reviewNote: r.reviewNote ?? "", addedBy: this.person(people.get(String(r.createdBy))) })),
      page,
      total,
      hasMore: page * PAGE_SIZE < total,
      counts,
    };
  }

  async adminDetail(id: string) {
    const doc = (await this.findDoc(id)).toObject() as any;
    const [lon, lat] = doc.location.coordinates;
    const nearbyRows = await this.places
      .find({ _id: { $ne: doc._id }, status: { $in: ["pending", "approved"] }, location: { $nearSphere: { $geometry: { type: "Point", coordinates: [lon, lat] }, $maxDistance: DUPLICATE_METERS } } } as any)
      .limit(10)
      .lean()
      .exec()
      .catch(() => [] as any[]);
    const people = await this.usersById([doc.createdBy, ...(doc.history ?? []).map((h: any) => h.by)]);
    const owned = await this.places.countDocuments({ createdBy: doc.createdBy, status: "approved" }).exec();
    return {
      ...this.view(doc),
      reviewNote: doc.reviewNote ?? "",
      addedBy: this.person(people.get(String(doc.createdBy))),
      addedByApprovedCount: owned,
      history: (doc.history ?? []).map((h: any) => ({ action: h.action, at: iso(h.at), note: h.note ?? "", by: this.person(people.get(String(h.by))) })),
      nearby: nearbyRows.map((n: any) => {
        const [nlon, nlat] = n.location.coordinates;
        return {
          id: String(n._id),
          name: n.name,
          category: n.category,
          status: n.status,
          latitude: nlat,
          longitude: nlon,
          distanceM: Math.round(haversineMeters({ lat, lon }, { lat: nlat, lon: nlon })),
          sameName: String(n.name).trim().toLowerCase() === String(doc.name).trim().toLowerCase(),
        };
      }),
    };
  }

  async review(actor: Actor, id: string, action: "approve" | "reject" | "remove", note = "") {
    const doc = await this.findDoc(id);
    const reviewer = actorId(actor);
    if (String(doc.createdBy) === reviewer && !isSuperAdmin(actor)) throw new ForbiddenException("Someone else has to review a place you added.");
    const text = String(note ?? "").trim().slice(0, 500);
    if (action === "reject" && text.length < 3) throw new BadRequestException("Tell the person why the place wasn't approved.");
    const next: PublicPlaceStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "removed";
    const now = new Date();
    const by = Types.ObjectId.isValid(reviewer) ? new Types.ObjectId(reviewer) : null;
    doc.status = next;
    doc.reviewNote = text;
    doc.reviewedAt = now;
    doc.reviewedBy = by;
    doc.history.push({ action: next === "approved" ? "approved" : next === "rejected" ? "rejected" : "removed", by, at: now, note: text });
    await doc.save();

    const link = `/map?public=${String(doc._id)}`;
    const owner = String(doc.createdBy);
    if (next === "approved") await this.notify(owner, "Your place is on Fockis Maps", `${doc.name} is now visible to everyone.${text ? ` ${text}` : ""}`, link, String(doc._id));
    else if (next === "rejected") await this.notify(owner, "Place not added to the map", `${doc.name}: ${text}`, link, String(doc._id));
    else await this.notify(owner, "Place removed from the map", `${doc.name}${text ? `: ${text}` : ""}`, link, String(doc._id));
    return this.adminDetail(id);
  }
}
