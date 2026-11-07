import { forwardRef, useMemo, type PointerEvent as RPointerEvent } from "react";
import { encodeQr, qrPath } from "../../../lib/qrcode";
import { CANVAS, FONT_FAMILY, fillText, type CertData, type CertDesign, type CertElement, type CertColors, type DecorKey } from "./certificateDesign";
import { publicSiteUrl } from "../../../lib/siteUrl";

/**
 * Renders a certificate design as a single vector SVG. Used by the designer
 * (editable), template thumbnails, student certificates and the public
 * verification page. Printing this SVG produces a real vector PDF.
 */

const F_PATH = "M8 6h26l-4 7H16l-1.6 5H28l-3.6 6.5H12.4L9 34H2z";

function wrap(text: string, maxChars: number): string[] {
  if (!maxChars || text.length <= maxChars) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  words.forEach((w) => {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  });
  if (cur) lines.push(cur);
  return lines;
}

/* ------------------------------------------------------------------ decorations */

function Decor({ kind, c, W, H }: { kind: DecorKey; c: CertColors; W: number; H: number }) {
  const id = `d${kind}`;
  switch (kind) {
    case "signature":
      return (
        <g>
          <defs>
            <pattern id={`${id}p`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="14" height="14" fill={c.accent} opacity=".14" />
              <line x1="0" y1="0" x2="0" y2="14" stroke={c.accent} strokeWidth="5" opacity=".35" />
            </pattern>
            <radialGradient id={`${id}g`} cx=".3" cy=".3" r=".9">
              <stop offset="0" stopColor={c.primary} stopOpacity=".05" />
              <stop offset="1" stopColor={c.primary} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${id}g)`} />
          {Array.from({ length: 9 }).map((_, i) => (
            <circle key={i} cx={W * 0.28} cy={H * 0.55} r={70 + i * 34} fill="none" stroke={c.primary} strokeOpacity=".05" strokeWidth="1.2" />
          ))}
          <rect x={W - 330} y="0" width="300" height={H} fill={c.accent} opacity=".1" />
          <rect x={W - 30} y="0" width="30" height={H} fill={`url(#${id}p)`} />
          <line x1={W - 330} y1="0" x2={W - 330} y2={H} stroke={c.accent} strokeOpacity=".35" />
        </g>
      );
    case "classic":
      return (
        <g fill="none">
          <rect x="22" y="22" width={W - 44} height={H - 44} stroke={c.primary} strokeWidth="6" />
          <rect x="38" y="38" width={W - 76} height={H - 76} stroke={c.accent} strokeWidth="2" />
          <rect x="46" y="46" width={W - 92} height={H - 92} stroke={c.primary} strokeWidth="1" strokeOpacity=".4" />
          {[
            [46, 46],
            [W - 46, 46],
            [46, H - 46],
            [W - 46, H - 46],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(45)`}>
              <rect x="-14" y="-14" width="28" height="28" fill={c.background} stroke={c.accent} strokeWidth="2" />
              <rect x="-6" y="-6" width="12" height="12" fill={c.accent} />
            </g>
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <circle key={i} cx={W / 2} cy={H / 2} r={120 + i * 40} stroke={c.accent} strokeOpacity=".07" />
          ))}
        </g>
      );
    case "modern":
      return (
        <g>
          <rect width="230" height={H} fill={c.accent} />
          <rect x="230" width="10" height={H} fill={c.primary} />
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={i} cx="115" cy={H - 120} r={20 + i * 22} fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="2" />
          ))}
          <g transform={`translate(75 ${H / 2 - 40}) scale(2)`}>
            <path d={F_PATH} fill="#fff" opacity=".9" />
          </g>
          <rect x={W - 160} y="0" width="160" height="10" fill={c.primary} />
        </g>
      );
    case "gold":
      return (
        <g>
          <defs>
            <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e9b23c" />
              <stop offset=".35" stopColor="#fbe7a6" />
              <stop offset=".65" stopColor="#c98b17" />
              <stop offset="1" stopColor="#f2cf6c" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="none" stroke={`url(#${id}f)`} strokeWidth="44" />
          <rect x="34" y="34" width={W - 68} height={H - 68} fill="none" stroke={c.primary} strokeWidth="1.5" />
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return <line key={i} x1={W / 2} y1={H * 0.83} x2={W / 2 + Math.cos(a) * 140} y2={H * 0.83 + Math.sin(a) * 140} stroke={c.accent} strokeOpacity=".18" strokeWidth="6" />;
          })}
        </g>
      );
    case "minimal":
      return (
        <g>
          <rect x="30" y="30" width={W - 60} height={H - 60} fill="none" stroke={c.primary} strokeOpacity=".25" strokeWidth="1.5" />
          <rect x="30" y="30" width="12" height="160" fill={c.primary} />
          <rect x={W - 230} y={H - 42} width="200" height="12" fill={c.primary} opacity=".85" />
        </g>
      );
    case "executive":
      return (
        <g fill="none">
          <rect x="28" y="28" width={W - 56} height={H - 56} stroke={c.accent} strokeWidth="2" />
          <rect x="40" y="40" width={W - 80} height={H - 80} stroke={c.accent} strokeOpacity=".4" />
          {Array.from({ length: 10 }).map((_, i) => (
            <path key={i} d={`M0 ${H - i * 26} Q ${W / 2} ${H - 180 - i * 26} ${W} ${H - i * 26}`} stroke={c.accent} strokeOpacity=".06" strokeWidth="2" />
          ))}
        </g>
      );
    case "geometric":
      return (
        <g>
          <circle cx="40" cy="40" r="70" fill="#1f3b5a" />
          <path d="M0 110 A110 110 0 0 1 110 0 L110 110Z" fill="#7fb3a6" opacity=".9" transform="translate(110 0)" />
          <circle cx={W - 60} cy="60" r="36" fill="#f6a689" />
          <path d={`M${W - 150} 0 h150 v150 z`} fill="#1f3b5a" opacity=".9" />
          <circle cx="70" cy={H - 70} r="46" fill="#f6a689" />
          <path d={`M0 ${H - 170} v170 h170 z`} fill="#7fb3a6" opacity=".55" />
          <circle cx={W - 80} cy={H - 80} r="80" fill="#e8603c" opacity=".9" />
          <path d={`M${W - 220} ${H} a60 60 0 0 1 120 0z`} fill="#1f3b5a" />
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 4 }).map((__, k) => <path key={`${r}-${k}`} d={`M${180 + k * 16} ${30 + r * 16} l6 10 h-12z`} fill={c.primary} />),
          )}
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 4 }).map((__, k) => <path key={`b${r}-${k}`} d={`M${W - 250 + k * 16} ${H - 90 + r * 16} l6 10 h-12z`} fill="#1f3b5a" />),
          )}
        </g>
      );
    case "wave":
      return (
        <g>
          <defs>
            <linearGradient id={`${id}b`} x1="0" x2="1">
              <stop offset="0" stopColor="#0b2a6b" />
              <stop offset="1" stopColor="#14469e" />
            </linearGradient>
          </defs>
          <path d={`M0 0 H${W} V120 Q ${W / 2} 210 0 120 Z`} fill={`url(#${id}b)`} />
          <path d={`M0 128 Q ${W / 2} 218 ${W} 128`} fill="none" stroke={c.accent} strokeWidth="6" />
          <path d={`M0 ${H} H${W} V${H - 70} Q ${W / 2} ${H - 140} 0 ${H - 70} Z`} fill={`url(#${id}b)`} />
          <path d={`M0 ${H - 78} Q ${W / 2} ${H - 148} ${W} ${H - 78}`} fill="none" stroke={c.accent} strokeWidth="6" />
        </g>
      );
    case "technical":
      return (
        <g stroke={c.accent} fill="none">
          {Array.from({ length: Math.ceil(W / 40) }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2={H} strokeOpacity=".05" />
          ))}
          {Array.from({ length: Math.ceil(H / 40) }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2={W} y2={i * 40} strokeOpacity=".05" />
          ))}
          <path d={`M${W - 300} 40 h120 l40 40 h100 M${W - 260} ${H - 60} h80 l30 -30 h150 M40 ${H - 40} h160 l40 -40`} strokeOpacity=".5" strokeWidth="2" />
          {[
            [W - 180, 40],
            [W - 40, 80],
            [W - 180, H - 60],
            [200, H - 40],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill={c.accent} fillOpacity=".7" />
          ))}
          <rect x="20" y="20" width={W - 40} height={H - 40} strokeOpacity=".35" strokeWidth="1.5" />
        </g>
      );
    case "culinary":
      return (
        <g>
          <rect x="26" y="26" width={W - 52} height={H - 52} fill="none" stroke={c.primary} strokeWidth="3" />
          {Array.from({ length: Math.floor((W - 52) / 26) }).map((_, i) => (
            <g key={i}>
              <circle cx={39 + i * 26} cy="26" r="9" fill={c.accent} opacity=".85" />
              <circle cx={39 + i * 26} cy={H - 26} r="9" fill={c.accent} opacity=".85" />
            </g>
          ))}
          {Array.from({ length: Math.floor((H - 52) / 26) }).map((_, i) => (
            <g key={i}>
              <circle cx="26" cy={39 + i * 26} r="9" fill={c.accent} opacity=".85" />
              <circle cx={W - 26} cy={39 + i * 26} r="9" fill={c.accent} opacity=".85" />
            </g>
          ))}
          <rect x="50" y="50" width={W - 100} height={H - 100} fill="none" stroke={c.accent} strokeOpacity=".5" strokeDasharray="2 6" strokeWidth="2" />
        </g>
      );
    case "gradient":
      return (
        <g>
          <defs>
            <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={c.primary} />
              <stop offset="1" stopColor={c.accent} />
            </linearGradient>
          </defs>
          <path d={`M${W - 420} 0 H${W} V${H} H${W - 120} C ${W - 380} ${H * 0.65}, ${W - 160} ${H * 0.35}, ${W - 420} 0 Z`} fill={`url(#${id}a)`} />
          <path d={`M${W - 470} 0 C ${W - 210} ${H * 0.35}, ${W - 430} ${H * 0.65}, ${W - 170} ${H}`} fill="none" stroke={c.accent} strokeOpacity=".35" strokeWidth="3" />
          <rect x="0" y="0" width="420" height="8" fill={`url(#${id}a)`} />
        </g>
      );
    case "elegant":
      return (
        <g fill="none">
          <rect x="26" y="26" width={W - 52} height={H - 52} stroke={c.primary} strokeWidth="5" />
          <rect x="42" y="42" width={W - 84} height={H - 84} stroke={c.accent} strokeWidth="1.5" />
          {[
            [42, 42, 0],
            [W - 42, 42, 90],
            [W - 42, H - 42, 180],
            [42, H - 42, 270],
          ].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`} stroke={c.accent} strokeWidth="2">
              <path d="M0 60 Q 0 0 60 0" />
              <path d="M12 60 Q 12 12 60 12" strokeOpacity=".6" />
              <circle cx="20" cy="20" r="5" fill={c.accent} />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ elements */

function Seal({ el, c }: { el: CertElement; c: CertColors }) {
  const w = el.w ?? 150;
  const r = w / 2;
  const id = `seal-${el.id}`;
  return (
    <g transform={`translate(${el.x + r} ${el.y + r})`}>
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <circle key={i} cx={Math.cos(a) * r * 0.97} cy={Math.sin(a) * r * 0.97} r={r * 0.09} fill={el.color ?? c.accent} />;
      })}
      <circle r={r * 0.95} fill={el.color ?? c.accent} />
      <circle r={r * 0.82} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth={r * 0.025} />
      <circle r={r * 0.56} fill="#fff" />
      <defs>
        <path id={id} d={`M ${-r * 0.69} 0 A ${r * 0.69} ${r * 0.69} 0 1 1 ${r * 0.69} 0 A ${r * 0.69} ${r * 0.69} 0 1 1 ${-r * 0.69} 0`} />
      </defs>
      <text fontFamily={FONT_FAMILY.sans} fontSize={r * 0.15} fontWeight={800} fill="#fff" letterSpacing={r * 0.03}>
        <textPath href={`#${id}`} startOffset="0">
          VERIFIED ★ CERTIFICATE ★ FOCKIS ACADEMY ★
        </textPath>
      </text>
      <g transform={`translate(${-r * 0.3} ${-r * 0.32}) scale(${(r * 0.6) / 40})`}>
        <path d={F_PATH} fill={c.primary} />
      </g>
    </g>
  );
}

