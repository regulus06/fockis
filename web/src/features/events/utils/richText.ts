/* ============================================================================
   EVENT DESCRIPTION — RICH TEXT (web)
   web/src/features/events/utils/richText.ts

   Same allow-list as the API (apps/api/src/events/utils/rich-text.ts):
     p br strong b em i u ul ol li a(href) img(src, alt)
     text-align on p / li
   The API sanitizes before saving; the web app sanitizes again before it
   renders anything, so a description is never trusted as HTML.
   Older and Events-app descriptions are plain text and render as text.
============================================================================ */

const ALLOWED = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "A", "IMG"]);
const BLOCK_TO_P = new Set(["DIV", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "SECTION", "ARTICLE"]);
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT", "TEMPLATE", "SVG", "MATH", "VIDEO", "AUDIO", "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA"]);
const ALIGN = new Set(["left", "center", "right", "justify"]);

export function isSafeUrl(value: string): boolean {
  return /^(https?:\/\/[^\s"'<>]+|\/uploads\/[^\s"'<>]+)$/i.test(value.trim());
}

/** True when the text looks like editor HTML rather than plain text. */
export function isRichText(value?: string | null): boolean {
  return /<(p|br|strong|b|em|i|u|ul|ol|li|a|img)\b/i.test(String(value ?? ""));
}

function clean(node: Node, doc: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) return [doc.createTextNode(node.textContent ?? "")];
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  if (DROP.has(tag)) return [];
  const children = Array.from(el.childNodes).flatMap((c) => clean(c, doc));

  const name = BLOCK_TO_P.has(tag) ? "P" : tag;
  if (!ALLOWED.has(name)) return children; // keep the text of unknown tags

  const out = doc.createElement(name.toLowerCase());
  if (name === "A") {
    const href = el.getAttribute("href") ?? "";
    if (!isSafeUrl(href)) return children;
    out.setAttribute("href", href.trim());
    out.setAttribute("target", "_blank");
    out.setAttribute("rel", "noopener noreferrer nofollow");
  }
  if (name === "IMG") {
    const src = el.getAttribute("src") ?? "";
    if (!isSafeUrl(src)) return [];
    out.setAttribute("src", src.trim());
    out.setAttribute("alt", (el.getAttribute("alt") ?? "").slice(0, 200));
    out.setAttribute("loading", "lazy");
    return [out];
  }
  if (name === "P" || name === "LI") {
    const align = ((el as HTMLElement).style?.textAlign || el.getAttribute("align") || "").toLowerCase();
    if (ALIGN.has(align) && align !== "left") out.setAttribute("style", `text-align: ${align}`);
  }
  children.forEach((c) => out.appendChild(c));
  return [out];
}

/** Allow-listed HTML (empty string for empty input). */
export function sanitizeRichText(html?: string | null): string {
  const input = String(html ?? "").trim();
  if (!input || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<body>${input}</body>`, "text/html");
  const box = doc.createElement("div");
  Array.from(doc.body.childNodes)
    .flatMap((n) => clean(n, doc))
    .forEach((n) => box.appendChild(n));
  // Drop empty trailing paragraphs the editor leaves behind.
  const out = box.innerHTML.replace(/(<p>(<br>)?<\/p>)+$/g, "").trim();
  return out;
}

/** Visible characters (what the 2,000 counter counts). */
export function richTextLength(html?: string | null): number {
  const value = String(html ?? "");
  if (!isRichText(value)) return value.length;
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, "x").length;
}

/** Plain text of a description (cards, previews, meta descriptions). */
export function richTextToPlain(html?: string | null): string {
  const value = String(html ?? "");
  if (!isRichText(value)) return value;
  return value
    .replace(/<\/(p|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
