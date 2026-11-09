import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomBytes } from "crypto";
import { Model, Types } from "mongoose";

import { encodePlusCode } from "../geo/geo-utils";
import { MapCounter, MapCounterDocument, SavedLocation, SavedLocationDocument, SavedRoute, SavedRouteDocument } from "./place.schemas";
import { SaveLocationDto, SaveRouteDto, UpdateLocationDto } from "./places.dto";
import { AddressVerificationService, statusOf } from "./address-verification.service";

const MAX_LOCATIONS = 50;
const MAX_ROUTES = 50;
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);

@Injectable()
export class PlacesService {
  constructor(
    @InjectModel(SavedLocation.name) private readonly locations: Model<SavedLocationDocument>,
    @InjectModel(MapCounter.name) private readonly counters: Model<MapCounterDocument>,
    @InjectModel(SavedRoute.name) private readonly routes: Model<SavedRouteDocument>,
    @Optional() private readonly verification?: AddressVerificationService,
  ) {}

  private oid(id: string, what = "user") {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(id);
  }

  /* ---------------------------------------------------------------- views */

  view(doc: any) {
    const [lon, lat] = doc.location?.coordinates ?? [0, 0];
    return {
      id: String(doc._id),
      kind: doc.kind,
      label: doc.label,
      smartAddressId: doc.smartAddressId,
      plusCode: doc.plusCode,
      latitude: lat,
      longitude: lon,
      accuracyM: doc.accuracyM ?? 0,
      captureMethod: doc.captureMethod ?? "pin",
      building: doc.building ?? { source: "pin" },
      country: doc.country ?? "",
      countryCode: doc.countryCode ?? "",
      department: doc.department ?? "",
      commune: doc.commune ?? "",
      communalSection: doc.communalSection ?? "",
      neighborhood: doc.neighborhood ?? "",
      locality: doc.locality ?? "",
      streetAddress: doc.streetAddress ?? "",
      landmarks: doc.landmarks ?? [],
      directions: doc.directions ?? "",
      isDefault: Boolean(doc.isDefault),
      verification: {
        status: statusOf(doc),
        note: statusOf(doc) === "pending" ? "" : doc.verificationNote ?? "",
        requestedAt: iso(doc.verificationRequestedAt ?? doc.createdAt),
        reviewedAt: iso(doc.verificationReviewedAt),
      },
      shared: Boolean(doc.shareToken && (!doc.shareExpiresAt || new Date(doc.shareExpiresAt) > new Date())),
      shareExpiresAt: iso(doc.shareExpiresAt),
      createdAt: iso(doc.createdAt),
      updatedAt: iso(doc.updatedAt),
    };
  }

  /** What someone with a share link may see. */
  private sharedView(doc: any) {
    const v = this.view(doc);
    return {
      label: v.label,
      kind: v.kind,
      smartAddressId: v.smartAddressId,
      plusCode: v.plusCode,
      latitude: v.latitude,
      longitude: v.longitude,
      building: v.building,
      department: v.department,
      commune: v.commune,
      communalSection: v.communalSection,
      neighborhood: v.neighborhood,
      locality: v.locality,
      streetAddress: v.streetAddress,
      landmarks: v.landmarks,
      directions: v.directions,
      expiresAt: v.shareExpiresAt,
    };
  }

  /* ---------------------------------------------------------------- helpers */

  private async nextSmartAddressId(countryCode: string) {
    const cc = (countryCode || "HT").toUpperCase();
    const counter = (await this.counters
      .findOneAndUpdate({ _id: `FSA-${cc}` }, { $inc: { seq: 1 } }, { upsert: true, new: true })
      .lean()
      .exec()) as any;
    return `FSA-${cc}-${String(counter.seq).padStart(6, "0")}`;
  }

