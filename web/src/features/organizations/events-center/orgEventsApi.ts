/* ============================================================================
   ORGANIZATION EVENTS — API
   web/src/features/organizations/events-center/orgEventsApi.ts

   Organization events are Fockis platform events linked to an organization
   (apps/api/src/events). Creating, editing, cancelling and deleting use the
   existing /events endpoints (eventsApi); this file adds the organization
   list, archive / restore and the event catalog (types, categories,
   locations, templates). The server checks the Manage events permission on
   every call.
============================================================================ */

import { EVENTS_URL, normalizeEvent, request } from "../../events/services/eventsApi";
import type { FockisEvent } from "../../events/types/event.types";

export type ManageTab = "all" | "upcoming" | "ongoing" | "past" | "drafts" | "archived";

export interface ManagedEvent extends FockisEvent {
  /** Registrations per status (confirmed, pending_approval, waitlisted…). */
  registrationCounts: Record<string, number>;
}

export interface ManageList {
  items: ManagedEvent[];
  total: number;
  page: number;
  limit: number;
  tab: ManageTab;
  counts: Record<ManageTab, number>;
  pendingRegistrations: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  archived: boolean;
}

export interface CatalogLocation extends CatalogItem {
  address: string;
}

export type EventFormat = "in_person" | "online" | "hybrid";

export interface CatalogTemplate extends CatalogItem {
  title: string;
  eventType: string;
  orgCategory: string;
  description: string;
  durationMinutes: number;
  locationName: string;
  address: string;
  format: EventFormat;
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

export type CatalogKind = "types" | "categories" | "locations" | "templates";

const enc = encodeURIComponent;

function qs(params: Record<string, string | number | undefined>): string {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") s.set(k, String(v));
  });
  const out = s.toString();
  return out ? `?${out}` : "";
}

const EMPTY_COUNTS: Record<ManageTab, number> = { all: 0, upcoming: 0, ongoing: 0, past: 0, drafts: 0, archived: 0 };

export const orgEventsApi = {
  async manage(
    organizationId: string,
    q: { tab?: ManageTab; search?: string; type?: string; page?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<ManageList> {
    const raw = await request<any>(`${EVENTS_URL}/organization/${enc(organizationId)}/manage${qs(q)}`, { signal });
    return {
      items: (Array.isArray(raw?.items) ? raw.items : []).map((e: any) => ({
        ...normalizeEvent(e),
        registrationCounts: e?.registrationCounts && typeof e.registrationCounts === "object" ? e.registrationCounts : {},
      })),
      total: Number(raw?.total ?? 0),
      page: Number(raw?.page ?? 1),
      limit: Number(raw?.limit ?? 25),
      tab: (raw?.tab as ManageTab) ?? "all",
      counts: { ...EMPTY_COUNTS, ...(raw?.counts ?? {}) },
      pendingRegistrations: Number(raw?.pendingRegistrations ?? 0),
    };
  },

  async archive(eventId: string) {
    return normalizeEvent(await request<any>(`${EVENTS_URL}/${enc(eventId)}/archive`, { method: "POST" }));
  },

  async restore(eventId: string) {
    return normalizeEvent(await request<any>(`${EVENTS_URL}/${enc(eventId)}/restore`, { method: "POST" }));
  },

  catalog(organizationId: string, signal?: AbortSignal) {
    return request<EventCatalog>(`${EVENTS_URL}/organization/${enc(organizationId)}/catalog`, { signal });
  },

  saveCatalog(organizationId: string, patch: Partial<Pick<EventCatalog, CatalogKind>>) {
    return request<EventCatalog>(`${EVENTS_URL}/organization/${enc(organizationId)}/catalog`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  },
};
