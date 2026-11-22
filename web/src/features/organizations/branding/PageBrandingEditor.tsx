/**
 * PageBrandingEditor.tsx
 * -----------------------------------------------------------------------------
 * "Edit thumbnail" / "Customize page" for ONE page of an organization:
 *
 *   Thumbnail   the image shown in the sidebar instead of the icon
 *   Banner      desktop + mobile banner, height, overlay, text position
 *   Logo        optional logo/icon on the banner
 *   Text        banner title, subtitle, description
 *
 * Save draft keeps changes private to editors; Publish makes them visible to
 * everyone. The previous published version can be restored, and the page
 * can be reset to the default icon (also restorable). Images are never
 * replaced or removed without a confirmation.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { Crop, History, ImagePlus, Monitor, Smartphone, Trash2, Undo2, X } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { exportCrop, fetchAsObjectUrl, ratioOf } from "./cropImage";
import ImageCropDialog, { type CropResult } from "./ImageCropDialog";
import { PageBanner, PageThumb } from "./PageBrandingParts";
import {
  BRANDING_ERROR,
  pageBrandingApi,
  type BrandImage,
  type ImageShape,
  type PageBrandingContent,
} from "./pageBrandingApi";
import { applyManagedBranding, usePageBranding } from "./usePageBranding";
import "./pageBranding.scss";

type SlotKey = "thumbnail" | "logo" | "bannerDesktop" | "bannerMobile";
type Tab = "thumbnail" | "banner" | "logo" | "text";

const SLOT: Record<SlotKey, { label: string; aspects: string[]; shapes?: ImageShape[]; longSide: number }> = {
  thumbnail: { label: "Thumbnail", aspects: ["1:1", "4:3", "16:9", "3:4"], shapes: ["rounded", "circle", "square"], longSide: 512 },
  logo: { label: "Logo", aspects: ["1:1"], shapes: ["rounded", "circle", "square"], longSide: 512 },
  bannerDesktop: { label: "Desktop banner", aspects: ["3:1", "16:9", "2:1"], longSide: 2400 },
  bannerMobile: { label: "Mobile banner", aspects: ["16:9", "2:1", "3:1"], longSide: 1200 },
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 15 * 1024 * 1024;

interface Pending {
  slot: SlotKey;
  src: string;
  /** Set when the original still has to be uploaded. */
  file?: File;
  sourceUrl?: string;
  initial?: BrandImage | null;
}

interface Confirm {
  title: string;
  body: string;
  action: string;
  danger?: boolean;
  run: () => void | Promise<void>;
}

