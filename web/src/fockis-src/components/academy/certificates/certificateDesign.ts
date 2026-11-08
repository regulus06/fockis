/**
 * Fockis Academy certificate design model + built-in templates.
 *
 * A design is plain JSON (saved to the backend as `design`): colours, a
 * decoration style, orientation, and a list of positioned elements. Text can
 * contain {{variables}} that are replaced with real data when a certificate is
 * issued — instructors never type student names by hand.
 */

import { publicSiteUrl, SAMPLE_VERIFICATION_ID } from "../../../lib/siteUrl";

export type FontKey = "serif" | "display" | "script" | "sans" | "mono" | "elegant";
export type Align = "left" | "center" | "right";
export type ElementKind = "text" | "logo" | "signature" | "seal" | "qr" | "line";

export interface CertElement {
  id: string;
  kind: ElementKind;
  /** Anchor point in canvas units (see CANVAS). For text: x is the align anchor, y the baseline. */
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  font?: FontKey;
  size?: number;
  color?: string;
  weight?: number;
  italic?: boolean;
  align?: Align;
  spacing?: number;
  upper?: boolean;
  /** Uploaded image (logo / signature) as a data URL. */
  src?: string;
  label?: string;
}

export interface CertColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
}

export type DecorKey =
  | "classic"
  | "modern"
  | "gold"
  | "minimal"
  | "executive"
  | "geometric"
  | "wave"
  | "technical"
  | "culinary"
  | "signature"
  | "elegant"
  | "gradient";

export interface CertDesign {
  version: 1;
  base: string;
  orientation: "landscape" | "portrait";
  decor: DecorKey;
  colors: CertColors;
  elements: CertElement[];
}

export const CANVAS = {
  landscape: { w: 1123, h: 794 },
  portrait: { w: 794, h: 1123 },
};

export const FONT_FAMILY: Record<FontKey, string> = {
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  display: "'Cinzel', 'Playfair Display', Georgia, serif",
  script: "'Great Vibes', 'Brush Script MT', cursive",
  sans: "Inter, 'Segoe UI', Arial, sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
  elegant: "'Cormorant Garamond', Georgia, serif",
};

export const FONT_LABEL: Record<FontKey, string> = {
  serif: "Playfair (serif)",
  display: "Cinzel (classic caps)",
  script: "Great Vibes (script)",
  sans: "Inter (modern)",
  mono: "Plex Mono",
  elegant: "Cormorant (elegant)",
};

export const VARIABLES: { key: string; label: string }[] = [
  { key: "student_name", label: "Student name" },
  { key: "course_name", label: "Course / seminar name" },
  { key: "activity_type", label: "Activity type (course, seminar…)" },
  { key: "instructor_name", label: "Instructor name" },
  { key: "institution_name", label: "Institution" },
  { key: "completion_date", label: "Completion date" },
  { key: "issue_date", label: "Issue date" },
  { key: "certificate_number", label: "Certificate number" },
  { key: "verification_id", label: "Verification ID" },
  { key: "verification_url", label: "Verification URL" },
  { key: "enrollment_number", label: "Enrollment ID" },
  { key: "duration", label: "Duration" },
  { key: "final_grade", label: "Final grade" },
];

export type CertData = Record<string, string>;

export const SAMPLE_DATA: CertData = {
  student_name: "Amara Johnson",
  course_name: "Cybersecurity Fundamentals",
  activity_type: "course",
  instructor_name: "Prof. Elince Regulus",
  institution_name: "Fockis Academy",
  completion_date: "November 15, 2026",
  issue_date: "November 16, 2026",
  certificate_number: "FA-2026-7K3QX9",
  verification_id: SAMPLE_VERIFICATION_ID,
  // Sample QR opens this site's verify page, which explains it is a template preview.
  get verification_url() {
    return `${publicSiteUrl()}/academy/verify/${SAMPLE_VERIFICATION_ID}`;
  },
  enrollment_number: "FAE-4HT8KQ2P",
  duration: "24 hours",
  final_grade: "A",
};

export function fillText(text: string, data: CertData): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => data[k] ?? "");
}

let seq = 0;
export const uid = (p = "el") => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

/* ------------------------------------------------------------------ */
/* Template builders                                                   */
/* ------------------------------------------------------------------ */

