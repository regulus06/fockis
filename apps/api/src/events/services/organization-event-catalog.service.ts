/* ============================================================================
   ORGANIZATION EVENT CATALOG
   apps/api/src/events/services/organization-event-catalog.service.ts

   The lists an organization uses when it creates events: event types,
   categories, saved locations and event templates. Stored on the existing
   organization_preferences document (field `eventCatalog`), next to the
   organization's time zone. No new collection.

   Only event managers (owner, or an administrator with Manage events) can
   read or change it; every value is validated here.
============================================================================ */

import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { isOrgEventManager } from "../utils/org-manager";
import { sanitizeEventHtml, textLength } from "../utils/rich-text";

export interface CatalogItem {
  id: string;
  name: string;
  archived: boolean;
}

export interface CatalogLocation extends CatalogItem {
  address: string;
}

export interface CatalogTemplate extends CatalogItem {
  title: string;
  eventType: string;
  orgCategory: string;
  description: string;
  durationMinutes: number;
  locationName: string;
  address: string;
  format: "in_person" | "online" | "hybrid";
  requireRsvp: boolean;
  showOnPublicPage: boolean;
}

export interface EventCatalog {
  timeZone: string;
  types: CatalogItem[];
  categories: CatalogItem[];
  locations: CatalogLocation[];
  templates: CatalogTemplate[];
}

const MAX_ITEMS = 60;
const SAFE_ID = /^[a-z0-9_-]{1,60}$/;

const CHURCH_TYPES = new Set(["church", "ministry", "parish", "congregation", "christian", "chapel", "cathedral", "faith"]);

function defaultTypes(orgType: string): CatalogItem[] {
  const church: [string, string][] = [
    ["service", "Church Service"],
    ["bible_study", "Bible Study"],
    ["prayer", "Prayer Meeting"],
    ["youth", "Youth Event"],
    ["conference", "Conference"],
    ["outreach", "Outreach"],
    ["meeting", "Meeting"],
    ["special", "Special Event"],
  ];
  const general: [string, string][] = [
    ["meeting", "Meeting"],
    ["workshop", "Workshop"],
    ["training", "Training"],
    ["conference", "Conference"],
    ["social", "Social Event"],
    ["fundraiser", "Fundraiser"],
    ["special", "Special Event"],
  ];
  return (CHURCH_TYPES.has(orgType.toLowerCase()) ? church : general).map(([id, name]) => ({ id, name, archived: false }));
}

function text(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "item"
  );
}

function list<T extends CatalogItem>(raw: unknown, label: string, extra: (o: Record<string, unknown>, base: CatalogItem) => T): T[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new BadRequestException(`${label} must be a list.`);
  if (raw.length > MAX_ITEMS) throw new BadRequestException(`At most ${MAX_ITEMS} ${label.toLowerCase()}.`);
  const seen = new Set<string>();
  return raw.map((r, i) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const name = text(o.name, 60);
    if (!name) throw new BadRequestException(`${label}: item ${i + 1} needs a name.`);
    let id = SAFE_ID.test(String(o.id ?? "")) ? String(o.id) : slug(name);
    let n = 2;
    const root = id;
    while (seen.has(id)) id = `${root}_${n++}`.slice(0, 60);
    seen.add(id);
    return extra(o, { id, name, archived: o.archived === true });
  });
}

@Injectable()
export class OrganizationEventCatalogService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private async requireManager(organizationId: string, userId: string): Promise<Types.ObjectId> {
    if (!Types.ObjectId.isValid(organizationId)) throw new BadRequestException("Invalid organization.");
    const org = new Types.ObjectId(organizationId);
    if (!(await isOrgEventManager(this.connection, org, userId))) {
      throw new ForbiddenException("You need the Manage events permission of this organization.");
    }
    return org;
  }

  async get(organizationId: string, userId: string): Promise<EventCatalog> {
    const org = await this.requireManager(organizationId, userId);
    const [prefs, organization] = await Promise.all([
      this.connection
        .collection("organization_preferences")
        .findOne({ organizationId: org }, { projection: { timeZone: 1, eventCatalog: 1 } }),
      this.connection.collection("church_organizations").findOne({ _id: org }, { projection: { organizationType: 1 } }),
    ]);
    const c = (prefs?.eventCatalog ?? {}) as Partial<EventCatalog>;
    const types = Array.isArray(c.types) && c.types.length ? c.types : defaultTypes(String(organization?.organizationType ?? ""));
    return {
      timeZone: String(prefs?.timeZone ?? ""),
      types,
      categories: Array.isArray(c.categories) ? c.categories : [],
      locations: Array.isArray(c.locations) ? c.locations : [],
      templates: Array.isArray(c.templates) ? c.templates : [],
    };
  }

  /** Replaces the lists that are sent; lists that are left out stay as they are. */
  async save(organizationId: string, userId: string, body: Record<string, unknown>): Promise<EventCatalog> {
    const org = await this.requireManager(organizationId, userId);
    const set: Record<string, unknown> = {};

    if (body.types !== undefined) {
      set["eventCatalog.types"] = list(body.types, "Event types", (_o, b) => b);
    }
    if (body.categories !== undefined) {
      set["eventCatalog.categories"] = list(body.categories, "Categories", (_o, b) => b);
    }
    if (body.locations !== undefined) {
      set["eventCatalog.locations"] = list(body.locations, "Locations", (o, b) => ({ ...b, address: text(o.address, 200) }));
    }
    if (body.templates !== undefined) {
      set["eventCatalog.templates"] = list(body.templates, "Templates", (o, b) => {
        const description = sanitizeEventHtml(String(o.description ?? "").trim());
        if (textLength(description) > 2000) throw new BadRequestException(`Template "${b.name}": the description can be at most 2,000 characters.`);
        const format = o.format === "online" || o.format === "hybrid" ? o.format : "in_person";
        const eventType = String(o.eventType ?? "");
        const orgCategory = String(o.orgCategory ?? "");
        return {
          ...b,
          title: text(o.title, 140),
          eventType: SAFE_ID.test(eventType) ? eventType : "",
          orgCategory: SAFE_ID.test(orgCategory) ? orgCategory : "",
          description,
          durationMinutes: Math.min(7 * 24 * 60, Math.max(15, Math.round(Number(o.durationMinutes) || 60))),
          locationName: text(o.locationName, 140),
          address: text(o.address, 200),
          format,
          requireRsvp: o.requireRsvp === true,
          showOnPublicPage: o.showOnPublicPage !== false,
        } as CatalogTemplate;
      });
    }
    if (!Object.keys(set).length) return this.get(organizationId, userId);

    await this.connection.collection("organization_preferences").updateOne(
      { organizationId: org },
      { $set: { ...set, updatedByUserId: new Types.ObjectId(userId), updatedAt: new Date() }, $setOnInsert: { organizationId: org, catalogOnly: true, createdAt: new Date() } },
      { upsert: true },
    );
    return this.get(organizationId, userId);
  }
}