function ConfirmBox({ c, busy, onClose }: { c: Confirm; busy: boolean; onClose: () => void }) {
  return createPortal(
    <div className="pb pb-modal pb-modal--top" role="alertdialog" aria-modal="true" aria-label={c.title}>
      <div className="pb-modal__card pb-confirm">
        <h2>{c.title}</h2>
        <p>{c.body}</p>
        <footer className="pb-modal__foot">
          <span className="pb-grow" />
          <button type="button" className="pb-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={"pb-btn " + (c.danger ? "pb-btn--danger" : "pb-btn--primary")} onClick={() => void c.run()} disabled={busy}>
            {busy ? "Working…" : c.action}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export default function PageBrandingEditor({
  organizationId,
  pageKey,
  pageLabel,
  icon,
  resourceId = "",
  initialTab = "thumbnail",
  onClose,
}: {
  organizationId: string;
  pageKey: string;
  pageLabel: string;
  icon?: LucideIcon | null;
  resourceId?: string;
  initialTab?: Tab;
  onClose: () => void;
}): React.JSX.Element {
  const branding = usePageBranding(organizationId);
  const managed = branding.managedFor(pageKey, resourceId);
  const startContent = managed?.draft ?? branding.publishedFor(pageKey, resourceId) ?? {};
  const [content, setContent] = useState<PageBrandingContent>(startContent);
  const [saved, setSaved] = useState<string>(JSON.stringify(startContent));
  const [tab, setTab] = useState<Tab>(initialTab);
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<SlotKey>("thumbnail");

  const dirty = JSON.stringify(content) !== saved;
  const live = managed?.published ?? null;
  const differsFromLive = JSON.stringify(content) !== JSON.stringify(live ?? {});

  // Pick up the server copy once it arrives (editor opened before load finished).
  const seeded = useRef(Boolean(managed || branding.loaded));
  useEffect(() => {
    if (seeded.current || !branding.loaded) return;
    seeded.current = true;
    const c = managed?.draft ?? branding.publishedFor(pageKey, resourceId) ?? {};
    setContent(c);
    setSaved(JSON.stringify(c));
  }, [branding.loaded, managed, branding, pageKey, resourceId]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending && !confirm && !busy) requestClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  });

  useEffect(() => () => {
    if (pending?.src.startsWith("blob:")) URL.revokeObjectURL(pending.src);
  }, [pending]);

  const set = (patch: Partial<PageBrandingContent>) => setContent((c) => ({ ...c, ...patch }));

  function requestClose() {
    if (!dirty) return onClose();
    setConfirm({
      title: "Close without saving?",
      body: "You have changes that are not saved. Close the editor and lose them?",
      action: "Discard and close",
      danger: true,
      run: () => onClose(),
    });
  }

  /* ---------------------------------------------------------- images */

  function choose(slot: SlotKey) {
    const open = () => {
      setConfirm(null);
      pickFor.current = slot;
      fileRef.current?.click();
    };
    if (content[slot]?.url) {
      setConfirm({
        title: `Replace the ${SLOT[slot].label.toLowerCase()}?`,
        body: "You will choose a new image. The current one stays until you apply the new crop, and published pages keep the old image until you publish.",
        action: "Choose new image",
        run: open,
      });
    } else open();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) return setError("Choose a JPG, PNG, WebP or GIF image.");
    if (file.size > MAX_BYTES) return setError("That image is too large (max 15 MB).");
    setError(null);
    setPending({ slot: pickFor.current, src: URL.createObjectURL(file), file, initial: content[pickFor.current] });
  }

  async function recrop(slot: SlotKey) {
    const img = content[slot];
    const source = img?.sourceUrl ?? img?.url;
    if (!img || !source) return;
    setError(null);
    try {
      const src = await fetchAsObjectUrl(mediaUrl(source) ?? source);
      setPending({ slot, src, sourceUrl: img.sourceUrl ?? img.url, initial: img });
    } catch {
      setError("The saved original could not be reopened here. Upload the image again to change its crop.");
    }
  }

  async function applyCrop(r: CropResult) {
    if (!pending) return;
    const slot = pending.slot;
    setBusy(true);
    setError(null);
    try {
      let sourceUrl = pending.sourceUrl;
      if (pending.file) sourceUrl = (await pageBrandingApi.upload(organizationId, pending.file, pending.file.name)).fileUrl;
      const isPng = pending.file?.type === "image/png" || slot === "thumbnail" || slot === "logo";
      const type = isPng ? "image/png" : "image/jpeg";
      const blob = await exportCrop(r.image, r.aspect, SLOT[slot].longSide, r, type);
      const cropped = await pageBrandingApi.upload(organizationId, blob, `${slot}.${isPng ? "png" : "jpg"}`);
      const next: BrandImage = { url: cropped.fileUrl, sourceUrl, zoom: r.zoom, x: r.x, y: r.y, rotate: r.rotate, aspect: r.aspect };
      if (r.shape) next.shape = r.shape;
      const patch: Partial<PageBrandingContent> = { [slot]: next };
      // A first banner image turns the banner on.
      if ((slot === "bannerDesktop" || slot === "bannerMobile") && !content.bannerDesktop && !content.bannerMobile) patch.showBanner = true;
      set(patch);
      setPending(null);
    } catch (e) {
      setError(BRANDING_ERROR(e, "The image could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  function remove(slot: SlotKey) {
    setConfirm({
      title: `Remove the ${SLOT[slot].label.toLowerCase()}?`,
      body:
        slot === "thumbnail"
          ? "The sidebar will show the default icon for this page after you publish."
          : "It will disappear from this page after you publish.",
      action: "Remove",
      danger: true,
      run: () => {
        set({ [slot]: null });
        setConfirm(null);
      },
    });
  }

  /* ---------------------------------------------------------- workflow */

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(label);
    } catch (e) {
      setError(BRANDING_ERROR(e, "Something went wrong. Please try again."));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const saveDraft = () =>
    run("Draft saved. Only editors can see it.", async () => {
      const item = await pageBrandingApi.saveDraft(organizationId, pageKey, content, resourceId);
      applyManagedBranding(organizationId, pageKey, resourceId, item);
      setContent(item.draft ?? {});
      setSaved(JSON.stringify(item.draft ?? {}));
    });

  const publish = () =>
    setConfirm({
      title: `Publish ${pageLabel}?`,
      body: "Everyone who opens this organization will see the new thumbnail and banner.",
      action: "Publish",
      run: () =>
        run("Published.", async () => {
          const item = await pageBrandingApi.publish(organizationId, pageKey, content, resourceId);
          applyManagedBranding(organizationId, pageKey, resourceId, item);
          setContent(item.draft ?? {});
          setSaved(JSON.stringify(item.draft ?? {}));
        }),
    });

  const discard = () =>
    setConfirm({
      title: "Discard unpublished changes?",
      body: "The editor goes back to the version everyone sees now.",
      action: "Discard changes",
      danger: true,
      run: () =>
        run("Changes discarded.", async () => {
          const item = await pageBrandingApi.discard(organizationId, pageKey, resourceId);
          applyManagedBranding(organizationId, pageKey, resourceId, item);
          const c = item?.draft ?? {};
          setContent(c);
          setSaved(JSON.stringify(c));
        }),
    });

  const restore = () =>
    setConfirm({
      title: "Restore the previous version?",
      body: "The version that was live before the last change is published again. The current one can be restored afterwards the same way.",
      action: "Restore",
      run: () =>
        run("Previous version restored.", async () => {
          const item = await pageBrandingApi.restore(organizationId, pageKey, resourceId);
          applyManagedBranding(organizationId, pageKey, resourceId, item);
          setContent(item.draft ?? {});
          setSaved(JSON.stringify(item.draft ?? {}));
        }),
    });

  const reset = () =>
    setConfirm({
      title: `Reset ${pageLabel} to the default?`,
      body: "The sidebar shows the standard icon again and the page banner is removed for everyone. You can restore the current version afterwards.",
      action: "Reset to default",
      danger: true,
      run: () =>
        run("Reset to the default icon.", async () => {
          const item = await pageBrandingApi.reset(organizationId, pageKey, resourceId);
          applyManagedBranding(organizationId, pageKey, resourceId, item);
          setContent({});
          setSaved("{}");
        }),
    });

  const status = useMemo(() => {
    if (dirty) return { cls: "warn", text: "Unsaved changes" };
    if (managed?.hasUnpublishedChanges) return { cls: "warn", text: "Draft — not published yet" };
    if (live) return { cls: "ok", text: "Published" };
    return { cls: "muted", text: "Default icon" };
  }, [dirty, managed, live]);

  /* ---------------------------------------------------------- render */

  const slotCard = (slot: SlotKey, hint: string) => {
    const img = content[slot];
    const src = img?.url ? mediaUrl(img.url) : null;
    const r = ratioOf(img?.aspect ?? SLOT[slot].aspects[0]);
    return (
      <div className="pb-slot">
        <div className="pb-slot__preview" style={{ aspectRatio: String(r) }}>
          {src ? (
            <img src={src} alt="" className={slot === "thumbnail" || slot === "logo" ? `pb-thumb--${img?.shape ?? "rounded"}` : undefined} />
          ) : (
            <span className="pb-slot__empty">
              <ImagePlus /> No image
            </span>
          )}
        </div>
        <div className="pb-slot__side">
          <strong>{SLOT[slot].label}</strong>
          <span className="pb-muted">{hint}</span>
          <div className="pb-row pb-row--wrap">
            <button type="button" className="pb-btn pb-btn--primary pb-btn--sm" onClick={() => choose(slot)} disabled={busy}>
              <ImagePlus /> {src ? "Replace" : "Upload"}
            </button>
            {src && (
              <>
                <button type="button" className="pb-btn pb-btn--sm" onClick={() => void recrop(slot)} disabled={busy}>
                  <Crop /> Crop & position
                </button>
                <button type="button" className="pb-btn pb-btn--sm pb-btn--danger-ghost" onClick={() => remove(slot)} disabled={busy}>
                  <Trash2 /> Remove
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="pb pb-modal" role="dialog" aria-modal="true" aria-label={`Customize ${pageLabel}`}>
      <div className="pb-modal__card pb-editor">
        <header className="pb-modal__head">
          <div>
            <h2>Customize “{pageLabel}”</h2>
            <span className={`pb-status pb-status--${status.cls}`}>{status.text}</span>
          </div>
          <button type="button" className="pb-icon" onClick={requestClose} disabled={busy} aria-label="Close">
            <X />
          </button>
        </header>

        <div className="pb-editor__body">
          <div className="pb-editor__form">
            <div className="pb-tabs" role="tablist">
              {(
                [
                  ["thumbnail", "Thumbnail"],
                  ["banner", "Banner"],
                  ["logo", "Logo"],
                  ["text", "Text & style"],
                ] as [Tab, string][]
              ).map(([t, l]) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={"pb-tab" + (tab === t ? " is-on" : "")} onClick={() => setTab(t)}>
                  {l}
                </button>
              ))}
            </div>

            {tab === "thumbnail" && (
              <div className="pb-panel">
                {slotCard("thumbnail", "Shown in the sidebar instead of the icon. Square works best; 4:3, 16:9 and 3:4 are also available.")}
                <p className="pb-muted">This thumbnail belongs to “{pageLabel}” only — other pages keep their own.</p>
              </div>
            )}

            {tab === "banner" && (
              <div className="pb-panel">
                <label className="pb-check">
                  <input type="checkbox" checked={Boolean(content.showBanner)} onChange={(e) => set({ showBanner: e.target.checked })} />
                  Show a banner at the top of this page
                </label>
                {slotCard("bannerDesktop", "Wide image for computers and tablets (3:1, 16:9 or 2:1).")}
                {slotCard("bannerMobile", "Optional. Phones use the desktop banner when this is empty.")}
                <div className="pb-field">
                  <span className="pb-field__label">Maximum banner height</span>
                  <div className="pb-chips">
                    {(["small", "medium", "large"] as const).map((h) => (
                      <button key={h} type="button" className={"pb-chip" + ((content.bannerHeight ?? "medium") === h ? " is-on" : "")} onClick={() => set({ bannerHeight: h })}>
                        {h[0].toUpperCase() + h.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "logo" && (
              <div className="pb-panel">
                {slotCard("logo", "Optional logo or icon shown on the banner, next to the title.")}
              </div>
            )}

            {tab === "text" && (
              <div className="pb-panel">
                <label className="pb-field">
                  <span className="pb-field__label">Banner title</span>
                  <input className="pb-input" value={content.title ?? ""} maxLength={80} placeholder={pageLabel} onChange={(e) => set({ title: e.target.value })} />
                </label>
                <label className="pb-field">
                  <span className="pb-field__label">Subtitle</span>
                  <input className="pb-input" value={content.subtitle ?? ""} maxLength={140} onChange={(e) => set({ subtitle: e.target.value })} />
                </label>
                <label className="pb-field">
                  <span className="pb-field__label">Description</span>
                  <textarea className="pb-input" rows={3} value={content.description ?? ""} maxLength={400} onChange={(e) => set({ description: e.target.value })} />
                </label>
                <div className="pb-field">
                  <span className="pb-field__label">Text position</span>
                  <div className="pb-chips">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button key={a} type="button" className={"pb-chip" + ((content.textAlign ?? "left") === a ? " is-on" : "")} onClick={() => set({ textAlign: a })}>
                        {a[0].toUpperCase() + a.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pb-row pb-row--wrap">
                  <label className="pb-field">
                    <span className="pb-field__label">Overlay colour</span>
                    <input type="color" className="pb-color" value={content.overlayColor ?? "#000000"} onChange={(e) => set({ overlayColor: e.target.value })} />
                  </label>
                  <label className="pb-field pb-grow">
                    <span className="pb-field__label">Overlay strength · {Math.round((content.overlayOpacity ?? 0.35) * 100)}%</span>
                    <input
                      type="range"
                      min={0}
                      max={0.9}
                      step={0.05}
                      value={content.overlayOpacity ?? 0.35}
                      onChange={(e) => set({ overlayOpacity: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </div>
            )}

            {error && <p className="pb-error">{error}</p>}
            {notice && !error && <p className="pb-notice">{notice}</p>}
          </div>

          <aside className="pb-editor__preview" aria-label="Preview">
            <div className="pb-field__label">Sidebar preview</div>
            <div className="pb-sidebar-preview">
              <div className="pb-sidebar-preview__item">
                <PageThumb content={content} icon={icon} />
                <span>{pageLabel}</span>
              </div>
              <div className="pb-sidebar-preview__item is-active">
                <PageThumb content={content} icon={icon} />
                <span>{pageLabel}</span>
              </div>
            </div>

            <div className="pb-row pb-row--between">
              <div className="pb-field__label">Banner preview</div>
              <div className="pb-chips" role="radiogroup" aria-label="Preview size">
                <button type="button" role="radio" aria-checked={preview === "desktop"} className={"pb-chip" + (preview === "desktop" ? " is-on" : "")} onClick={() => setPreview("desktop")}>
                  <Monitor /> Desktop
                </button>
                <button type="button" role="radio" aria-checked={preview === "mobile"} className={"pb-chip" + (preview === "mobile" ? " is-on" : "")} onClick={() => setPreview("mobile")}>
                  <Smartphone /> Mobile
                </button>
              </div>
            </div>
            <div className={"pb-banner-preview pb-banner-preview--" + preview}>
              {content.showBanner ? (
                <PageBanner content={content} fallbackTitle={pageLabel} mode={preview} placeholder />
              ) : (
                <div className="pb-banner-off">Banner is turned off for this page.</div>
              )}
            </div>
          </aside>
        </div>

        <footer className="pb-modal__foot pb-modal__foot--wrap">
          <button type="button" className="pb-btn pb-btn--ghost" onClick={reset} disabled={busy || (!live && !managed?.draft)}>
            <Undo2 /> Reset to default
          </button>
          {managed?.hasPrevious && (
            <button type="button" className="pb-btn pb-btn--ghost" onClick={restore} disabled={busy}>
              <History /> Restore previous
            </button>
          )}
          {managed?.hasUnpublishedChanges && !dirty && (
            <button type="button" className="pb-btn pb-btn--ghost" onClick={discard} disabled={busy}>
              Discard draft
            </button>
          )}
          <span className="pb-grow" />
          <button type="button" className="pb-btn" onClick={() => void saveDraft()} disabled={busy || !dirty}>
            Save draft
          </button>
          <button type="button" className="pb-btn pb-btn--primary" onClick={publish} disabled={busy || (!dirty && !differsFromLive)}>
            Publish
          </button>
        </footer>

        <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={onFile} />
      </div>

      {pending && (
        <ImageCropDialog
          title={`${SLOT[pending.slot].label} — crop & position`}
          src={pending.src}
          aspects={SLOT[pending.slot].aspects}
          shapes={SLOT[pending.slot].shapes}
          initial={pending.initial ? { ...pending.initial, ...(pending.file ? { zoom: 1, x: 0, y: 0, rotate: 0 } : {}) } : undefined}
          busy={busy}
          error={error}
          onCancel={() => !busy && setPending(null)}
          onApply={(r) => void applyCrop(r)}
        />
      )}
      {confirm && <ConfirmBox c={confirm} busy={busy} onClose={() => setConfirm(null)} />}
    </div>,
    document.body,
  );
}