type T = Omit<CertElement, "id">;
const t = (o: T): CertElement => ({ id: uid(o.kind), ...o });

/** A standard landscape layout, tuned per template with options. */
function landscape(o: {
  x: number; // text anchor x
  align: Align;
  title: string;
  titleFont: FontKey;
  titleSize: number;
  subtitle: string;
  nameFont: FontKey;
  nameSize: number;
  primary: string;
  accent: string;
  text: string;
  muted: string;
  top?: number;
  seal?: { x: number; y: number; w: number } | null;
  qr?: { x: number; y: number; w: number } | null;
  logo?: { x: number; y: number; w: number; h: number } | null;
  sigX?: number[];
  light?: boolean;
  lead?: string;
  body?: string;
}): CertElement[] {
  const top = o.top ?? 120;
  const els: CertElement[] = [];
  if (o.logo !== null) els.push(t({ kind: "logo", x: o.logo?.x ?? (o.align === "center" ? 561 - 90 : o.x), y: o.logo?.y ?? 70, w: o.logo?.w ?? 180, h: o.logo?.h ?? 48, color: o.primary }));
  els.push(
    t({ kind: "text", label: "Title", x: o.x, y: top + 80, text: o.title, font: o.titleFont, size: o.titleSize, color: o.primary, weight: 700, align: o.align, spacing: 6, upper: true }),
    t({ kind: "text", label: "Subtitle", x: o.x, y: top + 118, text: o.subtitle, font: "sans", size: 17, color: o.accent, weight: 600, align: o.align, spacing: 5, upper: true }),
    t({ kind: "text", label: "Lead", x: o.x, y: top + 178, text: o.lead ?? "This certificate is proudly presented to", font: "sans", size: 17, color: o.muted, weight: 400, align: o.align }),
    t({ kind: "text", label: "Student name", x: o.x, y: top + 250, text: "{{student_name}}", font: o.nameFont, size: o.nameSize, color: o.light ? "#ffffff" : o.primary, weight: o.nameFont === "script" ? 400 : 700, align: o.align }),
    t({ kind: "line", x: o.align === "center" ? o.x - 230 : o.x, y: top + 272, w: 460, h: 2, color: o.accent }),
    t({ kind: "text", label: "Body", x: o.x, y: top + 312, text: o.body ?? "for successfully completing the {{activity_type}}", font: "sans", size: 16, color: o.muted, weight: 400, align: o.align }),
    t({ kind: "text", label: "Course name", x: o.x, y: top + 352, text: "{{course_name}}", font: "sans", size: 27, color: o.text, weight: 800, align: o.align }),
    t({ kind: "text", label: "Date", x: o.x, y: top + 388, text: "Completed on {{completion_date}}", font: "sans", size: 15, color: o.muted, weight: 400, align: o.align }),
  );
  const sx = o.sigX ?? (o.align === "center" ? [280, 750] : [o.x + 110]);
  sx.forEach((x, i) => {
    els.push(
      t({ kind: "signature", x: x - 90, y: 610, w: 180, h: 52, text: i === 0 ? "{{instructor_name}}" : "{{institution_name}}", font: "script", size: 30, color: o.light ? "#ffffff" : o.text }),
      t({ kind: "line", x: x - 110, y: 672, w: 220, h: 1.5, color: o.light ? "#ffffff" : o.muted }),
      t({ kind: "text", label: i === 0 ? "Instructor" : "Institution", x, y: 696, text: i === 0 ? "{{instructor_name}}" : "{{institution_name}}", font: "sans", size: 15, color: o.light ? "#ffffff" : o.text, weight: 700, align: "center" }),
      t({ kind: "text", label: i === 0 ? "Instructor role" : "Institution role", x, y: 716, text: i === 0 ? "Instructor" : "Organizer", font: "sans", size: 12, color: o.light ? "#c7d3ee" : o.muted, weight: 400, align: "center" }),
    );
  });
  if (o.seal !== null) els.push(t({ kind: "seal", x: o.seal?.x ?? 900, y: o.seal?.y ?? 470, w: o.seal?.w ?? 150, color: o.accent }));
  if (o.qr !== null)
    els.push(
      t({ kind: "qr", x: o.qr?.x ?? 960, y: o.qr?.y ?? 610, w: o.qr?.w ?? 110, color: o.light ? "#ffffff" : o.text }),
      t({ kind: "text", label: "Certificate number", x: (o.qr?.x ?? 960) + (o.qr?.w ?? 110) / 2, y: (o.qr?.y ?? 610) + (o.qr?.w ?? 110) + 18, text: "No. {{certificate_number}}", font: "mono", size: 11, color: o.light ? "#c7d3ee" : o.muted, weight: 500, align: "center" }),
    );
  return els;
}

