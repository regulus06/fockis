/**
 * organization-handles.service.ts
 * -----------------------------------------------------------------------------
 * An organization's public name ("handle"): fockis.com/o/<handle> and, once
 * DNS is set up, <its Fockis domain>.
 *
 *   - Starts as the organization's Fockis domain prefix
 *     ("methodiste.fockis.church" → "methodiste"); if another organization
 *     already uses it, a number is added.
 *   - Never changes by itself. The owner can rename it; old names keep
 *     working and send visitors (and Google) to the new one.
 *   - A name can only belong to one organization, including old names.
 *   - Only active, discoverable organizations are listed in the sitemap.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { FOCKIS_ORGANIZATION_DOMAIN_SUFFIXES, Organization, OrganizationDocument } from "../schemas/organization.schema";
import { OrganizationStatus } from "../../enums/organization-status.enum";
import { handleCandidates, handleProblem, isOrganizationHost, normalizeHandle, shareHtml, sitemapXml } from "./organization-handles";

type Lean = Record<string, any>;
const MAX_PREVIOUS = 20;

export interface ResolvedOrganization {
  organizationId: string;
  handle: string;
  /** true when the name asked for is an old name (or the ID): show the current one. */
  redirect: boolean;
}

@Injectable()
export class OrganizationHandlesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("OrganizationHandles");
  private timer: NodeJS.Timeout | null = null;

  constructor(@InjectModel(Organization.name) private readonly organizationModel: Model<OrganizationDocument>) {}

  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    // Give every existing organization a public name (in the background).
    setTimeout(() => void this.backfill(), 20_000).unref?.();
    this.timer = setInterval(() => void this.backfill(), 10 * 60 * 1000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /* ------------------------------------------------------------------ names */

  /** Public site address used for links, sitemap and previews. */
  siteUrl(): string {
    return String(process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || "https://www.fockis.com").trim().replace(/\/+$/, "");
  }

  publicUrl(handle: string): string {
    return `${this.siteUrl()}/o/${encodeURIComponent(handle)}`;
  }

  /** Is this name free for this organization (not used now or before by another one)? */
  async isAvailable(handle: string, exceptOrgId?: Types.ObjectId | string): Promise<boolean> {
    const other = await this.organizationModel
      .exists({
        $or: [{ handle }, { previousHandles: handle }],
        ...(exceptOrgId ? { _id: { $ne: new Types.ObjectId(String(exceptOrgId)) } } : {}),
      })
      .exec();
    return !other;
  }

  /** Gives the organization a public name if it has none. Returns the name. */
  async ensureHandle(org: Lean): Promise<string> {
    if (org.handle) return String(org.handle);
    for (const candidate of handleCandidates(org.domain, org.name, null)) {
      if (!(await this.isAvailable(candidate, org._id))) continue;
      try {
        const res = await this.organizationModel
          .updateOne({ _id: org._id, $or: [{ handle: null }, { handle: { $exists: false } }] }, { $set: { handle: candidate } })
          .exec();
        if (res.modifiedCount === 1) return candidate;
        const fresh = (await this.organizationModel.findById(org._id).select("handle").lean().exec()) as Lean | null;
        if (fresh?.handle) return String(fresh.handle);
      } catch (e) {
        if ((e as { code?: number })?.code !== 11000) throw e; // taken at the same moment: try the next name
      }
    }
    throw new ConflictException("No public name could be chosen for this organization.");
  }

  async backfill(limit = 500) {
    try {
      const missing = (await this.organizationModel
        .find({ $or: [{ handle: null }, { handle: { $exists: false } }] })
        .select("_id name domain handle")
        .limit(limit)
        .lean()
        .exec()) as Lean[];
      for (const org of missing) await this.ensureHandle(org).catch((e) => this.logger.warn(`Organization ${org._id}: ${String(e?.message ?? e)}`));
      if (missing.length) this.logger.log(`Gave ${missing.length} organization(s) a public name.`);
    } catch (e) {
      this.logger.error(`Public name backfill failed: ${String((e as Error)?.message ?? e)}`);
    }
  }

  /* -------------------------------------------------------------- resolving */

  /** By current name, old name or ID. Archived organizations are not found. */
  async resolve(nameOrId: string): Promise<ResolvedOrganization> {
    const raw = String(nameOrId ?? "").trim();
    const handle = normalizeHandle(raw);
    let org: Lean | null = null;
    let redirect = false;

    if (handle) {
      org = (await this.organizationModel.findOne({ handle }).select("_id handle name domain status").lean().exec()) as Lean | null;
      if (!org) {
        org = (await this.organizationModel.findOne({ previousHandles: handle }).select("_id handle name domain status").lean().exec()) as Lean | null;
        redirect = Boolean(org);
      }
    }
    if (!org && Types.ObjectId.isValid(raw)) {
      org = (await this.organizationModel.findById(raw).select("_id handle name domain status").lean().exec()) as Lean | null;
      redirect = Boolean(org);
    }
    if (!org || org.status === OrganizationStatus.Archived) throw new NotFoundException("Organization not found.");
    const current = await this.ensureHandle(org);
    return { organizationId: String(org._id), handle: current, redirect: redirect || current !== handle };
  }

  /** An organization's own Fockis address (e.g. methodiste.fockis.church). */
  async resolveHost(hostInput: string): Promise<ResolvedOrganization> {
    const host = String(hostInput ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
    if (!isOrganizationHost(host, FOCKIS_ORGANIZATION_DOMAIN_SUFFIXES)) throw new NotFoundException("Organization not found.");
    const org = (await this.organizationModel.findOne({ domain: host }).select("_id handle name domain status").lean().exec()) as Lean | null;
    if (!org || org.status === OrganizationStatus.Archived) throw new NotFoundException("Organization not found.");
    return { organizationId: String(org._id), handle: await this.ensureHandle(org), redirect: false };
  }

  /* --------------------------------------------------------------- renaming */

  async check(organizationId: string, userId: string, input: unknown) {
    const org = await this.ownedOrganization(organizationId, userId);
    const handle = normalizeHandle(input);
    const problem = handleProblem(handle);
    if (problem) return { handle, available: false, message: problem };
    if (handle === org.handle) return { handle, available: true, message: "This is your current link." };
    const free = await this.isAvailable(handle, org._id);
    return { handle, available: free, message: free ? "Available." : "Another organization already uses this name." };
  }

  async rename(organizationId: string, userId: string, input: unknown) {
    const org = await this.ownedOrganization(organizationId, userId);
    const current = await this.ensureHandle(org);
    const handle = normalizeHandle(input);
    const problem = handleProblem(handle);
    if (problem) throw new BadRequestException(problem);
    if (handle === current) return this.linkInfo(org._id);
    if (!(await this.isAvailable(handle, org._id))) throw new ConflictException("Another organization already uses this name.");

    const previous = [current, ...((org.previousHandles as string[] | undefined) ?? [])].filter((h) => h && h !== handle);
    try {
      const res = await this.organizationModel
        .updateOne({ _id: org._id, handle: current }, { $set: { handle, previousHandles: [...new Set(previous)].slice(0, MAX_PREVIOUS) } })
        .exec();
      if (res.modifiedCount !== 1) throw new ConflictException("The link changed at the same time. Reload and try again.");
    } catch (e) {
      if ((e as { code?: number })?.code === 11000) throw new ConflictException("Another organization already uses this name.");
      throw e;
    }
    this.logger.log(`Organization ${org._id} renamed its public link from "${current}" to "${handle}".`);
    return this.linkInfo(org._id);
  }

  async linkInfo(orgId: Types.ObjectId | string) {
    if (!Types.ObjectId.isValid(String(orgId))) throw new NotFoundException("Organization not found.");
    const org = (await this.organizationModel.findById(orgId).select("handle previousHandles domain").lean().exec()) as Lean | null;
    if (!org) throw new NotFoundException("Organization not found.");
    const handle = await this.ensureHandle(org);
    return {
      handle,
      url: this.publicUrl(handle),
      domainUrl: org.domain ? `https://${org.domain}` : null,
      previousHandles: (org.previousHandles as string[] | undefined) ?? [],
    };
  }

  /* ---------------------------------------------------- search & previews */

  async sitemap(): Promise<string> {
    const orgs = (await this.organizationModel
      .find({ status: OrganizationStatus.Active, "settings.isDiscoverable": { $ne: false }, handle: { $nin: [null, ""] } })
      .select("handle updatedAt")
      .sort({ updatedAt: -1 })
      .limit(50_000)
      .lean()
      .exec()) as Lean[];
    return sitemapXml(orgs.map((o) => ({ loc: this.publicUrl(String(o.handle)), lastmod: o.updatedAt ? new Date(o.updatedAt) : null })));
  }

  /** Link-preview page for apps that don't run JavaScript. */
  async share(nameOrId: string): Promise<{ html: string; status: number }> {
    let resolved: ResolvedOrganization;
    try {
      resolved = await this.resolve(nameOrId);
    } catch {
      return {
        status: 404,
        html: shareHtml({ title: "Fockis Organizations", description: "Churches and organizations on Fockis.", url: `${this.siteUrl()}/organizations`, image: null, siteName: "Fockis", index: false }),
      };
    }
    const org = (await this.organizationModel
      .findById(resolved.organizationId)
      .select("name tagline description bannerUrl bannerMediaType logoUrl status settings")
      .lean()
      .exec()) as Lean;
    const image = org.bannerUrl && org.bannerMediaType !== "video" ? org.bannerUrl : org.logoUrl;
    const tagline = String(org.tagline ?? "").trim();
    return {
      status: 200,
      html: shareHtml({
        title: tagline ? `${org.name} — ${tagline}` : String(org.name),
        description: String(org.description ?? "").trim() || tagline || `${org.name} on Fockis Organizations.`,
        url: this.publicUrl(resolved.handle),
        image: image ? this.absolute(String(image)) : null,
        siteName: "Fockis",
        index: org.status === OrganizationStatus.Active && org.settings?.isDiscoverable !== false,
      }),
    };
  }

  /* ---------------------------------------------------------------- helpers */

  private absolute(url: string): string | null {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/")) return `${this.siteUrl()}${url}`;
    return null;
  }

  private async ownedOrganization(organizationId: string, userId: string): Promise<Lean> {
    if (!Types.ObjectId.isValid(organizationId)) throw new BadRequestException("Invalid organization ID.");
    const org = (await this.organizationModel
      .findById(organizationId)
      .select("_id name domain handle previousHandles createdByUserId status")
      .lean()
      .exec()) as Lean | null;
    if (!org || org.status === OrganizationStatus.Archived) throw new NotFoundException("Organization not found.");
    if (!org.createdByUserId || String(org.createdByUserId) !== String(userId)) {
      throw new ForbiddenException("Only the organization's owner can change its public link.");
    }
    return org;
  }
}
