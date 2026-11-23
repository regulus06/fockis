/**
 * organization-handles.ts — pure rules for an organization's public name
 * (the "handle" in fockis.com/o/<handle> and <handle>.fockis.com).
 */

/** Words that can never be an organization's public name. */
export const RESERVED_HANDLES = new Set([
  "www", "app", "api", "admin", "administrator", "mail", "email", "smtp", "ftp", "cdn", "static", "assets", "uploads", "media",
  "o", "org", "orgs", "organization", "organizations", "church", "churches", "fockis", "fockisapp", "official",
  "login", "logout", "register", "signup", "signin", "account", "accounts", "auth", "oauth", "reset-password", "forgot-password",
  "settings", "dashboard", "payouts", "payout", "giving", "give", "payments", "payment", "billing", "checkout", "wallet",
  "help", "support", "contact", "about", "terms", "privacy", "policy", "legal", "security", "status", "blog", "news",
  "shop", "store", "stores", "seller", "sellers", "marketplace", "academy", "careers", "jobs", "events", "groups", "messages",
  "search", "explore", "feed", "home", "test", "demo", "null", "undefined", "root", "system", "staff", "moderator",
]);

export const HANDLE_MIN = 2;
export const HANDLE_MAX = 63;

/** Lowercase, no accents, letters / numbers / single hyphens, no leading or trailing hyphen. */
export function normalizeHandle(input: unknown): string {
  return String(input ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, HANDLE_MAX)
    .replace(/-+$/g, "");
}

/** Error message, or null when the handle can be used. */
export function handleProblem(handle: string): string | null {
  if (handle.length < HANDLE_MIN) return `Use at least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX) return `Use at most ${HANDLE_MAX} characters.`;
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(handle)) return "Use only lowercase letters, numbers and hyphens (not at the start or end).";
  if (handle.includes("--")) return "Don't use two hyphens in a row.";
  if (/^\d+$/.test(handle)) return "Include at least one letter.";
  if (/^[a-f0-9]{24}$/.test(handle)) return "This looks like an internal ID. Choose a name.";
  if (RESERVED_HANDLES.has(handle)) return "This name is reserved. Choose another.";
  return null;
}

/** The part of a Fockis domain before the first dot ("methodiste.fockis.church" → "methodiste"). */
export function domainPrefix(domain: unknown): string {
  const d = String(domain ?? "").trim().toLowerCase();
  const i = d.indexOf(".");
  return i > 0 ? d.slice(0, i) : "";
}

/**
 * Names to try, in order, for an organization without a handle:
 * its domain prefix, then the prefix with its city, then numbered.
 */
export function handleCandidates(domain: unknown, name: unknown, city: unknown): string[] {
  const base = normalizeHandle(domainPrefix(domain)) || normalizeHandle(name) || "organization";
  const out: string[] = [];
  const add = (h: string) => {
    const v = normalizeHandle(h);
    if (v && !handleProblem(v) && !out.includes(v)) out.push(v);
  };
  add(base);
  const c = normalizeHandle(city);
  if (c) add(`${base}-${c}`.slice(0, HANDLE_MAX));
  for (let i = 2; i <= 50; i += 1) add(`${base.slice(0, HANDLE_MAX - 4)}-${i}`);
  return out;
}

/** True when the hostname is an organization's own Fockis address (e.g. methodiste.fockis.church). */
export function isOrganizationHost(host: string, suffixes: readonly string[]): boolean {
  const h = host.toLowerCase();
  const suffix = suffixes.find((s) => h.endsWith(s));
  if (!suffix) return false;
  const sub = h.slice(0, -suffix.length);
  return Boolean(sub) && !sub.includes(".") && !RESERVED_HANDLES.has(sub);
}

/* ---------------------------------------------------------------- outputs */

export function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string);
}

export function escapeHtml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" })[c] as string);
}

export function sitemapXml(entries: Array<{ loc: string; lastmod?: Date | null }>): string {
  const urls = entries
    .map((e) => `  <url><loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Small HTML page with link-preview tags, for apps that don't run JavaScript (WhatsApp, Facebook…). */
export function shareHtml(p: { title: string; description: string; url: string; image: string | null; siteName: string; index: boolean }): string {
  const t = escapeHtml(p.title);
  const d = escapeHtml(p.description.replace(/\s+/g, " ").trim().slice(0, 300));
  const u = escapeHtml(p.url);
  const img = p.image ? escapeHtml(p.image) : "";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="robots" content="${p.index ? "index, follow" : "noindex, nofollow"}">
<link rel="canonical" href="${u}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${escapeHtml(p.siteName)}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
${img ? `<meta property="og:image" content="${img}">\n` : ""}<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
${img ? `<meta name="twitter:image" content="${img}">\n` : ""}<meta http-equiv="refresh" content="0;url=${u}">
</head><body><h1>${t}</h1><p>${d}</p><p><a href="${u}">${u}</a></p></body></html>`;
}
