/**
 * media-link.ts
 * -----------------------------------------------------------------------------
 * Short-lived links to Academy lesson files (video, PDF, worksheets, homework
 * attachments) that Fockis signs itself.
 *
 * Before, the API handed the browser a Google Cloud Storage signed URL. When
 * Google rejected that signature ("SignatureDoesNotMatch"), PDFs showed an XML
 * error and videos stayed black. Now the API checks who may open the file, then
 * returns a link to its own GET /academy/learn/media/:token route, which
 * streams the file from storage. The token is signed with ACADEMY_JWT_SECRET
 * and expires, so it can't be guessed, changed or reused later.
 * -----------------------------------------------------------------------------
 */

import { createHmac, timingSafeEqual } from "crypto";

export interface MediaGrant {
  /** storage object key */
  k: string;
  /** content type */
  m: string;
  /** file name shown to the user */
  n: string;
  /** 1 = download (attachment), 0 = show in the page */
  d: 0 | 1;
  /** expiry, unix seconds */
  e: number;
}

function secret(): string {
  const s = process.env.ACADEMY_JWT_SECRET;
  if (!s) throw new Error("FOCKIS ACADEMY ERROR: ACADEMY_JWT_SECRET is not configured.");
  return `academy-media:${s}`;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** Path relative to the Academy API base, e.g. "/learn/media/eyJr…". */
export function mediaPath(storageKey: string, mimeType: string | undefined, fileName: string | undefined, download: boolean, lifetimeSeconds: number): string {
  const grant: MediaGrant = {
    k: storageKey,
    m: mimeType || "application/octet-stream",
    n: (fileName || "file").replace(/["\\\r\n]/g, ""),
    d: download ? 1 : 0,
    e: Math.floor(Date.now() / 1000) + Math.max(60, Math.floor(lifetimeSeconds)),
  };
  const body = Buffer.from(JSON.stringify(grant)).toString("base64url");
  return `/learn/media/${body}.${sign(body)}`;
}

/** Returns the grant, or null when the token is fake, changed or expired. */
export function readMediaToken(token: string): MediaGrant | null {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const g = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as MediaGrant;
    if (!g?.k || typeof g.e !== "number" || g.e < Math.floor(Date.now() / 1000)) return null;
    return g;
  } catch {
    return null;
  }
}
