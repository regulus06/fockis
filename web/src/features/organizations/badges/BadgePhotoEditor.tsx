/**
 * BadgePhotoEditor.tsx
 * -----------------------------------------------------------------------------
 * Photo editor for a member badge: upload, drag, zoom, rotate, move, crop
 * area size, fit / fill, and the photo shape — with a live preview of the
 * real badge. Saving uploads the edited picture plus the untouched original
 * (so it can be re-cropped later) and the crop settings.
 *
 * The server decides who may save: badge managers always; the member only
 * when the church allows members to change their own badge photo.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area, type MediaSize, type Point } from "react-easy-crop";
import {
  Circle,
  Expand,
  ImageUp,
  LoaderCircle,
  Minimize2,
  RectangleVertical,
  RotateCcw,
  RotateCw,
  Square,
  SquareRoundCorner,
  Trash2,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";

import OfficialBadge, { shapeAspect } from "./OfficialBadge";
import {
  BADGE_EDITOR_ACCEPT,
  BADGE_PHOTO_MAX_BYTES,
  badgeApi,
  badgePhotoSrc,
  type Badge,
  type BadgePhotoSettings,
  type PhotoShape,
} from "./badgeApi";
import "./myBadge.scss";

const SHAPES: { id: PhotoShape; label: string; icon: LucideIcon }[] = [
  { id: "circle", label: "Circle", icon: Circle },
  { id: "rounded", label: "Rounded square", icon: SquareRoundCorner },
  { id: "square", label: "Square", icon: Square },
  { id: "rectangle", label: "Rectangle", icon: RectangleVertical },
  { id: "oval", label: "Oval", icon: Circle },
  { id: "custom", label: "Custom corners", icon: SquareRoundCorner },
];

const MAX_SIDE = 4000; // larger pictures are scaled down before cropping
const MIN_SIDE = 200;

interface Props {
  badge: Badge;
  onClose: () => void;
  /** Called with the updated badge after saving or removing the photo. */
  onSaved: (badge: Badge, message: string) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This picture could not be opened."));
    img.src = src;
  });
}

/** Draws the cropped area (with rotation) into a canvas of the given size, on white. */
function renderCrop(img: HTMLImageElement, area: Area, rotation: number, outW: number, outH: number): HTMLCanvasElement {
  const scaleDown = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const iw = img.naturalWidth * scaleDown;
  const ih = img.naturalHeight * scaleDown;
  const rad = (rotation * Math.PI) / 180;
  const bw = Math.abs(Math.cos(rad) * iw) + Math.abs(Math.sin(rad) * ih);
  const bh = Math.abs(Math.sin(rad) * iw) + Math.abs(Math.cos(rad) * ih);

  const rotated = document.createElement("canvas");
  rotated.width = Math.round(bw);
  rotated.height = Math.round(bh);
  const rctx = rotated.getContext("2d")!;
  rctx.imageSmoothingQuality = "high";
  rctx.translate(bw / 2, bh / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);
  const s = outW / (area.width * scaleDown);
  ctx.drawImage(rotated, -area.x * scaleDown * s, -area.y * scaleDown * s, bw * s, bh * s);
  return out;
}

