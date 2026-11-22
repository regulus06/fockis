/**
 * badgeExport.ts
 * -----------------------------------------------------------------------------
 * Print, PNG and PDF for the official badge. All three start from the badge
 * SVG on the page, with its pictures embedded, so they look exactly like the
 * screen. No extra libraries: the PDF is a one-page file written by hand with
 * the badge as a JPEG image.
 * -----------------------------------------------------------------------------
 */

import { BADGE_H, BADGE_W } from "./OfficialBadge";

async function toDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** The badge SVG as text, with logo and photo embedded (pictures that can't be read are left out). */
export async function badgeSvgMarkup(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const images = Array.from(clone.querySelectorAll("image"));
  await Promise.all(
    images.map(async (img) => {
      const href = img.getAttribute("href") || img.getAttributeNS("http://www.w3.org/1999/xlink", "href") || "";
      const data = href ? await toDataUrl(href) : null;
      if (data) img.setAttribute("href", data);
      else img.remove();
    }),
  );
  clone.setAttribute("width", String(BADGE_W));
  clone.setAttribute("height", String(BADGE_H));
  clone.removeAttribute("class");
  return new XMLSerializer().serializeToString(clone);
}

async function badgeCanvas(svg: SVGSVGElement, scale: number): Promise<HTMLCanvasElement> {
  const markup = await badgeSvgMarkup(svg);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("The badge picture could not be drawn."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(BADGE_W * scale);
    canvas.height = Math.round(BADGE_H * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't create images.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function badgeFileName(name: string, ext: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "member";
  return `${slug}-badge.${ext}`;
}

/** High-quality PNG (4× = 1560 × 2192 px). */
export async function downloadBadgePng(svg: SVGSVGElement, filename: string): Promise<void> {
  const canvas = await badgeCanvas(svg, 4);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("The PNG could not be created.");
  save(blob, filename);
}

/* ---------------------------------------------------------------- PDF */

function ascii(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function buildPdf(jpeg: Uint8Array, pxWidth: number, pxHeight: number, ptWidth: number, ptHeight: number): Blob {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: Uint8Array) => {
    parts.push(chunk);
    length += chunk.length;
  };
  const obj = (n: number, body: string | Uint8Array[], ) => {
    offsets[n] = length;
    if (typeof body === "string") push(ascii(`${n} 0 obj\n${body}\nendobj\n`));
    else {
      push(ascii(`${n} 0 obj\n`));
      body.forEach(push);
      push(ascii(`\nendobj\n`));
    }
  };
  const w = ptWidth.toFixed(2);
  const h = ptHeight.toFixed(2);
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;

  push(ascii("%PDF-1.4\n%âãÏÓ\n"));
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, [
    ascii(`<< /Type /XObject /Subtype /Image /Width ${pxWidth} /Height ${pxHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
    jpeg,
    ascii("\nendstream"),
  ]);
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = length;
  let table = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) table += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  push(ascii(table + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

/** One-page PDF the size of the badge (3.75 × 5.27 in), print-quality image. */
export async function downloadBadgePdf(svg: SVGSVGElement, filename: string): Promise<void> {
  const canvas = await badgeCanvas(svg, 4);
  // JPEG has no transparency: put the badge on white.
  const flat = document.createElement("canvas");
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);
  const blob = await new Promise<Blob | null>((r) => flat.toBlob(r, "image/jpeg", 0.95));
  if (!blob) throw new Error("The PDF could not be created.");
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  const ptWidth = 270;
  const ptHeight = (ptWidth * BADGE_H) / BADGE_W;
  save(buildPdf(jpeg, flat.width, flat.height, ptWidth, ptHeight), filename);
}

/* ---------------------------------------------------------------- print */

/** Prints only the badge (no menus or buttons), at ID-card width. */
export async function printBadge(svg: SVGSVGElement, title: string): Promise<void> {
  const markup = await badgeSvgMarkup(svg);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new Error("Printing is not available in this browser.");
  }
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title.replace(/[<>&]/g, "")}</title>
<style>
@page{size:auto;margin:12mm}
html,body{margin:0;background:#fff}
body{display:flex;justify-content:center;padding-top:6mm}
svg{width:3.4in;height:auto;display:block}
@media print{svg{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${markup}</body></html>`);
  doc.close();
  await new Promise((r) => setTimeout(r, 250));
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  window.setTimeout(() => frame.remove(), 60_000);
}