  private cleanFootprint(building?: SaveLocationDto["building"]) {
    if (!building) return undefined;
    const fp = building.footprint;
    let footprint: { type: "Polygon"; coordinates: number[][][] } | null = null;
    if (fp && fp.type === "Polygon" && Array.isArray(fp.coordinates) && Array.isArray(fp.coordinates[0])) {
      const ring = fp.coordinates[0]
        .filter((p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)
        .slice(0, 200)
        .map((p) => [Number(p[0]), Number(p[1])]);
      if (ring.length >= 4) footprint = { type: "Polygon", coordinates: [ring] };
    }
    return { source: building.source === "osm" && footprint ? ("osm" as const) : ("pin" as const), osmId: String(building.osmId ?? "").slice(0, 40), footprint };
  }

  private landmarks(list?: SaveLocationDto["landmarks"]) {
    return (list ?? []).slice(0, 5).map((l) => ({ name: l.name.trim(), relation: l.relation ?? "near" }));
  }

  private async ownDoc(userId: string, id: string) {
    const doc = await this.locations.findOne({ _id: this.oid(id, "location"), userId: this.oid(userId) }).lean().exec();
    if (!doc) throw new NotFoundException("Location not found.");
    return doc as any;
  }

  private async clearDefault(userId: string, kind: string, exceptId?: string) {
    const filter: any = { userId: this.oid(userId), kind, isDefault: true };
    if (exceptId) filter._id = { $ne: this.oid(exceptId, "location") };
    await this.locations.updateMany(filter, { $set: { isDefault: false } }).exec();
  }

  /* ---------------------------------------------------------------- CRUD */

  async list(userId: string, kind?: string) {
    const filter: any = { userId: this.oid(userId) };
    if (kind) filter.kind = kind;
    const rows = (await this.locations.find(filter).sort({ isDefault: -1, updatedAt: -1 }).limit(MAX_LOCATIONS).lean().exec()) as any[];
    return rows.map((r) => this.view(r));
  }

  async get(userId: string, id: string) {
    return this.view(await this.ownDoc(userId, id));
  }

  async create(userId: string, dto: SaveLocationDto) {
    const uid = this.oid(userId);
    const count = await this.locations.countDocuments({ userId: uid }).exec();
    if (count >= MAX_LOCATIONS) throw new BadRequestException(`You can save up to ${MAX_LOCATIONS} places.`);

    const countryCode = (dto.countryCode || "HT").toUpperCase();
    const kind = dto.kind ?? "saved";
    // Only one home and one work place.
    if (kind === "home" || kind === "work") {
      const existing = await this.locations.exists({ userId: uid, kind }).exec();
      if (existing) throw new BadRequestException(`You already have a ${kind} location. Edit it instead.`);
    }
    const landmarks = this.landmarks(dto.landmarks);
    const created = await this.locations.create({
      userId: uid,
      kind,
      label: dto.label,
      smartAddressId: await this.nextSmartAddressId(countryCode),
      plusCode: encodePlusCode(dto.latitude, dto.longitude, 11),
      location: { type: "Point", coordinates: [dto.longitude, dto.latitude] },
      accuracyM: dto.accuracyM ?? 0,
      captureMethod: dto.captureMethod ?? "pin",
      building: this.cleanFootprint(dto.building) ?? { source: "pin", osmId: "", footprint: null },
      country: dto.country ?? (countryCode === "HT" ? "Haiti" : ""),
      countryCode,
      department: dto.department ?? "",
      commune: dto.commune ?? "",
      communalSection: dto.communalSection ?? "",
      neighborhood: dto.neighborhood ?? "",
      locality: dto.locality ?? "",
      streetAddress: dto.streetAddress ?? "",
      landmarks,
      landmarkText: landmarks.map((l) => l.name).join(" | "),
      directions: dto.directions ?? "",
      isDefault: Boolean(dto.isDefault) || kind === "home",
      shareToken: null,
      shareExpiresAt: null,
      // Every new address goes to Fockis staff for verification.
      verificationStatus: "pending",
      verificationRequestedAt: new Date(),
      verificationReviewedAt: null,
      verificationReviewedBy: null,
      verificationNote: "",
      verificationHistory: [{ action: "submitted", by: uid, at: new Date(), note: "" }],
    });
    if (created.isDefault) await this.clearDefault(userId, kind, String(created._id));
    void this.verification?.notifyReviewers((created as any).toObject ? (created as any).toObject() : created, "submitted");
    return this.get(userId, String(created._id));
  }

  async update(userId: string, id: string, dto: UpdateLocationDto) {
    const doc = await this.ownDoc(userId, id);
    const set: Record<string, unknown> = {};
    for (const key of ["label", "department", "commune", "communalSection", "neighborhood", "locality", "streetAddress", "directions", "country", "accuracyM", "captureMethod"] as const) {
      if (dto[key] !== undefined) set[key] = dto[key];
    }
    if (dto.kind && dto.kind !== doc.kind) {
      if ((dto.kind === "home" || dto.kind === "work") && (await this.locations.exists({ userId: this.oid(userId), kind: dto.kind, _id: { $ne: doc._id } }).exec())) {
        throw new BadRequestException(`You already have a ${dto.kind} location.`);
      }
      set.kind = dto.kind;
    }
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const lat = dto.latitude ?? doc.location.coordinates[1];
      const lon = dto.longitude ?? doc.location.coordinates[0];
      set.location = { type: "Point", coordinates: [lon, lat] };
      set.plusCode = encodePlusCode(lat, lon, 11);
      // The Smart Address ID stays the same when the pin is adjusted.
    }
    if (dto.building) set.building = this.cleanFootprint(dto.building);
    if (dto.landmarks) {
      const landmarks = this.landmarks(dto.landmarks);
      set.landmarks = landmarks;
      set.landmarkText = landmarks.map((l) => l.name).join(" | ");
    }
    if (dto.isDefault !== undefined) set.isDefault = dto.isDefault;

    // Moving the pin or changing the address sends it back for review.
    // Renaming it, or changing home/work/default, doesn't.
    const status = statusOf(doc);
    const reviewAgain = status !== "pending" && this.changesAddress(doc, set);
    const update: Record<string, unknown> = { $set: set };
    if (reviewAgain) {
      const action = status === "verified" ? "changed" : "resubmitted";
      Object.assign(set, { verificationStatus: "pending", verificationRequestedAt: new Date(), verificationNote: "" });
      update.$push = { verificationHistory: { $each: [{ action, by: doc.userId, at: new Date(), note: "" }], $slice: -50 } };
    }
    await this.locations.updateOne({ _id: doc._id }, update).exec();
    if (set.isDefault) await this.clearDefault(userId, String(set.kind ?? doc.kind), id);
    if (reviewAgain) void this.verification?.notifyReviewers({ ...doc, ...set }, status === "verified" ? "changed" : "resubmitted");
    return this.get(userId, id);
  }

