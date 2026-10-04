// Marketing applications: public submission → agency review → client workspace.

import type {
  ApplicationDraft,
  ApplicationMessage,
  ApplicationStatus,
  Business,
  MarketingApplication,
} from "../types/platform.types";
import { PLATFORM_ENDPOINTS as EP } from "./endpoints";
import { call, callAsync } from "./httpClient";
import { findOrThrow, upsert } from "./mockDb";
import { platformDb } from "./platformDb";
import { pushNotification } from "./notificationsApi";
import { agencyApi } from "./agencyApi";
import { APPLICATION_STATUS_LABELS } from "../utils/platformLabels";
import { uid } from "../utils/format";

const DRAFT_KEY = "fockis-marketing:application-draft";

const STATUS_NOTIFICATION: Partial<Record<ApplicationStatus, "APPLICATION_UNDER_REVIEW" | "APPLICATION_MORE_INFO" | "APPLICATION_APPROVED" | "APPLICATION_REJECTED">> = {
  UNDER_REVIEW: "APPLICATION_UNDER_REVIEW",
  MORE_INFORMATION_NEEDED: "APPLICATION_MORE_INFO",
  APPROVED: "APPLICATION_APPROVED",
  REJECTED: "APPLICATION_REJECTED",
};

export interface ApplicationFilters {
  status?: ApplicationStatus | "all";
  businessType?: string;
  service?: string;
  search?: string;
  days?: number;
}

export const applicationsApi = {
  // Local draft (the public form saves on the applicant's device) ---------------
  saveDraft(draft: ApplicationDraft, step: number): void {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step, savedAt: new Date().toISOString() }));
    } catch {
      /* storage unavailable */
    }
  },
  loadDraft(): { draft: ApplicationDraft; step: number; savedAt: string } | null {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      return raw ? (JSON.parse(raw) as { draft: ApplicationDraft; step: number; savedAt: string }) : null;
    } catch {
      return null;
    }
  },
  clearDraft(): void {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* storage unavailable */
    }
  },

  // Public submission ------------------------------------------------------------
  createApplication: (draft: ApplicationDraft) =>
    call<MarketingApplication>(() => {
      const now = new Date().toISOString();
      const n = platformDb.applications.length + 131;
      const app: MarketingApplication = {
        ...structuredClone(draft),
        // Uploads are local previews only; drop object URLs from the stored copy.
        branding: { ...draft.branding, uploads: draft.branding.uploads.map((u) => ({ ...u, previewUrl: undefined })) },
        id: uid("app"),
        reference: `FM-2026-${String(n).padStart(4, "0")}`,
        status: "NEW",
        statusHistory: [{ status: "NEW", at: now, by: "Applicant" }],
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      platformDb.applications.unshift(app);
      pushNotification({ type: "APPLICATION_SUBMITTED", businessId: null, title: "New marketing application", body: `${app.business.name} requested ${app.services.length} service${app.services.length === 1 ? "" : "s"}.`, link: `/marketing/agency/applications/${app.id}` });
      return app;
    }, EP.applications, { method: "POST", body: draft }),

  // Agency review ----------------------------------------------------------------
  getApplications: (filters: ApplicationFilters = {}) =>
    call<MarketingApplication[]>(() =>
      platformDb.applications.filter((a) => {
        if (filters.status && filters.status !== "all" && a.status !== filters.status) return false;
        if (filters.businessType && filters.businessType !== "all" && a.business.type !== filters.businessType) return false;
        if (filters.service && filters.service !== "all" && !a.services.includes(filters.service as never)) return false;
        if (filters.days && new Date(a.createdAt).getTime() < Date.now() - filters.days * 86400000) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if (!`${a.business.name} ${a.contact.fullName} ${a.contact.email} ${a.reference}`.toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    EP.applications, { query: { ...filters } }),

  getApplication: (id: string) => call<MarketingApplication>(() => findOrThrow(platformDb.applications, id, "Application"), EP.application(id)),

  updateApplicationStatus: (id: string, status: ApplicationStatus, note?: string) =>
    call<MarketingApplication>(() => {
      const a = findOrThrow(platformDb.applications, id, "Application");
      if (a.status === "CONVERTED_TO_CLIENT") throw new Error("This application already became a client workspace.");
      const now = new Date().toISOString();
      const next = upsert(platformDb.applications, { ...a, status, updatedAt: now, statusHistory: [...a.statusHistory, { status, at: now, by: platformDb.viewer.name, note }] });
      const type = STATUS_NOTIFICATION[status];
      if (type) pushNotification({ type, businessId: null, title: `Application ${APPLICATION_STATUS_LABELS[status].toLowerCase()}`, body: `${a.business.name} (${a.reference})`, link: `/marketing/agency/applications/${id}` });
      return next;
    }, EP.applicationStatus(id), { method: "PATCH", body: { status, note } }),

  addMessage: (id: string, message: Omit<ApplicationMessage, "id" | "at">) =>
    call<MarketingApplication>(() => {
      const a = findOrThrow(platformDb.applications, id, "Application");
      return upsert(platformDb.applications, { ...a, messages: [...a.messages, { ...message, id: uid("msg"), at: new Date().toISOString() }] });
    }, EP.applicationMessages(id), { method: "POST", body: message }),

  /**
   * Approved application → client workspace. The backend should do this in one
   * transaction: create Business + workspace + credit balance + team invite.
   */
  convertToClient: (id: string, planId: string) =>
    callAsync<{ application: MarketingApplication; business: Business }>(async () => {
      const a = findOrThrow(platformDb.applications, id, "Application");
      if (a.status !== "APPROVED") throw new Error("Approve the application before creating a workspace.");
      const business = await agencyApi.createBusiness({
        name: a.business.name, type: a.business.type, description: a.business.description, website: a.business.website,
        phone: a.business.phone, email: a.business.email, address: a.business.address, serviceArea: a.business.serviceArea,
        accent: a.branding.colors[0] ?? "#1f5eff", logo: "", brandFonts: a.branding.fonts ? [a.branding.fonts] : [],
        goals: a.goals, services: a.services, planId, sizeHint: 500,
        ownerName: a.contact.fullName, ownerEmail: a.contact.email, sourceApplicationId: a.id,
      });
      const now = new Date().toISOString();
      const application = upsert(platformDb.applications, {
        ...a, status: "CONVERTED_TO_CLIENT", convertedBusinessId: business.id, updatedAt: now,
        statusHistory: [...a.statusHistory, { status: "CONVERTED_TO_CLIENT", at: now, by: platformDb.viewer.name }],
      });
      return { application, business };
    }, EP.applicationConvert(id), { method: "POST", body: { planId } }),
};
