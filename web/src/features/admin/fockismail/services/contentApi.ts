import type {
  LandingPage,
  LandingPageStatus,
  MediaAsset,
  MediaKind,
  SignupForm,
} from "../types/mailchimp.types";
import { ENDPOINTS } from "./endpoints";
import { call } from "./httpClient";
import { activeBusinessId, db, findOrThrow, removeById, upsert } from "./mockDb";
import { uid } from "../utils/format";

function kindFromFile(file: File): MediaKind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return file.name.toLowerCase().includes("logo") ? "logo" : "image";
  return "document";
}

export const contentApi = {
  // Forms -----------------------------------------------------------------
  forms: () => call<SignupForm[]>(() => db.forms, ENDPOINTS.forms),

  saveForm: (form: SignupForm) =>
    call<SignupForm>(() => upsert(db.forms, { ...form, updatedAt: new Date().toISOString() }), ENDPOINTS.form(form.id), {
      method: "PUT",
      body: form,
    }),

  createForm: (name: string, audienceId: string) =>
    call<SignupForm>(
      () =>
        upsert(db.forms, {
          id: uid("frm"), businessId: activeBusinessId(), name, audienceId, display: "inline", title: "Join our list",
          description: "Get updates from Fockis.", submitLabel: "Subscribe", submissions: 0,
          conversionRate: 0, updatedAt: new Date().toISOString(),
          fields: [{ id: uid("f"), type: "email", label: "Email", placeholder: "you@example.com", required: true, options: [] }],
        }),
      ENDPOINTS.forms,
      { method: "POST", body: { name, audienceId } },
    ),

  deleteForm: (id: string) => call<void>(() => removeById(db.forms, id), ENDPOINTS.form(id), { method: "DELETE" }),

  // Landing pages -------------------------------------------------------------
  landingPages: () => call<LandingPage[]>(() => db.landingPages, ENDPOINTS.landingPages),

  saveLandingPage: (page: LandingPage) =>
    call<LandingPage>(() => upsert(db.landingPages, { ...page, updatedAt: new Date().toISOString() }), ENDPOINTS.landingPage(page.id), {
      method: "PUT",
      body: page,
    }),

  createLandingPage: (name: string) =>
    call<LandingPage>(
      () =>
        upsert(db.landingPages, {
          id: uid("lp"), businessId: activeBusinessId(), name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          status: "draft", visits: 0, signups: 0, updatedAt: new Date().toISOString(), accent: "#1f5eff",
          sections: [{ id: uid("s"), kind: "hero", heading: name, body: "Describe the offer in one or two sentences.", buttonLabel: "Get started" }],
        }),
      ENDPOINTS.landingPages,
      { method: "POST", body: { name } },
    ),

  setLandingStatus: (id: string, status: LandingPageStatus) =>
    call<LandingPage>(
      () => upsert(db.landingPages, { ...findOrThrow(db.landingPages, id, "Landing page"), status, updatedAt: new Date().toISOString() }),
      ENDPOINTS.landingPage(id),
      { method: "PATCH", body: { status } },
    ),

  duplicateLandingPage: (id: string) =>
    call<LandingPage>(() => {
      const p = findOrThrow(db.landingPages, id, "Landing page");
      return upsert(db.landingPages, { ...structuredClone(p), id: uid("lp"), businessId: activeBusinessId(), name: `${p.name} (copy)`, slug: `${p.slug}-copy`, status: "draft", visits: 0, signups: 0 });
    }, `${ENDPOINTS.landingPage(id)}/duplicate`, { method: "POST" }),

  deleteLandingPage: (id: string) =>
    call<void>(() => removeById(db.landingPages, id), ENDPOINTS.landingPage(id), { method: "DELETE" }),

  // Media -------------------------------------------------------------------
  media: () => call<MediaAsset[]>(() => db.media, ENDPOINTS.media),

  /**
   * Mock mode stores only metadata and a local object URL (lost on reload).
   * Real mode should POST multipart data to the existing Fockis upload
   * service, then register the asset with the marketing backend.
   */
  upload: (file: File, folder: string) =>
    call<MediaAsset>(
      () =>
        upsert(db.media, {
          id: uid("med"), businessId: activeBusinessId(),
          name: file.name,
          kind: kindFromFile(file),
          folder,
          url: URL.createObjectURL(file),
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          uploadedAt: new Date().toISOString(),
          swatch: "#dbe6ff",
        }),
      ENDPOINTS.mediaUpload,
      { method: "POST", body: { name: file.name, folder, size: file.size, type: file.type } },
    ),

  renameMedia: (id: string, name: string) =>
    call<MediaAsset>(() => upsert(db.media, { ...findOrThrow(db.media, id, "Asset"), name }), ENDPOINTS.mediaItem(id), {
      method: "PATCH",
      body: { name },
    }),

  deleteMedia: (id: string) => call<void>(() => removeById(db.media, id), ENDPOINTS.mediaItem(id), { method: "DELETE" }),
};
