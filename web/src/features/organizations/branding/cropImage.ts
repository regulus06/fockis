/**
 * cropImage.ts
 * -----------------------------------------------------------------------------
 * The crop maths shared by the on-screen preview and the exported file, so
 * what the admin sees is exactly what is saved.
 *
 * The image always COVERS the frame (scaled up, never stretched); zoom ≥ 1
 * enlarges it, x/y (-1 … 1) slide it inside the room zoom leaves, and rotate
 * turns it in 90° steps (no empty corners).
 * -----------------------------------------------------------------------------
 */

import type { ImageShape } from "./pageBrandingApi";

export interface CropState {
  zoom: number;
  x: number;
  y: number;
  rotate: number;
}

export const ASPECT_RATIO: Record<string, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "16:9": 16 / 9,
  "3:4": 3 / 4,
  "3:1": 3,
  "2:1": 2,
};

export function ratioOf(aspect?: string): number {
  return ASPECT_RATIO[aspect ?? ""] ?? 1;
}

function geometry(img: { width: number; height: number }, W: number, H: number, s: CropState) {
  const quarter = (((Math.round(s.rotate / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const ew = quarter % 2 ? img.height : img.width;
  const eh = quarter % 2 ? img.width : img.height;
  const scale = Math.max(W / ew, H / eh) * Math.max(1, s.zoom);
  const mx = Math.max(0, (ew * scale - W) / 2);
  const my = Math.max(0, (eh * scale - H) / 2);
  return { quarter, scale, mx, my };
}

/** Draw the cropped image into a W×H canvas context. */
export function drawCrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number, s: CropState) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const g = geometry({ width: w, height: h }, W, H, s);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.translate(W / 2 - s.x * g.mx, H / 2 - s.y * g.my);
  ctx.rotate((g.quarter * Math.PI) / 2);
  ctx.drawImage(img, (-w * g.scale) / 2, (-h * g.scale) / 2, w * g.scale, h * g.scale);
  ctx.restore();
}

/** How far (in frame px) the image can move each way at this zoom. */
export function moveRoom(img: HTMLImageElement, W: number, H: number, s: CropState) {
  const g = geometry({ width: img.naturalWidth, height: img.naturalHeight }, W, H, s);
  return { mx: g.mx, my: g.my };
}

/**
 * Clip a W×H canvas to the chosen shape (same corner radius as the on-screen
 * frame). Outside the shape stays transparent, so export as PNG/WebP.
 */
function clipShape(ctx: CanvasRenderingContext2D, W: number, H: number, shape: ImageShape) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2);
  } else {
    const r = Math.min(W, H) * 0.14;
    ctx.moveTo(r, 0);
    ctx.arcTo(W, 0, W, H, r);
    ctx.arcTo(W, H, 0, H, r);
    ctx.arcTo(0, H, 0, 0, r);
    ctx.arcTo(0, 0, W, 0, r);
    ctx.closePath();
  }
  ctx.clip();
}

/**
 * Export at the given long-side size, never larger than the source allows.
 * With a "rounded" or "circle" shape the corners are cut out of the file
 * itself (transparent), so the image keeps its shape wherever it is shown.
 */
export function exportCrop(
  img: HTMLImageElement,
  aspect: string,
  longSide: number,
  s: CropState,
  type = "image/jpeg",
  shape?: ImageShape,
): Promise<Blob> {
  const r = ratioOf(aspect);
  let W = r >= 1 ? longSide : Math.round(longSide * r);
  let H = r >= 1 ? Math.round(longSide / r) : longSide;
  // Don't upscale beyond what the visible part of the source really has.
  const g = geometry({ width: img.naturalWidth, height: img.naturalHeight }, W, H, s);
  if (g.scale > 1) {
    W = Math.max(1, Math.round(W / g.scale));
    H = Math.max(1, Math.round(H / g.scale));
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Your browser cannot edit images."));
  const masked = shape === "circle" || shape === "rounded";
  if (masked) type = "image/png";
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
  }
  if (masked) clipShape(ctx, W, H, shape);
  drawCrop(ctx, img, W, H, s);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The image could not be prepared."))), type, 0.9),
  );
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This image could not be opened. Try a JPG, PNG or WebP file."));
    img.src = src;
  });
}

/**
 * Re-open a saved original for re-cropping. Fetching it as a blob keeps the
 * canvas exportable even when the API is on another origin (needs CORS on
 * /uploads; when that is not allowed the caller asks for the file again).
 */
export async function fetchAsObjectUrl(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error("The original image is no longer available.");
  return URL.createObjectURL(await res.blob());
}