  private changesAddress(doc: any, set: Record<string, unknown>) {
    const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    if (set.location) {
      const [lon, lat] = (set.location as any).coordinates;
      const [oldLon, oldLat] = doc.location?.coordinates ?? [0, 0];
      if (Math.abs(lon - oldLon) > 1e-6 || Math.abs(lat - oldLat) > 1e-6) return true;
    }
    if (set.building) {
      const b = set.building as any;
      const old = doc.building ?? {};
      if ((b.source ?? "pin") !== (old.source ?? "pin") || String(b.osmId ?? "") !== String(old.osmId ?? "") || !same(b.footprint, old.footprint)) return true;
    }
    if (set.landmarks && !same(set.landmarks, (doc.landmarks ?? []).map((l: any) => ({ name: l.name, relation: l.relation ?? "near" })))) return true;
    return ["country", "department", "commune", "communalSection", "neighborhood", "locality", "streetAddress", "directions"].some(
      (key) => set[key] !== undefined && String(set[key] ?? "") !== String(doc[key] ?? ""),
    );
  }

  /** After "needs info" or "rejected": send it back without changing anything (with an optional reply). */
  async requestVerification(userId: string, id: string, message?: string) {
    const doc = await this.ownDoc(userId, id);
    const status = statusOf(doc);
    if (status === "pending") throw new ConflictException("This address is already waiting for review.");
    if (status === "verified") throw new ConflictException("This address is already verified.");
    const note = String(message ?? "").trim().slice(0, 500);
    await this.locations
      .updateOne(
        { _id: doc._id, verificationStatus: status },
        {
          $set: { verificationStatus: "pending", verificationRequestedAt: new Date(), verificationNote: "" },
          $push: { verificationHistory: { $each: [{ action: "resubmitted", by: doc.userId, at: new Date(), note }], $slice: -50 } },
        } as any,
      )
      .exec();
    void this.verification?.notifyReviewers(doc, "resubmitted");
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const doc = await this.ownDoc(userId, id);
    await this.locations.deleteOne({ _id: doc._id }).exec();
    return { removed: true };
  }

