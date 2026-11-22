/**
 * HeroBackground.tsx
 * -----------------------------------------------------------------------------
 * Custom background photo for the church website's home hero.
 *
 * Storage: the existing per-page branding system (organization_page_branding,
 * pageKey "website-hero"). The photo is uploaded with the existing branding
 * upload (the organization's shared media storage) and saved as
 * bannerDesktop { url, x, y, zoom } + overlayOpacity. Publishing makes it
 * public; only people with the "Settings & Roles" permission (and the owner)
 * can upload, save or remove it — the server checks this on every call.
 *
 *   HeroBackdrop          the background layer (photo + dark blue gradient)
 *   HeroBackgroundDialog  upload / media library / position / zoom / overlay
 *   saveHeroBackground    upload (if new) + publish
 *   removeHeroBackground  unpublish (kept as "previous" on the server)
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { Check, Eye, ImageIcon, ImagePlus, Images, Loader2, RotateCcw, Trash2, Upload, X } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { listMedia, type MediaItem } from "../api/mediaApi";
import { pageBrandingApi, type ManagedPageBranding, type PageBrandingContent } from "../branding/pageBrandingApi";
import { applyManagedBranding } from "../branding/usePageBranding";

export const HERO_KEY = "website-hero";
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_OVERLAY = 0.55;
const OVERLAY_COLOR = "#0b2b5e";

/** What the hero shows. x / y: -1 … 1 (left/top … right/bottom), zoom 1 … 3, overlay 0 … 0.9. */
export interface HeroBg {
  url: string;
  x: number;
  y: number;
  zoom: number;
  overlay: number;
  video?: boolean;
  /** A new photo chosen from the computer, uploaded on Save. */
  file?: File | null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

/** The saved background from the published branding, if any. */
export function heroFromBranding(content: PageBrandingContent | null): HeroBg | null {
  const img = content?.bannerDesktop;
  if (!img?.url) return null;
  const url = mediaUrl(img.url);
  if (!url) return null;
  return {
    url,
    x: clamp(img.x ?? 0, -1, 1),
    y: clamp(img.y ?? 0, -1, 1),
    zoom: clamp(img.zoom ?? 1, 1, 3),
    overlay: clamp(content?.overlayOpacity ?? DEFAULT_OVERLAY, 0, 0.9),
  };
}

/** The church's existing cover, used when no custom hero background is saved. */
export function heroFromCover(url: string | null, video: boolean): HeroBg | null {
  return url ? { url, x: 0, y: -0.2, zoom: 1, overlay: DEFAULT_OVERLAY, video } : null;
}

const pct = (v: number) => `${Math.round((v + 1) * 50)}%`;

/** Dark blue gradient: always darker on the left, where the text sits. */
function overlayStyle(d: number): CSSProperties {
  const a = (n: number) => clamp(n, 0, 0.97).toFixed(3);
  return {
    background: `linear-gradient(90deg, rgba(var(--cw-dark-rgb, 11, 43, 94), ${a(0.42 + d * 0.6)}) 0%, rgba(var(--cw-dark-rgb, 11, 43, 94), ${a(0.18 + d * 0.62)}) 40%, rgba(var(--cw-dark-rgb, 11, 43, 94), ${a(d * 0.3)}) 72%, rgba(var(--cw-dark-rgb, 11, 43, 94), ${a(0.08 + d * 0.45)}) 100%)`,
  };
}

/** Background layer of the hero. Rendered behind the hero content, never above it. */
export function HeroBackdrop({ bg }: { bg: HeroBg | null }) {
  if (!bg) return <div className="cw-hero__shade" />;
  const pos = `${pct(bg.x)} ${pct(bg.y)}`;
  const style: CSSProperties = { transform: bg.zoom > 1 ? `scale(${bg.zoom})` : undefined, transformOrigin: pos };
  return (
    <>
      {bg.video ? (
        <video key={bg.url} className="cw-hero__media cw-hero__media--fade" src={bg.url} autoPlay muted loop playsInline style={{ ...style, objectPosition: pos }} />
      ) : (
        <div key={bg.url} className="cw-hero__media cw-hero__media--fade" style={{ ...style, backgroundImage: `url("${bg.url}")`, backgroundPosition: pos }} />
      )}
      <div className="cw-hero__shade" style={overlayStyle(bg.overlay)} />
    </>
  );
}

/* ----------------------------------------------------------------- saving */

export async function saveHeroBackground(organizationId: string, bg: HeroBg, onProgress?: (p: number) => void): Promise<ManagedPageBranding> {
  let stored = bg.url;
  if (bg.file) {
    const up = await pageBrandingApi.upload(organizationId, bg.file, bg.file.name || "hero.jpg", onProgress);
    stored = up.fileUrl;
  } else {
    // A saved / library image: send the stored path (/uploads/…), not the absolute URL.
    const i = stored.indexOf("/uploads/");
    if (i > 0) stored = stored.slice(i);
  }
  const content: PageBrandingContent = {
    showBanner: true,
    bannerDesktop: { url: stored, x: clamp(bg.x, -1, 1), y: clamp(bg.y, -1, 1), zoom: clamp(bg.zoom, 1, 3), aspect: "free" },
    overlayColor: OVERLAY_COLOR,
    overlayOpacity: clamp(bg.overlay, 0, 0.9),
  };
  const res = await pageBrandingApi.publish(organizationId, HERO_KEY, content);
  applyManagedBranding(organizationId, HERO_KEY, "", res);
  return res;
}

export async function removeHeroBackground(organizationId: string): Promise<void> {
  const res = await pageBrandingApi.reset(organizationId, HERO_KEY);
  applyManagedBranding(organizationId, HERO_KEY, "", res);
}

export function validateHeroFile(file: File): string | null {
  if (!TYPES.includes(file.type)) return "Choose a JPG, PNG or WebP photo.";
  if (file.size > MAX_BYTES) return "That photo is larger than 15 MB. Choose a smaller one.";
  return null;
}

/* ----------------------------------------------------------------- dialog */

type Source = "upload" | "library";

export default function HeroBackgroundDialog({
  organizationId,
  churchName,
  initial,
  saved,
  hasCover,
  startWithPicker,
  onClose,
  onPreview,
  onSaved,
  onRemoved,
}: {
  organizationId: string;
  churchName: string;
  /** What to start editing (pending changes or the saved background). */
  initial: HeroBg | null;
  /** Whether a custom background is currently saved. */
  saved: boolean;
  /** Whether the church has a cover photo to fall back to. */
  hasCover: boolean;
  startWithPicker?: boolean;
  onClose: () => void;
  onPreview: (bg: HeroBg) => void;
  onSaved: (message: string) => void;
  onRemoved: (message: string) => void;
}) {
  const [bg, setBg] = useState<HeroBg | null>(initial && !initial.video ? initial : null);
  const [source, setSource] = useState<Source>("upload");
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    if (startWithPicker) fileRef.current?.click();
  }, [startWithPicker]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  function pickFile(file: File | undefined) {
    if (!file) return;
    const problem = validateHeroFile(file);
    if (problem) return setError(problem);
    setError(null);
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setBg((cur) => ({ url, file, x: 0, y: 0, zoom: 1, overlay: cur?.overlay ?? DEFAULT_OVERLAY }));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function save() {
    if (!bg) return;
    setBusy("save");
    setError(null);
    setProgress(0);
    try {
      await saveHeroBackground(organizationId, bg, setProgress);
      onSaved("Background saved. It's now live on your website.");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The background could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(hasCover ? "Remove the custom background? Your cover photo will show instead." : "Remove the background photo?")) return;
    setBusy("remove");
    setError(null);
    try {
      await removeHeroBackground(organizationId);
      onRemoved("Background removed.");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The background could not be removed.");
    } finally {
      setBusy(null);
    }
  }

  const set = (patch: Partial<HeroBg>) => setBg((cur) => (cur ? { ...cur, ...patch } : cur));

  return (
    <div className="hbg" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="hbg__box" role="dialog" aria-modal="true" aria-labelledby="hbg-title">
        <header className="hbg__head">
          <div>
            <h2 id="hbg-title">Change Background</h2>
            <p>Homepage hero photo for {churchName}</p>
          </div>
          <button type="button" className="hbg__close" onClick={onClose} disabled={Boolean(busy)} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="hbg__body">
          <div className="hbg__left">
            <div className="hbg__tabs" role="tablist">
              <button type="button" role="tab" aria-selected={source === "upload"} className={source === "upload" ? "is-on" : ""} onClick={() => setSource("upload")}>
                <Upload aria-hidden="true" /> Upload photo
              </button>
              <button type="button" role="tab" aria-selected={source === "library"} className={source === "library" ? "is-on" : ""} onClick={() => setSource("library")}>
                <Images aria-hidden="true" /> Media Library
              </button>
            </div>

            <input ref={fileRef} type="file" accept={TYPES.join(",")} hidden onChange={(e) => (pickFile(e.target.files?.[0]), (e.target.value = ""))} />
            {source === "upload" ? (
              <button
                type="button"
                className={"hbg__drop" + (dragging ? " is-drag" : "")}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => (e.preventDefault(), setDragging(true))}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <ImagePlus aria-hidden="true" />
                <b>Choose a photo from your computer</b>
                <small>or drag it here · JPG, PNG or WebP · up to 15 MB · a wide photo (at least 1920 px) looks best</small>
              </button>
            ) : (
              <LibraryPicker organizationId={organizationId} selected={bg?.file ? null : (bg?.url ?? null)} onPick={(url) => setBg((cur) => ({ url, x: 0, y: 0, zoom: 1, overlay: cur?.overlay ?? DEFAULT_OVERLAY }))} />
            )}

            <fieldset className="hbg__controls" disabled={!bg || Boolean(busy)}>
              <legend>Adjust</legend>
              <Slider label="Horizontal position" value={Math.round(((bg?.x ?? 0) + 1) * 50)} min={0} max={100} unit="%" onChange={(v) => set({ x: v / 50 - 1 })} />
              <Slider label="Vertical position" value={Math.round(((bg?.y ?? 0) + 1) * 50)} min={0} max={100} unit="%" onChange={(v) => set({ y: v / 50 - 1 })} />
              <Slider label="Zoom" value={Math.round((bg?.zoom ?? 1) * 100)} min={100} max={300} unit="%" onChange={(v) => set({ zoom: v / 100 })} />
              <Slider label="Overlay darkness" value={Math.round((bg?.overlay ?? DEFAULT_OVERLAY) * 100)} min={0} max={90} unit="%" onChange={(v) => set({ overlay: v / 100 })} />
              <button type="button" className="hbg__reset" onClick={() => set({ x: 0, y: 0, zoom: 1, overlay: DEFAULT_OVERLAY })}>
                <RotateCcw aria-hidden="true" /> Reset adjustments
              </button>
            </fieldset>
          </div>

          <div className="hbg__right">
            <span className="hbg__label">Live preview</span>
            <div className="hbg__preview cw-hero" aria-label="Preview of the homepage hero">
              <HeroBackdrop bg={bg} />
              <div className="hbg__sample">
                <small>WELCOME TO</small>
                <strong>{churchName}</strong>
                <span>
                  <i>Plan a Visit</i>
                  <i className="is-light">Service Times</i>
                </span>
              </div>
              {!bg && (
                <div className="hbg__empty">
                  <ImageIcon aria-hidden="true" /> Choose a photo to see it here
                </div>
              )}
            </div>
            <p className="hbg__hint">The church name, welcome message, mission, buttons and service schedule always stay on top of the photo.</p>
            {bg?.file && <p className="hbg__hint">New photo: {bg.file.name}. It will be uploaded when you save.</p>}
          </div>
        </div>

        {error && (
          <p className="hbg__error" role="alert">
            {error}
          </p>
        )}

        <footer className="hbg__foot">
          {saved && (
            <button type="button" className="cw-btn cw-btn--outline hbg__danger" onClick={() => void remove()} disabled={Boolean(busy)}>
              {busy === "remove" ? <Loader2 className="cw-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />} Remove background
            </button>
          )}
          <span className="hbg__spacer" />
          <button type="button" className="cw-btn cw-btn--outline" onClick={onClose} disabled={Boolean(busy)}>
            Cancel
          </button>
          <button type="button" className="cw-btn cw-btn--outline" onClick={() => bg && onPreview(bg)} disabled={!bg || Boolean(busy)}>
            <Eye aria-hidden="true" /> Preview on page
          </button>
          <button type="button" className="cw-btn cw-btn--primary" onClick={() => void save()} disabled={!bg || Boolean(busy)}>
            {busy === "save" ? <Loader2 className="cw-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            {busy === "save" ? (bg?.file && progress < 100 ? `Uploading ${progress}%` : "Saving…") : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="hbg__slider">
      <span>
        {label} <b>{value}{unit}</b>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/** Photos already uploaded to this church's Media Library. */
function LibraryPicker({ organizationId, selected, onPick }: { organizationId: string; selected: string | null; onPick: (url: string) => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listMedia(organizationId, { mediaType: "photo", pageSize: 60 })
      .then((r) => alive && setItems(r.items ?? []))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "The Media Library could not be loaded."));
    return () => {
      alive = false;
    };
  }, [organizationId]);

  // Only photos stored on Fockis can be used (the server checks this too).
  const photos = useMemo(() => (items ?? []).filter((m) => m.fileUrl?.startsWith("/uploads/") && /\.(jpe?g|png|webp)$/i.test(m.fileUrl.split("?")[0])), [items]);

  if (error) return <p className="hbg__error">{error}</p>;
  if (!items)
    return (
      <p className="hbg__muted">
        <Loader2 className="cw-spin" aria-hidden="true" /> Loading photos…
      </p>
    );
  if (photos.length === 0) return <p className="hbg__muted">No photos in your Media Library yet. Upload one from your computer instead.</p>;
  return (
    <ul className="hbg__library">
      {photos.map((m) => {
        const url = mediaUrl(m.fileUrl) ?? m.fileUrl;
        return (
          <li key={m.id}>
            <button type="button" className={selected === url ? "is-on" : ""} onClick={() => onPick(url)} title={m.title} aria-pressed={selected === url}>
              <img src={mediaUrl(m.thumbnailUrl) ?? url} alt={m.title || "Photo"} loading="lazy" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
