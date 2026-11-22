import { api } from "../../../api/api";
import type { Section, SiteContent } from "../types/content";
import type {
  CartLine,
  CheckoutResponse,
  QuoteResponse,
  WebsiteAsset,
  WebsiteCategory,
  WebsiteDetail,
  WebsiteDomain,
  WebsiteOrder,
  WebsiteSubmission,
  WebsiteSummary,
  WebsiteTemplate,
  WebsiteVersion,
  PublicSite,
  SwitchReport,
  AiAssistAction,
} from "../types/studio";

const BASE = "/website-studio";

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export function apiError(err: unknown, fallback = "Something went wrong."): string {
  const e = err as any;
  const msg = e?.response?.data?.message ?? e?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

export const websiteStudioApi = {
  /* ---------------- catalog of templates ---------------- */
  categories: () => data<WebsiteCategory[]>(api.get(`${BASE}/categories`)),
  templates: (params: { category?: string; q?: string; featured?: boolean } = {}) =>
    data<WebsiteTemplate[]>(api.get(`${BASE}/templates`, { params })),
  template: (slug: string) => data<WebsiteTemplate & { content: SiteContent }>(api.get(`${BASE}/templates/${encodeURIComponent(slug)}`)),

  /* ---------------- my websites ---------------- */
  myWebsites: () => data<WebsiteSummary[]>(api.get(`${BASE}/websites`)),
  createWebsite: (input: {
    name: string;
    mode: "template" | "scratch" | "import";
    templateSlug?: string;
    categorySlug?: string;
    organizationId?: string;
    importContent?: unknown;
  }) => data<WebsiteDetail>(api.post(`${BASE}/websites`, input)),
  website: (id: string) => data<WebsiteDetail>(api.get(`${BASE}/websites/${id}`)),
  updateWebsite: (id: string, patch: Partial<Pick<WebsiteDetail, "name" | "slug">> & { organizationId?: string | null }) =>
    data<WebsiteDetail>(api.patch(`${BASE}/websites/${id}`, patch)),
  deleteWebsite: (id: string) => data<{ deleted: boolean }>(api.delete(`${BASE}/websites/${id}`)),
  duplicateWebsite: (id: string) => data<WebsiteDetail>(api.post(`${BASE}/websites/${id}/duplicate`)),
  saveDraft: (id: string, content: SiteContent, revision: number) =>
    data<{ revision: number; updatedAt: string }>(api.put(`${BASE}/websites/${id}/draft`, { content, revision }, { timeout: 30000 })),
  versions: (id: string) => data<WebsiteVersion[]>(api.get(`${BASE}/websites/${id}/versions`)),
  createVersion: (id: string, label: string) => data<WebsiteVersion>(api.post(`${BASE}/websites/${id}/versions`, { label })),
  restoreVersion: (id: string, versionId: string) =>
    data<{ content: SiteContent; revision: number }>(api.post(`${BASE}/websites/${id}/versions/${versionId}/restore`)),
  publish: (id: string) => data<{ status: string; publishedAt: string; url: string; versionNumber: number }>(api.post(`${BASE}/websites/${id}/publish`, {}, { timeout: 30000 })),
  unpublish: (id: string) => data<{ status: string }>(api.post(`${BASE}/websites/${id}/unpublish`)),
  previewSwitch: (id: string, templateSlug: string) =>
    data<SwitchReport>(api.post(`${BASE}/websites/${id}/switch-template/preview`, { templateSlug })),
  switchTemplate: (id: string, templateSlug: string) =>
    data<{ content: SiteContent; revision: number; backupVersionId: string; report: SwitchReport }>(
      api.post(`${BASE}/websites/${id}/switch-template`, { templateSlug }),
    ),
  exportWebsite: (id: string) => data<{ format: string; content: SiteContent }>(api.get(`${BASE}/websites/${id}/export`)),

  /* ---------------- domains / managers ---------------- */
  domains: (id: string) => data<WebsiteDomain[]>(api.get(`${BASE}/websites/${id}/domains`)),
  addDomain: (id: string, domain: string) => data<WebsiteDomain>(api.post(`${BASE}/websites/${id}/domains`, { domain })),
  verifyDomain: (id: string, domainId: string) => data<WebsiteDomain>(api.post(`${BASE}/websites/${id}/domains/${domainId}/verify`)),
  removeDomain: (id: string, domainId: string) => data<{ deleted: boolean }>(api.delete(`${BASE}/websites/${id}/domains/${domainId}`)),
  managers: (id: string) => data<{ userId: string; role: string; name: string }[]>(api.get(`${BASE}/websites/${id}/managers`)),
  addManager: (id: string, identifier: string, role: "editor" | "admin") =>
    data<{ userId: string; role: string; name: string }[]>(api.post(`${BASE}/websites/${id}/managers`, { identifier, role })),
  removeManager: (id: string, userId: string) =>
    data<{ userId: string; role: string; name: string }[]>(api.delete(`${BASE}/websites/${id}/managers/${userId}`)),

  /* ---------------- media ---------------- */
  assets: (id: string, params: { folder?: string; q?: string } = {}) => data<WebsiteAsset[]>(api.get(`${BASE}/websites/${id}/assets`, { params })),
  /** Uploads a file through the existing Fockis /uploads pipeline and returns a permanent URL. */
  uploadFile: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const up = await api.post(`/uploads`, form, {
      params: { context: "website-studio" },
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });
    const u = up.data as any;
    // Signed GCS URLs expire after 7 days, so store the permanent public media-gateway URL
    // (/uploads/media/<storageKey>) whenever the upload pipeline returns a storage key.
    const apiBase = String(api.defaults.baseURL ?? "").replace(/\/+$/, "");
    const url: string = u.storageKey ? `${apiBase}/uploads/media/${String(u.storageKey).replace(/^\/+/, "")}` : u.media ?? u.url ?? "";
    if (!url) throw new Error("Upload succeeded but no file URL was returned.");
    return url;
  },
  uploadAsset: async (id: string, file: File, folder = "") => {
    const url = await websiteStudioApi.uploadFile(file);
    return data<WebsiteAsset>(
      api.post(`${BASE}/websites/${id}/assets`, { url, filename: file.name, fileType: file.type, size: file.size, folder }),
    );
  },
  updateAsset: (id: string, assetId: string, patch: Partial<Pick<WebsiteAsset, "alt" | "folder" | "filename">>) =>
    data<WebsiteAsset>(api.patch(`${BASE}/websites/${id}/assets/${assetId}`, patch)),
  deleteAsset: (id: string, assetId: string) => data<{ deleted: boolean }>(api.delete(`${BASE}/websites/${id}/assets/${assetId}`)),

  /* ---------------- business data ---------------- */
  orders: (id: string) => data<WebsiteOrder[]>(api.get(`${BASE}/websites/${id}/orders`)),
  updateOrder: (id: string, orderId: string, patch: { status?: string; trackingNumber?: string }) =>
    data<WebsiteOrder>(api.patch(`${BASE}/websites/${id}/orders/${orderId}`, patch)),
  submissions: (id: string, type?: string) => data<WebsiteSubmission[]>(api.get(`${BASE}/websites/${id}/submissions`, { params: { type } })),
  updateSubmission: (id: string, sid: string, status: string) =>
    data<WebsiteSubmission>(api.patch(`${BASE}/websites/${id}/submissions/${sid}`, { status })),
  coupons: (id: string) => data<{ code: string; type: "percent" | "fixed"; value: number; active: boolean }[]>(api.get(`${BASE}/websites/${id}/coupons`)),
  saveCoupons: (id: string, coupons: { code: string; type: "percent" | "fixed"; value: number; active: boolean }[]) =>
    data<{ code: string; type: "percent" | "fixed"; value: number; active: boolean }[]>(api.put(`${BASE}/websites/${id}/coupons`, { coupons })),
  analytics: (id: string) => data<{ days: { date: string; views: number }[]; totalViews: number; topPaths: { path: string; views: number }[]; orders: number; revenue: number; submissions: number }>(api.get(`${BASE}/websites/${id}/analytics`)),

  /* ---------------- reusable sections ---------------- */
  savedSections: () => data<{ id: string; name: string; section: Section }[]>(api.get(`${BASE}/saved-sections`)),
  saveSection: (name: string, section: Section) => data<{ id: string; name: string; section: Section }>(api.post(`${BASE}/saved-sections`, { name, section })),
  deleteSavedSection: (sid: string) => data<{ deleted: boolean }>(api.delete(`${BASE}/saved-sections/${sid}`)),

  /* ---------------- AI ---------------- */
  aiGenerate: (prompt: string, organizationId?: string) =>
    data<{ website: WebsiteDetail; categorySlug: string; recommendedTemplates: WebsiteTemplate[]; usedLanguageModel: boolean }>(
      api.post(`${BASE}/ai/generate`, { prompt, organizationId }, { timeout: 90000 }),
    ),
  aiAssist: (input: { websiteId: string; action: AiAssistAction; sectionId?: string; pageId?: string; instruction?: string; content: SiteContent }) =>
    data<{ content: SiteContent; summary: string; usedLanguageModel: boolean }>(api.post(`${BASE}/ai/assist`, input, { timeout: 90000 })),

  /* ---------------- public website runtime ---------------- */
  publicBySlug: (slug: string) => data<PublicSite>(api.get(`${BASE}/public/sites/by-slug/${encodeURIComponent(slug)}`)),
  publicByHost: (host: string) => data<PublicSite>(api.get(`${BASE}/public/sites/by-host/${encodeURIComponent(host)}`)),
  availability: (siteId: string, params: { type: "booking" | "reservation"; date: string; serviceId?: string; staffId?: string }) =>
    data<{ date: string; slots: string[] }>(api.get(`${BASE}/public/sites/${siteId}/availability`, { params })),
  submit: (siteId: string, type: string, payload: Record<string, unknown>) =>
    data<{ id: string; confirmationCode: string; status: string }>(api.post(`${BASE}/public/sites/${siteId}/submissions`, { type, data: payload })),
  quote: (siteId: string, input: { items: CartLine[]; fulfillment: { method: string }; couponCode?: string }) =>
    data<QuoteResponse>(api.post(`${BASE}/public/sites/${siteId}/quote`, input)),
  checkout: (siteId: string, input: Record<string, unknown>) => data<CheckoutResponse>(api.post(`${BASE}/public/sites/${siteId}/checkout`, input, { timeout: 30000 })),
  confirmOrder: (orderId: string, paymentIntentId: string) =>
    data<WebsiteOrder>(api.post(`${BASE}/public/orders/${orderId}/confirm`, { paymentIntentId }, { timeout: 30000 })),
  myOrders: (siteId: string) => data<{ orders: WebsiteOrder[]; bookings: WebsiteSubmission[] }>(api.get(`${BASE}/public/sites/${siteId}/my-orders`)),
  trackView: (siteId: string, path: string) => api.post(`${BASE}/public/sites/${siteId}/view`, { path }).catch(() => undefined),
  report: (siteId: string, reason: string) => data<{ received: boolean }>(api.post(`${BASE}/public/sites/${siteId}/report`, { reason })),

  /* ---------------- administration ---------------- */
  admin: {
    categories: () => data<WebsiteCategory[]>(api.get(`${BASE}/admin/categories`)),
    createCategory: (c: Partial<WebsiteCategory>) => data<WebsiteCategory>(api.post(`${BASE}/admin/categories`, c)),
    updateCategory: (id: string, c: Partial<WebsiteCategory>) => data<WebsiteCategory>(api.patch(`${BASE}/admin/categories/${id}`, c)),
    deleteCategory: (id: string) => data<{ deleted: boolean }>(api.delete(`${BASE}/admin/categories/${id}`)),
    reorderCategories: (ids: string[]) => data<{ ok: boolean }>(api.post(`${BASE}/admin/categories/reorder`, { ids })),
    templates: () => data<WebsiteTemplate[]>(api.get(`${BASE}/admin/templates`)),
    template: (id: string) => data<WebsiteTemplate & { content: SiteContent; draftContent: SiteContent | null }>(api.get(`${BASE}/admin/templates/${id}`)),
    createTemplate: (t: { name: string; slug?: string; categoryIds: string[]; fromTemplateSlug?: string; description?: string }) =>
      data<WebsiteTemplate>(api.post(`${BASE}/admin/templates`, t)),
    updateTemplate: (id: string, t: Partial<WebsiteTemplate>) => data<WebsiteTemplate>(api.patch(`${BASE}/admin/templates/${id}`, t)),
    duplicateTemplate: (id: string) => data<WebsiteTemplate>(api.post(`${BASE}/admin/templates/${id}/duplicate`)),
    deleteTemplate: (id: string) => data<{ deleted: boolean }>(api.delete(`${BASE}/admin/templates/${id}`)),
    saveTemplateDraft: (id: string, content: SiteContent, revision: number) =>
      data<{ revision: number; updatedAt: string }>(api.put(`${BASE}/admin/templates/${id}/draft`, { content, revision }, { timeout: 30000 })),
    publishTemplate: (id: string) => data<WebsiteTemplate>(api.post(`${BASE}/admin/templates/${id}/publish`)),
    setDefault: (id: string, categoryId: string) => data<WebsiteTemplate>(api.post(`${BASE}/admin/templates/${id}/default`, { categoryId })),
    websites: (params: { q?: string; status?: string } = {}) => data<(WebsiteSummary & { ownerName: string; reports: number })[]>(api.get(`${BASE}/admin/websites`, { params })),
    suspendWebsite: (id: string, suspended: boolean, reason?: string) => data<WebsiteSummary>(api.post(`${BASE}/admin/websites/${id}/suspend`, { suspended, reason })),
    reports: () => data<{ id: string; websiteId: string; websiteName: string; reason: string; status: string; createdAt: string }[]>(api.get(`${BASE}/admin/reports`)),
    resolveReport: (id: string) => data<{ ok: boolean }>(api.post(`${BASE}/admin/reports/${id}/resolve`)),
    usage: () => data<{ templateId: string; name: string; websites: number }[]>(api.get(`${BASE}/admin/usage`)),
  },
};

export default websiteStudioApi;