  /* ---------------------------------------------------------------- sharing */

  async share(userId: string, id: string, days = 30) {
    const doc = await this.ownDoc(userId, id);
    const token = doc.shareToken && (!doc.shareExpiresAt || new Date(doc.shareExpiresAt) > new Date()) ? doc.shareToken : randomBytes(18).toString("base64url");
    const expires = new Date(Date.now() + Math.min(Math.max(days, 1), 365) * 86_400_000);
    await this.locations.updateOne({ _id: doc._id }, { $set: { shareToken: token, shareExpiresAt: expires } }).exec();
    return { token, expiresAt: expires.toISOString(), path: `/map/p/${token}` };
  }

  async unshare(userId: string, id: string) {
    const doc = await this.ownDoc(userId, id);
    await this.locations.updateOne({ _id: doc._id }, { $set: { shareToken: null, shareExpiresAt: null } }).exec();
    return { shared: false };
  }

  async shared(token: string) {
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(token ?? ""))) throw new NotFoundException("This link isn't valid.");
    const doc = (await this.locations.findOne({ shareToken: token }).lean().exec()) as any;
    if (!doc) throw new NotFoundException("This link isn't valid.");
    if (doc.shareExpiresAt && new Date(doc.shareExpiresAt) <= new Date()) throw new ForbiddenException("This link has expired.");
    return this.sharedView(doc);
  }

  /* ---------------------------------------------------------------- saved routes */

  private routeView(r: any) {
    return {
      id: String(r._id),
      name: r.name,
      origin: r.origin,
      destination: r.destination,
      mode: r.mode,
      distanceM: r.distanceM ?? 0,
      durationS: r.durationS ?? 0,
      summary: r.summary ?? "",
      createdAt: iso(r.createdAt),
    };
  }

  async listRoutes(userId: string) {
    const rows = (await this.routes.find({ userId: this.oid(userId) }).sort({ createdAt: -1 }).limit(MAX_ROUTES).lean().exec()) as any[];
    return rows.map((r) => this.routeView(r));
  }

  async saveRoute(userId: string, dto: SaveRouteDto) {
    const uid = this.oid(userId);
    if ((await this.routes.countDocuments({ userId: uid }).exec()) >= MAX_ROUTES) throw new BadRequestException(`You can save up to ${MAX_ROUTES} routes.`);
    const created = await this.routes.create({
      userId: uid,
      name: dto.name,
      origin: { label: dto.origin.label ?? "", lat: dto.origin.lat, lon: dto.origin.lon },
      destination: { label: dto.destination.label ?? "", lat: dto.destination.lat, lon: dto.destination.lon },
      mode: dto.mode,
      distanceM: dto.distanceM ?? 0,
      durationS: dto.durationS ?? 0,
      summary: dto.summary ?? "",
    });
    return this.routeView((created as any).toObject ? (created as any).toObject() : created);
  }

  async removeRoute(userId: string, id: string) {
    const res: any = await this.routes.deleteOne({ _id: this.oid(id, "route"), userId: this.oid(userId) }).exec();
    if (!res?.deletedCount) throw new NotFoundException("Route not found.");
    return { removed: true };
  }
}
