/**
 * returnTo.ts — "come back here after signing in".
 *
 * Pages send people to /login?returnTo=<path> (e.g. a giving QR code sends
 * signed-out visitors to sign in, then back to the giving form). Only paths
 * on this site are accepted ("/something"), never another website, so the
 * link can't be used to send people somewhere else after they sign in.
 */

const BLOCKED = /^\/(login|register|forgot-password|reset-password)(\/|\?|#|$)/i;

/** The validated returnTo of the current URL, or null. */
export function safeReturnTo(search = typeof window === "undefined" ? "" : window.location.search): string | null {
  const raw = new URLSearchParams(search).get("returnTo");
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  if (/[\u0000-\u001f]/.test(path) || path.length > 1000) return null;
  if (BLOCKED.test(path)) return null;
  return path;
}

/** Adds the current page's returnTo (if any) to a link, e.g. Login → Register. */
export function withReturnTo(target: string): string {
  const back = safeReturnTo();
  if (!back) return target;
  return `${target}${target.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(back)}`;
}