export default function BadgePhotoEditor({ badge, onClose, onSaved }: Props) {
  const saved = badge.photo;
  const [source, setSource] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [shape, setShape] = useState<PhotoShape>(saved?.shape ?? "circle");
  const [corner, setCorner] = useState(saved?.cornerRadius ?? 24);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fit, setFit] = useState<"fill" | "fit">(saved?.fit ?? "fill");
  const [areaPct, setAreaPct] = useState(82);
  const [area, setArea] = useState<Area | null>(null);
  const [media, setMedia] = useState<MediaSize | null>(null);
  const [preview, setPreview] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [box, setBox] = useState({ w: 360, h: 340 });
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const objectUrls = useRef<string[]>([]);
  const openedSource = useRef<string | null>(null);
  const [cropKey, setCropKey] = useState(0);
  const savedArea = useRef<Area | undefined>(
    saved && saved.cropWidth > 0 && saved.originalUrl ? { x: saved.cropX, y: saved.cropY, width: saved.cropWidth, height: saved.cropHeight } : undefined,
  );
  const initialArea = useRef<Area | undefined>(savedArea.current);

  const aspect = shapeAspect(shape);

  // Open the original photo (or the current badge photo) as a local copy, so
  // the canvas can read it.
  useEffect(() => {
    const url = badgePhotoSrc(saved?.originalUrl ?? badge.avatarUrl);
    if (!url) return;
    let cancelled = false;
    fetch(url, { mode: "cors", credentials: "omit" })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("not found"))))
      .then((blob) => {
        if (cancelled) return;
        const local = URL.createObjectURL(blob);
        objectUrls.current.push(local);
        openedSource.current = local;
        setSource(local);
        if (saved?.originalUrl) setRotation(saved.rotation ?? 0);
      })
      .catch(() => !cancelled && setSourceError("The current photo could not be opened for editing. Upload it again."));
    return () => {
      cancelled = true;
    };
  }, [badge.avatarUrl, saved?.originalUrl, saved?.rotation]);

  useEffect(
    () => () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  useEffect(() => {
    if (!source) return;
    loadImage(source)
      .then((img) => (imgRef.current = img))
      .catch(() => setSourceError("This picture could not be opened."));
  }, [source]);

  // Size of the crop window follows the editor box.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cropSize = useMemo(() => {
    const h = Math.min(box.h * (areaPct / 100), (box.w * (areaPct / 100)) / aspect);
    return { width: Math.round(h * aspect), height: Math.round(h) };
  }, [box, areaPct, aspect]);

  // Fit = the whole picture visible inside the crop area.
  const fitZoom = useMemo(() => {
    if (!media) return 1;
    return Math.min(1, Math.min(cropSize.width / media.width, cropSize.height / media.height));
  }, [media, cropSize]);

  const minZoom = fit === "fit" ? Math.max(0.1, Math.min(fitZoom, 1)) : 1;

  const applyFit = (mode: "fill" | "fit") => {
    setFit(mode);
    setCrop({ x: 0, y: 0 });
    setZoom(mode === "fit" ? fitZoom : 1);
  };

  // Horizontal / vertical sliders: −100…100 % of the room there is to move.
  const range = useMemo(() => {
    if (!media) return { x: 1, y: 1 };
    const w = media.width * zoom;
    const h = media.height * zoom;
    return {
      x: Math.max(1, Math.abs(w - cropSize.width) / 2),
      y: Math.max(1, Math.abs(h - cropSize.height) / 2),
    };
  }, [media, zoom, cropSize]);

  // Live preview of the badge photo.
  useEffect(() => {
    if (!area || !imgRef.current) return;
    const t = window.setTimeout(() => {
      if (!imgRef.current) return;
      const w = 360;
      const canvas = renderCrop(imgRef.current, area, rotation, w, Math.round(w / aspect));
      setPreview(canvas.toDataURL("image/jpeg", 0.85));
    }, 90);
    return () => window.clearTimeout(t);
  }, [area, rotation, aspect, source]);

  const onComplete = useCallback((_a: Area, pixels: Area) => setArea(pixels), []);

  async function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!BADGE_EDITOR_ACCEPT.split(",").includes(file.type)) return setError("Use a JPG, JPEG, PNG or WebP picture.");
    if (file.size > BADGE_PHOTO_MAX_BYTES) return setError("The photo is too large. The limit is 8 MB.");
    const local = URL.createObjectURL(file);
    try {
      const img = await loadImage(local);
      if (Math.min(img.naturalWidth, img.naturalHeight) < MIN_SIDE) {
        URL.revokeObjectURL(local);
        return setError(`The photo is too small. Use one at least ${MIN_SIDE} × ${MIN_SIDE} pixels.`);
      }
    } catch {
      URL.revokeObjectURL(local);
      return setError("This picture could not be opened.");
    }
    objectUrls.current.push(local);
    initialArea.current = undefined;
    setNewFile(file);
    setSourceError(null);
    setSource(local);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFit("fill");
  }

  /** Back to the photo and settings as they were when the editor opened. */
  function reset() {
    setNewFile(null);
    setError(null);
    setSource(openedSource.current);
    setArea(null);
    initialArea.current = savedArea.current;
    setShape(saved?.shape ?? "circle");
    setCorner(saved?.cornerRadius ?? 24);
    setFit(saved?.fit ?? "fill");
    setRotation(saved?.originalUrl ? (saved.rotation ?? 0) : 0);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPct(82);
    setCropKey((k) => k + 1);
  }

  async function save() {
    if (!area || !imgRef.current) return setError("Choose a photo first.");
    setBusy("save");
    setError(null);
    try {
      const outW = Math.max(480, Math.min(1200, Math.round(area.width)));
      const outH = Math.round(outW / aspect);
      const canvas = renderCrop(imgRef.current, area, rotation, outW, outH);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
      if (!blob) throw new Error("The edited photo could not be created.");
      const edited = new File([blob], "badge-photo.jpg", { type: "image/jpeg" });
      const settings: Omit<BadgePhotoSettings, "originalUrl"> = {
        shape,
        cornerRadius: corner,
        x: crop.x,
        y: crop.y,
        zoom,
        rotation,
        aspect,
        fit,
        cropX: Math.round(area.x),
        cropY: Math.round(area.y),
        cropWidth: Math.round(area.width),
        cropHeight: Math.round(area.height),
        outputWidth: outW,
        outputHeight: outH,
      };
      const res = await badgeApi.uploadPhoto(badge.organizationId, badge.membershipId, edited, { original: newFile, settings });
      onSaved(res.badge ?? { ...badge, avatarUrl: res.avatarUrl }, "Badge photo saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The photo could not be saved.");
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    setError(null);
    try {
      const res = await badgeApi.removePhoto(badge.organizationId, badge.membershipId);
      onSaved(res.badge ?? { ...badge, avatarUrl: null, photo: null }, "Badge photo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The photo could not be removed.");
      setBusy(null);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, suffix = "") => (
    <label className="bpe-slider">
      <span>
        {label}
        <output>
          {Math.round(value * 10) / 10}
          {suffix}
        </output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={!source} />
    </label>
  );

  return createPortal(
    <div className="bpe" role="dialog" aria-modal="true" aria-label="Edit badge photo">
      <div className="bpe__card">
        <header className="bpe__head">
          <h2>Edit badge photo</h2>
          <button type="button" className="bpe__x" onClick={onClose} disabled={busy !== null} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="bpe__body">
          <section className="bpe__stage">
            <div className="bpe__crop" ref={boxRef}>
              {source ? (
                <Cropper
                  key={cropKey}
                  image={source}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspect}
                  cropShape={shape === "circle" || shape === "oval" ? "round" : "rect"}
                  cropSize={cropSize}
                  minZoom={minZoom}
                  maxZoom={5}
                  restrictPosition={fit === "fill"}
                  showGrid
                  objectFit="contain"
                  initialCroppedAreaPixels={initialArea.current}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onComplete}
                  onMediaLoaded={setMedia}
                  style={{ cropAreaStyle: shape === "rounded" || shape === "custom" ? { borderRadius: shape === "rounded" ? "20%" : `${corner}%` } : {} }}
                />
              ) : (
                <div className="bpe__empty">
                  <ImageUp aria-hidden="true" />
                  <strong>{sourceError ? "Upload a photo" : badge.avatarUrl ? "Opening photo…" : "No photo yet"}</strong>
                  <span>{sourceError ?? "JPG, JPEG, PNG or WebP · up to 8 MB"}</span>
                </div>
              )}
            </div>
            <div className="bpe__toolbar">
              <label className="bpe-btn bpe-btn--primary">
                <ImageUp aria-hidden="true" /> {source ? "Upload new photo" : "Upload photo"}
                <input type="file" accept={BADGE_EDITOR_ACCEPT} onChange={(e) => void chooseFile(e)} hidden />
              </label>
              <button type="button" className="bpe-btn" onClick={() => setRotation((r) => ((r - 90 + 540) % 360) - 180)} disabled={!source} aria-label="Rotate left">
                <RotateCcw aria-hidden="true" />
              </button>
              <button type="button" className="bpe-btn" onClick={() => setRotation((r) => ((r + 90 + 540) % 360) - 180)} disabled={!source} aria-label="Rotate right">
                <RotateCw aria-hidden="true" />
              </button>
              <button type="button" className={`bpe-btn ${fit === "fill" ? "is-on" : ""}`} onClick={() => applyFit("fill")} disabled={!source} aria-pressed={fit === "fill"}>
                <Expand aria-hidden="true" /> Fill
              </button>
              <button type="button" className={`bpe-btn ${fit === "fit" ? "is-on" : ""}`} onClick={() => applyFit("fit")} disabled={!source} aria-pressed={fit === "fit"}>
                <Minimize2 aria-hidden="true" /> Fit
              </button>
            </div>
            <p className="bpe__hint">Drag the photo to move it. Scroll or pinch to zoom.</p>
          </section>

          <section className="bpe__controls" aria-label="Photo settings">
            <h3>Shape</h3>
            <div className="bpe-shapes" role="radiogroup" aria-label="Photo shape">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={shape === s.id}
                  className={`bpe-shape bpe-shape--${s.id} ${shape === s.id ? "is-on" : ""}`}
                  onClick={() => setShape(s.id)}
                >
                  <span className="bpe-shape__swatch" aria-hidden="true" style={s.id === "custom" ? { borderRadius: `${corner}%` } : undefined} />
                  {s.label}
                </button>
              ))}
            </div>
            {shape === "custom" && slider("Corner radius", corner, 0, 50, 1, setCorner, "%")}

            <h3>Adjust</h3>
            {slider("Zoom", zoom, minZoom, 5, 0.01, setZoom, "×")}
            {slider("Rotation", rotation, -180, 180, 1, setRotation, "°")}
            {slider("Horizontal position", Math.round((crop.x / range.x) * 100), -100, 100, 1, (v) => setCrop((c) => ({ ...c, x: (v / 100) * range.x })))}
            {slider("Vertical position", Math.round((crop.y / range.y) * 100), -100, 100, 1, (v) => setCrop((c) => ({ ...c, y: (v / 100) * range.y })))}
            {slider("Crop area", areaPct, 50, 95, 1, setAreaPct, "%")}
          </section>

          <section className="bpe__preview" aria-label="Badge preview">
            <h3>Live badge preview</h3>
            <OfficialBadge
              badge={badge}
              photoOverride={preview === undefined ? undefined : preview}
              shapeOverride={shape}
              cornerOverride={corner}
              className="bpe__badge"
              noStamp
            />
          </section>
        </div>

        {error && (
          <p className="bpe__error" role="alert">
            {error}
          </p>
        )}

        <footer className="bpe__foot">
          {badge.avatarUrl &&
            (confirmRemove ? (
              <span className="bpe__confirm">
                Remove the photo?
                <button type="button" className="bpe-btn bpe-btn--danger" onClick={() => void remove()} disabled={busy !== null}>
                  {busy === "remove" ? "Removing…" : "Remove"}
                </button>
                <button type="button" className="bpe-btn" onClick={() => setConfirmRemove(false)} disabled={busy !== null}>
                  Keep
                </button>
              </span>
            ) : (
              <button type="button" className="bpe-btn bpe-btn--ghost" onClick={() => setConfirmRemove(true)} disabled={busy !== null}>
                <Trash2 aria-hidden="true" /> Remove photo
              </button>
            ))}
          <span className="bpe__spacer" />
          <button type="button" className="bpe-btn" onClick={onClose} disabled={busy !== null}>
            Cancel
          </button>
          <button type="button" className="bpe-btn" onClick={reset} disabled={(!source && !newFile) || busy !== null}>
            <Undo2 aria-hidden="true" /> Reset
          </button>
          <button type="button" className="bpe-btn bpe-btn--primary" onClick={() => void save()} disabled={!source || !area || busy !== null}>
            {busy === "save" ? <LoaderCircle className="bpe-spin" aria-hidden="true" /> : null}
            {busy === "save" ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
