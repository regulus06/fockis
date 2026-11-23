/**
 * publicLinks.ts — an organization's public name (fockis.com/o/<handle>) and
 * its own Fockis address (<prefix>.fockis.com).
 *
 *   GET /church/public/organizations/resolve/:name   name, old name or ID
 *   GET /church/public/organizations/by-host?host=
 *   GET /church/organizations/:id/public-link        current link
 *   GET /church/organizations/:id/public-link/check  owner
 *   PUT /church/organizations/:id/public-link        owner
 */

import { churchRequest, getAuthToken } from "../api/organizationApi";

export interface ResolvedOrganization {
  organizationId: string;
  handle: string;
  redirect: boolean;
}

export interface PublicLinkInfo {
  handle: string;
  url: string;
  domainUrl: string | null;
  previousHandles: string[];
}

/** Fockis addresses an organization can own (same list as the API). */
const ORG_SUFFIXES = [".fockis.com", ".fockis.org", ".fockis.net", ".fockis.edu", ".fockis.church", ".fockis.co", ".fockis.io"];
const NOT_ORGS = new Set(["www", "app", "api", "admin", "mail", "email", "cdn", "static", "assets", "uploads", "media"]);

const cache = new Map<string, Promise<ResolvedOrganization>>();

export const publicLinksApi = {
  resolve(name: string): Promise<ResolvedOrganization> {
    const key = `n:${name.toLowerCase()}`;
    if (!cache.has(key)) {
      const p = churchRequest<ResolvedOrganization>(`/public/organizations/resolve/${encodeURIComponent(name)}`, { anonymous: !getAuthToken() });
      p.catch(() => cache.delete(key));
      cache.set(key, p);
    }
    return cache.get(key)!;
  },
  byHost(host: string): Promise<ResolvedOrganization> {
    return churchRequest<ResolvedOrganization>(`/public/organizations/by-host`, { query: { host }, anonymous: true });
  },
  info: (organizationId: string) => churchRequest<PublicLinkInfo>(`/organizations/${encodeURIComponent(organizationId)}/public-link`, { anonymous: !getAuthToken() }),
  check: (organizationId: string, handle: string) =>
    churchRequest<{ handle: string; available: boolean; message: string }>(`/organizations/${encodeURIComponent(organizationId)}/public-link/check`, { query: { handle } }),
  rename: (organizationId: string, handle: string) => {
    cache.clear();
    return churchRequest<PublicLinkInfo>(`/organizations/${encodeURIComponent(organizationId)}/public-link`, { method: "PUT", body: { handle } });
  },
};

/** True on an organization's own address (e.g. methodiste.fockis.church), not on www / app hosts. */
export function isOrganizationHost(hostname = typeof window === "undefined" ? "" : window.location.hostname): boolean {
  const h = hostname.toLowerCase();
  const suffix = ORG_SUFFIXES.find((s) => h.endsWith(s));
  if (!suffix) return false;
  const sub = h.slice(0, -suffix.length);
  return Boolean(sub) && !sub.includes(".") && !NOT_ORGS.has(sub);
}

/** Address search engines should treat as the official one for public pages. */
export function publicSiteOrigin(): string {
  const configured = String(import.meta.env.VITE_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (typeof window === "undefined") return "https://www.fockis.com";
  return isOrganizationHost() ? "https://www.fockis.com" : window.location.origin;
}

export function publicPath(handle: string) {
  return `/o/${encodeURIComponent(handle)}`;
}
