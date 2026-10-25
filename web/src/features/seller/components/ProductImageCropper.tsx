import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

/**
 * ============================================================================
 * SELLER CENTER: PRODUCT IMAGE CROPPER
 * ============================================================================
 * Lets a seller turn any photo into the square image that product cards use.
 * The seller either crops a square out of the photo (fill) or keeps the whole
 * product visible on a white background (fit). The result is drawn onto a
 * canvas at OUTPUT_SIZE × OUTPUT_SIZE and handed back as a JPEG File, so the
 * existing upload flow receives a normal image file.
 * ============================================================================
 */

export const OUTPUT_SIZE = 600;
const OUTPUT_QUALITY = 0.9;

type ProductImageCropperProps = {
  file: File;
  /** Shown as "Photo 2 of 3" when several photos are being adjusted. */
  position?: { current: number; total: number };
  onDone: (file: File) => void;
  onSkip: () => void;
  skipLabel?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The image could not be opened."));
    img.src = src;
  });
}

async function renderSquare(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not prepare the image.");

  // White background: fills the padding in "fit" mode and replaces
  // transparency, since the result is saved as JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // `area` is in source pixels and may extend past the photo's edges.
  const scale = OUTPUT_SIZE / area.width;
  ctx.drawImage(
    img,
    0,
    0,
    img.naturalWidth,
    img.naturalHeight,
    -area.x * scale,
    -area.y * scale,
    img.naturalWidth * scale,
    img.naturalHeight * scale,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Your browser could not save the image."))),
      "image/jpeg",
      OUTPUT_QUALITY,
    );
  });
}

function outputName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "product-image";
  return `${base}-${OUTPUT_SIZE}x${OUTPUT_SIZE}.jpg`;
}

export default function ProductImageCropper({
  file,
  position,
  onDone,
  onSkip,
  skipLabel = "Skip this photo",
}: ProductImageCropperProps) {
  const src = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Zoom at which the whole photo fits inside the square.
  const fitZoom = natural
    ? Math.min(natural.width, natural.height) / Math.max(natural.width, natural.height)
    : 1;
  const minZoom = Math.min(1, fitZoom);
  const maxZoom = 4;

  useEffect(() => {
    let active = true;
    setNatural(null);
    setError("");
    loadImage(src)
      .then((img) => {
        if (!active) return;
        const size = { width: img.naturalWidth, height: img.naturalHeight };
        setNatural(size);
        // Start with the whole product visible; sellers zoom in to crop.
        setZoom(Math.min(size.width, size.height) / Math.max(size.width, size.height));
        setCrop({ x: 0, y: 0 });
      })
      .catch(() => active && setError(`${file.name} could not be opened. Try a JPG, PNG or WebP photo.`));
    return () => {
      active = false;
    };
  }, [src, file.name]);

  // Escape skips, like closing a dialog.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onSkip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip, saving]);

  const handleCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  function setPreset(nextZoom: number) {
    setZoom(nextZoom);
    setCrop({ x: 0, y: 0 });
  }

  async function handleSave() {
    if (!area) return;
    setSaving(true);
    setError("");
    try {
      const blob = await renderSquare(src, area);
      onDone(new File([blob], outputName(file.name), { type: "image/jpeg", lastModified: Date.now() }));
    } catch (err: any) {
      setError(err?.message || "The image could not be saved.");
      setSaving(false);
    }
  }

  const isFit = Math.abs(zoom - fitZoom) < 0.005;
  const isFill = Math.abs(zoom - 1) < 0.005;
  const zoomStep = 0.05;

  return createPortal(
    <div className="pic-cropper" role="dialog" aria-modal="true" aria-labelledby="pic-cropper-title">
      <div className="pic-cropper__backdrop" />
      <div className="pic-cropper__panel">
        <header className="pic-cropper__head">
          <div>
            <h2 id="pic-cropper-title">Adjust product photo</h2>
            <p>
              {natural
                ? `Your photo is ${natural.width} × ${natural.height}. It will be saved as a ${OUTPUT_SIZE} × ${OUTPUT_SIZE} square.`
                : "Loading photo…"}
            </p>
          </div>
          {position && position.total > 1 && (
            <span className="pic-cropper__count">
              Photo {position.current} of {position.total}
            </span>
          )}
        </header>

        <div className="pic-cropper__stage">
          {natural && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={maxZoom}
              aspect={1}
              restrictPosition={false}
              objectFit="contain"
              showGrid
              zoomSpeed={0.15}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              style={{ containerStyle: { background: "#ffffff" } }}
            />
          )}
        </div>

        <div className="pic-cropper__presets" role="group" aria-label="Framing">
          <button
            type="button"
            className={isFit ? "is-active" : ""}
            onClick={() => setPreset(fitZoom)}
            disabled={!natural}
          >
            <Minimize size={16} aria-hidden="true" /> Fit whole photo
          </button>
          <button
            type="button"
            className={isFill ? "is-active" : ""}
            onClick={() => setPreset(1)}
            disabled={!natural}
          >
            <Maximize size={16} aria-hidden="true" /> Fill square
          </button>
          <button type="button" onClick={() => setPreset(fitZoom)} disabled={!natural} aria-label="Reset position">
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </button>
        </div>

        <div className="pic-cropper__zoom">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(minZoom, z - zoomStep * 2))}
            disabled={!natural}
          >
            <ZoomOut size={18} aria-hidden="true" />
          </button>
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="Zoom"
            disabled={!natural}
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(maxZoom, z + zoomStep * 2))}
            disabled={!natural}
          >
            <ZoomIn size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="pic-cropper__tip">
          Drag to move the photo and zoom to frame it. Any empty space is filled with white,
          which keeps product cards clean and consistent.
        </p>

        {error && (
          <div className="pic-cropper__error" role="alert">
            {error}
          </div>
        )}

        <footer className="pic-cropper__actions">
          <button type="button" className="pic-cropper__secondary" onClick={onSkip} disabled={saving}>
            {skipLabel}
          </button>
          <button
            type="button"
            className="pic-cropper__primary"
            onClick={handleSave}
            disabled={saving || !area || !natural}
          >
            {saving ? "Saving…" : "Use this photo"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
