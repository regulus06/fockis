import type { CSSProperties } from "react";
import type { ElementStyle, Section, SiteContent, SiteTheme, StyleBox } from "../types/content";

export const BREAKPOINTS = { tablet: 1023, mobile: 640 } as const;

/** Google Fonts weights known to exist per family (unknown families load regular only). */
const FONT_WEIGHTS: Record<string, string> = {
  "Libre Caslon Text": "ital,wght@0,400;0,700;1,400",
  "Playfair Display": "ital,wght@0,400;0,600;0,700;0,800;1,400;1,700",
  Merriweather: "ital,wght@0,400;0,700;0,900;1,400",
  "Nunito Sans": "wght@400;600;700;800",
  Nunito: "wght@400;600;700;800",
  Jost: "wght@400;500;600;700",
  Poppins: "ital,wght@0,400;0,500;0,600;0,700;0,800;1,700;1,800",
  Inter: "wght@400;500;600;700;800",
  Outfit: "wght@400;500;600;700;800",
  "DM Sans": "wght@400;500;700",
  "DM Serif Display": "ital@0;1",
  "Cormorant Garamond": "ital,wght@0,400;0,500;0,600;0,700;1,500",
  Montserrat: "wght@400;500;600;700;800",
  Lato: "wght@400;700;900",
  Lora: "ital,wght@0,400;0,600;0,700;1,400",
  Karla: "wght@400;500;700",
  "Work Sans": "wght@400;500;600;700",
  Manrope: "wght@400;500;600;700;800",
  Fraunces: "wght@400;600;700",
  "Source Sans 3": "wght@400;600;700",
  "Noto Serif": "wght@400;700",
  "Noto Sans": "wght@400;500;700",
  "Space Grotesk": "wght@400;500;700",
  "Bodoni Moda": "wght@400;600;700",
  Fredoka: "wght@400;500;600;700",
  Roboto: "wght@400;500;700;900",
  Anton: "",
  "Bebas Neue": "",
  "Great Vibes": "",
  "Kaushan Script": "",
  Pacifico: "",
  Rye: "",
  "Permanent Marker": "",
  "Dancing Script": "wght@400;700",
};

export const FONT_CHOICES = Object.keys(FONT_WEIGHTS).sort();

export function googleFontUrl(family: string): string | null {
  const clean = family.trim();
  if (!clean || /[^A-Za-z0-9 ]/.test(clean)) return null;
  const spec = FONT_WEIGHTS[clean];
  const fam = clean.replace(/ /g, "+");
  return `https://fonts.googleapis.com/css2?family=${fam}${spec ? `:${spec}` : ""}&display=swap`;
}

export function fontsForContent(content: SiteContent): string[] {
  const set = new Set<string>(Object.values(content.theme.fonts));
  const scan = (styles?: Record<string, ElementStyle>) =>
    Object.values(styles ?? {}).forEach((s) => s.fontFamily && set.add(s.fontFamily));
  scan(content.header.elementStyles);
  scan(content.footer.elementStyles);
  content.pages.forEach((p) => p.sections.forEach((s) => scan(s.elementStyles)));
  return [...set].filter(Boolean);
}

/** Inject <link> tags for the theme fonts once per document. */
export function ensureFonts(families: string[], doc: Document = document) {
  families.forEach((f) => {
    const href = googleFontUrl(f);
    if (!href) return;
    const id = `ws-font-${f.replace(/\s+/g, "-").toLowerCase()}`;
    if (doc.getElementById(id)) return;
    const link = doc.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    doc.head.appendChild(link);
  });
}

const fontStack = (f: string, fallback: string) => `"${f}", ${fallback}`;

export function themeVars(theme: SiteTheme): CSSProperties {
  const c = theme.colors;
  const radius =
    theme.buttonShape === "pill" ? "999px" : theme.buttonShape === "square" ? "0px" : `${Math.min(theme.radius, 10)}px`;
  return {
    "--ws-primary": c.primary,
    "--ws-primary-text": c.primaryText,
    "--ws-secondary": c.secondary,
    "--ws-accent": c.accent,
    "--ws-bg": c.background,
    "--ws-surface": c.surface,
    "--ws-text": c.text,
    "--ws-heading": c.heading,
    "--ws-muted": c.muted,
    "--ws-border": c.border,
    "--ws-header-bg": c.headerBg,
    "--ws-header-text": c.headerText,
    "--ws-topbar-bg": c.topBarBg,
    "--ws-topbar-text": c.topBarText,
    "--ws-footer-bg": c.footerBg,
    "--ws-footer-text": c.footerText,
    "--ws-font-heading": fontStack(theme.fonts.heading, "Georgia, serif"),
    "--ws-font-body": fontStack(theme.fonts.body, "system-ui, sans-serif"),
    "--ws-font-script": fontStack(theme.fonts.script, "cursive"),
    "--ws-font-nav": fontStack(theme.fonts.nav || theme.fonts.body, "system-ui, sans-serif"),
    "--ws-radius": `${theme.radius}px`,
    "--ws-btn-radius": radius,
    "--ws-max": `${theme.maxWidth}px`,
  } as CSSProperties;
}