function Qr({ el, data }: { el: CertElement; data: CertData }) {
  const url = data.verification_url || `${publicSiteUrl()}/academy/verify${data.certificate_number ? `/${encodeURIComponent(data.certificate_number)}` : ""}`;
  const matrix = useMemo(() => encodeQr(url), [url]);
  const n = matrix.length + 4;
  const w = el.w ?? 110;
  return (
    <g transform={`translate(${el.x} ${el.y}) scale(${w / n})`}>
      <rect width={n} height={n} fill="#fff" rx="1" />
      <path d={qrPath(matrix, 2)} fill={el.color && el.color !== "#ffffff" ? el.color : "#0f1b33"} shapeRendering="crispEdges" />
    </g>
  );
}

function Logo({ el, c }: { el: CertElement; c: CertColors }) {
  const w = el.w ?? 180;
  const h = el.h ?? 46;
  if (el.src) return <image href={el.src} x={el.x} y={el.y} width={w} height={h} preserveAspectRatio="xMinYMid meet" />;
  const col = el.color ?? c.primary;
  const s = h / 40;
  return (
    <g transform={`translate(${el.x} ${el.y})`}>
      <g transform={`scale(${s})`}>
        <path d={F_PATH} fill={col} />
      </g>
      <text x={h * 1.05} y={h * 0.5} fontFamily={FONT_FAMILY.sans} fontSize={h * 0.48} fontWeight={800} fill={col}>
        Fockis
      </text>
      <text x={h * 1.05} y={h * 0.95} fontFamily={FONT_FAMILY.sans} fontSize={h * 0.36} fontWeight={600} fill={col} opacity=".8">
        Academy
      </text>
    </g>
  );
}

