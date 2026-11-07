/**
 * Public address of the Fockis web app, used in links that leave the browser —
 * above all the QR code printed on certificates, which is scanned by phones.
 *
 * Set VITE_PUBLIC_SITE_URL (e.g. https://www.yourdomain.com) in web/.env so
 * certificates printed while you work on localhost still point to the live
 * site. Without it, the current address is used.
 */
export function publicSiteUrl(): string {
  const env = String(import.meta.env.VITE_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  if (env) return env;
  return typeof window !== "undefined" ? window.location.origin : "";
}

/** True when QR links would point at this computer only (phones can't open them). */
export function linksAreLocalOnly(): boolean {
  try {
    const host = new URL(publicSiteUrl()).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost");
  } catch {
    return false;
  }
}

export const SAMPLE_VERIFICATION_ID = "SAMPLE7K3QX9M2AB";