function boxCss(box: StyleBox | undefined): string {
  if (!box) return "";
  const out: string[] = [];
  if (box.background) {
    const isGradient = /gradient\(/.test(box.background);
    out.push(`${isGradient ? "background-image" : "background-color"}:${box.background}`);
  }
  if (box.backgroundImage) out.push(`background-image:url("${box.backgroundImage.replace(/"/g, "")}");background-size:cover;background-position:center`);
  if (box.textColor) out.push(`--ws-section-text:${box.textColor};color:${box.textColor}`);
  if (box.paddingTop !== undefined) out.push(`padding-top:${box.paddingTop}px`);
  if (box.paddingBottom !== undefined) out.push(`padding-bottom:${box.paddingBottom}px`);
  if (box.marginTop !== undefined) out.push(`margin-top:${box.marginTop}px`);
  if (box.marginBottom !== undefined) out.push(`margin-bottom:${box.marginBottom}px`);
  if (box.minHeight !== undefined) out.push(`min-height:${box.minHeight}px`);
  if (box.align) out.push(`--ws-align:${box.align};text-align:${box.align}`);
  if (box.maxWidth) out.push(`--ws-section-max:${box.maxWidth}px`);
  if (box.columns) out.push(`--ws-cols:${box.columns}`);
  if (box.fontScale) out.push(`--ws-font-scale:${box.fontScale}`);
  return out.join(";");
}

/** Generates scoped CSS for one section, including tablet/mobile overrides and visibility rules. */
export function sectionCss(section: Section, editing: boolean): string {
  const sel = `[data-ws-s="${section.id}"]`;
  const s = section.style ?? {};
  let css = `${sel}{${boxCss(s)}}`;
  if (s.overlay) css += `${sel}::before{content:"";position:absolute;inset:0;background:${s.overlay};pointer-events:none;z-index:0}`;
  if (s.responsive?.tablet) css += `@container wsite (max-width:${BREAKPOINTS.tablet}px){${sel}{${boxCss(s.responsive.tablet)}}}`;
  if (s.responsive?.mobile) css += `@container wsite (max-width:${BREAKPOINTS.mobile}px){${sel}{${boxCss(s.responsive.mobile)}}}`;
  if (!editing && s.hideOn) {
    if (s.hideOn.desktop) css += `@container wsite (min-width:${BREAKPOINTS.tablet + 1}px){${sel}{display:none!important}}`;
    if (s.hideOn.tablet) css += `@container wsite (min-width:${BREAKPOINTS.mobile + 1}px) and (max-width:${BREAKPOINTS.tablet}px){${sel}{display:none!important}}`;
    if (s.hideOn.mobile) css += `@container wsite (max-width:${BREAKPOINTS.mobile}px){${sel}{display:none!important}}`;
  }
  return css;
}

export function elementStyleToCss(es?: ElementStyle): CSSProperties | undefined {
  if (!es) return undefined;
  const st: CSSProperties = {};
  if (es.fontFamily) st.fontFamily = `"${es.fontFamily}", inherit`;
  if (es.fontSize) st.fontSize = `${es.fontSize}px`;
  if (es.fontWeight) st.fontWeight = es.fontWeight;
  if (es.lineHeight) st.lineHeight = es.lineHeight;
  if (es.letterSpacing !== undefined) st.letterSpacing = `${es.letterSpacing}px`;
  if (es.textAlign) st.textAlign = es.textAlign;
  if (es.color) st.color = es.color;
  if (es.background) st.background = es.background;
  if (es.borderRadius !== undefined) st.borderRadius = `${es.borderRadius}px`;
  if (es.borderColor) st.borderColor = es.borderColor;
  if (es.width) st.width = `${es.width}px`;
  if (es.height) st.height = `${es.height}px`;
  if (es.objectFit) st.objectFit = es.objectFit;
  if (es.objectPosition) st.objectPosition = es.objectPosition;
  return st;
}

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Reads a nested value with a dotted path like "items.2.label". */
export function getPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** Immutable set of a nested value with a dotted path. */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const root: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k];
    cur[k] = Array.isArray(next) ? [...next] : next && typeof next === "object" ? { ...next } : /^\d+$/.test(keys[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return root;
}