function Signature({ el, c, data }: { el: CertElement; c: CertColors; data: CertData }) {
  const w = el.w ?? 180;
  const h = el.h ?? 52;
  if (el.src) return <image href={el.src} x={el.x} y={el.y} width={w} height={h} preserveAspectRatio="xMidYMax meet" />;
  return (
    <text x={el.x + w / 2} y={el.y + h * 0.85} textAnchor="middle" fontFamily={FONT_FAMILY.script} fontSize={el.size ?? 30} fill={el.color ?? c.text}>
      {fillText(el.text ?? "", data)}
    </text>
  );
}

function TextEl({ el, c, data }: { el: CertElement; c: CertColors; data: CertData }) {
  let s = fillText(el.text ?? "", data);
  if (el.upper) s = s.toUpperCase();
  const size = el.size ?? 16;
  const lines = el.w ? wrap(s, Math.max(8, Math.floor(el.w / (size * 0.52)))) : [s];
  const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
  return (
    <text
      x={el.x}
      y={el.y}
      textAnchor={anchor}
      fontFamily={FONT_FAMILY[el.font ?? "sans"]}
      fontSize={size}
      fontWeight={el.weight ?? 400}
      fontStyle={el.italic ? "italic" : "normal"}
      fill={el.color ?? c.text}
      letterSpacing={el.spacing ?? 0}
    >
      {lines.map((l, i) => (
        <tspan key={i} x={el.x} dy={i === 0 ? 0 : size * 1.3}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

export function renderElement(el: CertElement, c: CertColors, data: CertData) {
  switch (el.kind) {
    case "text":
      return <TextEl el={el} c={c} data={data} />;
    case "line":
      return <rect x={el.x} y={el.y} width={el.w ?? 200} height={el.h ?? 2} fill={el.color ?? c.accent} />;
    case "seal":
      return <Seal el={el} c={c} />;
    case "qr":
      return <Qr el={el} data={data} />;
    case "logo":
      return <Logo el={el} c={c} />;
    case "signature":
      return <Signature el={el} c={c} data={data} />;
  }
}

export interface CanvasProps {
  design: CertDesign;
  data: CertData;
  className?: string;
  selectedId?: string | null;
  onElementPointerDown?: (id: string, e: RPointerEvent<SVGGElement>) => void;
  onBackgroundPointerDown?: () => void;
  watermark?: string;
}

const CertificateCanvas = forwardRef<SVGSVGElement, CanvasProps>(function CertificateCanvas({ design, data, className, selectedId, onElementPointerDown, onBackgroundPointerDown, watermark }, ref) {
  const { w: W, h: H } = CANVAS[design.orientation];
  const c = design.colors;
  return (
    <svg ref={ref} className={className} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`Certificate for ${data.student_name ?? ""}`}>
      <rect width={W} height={H} fill={c.background} onPointerDown={onBackgroundPointerDown} />
      <g pointerEvents="none">
        <Decor kind={design.decor} c={c} W={W} H={H} />
      </g>
      {design.elements.map((el) => (
        <g
          key={el.id}
          data-id={el.id}
          pointerEvents={onElementPointerDown ? "bounding-box" : undefined}
          className={onElementPointerDown ? `fa-cert-el ${selectedId === el.id ? "is-selected" : ""}` : undefined}
          onPointerDown={onElementPointerDown ? (e) => onElementPointerDown(el.id, e) : undefined}
        >
          {renderElement(el, c, data)}
        </g>
      ))}
      {watermark && (
        <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" transform={`rotate(-24 ${W / 2} ${H / 2})`} fontFamily={FONT_FAMILY.sans} fontSize="150" fontWeight={900} fill="#dc2626" fillOpacity=".12" letterSpacing="12" pointerEvents="none">
          {watermark}
        </text>
      )}
    </svg>
  );
});

export default CertificateCanvas;

/** Print a certificate SVG as its own page (browser "Save as PDF" = vector PDF). */
export function printCertificate(svg: SVGSVGElement | null, orientation: "landscape" | "portrait", title: string) {
  if (!svg) return;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  const fonts = document.getElementById("academy-fonts") as HTMLLinkElement | null;
  doc.open();
  doc.write(`<!doctype html><html><head><title>${title.replace(/[<>&"]/g, "")}</title>${fonts ? `<link rel="stylesheet" href="${fonts.href}">` : ""}<style>@page{size:A4 ${orientation};margin:0}html,body{margin:0;padding:0}svg{display:block;width:100vw;height:100vh}</style></head><body>${svg.outerHTML}</body></html>`);
  doc.close();
  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  };
  // give web fonts a moment to load inside the frame
  const ready = (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
  if (ready) ready.then(() => setTimeout(go, 150));
  else setTimeout(go, 600);
}