export interface TemplateDef {
  key: string;
  name: string;
  tag: string;
  make: () => CertDesign;
}

const design = (base: string, decor: DecorKey, colors: CertColors, elements: CertElement[], orientation: "landscape" | "portrait" = "landscape"): CertDesign => ({ version: 1, base, orientation, decor, colors, elements });

export const TEMPLATES: TemplateDef[] = [
  {
    key: "signature",
    name: "Fockis Signature",
    tag: "Verified side panel",
    make: () => {
      const c = { primary: "#0b2a6b", accent: "#c99a2e", background: "#ffffff", text: "#0f1b33", muted: "#5f6b85" };
      const els = landscape({ x: 90, align: "left", title: "Certificate", titleFont: "elegant", titleSize: 74, subtitle: "of Completion", nameFont: "elegant", nameSize: 50, ...c, top: 100, seal: { x: 838, y: 160, w: 170 }, qr: { x: 868, y: 560, w: 110 }, sigX: [200, 470], lead: "Presented to" });
      els.push(t({ kind: "text", label: "Verify label", x: 923, y: 540, text: "Verify authenticity", font: "sans", size: 12, color: c.muted, weight: 700, align: "center", spacing: 3, upper: true }));
      // Who offers the class (the business or school) — "Offered by Bell Bakery".
      els.push(t({ kind: "text", label: "Offered by", x: 90, y: 524, text: "Offered by {{institution_name}}", font: "sans", size: 16, color: c.primary, weight: 700, align: "left" }));
      return design("signature", "signature", c, els);
    },
  },
  {
    key: "classic",
    name: "Classic University",
    tag: "Double border, serif",
    make: () => {
      const c = { primary: "#0b1f4d", accent: "#b8892a", background: "#fffdf6", text: "#0f1b33", muted: "#5f6b85" };
      return design("classic", "classic", c, landscape({ x: 561, align: "center", title: "Certificate", titleFont: "display", titleSize: 64, subtitle: "of Achievement", nameFont: "serif", nameSize: 52, ...c, top: 110, seal: { x: 486, y: 560, w: 150 }, qr: { x: 940, y: 590, w: 100 }, logo: { x: 471, y: 82, w: 180, h: 46 } }));
    },
  },
  {
    key: "modern",
    name: "Modern Professional",
    tag: "Navy side band",
    make: () => {
      const c = { primary: "#1d5ee8", accent: "#0b1f4d", background: "#ffffff", text: "#0f1b33", muted: "#5f6b85" };
      return design("modern", "modern", c, landscape({ x: 300, align: "left", title: "Certificate", titleFont: "sans", titleSize: 66, subtitle: "of Completion", nameFont: "sans", nameSize: 46, ...c, top: 100, seal: { x: 880, y: 90, w: 140 }, qr: { x: 930, y: 590, w: 110 }, logo: { x: 300, y: 64, w: 180, h: 46 }, sigX: [410, 700] }));
    },
  },
  {
    key: "gold",
    name: "Gold Achievement",
    tag: "Gold frame, cream",
    make: () => {
      const c = { primary: "#7a5a12", accent: "#c99a2e", background: "#fff9ea", text: "#3b2a07", muted: "#7d6a43" };
      return design("gold", "gold", c, landscape({ x: 561, align: "center", title: "Certificate", titleFont: "display", titleSize: 66, subtitle: "of Excellence", nameFont: "script", nameSize: 68, ...c, top: 110, seal: { x: 486, y: 565, w: 150 }, qr: { x: 945, y: 600, w: 95 }, logo: { x: 471, y: 80, w: 180, h: 46 } }));
    },
  },
  {
    key: "minimal",
    name: "Minimal Blue",
    tag: "Clean & airy",
    make: () => {
      const c = { primary: "#1d5ee8", accent: "#1d5ee8", background: "#ffffff", text: "#0f1b33", muted: "#64748b" };
      return design("minimal", "minimal", c, landscape({ x: 120, align: "left", title: "Certificate", titleFont: "sans", titleSize: 58, subtitle: "of Completion", nameFont: "sans", nameSize: 48, ...c, top: 120, seal: null, qr: { x: 930, y: 580, w: 110 }, logo: { x: 120, y: 70, w: 180, h: 46 }, sigX: [230, 520] }));
    },
  },
  {
    key: "executive",
    name: "Executive",
    tag: "Navy & gold, dark",
    make: () => {
      const c = { primary: "#f5c35a", accent: "#f5c35a", background: "#0b1f4d", text: "#ffffff", muted: "#c7d3ee" };
      return design("executive", "executive", c, landscape({ x: 561, align: "center", title: "Certificate", titleFont: "display", titleSize: 62, subtitle: "Executive Program", nameFont: "serif", nameSize: 54, ...c, top: 110, light: true, seal: { x: 486, y: 565, w: 150 }, qr: { x: 940, y: 595, w: 100 }, logo: { x: 471, y: 80, w: 180, h: 46 } }));
    },
  },
  {
    key: "workshop",
    name: "Workshop Completion",
    tag: "Playful geometry",
    make: () => {
      const c = { primary: "#e8603c", accent: "#1f3b5a", background: "#ffffff", text: "#1f3b5a", muted: "#5f6b85" };
      return design("workshop", "geometric", c, landscape({ x: 561, align: "center", title: "Certificate", titleFont: "serif", titleSize: 62, subtitle: "of Participation", nameFont: "script", nameSize: 66, ...c, top: 100, body: "for actively participating in the workshop", seal: null, qr: { x: 506, y: 565, w: 110 }, logo: { x: 471, y: 70, w: 180, h: 46 } }));
    },
  },
  {
    key: "seminar",
    name: "Seminar Participation",
    tag: "Curved banner",
    make: () => {
      const c = { primary: "#7c2d12", accent: "#c99a2e", background: "#ffffff", text: "#1f2937", muted: "#6b7280" };
      const els = landscape({ x: 561, align: "center", title: "Certificate", titleFont: "serif", titleSize: 64, subtitle: "of Attendance", nameFont: "script", nameSize: 64, ...c, top: 150, body: "for attending the seminar", seal: { x: 491, y: 590, w: 140 }, qr: { x: 950, y: 595, w: 95 }, logo: { x: 80, y: 40, w: 180, h: 46 } });
      els.find((e) => e.kind === "logo")!.color = "#ffffff";
      return design("seminar", "wave", c, els);
    },
  },
  {
    key: "technical",
    name: "Technical Certification",
    tag: "Dark circuit",
    make: () => {
      const c = { primary: "#38bdf8", accent: "#22d3ee", background: "#0b1220", text: "#e2e8f0", muted: "#94a3b8" };
      return design("technical", "technical", c, landscape({ x: 120, align: "left", title: "Certified", titleFont: "mono", titleSize: 60, subtitle: "Technical Certification", nameFont: "sans", nameSize: 50, ...c, top: 110, light: true, seal: { x: 860, y: 120, w: 150 }, qr: { x: 930, y: 580, w: 110 }, logo: { x: 120, y: 70, w: 180, h: 46 }, sigX: [230, 520] }));
    },
  },
  {
    key: "culinary",
    name: "Culinary Arts",
    tag: "Warm & crafted",
    make: () => {
      const c = { primary: "#9a3412", accent: "#d97706", background: "#fffaf3", text: "#431407", muted: "#78716c" };
      return design("culinary", "culinary", c, landscape({ x: 561, align: "center", title: "Certificate", titleFont: "serif", titleSize: 62, subtitle: "Culinary Arts", nameFont: "script", nameSize: 66, ...c, top: 110, seal: { x: 486, y: 565, w: 150 }, qr: { x: 940, y: 595, w: 100 }, logo: { x: 471, y: 80, w: 180, h: 46 } }));
    },
  },
  {
    key: "gradient",
    name: "Vibrant Gradient",
    tag: "Bold & modern",
    make: () => {
      const c = { primary: "#6d28d9", accent: "#2563eb", background: "#ffffff", text: "#111827", muted: "#6b7280" };
      return design("gradient", "gradient", c, landscape({ x: 120, align: "left", title: "Certificate", titleFont: "sans", titleSize: 64, subtitle: "of Achievement", nameFont: "sans", nameSize: 50, ...c, top: 120, seal: { x: 860, y: 330, w: 150 }, qr: { x: 930, y: 590, w: 105 }, logo: { x: 120, y: 70, w: 180, h: 46 }, sigX: [230, 520] }));
    },
  },
  {
    key: "elegant-portrait",
    name: "Elegant Portrait",
    tag: "Portrait, ornate",
    make: () => {
      const c = { primary: "#0b2a6b", accent: "#b8892a", background: "#fffdf6", text: "#0f1b33", muted: "#5f6b85" };
      const x = 397;
      const els: CertElement[] = [
        t({ kind: "logo", x: 307, y: 110, w: 180, h: 46, color: c.primary }),
        t({ kind: "text", label: "Title", x, y: 270, text: "Certificate", font: "display", size: 62, color: c.primary, weight: 700, align: "center", spacing: 6, upper: true }),
        t({ kind: "text", label: "Subtitle", x, y: 310, text: "of Completion", font: "sans", size: 16, color: c.accent, weight: 600, align: "center", spacing: 5, upper: true }),
        t({ kind: "text", label: "Lead", x, y: 400, text: "This certificate is proudly presented to", font: "sans", size: 16, color: c.muted, align: "center" }),
        t({ kind: "text", label: "Student name", x, y: 480, text: "{{student_name}}", font: "script", size: 62, color: c.primary, align: "center" }),
        t({ kind: "line", x: x - 220, y: 505, w: 440, h: 2, color: c.accent }),
        t({ kind: "text", label: "Body", x, y: 550, text: "for successfully completing the {{activity_type}}", font: "sans", size: 16, color: c.muted, align: "center" }),
        t({ kind: "text", label: "Course name", x, y: 595, text: "{{course_name}}", font: "sans", size: 26, color: c.text, weight: 800, align: "center" }),
        t({ kind: "text", label: "Date", x, y: 632, text: "Completed on {{completion_date}}", font: "sans", size: 14, color: c.muted, align: "center" }),
        t({ kind: "seal", x: 322, y: 690, w: 150, color: c.accent }),
        t({ kind: "signature", x: 110, y: 870, w: 180, h: 52, text: "{{instructor_name}}", font: "script", size: 28, color: c.text }),
        t({ kind: "line", x: 90, y: 930, w: 220, h: 1.5, color: c.muted }),
        t({ kind: "text", label: "Instructor", x: 200, y: 954, text: "{{instructor_name}}", font: "sans", size: 14, color: c.text, weight: 700, align: "center" }),
        t({ kind: "qr", x: 560, y: 850, w: 110, color: c.text }),
        t({ kind: "text", label: "Certificate number", x: 615, y: 980, text: "No. {{certificate_number}}", font: "mono", size: 11, color: c.muted, align: "center" }),
      ];
      return design("elegant-portrait", "elegant", c, els, "portrait");
    },
  },
];

export function templateByKey(key: string): TemplateDef {
  return TEMPLATES.find((x) => x.key === key) ?? TEMPLATES[0];
}

export const PALETTES: { name: string; colors: CertColors }[] = [
  { name: "Fockis Navy", colors: { primary: "#0b2a6b", accent: "#c99a2e", background: "#ffffff", text: "#0f1b33", muted: "#5f6b85" } },
  { name: "Royal Blue", colors: { primary: "#1d5ee8", accent: "#0b1f4d", background: "#ffffff", text: "#0f1b33", muted: "#5f6b85" } },
  { name: "Emerald", colors: { primary: "#065f46", accent: "#c99a2e", background: "#fbfdf9", text: "#0f2a1f", muted: "#4b6358" } },
  { name: "Burgundy", colors: { primary: "#7f1d1d", accent: "#c99a2e", background: "#fffaf5", text: "#2b0f0f", muted: "#6b5555" } },
  { name: "Plum", colors: { primary: "#5b21b6", accent: "#db2777", background: "#ffffff", text: "#1f1235", muted: "#6b6280" } },
  { name: "Charcoal", colors: { primary: "#111827", accent: "#d97706", background: "#ffffff", text: "#111827", muted: "#6b7280" } },
];
