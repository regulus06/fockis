/* ============================================================================
   EVENT DESCRIPTION (RICH TEXT)
   apps/api/src/events/utils/rich-text.ts

   Event descriptions may be plain text (older events, the Events app) or a
   small subset of HTML written by the organization editor. HTML is reduced
   to an allow-list before it is stored:

     p br strong b em i u ul ol li a(href) img(src, alt)
     text-align on p / li (left, center, right, justify)

   Links and images must be http(s) or a server upload path. Everything else
   (scripts, styles, event handlers, iframes, unknown tags) is removed; the
   text inside unknown tags is kept. The web app sanitizes again on render.
============================================================================ */

const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "img"]);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|svg|math)[\s\S]*?<\/\1\s*>/gi;
const SAFE_URL = /^(https?:\/\/[^\s"'<>]+|\/uploads\/[^\s"'<>]+)$/i;

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs);
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? "").trim();
}

/** True when the text looks like editor HTML rather than plain text. */
export function isRichText(value: string): boolean {
  return /<(p|br|strong|b|em|i|u|ul|ol|li|a|img)\b/i.test(value);
}

export function sanitizeEventHtml(input: string): string {
  if (!input) return "";
  if (!isRichText(input)) return input.trim();
  let html = input.replace(/<!--[\s\S]*?-->/g, "").replace(DROP_WITH_CONTENT, "");
  html = html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, rawTag: string, attrs: string) => {
    const tag = rawTag.toLowerCase();
    const closing = full.startsWith("</");
    if (!ALLOWED.has(tag)) return "";
    if (closing) return tag === "br" || tag === "img" ? "" : `</${tag}>`;
    if (tag === "a") {
      const href = attr(attrs, "href");
      if (!href || !SAFE_URL.test(href)) return "<a>";
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer nofollow">`;
    }
    if (tag === "img") {
      const src = attr(attrs, "src");
      if (!src || !SAFE_URL.test(src)) return "";
      const alt = attr(attrs, "alt") ?? "";
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt.slice(0, 200))}">`;
    }
    if (tag === "p" || tag === "li") {
      const style = attr(attrs, "style") ?? "";
      const align = /text-align\s*:\s*(left|center|right|justify)/i.exec(style)?.[1]?.toLowerCase();
      return align ? `<${tag} style="text-align:${align}">` : `<${tag}>`;
    }
    return `<${tag}>`;
  });
  return html.trim();
}

/** Visible text length (what the 2,000 character counter measures). */
export function textLength(value: string): number {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, "x").length;
}
