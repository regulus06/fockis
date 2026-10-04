import type {
  EmailBlock,
  EmailBlockStyle,
  EmailBlockType,
  EmailDocument,
} from "../types/mailchimp.types";
import { uid } from "./format";

export const EMAIL_FONTS = [
  "Helvetica, Arial, sans-serif",
  "Georgia, serif",
  "Verdana, sans-serif",
  "'Trebuchet MS', sans-serif",
  "'Courier New', monospace",
];

const baseStyle: EmailBlockStyle = {
  fontFamily: EMAIL_FONTS[0],
  fontSize: 16,
  color: "#22304a",
  align: "left",
  paddingY: 12,
  paddingX: 32,
  background: "transparent",
  borderWidth: 0,
  borderColor: "#dfe5ef",
  borderRadius: 0,
  buttonColor: "#1f5eff",
  buttonTextColor: "#ffffff",
};

type BlockDefaults = Partial<Omit<EmailBlock, "style">> & { style?: Partial<EmailBlockStyle> };

const DEFAULTS: Record<EmailBlockType, BlockDefaults> = {
  text: {
    text: "Write something your readers will care about. Keep paragraphs short and lead with the most useful detail.",
  },
  heading: { text: "A headline that earns the open", style: { fontSize: 28, color: "#14213d" } },
  image: { imageUrl: "", text: "Image description", style: { paddingX: 0 } },
  button: { text: "Shop on Fockis", url: "https://fockis.com", style: { align: "center", borderRadius: 8 } },
  divider: { style: { borderWidth: 1, paddingY: 16 } },
  spacer: { height: 32 },
  video: { text: "Watch the new Wave", url: "https://fockis.com/waves", imageUrl: "" },
  social: { text: "Fockis · Instagram · TikTok · Facebook", style: { align: "center", fontSize: 14 } },
  logo: { text: "Fockis", style: { align: "center", fontSize: 26, color: "#1f5eff" } },
  product: {
    products: [{ name: "Handwoven market tote", price: "$42.00", imageUrl: "", url: "https://fockis.com/shop" }],
  },
  product_grid: {
    products: [
      { name: "Ceramic pour-over set", price: "$58.00", imageUrl: "", url: "https://fockis.com/shop" },
      { name: "Linen throw", price: "$76.00", imageUrl: "", url: "https://fockis.com/shop" },
      { name: "Studio candle", price: "$24.00", imageUrl: "", url: "https://fockis.com/shop" },
      { name: "Leather notebook", price: "$31.00", imageUrl: "", url: "https://fockis.com/shop" },
    ],
  },
  coupon: { text: "Take 20% off your next marketplace order", code: "FOCKIS20", style: { align: "center", borderWidth: 2, borderColor: "#1f5eff", borderRadius: 10 } },
  countdown: { text: "Sale ends in", endsAt: "2026-10-31T23:59", style: { align: "center" } },
  columns: { columns: ["Left column text. Great for a short feature.", "Right column text. Pair it with a link."] },
  footer: {
    text: "You're receiving this because you joined Fockis. Update preferences or unsubscribe at any time.",
    style: { fontSize: 12, color: "#6b7a90", align: "center", background: "#f3f6fb" },
  },
};

export function createBlock(type: EmailBlockType): EmailBlock {
  const d = DEFAULTS[type];
  return {
    id: uid("blk"),
    type,
    text: d.text ?? "",
    url: d.url ?? "",
    imageUrl: d.imageUrl ?? "",
    height: d.height ?? 24,
    products: d.products ? d.products.map((p) => ({ ...p })) : [],
    code: d.code ?? "",
    endsAt: d.endsAt ?? "",
    columns: d.columns ? [d.columns[0], d.columns[1]] : ["", ""],
    style: { ...baseStyle, ...(d.style ?? {}) },
  };
}

export function createDocument(types: EmailBlockType[]): EmailDocument {
  return {
    background: "#eef2f8",
    contentWidth: 600,
    blocks: types.map(createBlock),
  };
}

export function withText(block: EmailBlock, text: string): EmailBlock {
  return { ...block, text };
}

/** Builds a document from (type, text) pairs — used by templates. */
export function documentFrom(
  parts: Array<[EmailBlockType, string?]>,
): EmailDocument {
  return {
    background: "#eef2f8",
    contentWidth: 600,
    blocks: parts.map(([type, text]) => {
      const b = createBlock(type);
      return text ? withText(b, text) : b;
    }),
  };
}

export function cloneDocument(doc: EmailDocument): EmailDocument {
  return {
    ...doc,
    blocks: doc.blocks.map((b) => ({
      ...b,
      id: uid("blk"),
      style: { ...b.style },
      products: b.products.map((p) => ({ ...p })),
      columns: [b.columns[0], b.columns[1]],
    })),
  };
}

/** Serialises a document to email-safe HTML (tables + inline styles). */
export function documentToHtml(doc: EmailDocument): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = doc.blocks
    .map((b) => {
      const s = b.style;
      const cell = `padding:${s.paddingY}px ${s.paddingX}px;background:${s.background};text-align:${s.align};font-family:${s.fontFamily};font-size:${s.fontSize}px;color:${s.color};`;
      let inner = "";
      switch (b.type) {
        case "heading":
          inner = `<h1 style="margin:0;font-size:${s.fontSize}px">${esc(b.text)}</h1>`;
          break;
        case "button":
          inner = `<a href="${esc(b.url)}" style="display:inline-block;padding:12px 24px;background:${s.buttonColor};color:${s.buttonTextColor};border-radius:${s.borderRadius}px;text-decoration:none">${esc(b.text)}</a>`;
          break;
        case "image":
        case "video":
          inner = b.imageUrl
            ? `<a href="${esc(b.url)}"><img src="${esc(b.imageUrl)}" alt="${esc(b.text)}" width="100%" /></a>`
            : `<p>${esc(b.text)}</p>`;
          break;
        case "divider":
          inner = `<hr style="border:0;border-top:${s.borderWidth}px solid ${s.borderColor}" />`;
          break;
        case "spacer":
          inner = `<div style="height:${b.height}px"></div>`;
          break;
        case "coupon":
          inner = `<p>${esc(b.text)}</p><p style="font-size:22px;letter-spacing:2px"><strong>${esc(b.code)}</strong></p>`;
          break;
        case "product":
        case "product_grid":
          inner = b.products
            .map((p) => `<p><a href="${esc(p.url)}">${esc(p.name)}</a> ${esc(p.price)}</p>`)
            .join("");
          break;
        case "columns":
          inner = `<table width="100%"><tr><td width="50%">${esc(b.columns[0])}</td><td width="50%">${esc(b.columns[1])}</td></tr></table>`;
          break;
        default:
          inner = `<p style="margin:0">${esc(b.text)}</p>`;
      }
      return `<tr><td style="${cell}">${inner}</td></tr>`;
    })
    .join("\n");
  return `<!doctype html><html><body style="margin:0;background:${doc.background}"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="${doc.contentWidth}" style="background:#ffffff">${rows}</table></td></tr></table></body></html>`;
}
