/** True when the app is opened on a customer website host instead of the Fockis app itself. */
export function isWebsiteStudioHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  const root = String(import.meta.env.VITE_WEBSITE_STUDIO_ROOT_DOMAIN || "fockis.com").toLowerCase();
  const appHosts = String(import.meta.env.VITE_FOCKIS_APP_HOSTS || "").toLowerCase().split(",").map((h: string) => h.trim()).filter(Boolean);
  if (host === "localhost" || host === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  if (host.endsWith(".vercel.app") || host.endsWith(".onrender.com")) return false;
  if (host === root || host === `www.${root}` || appHosts.includes(host)) return false;
  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    return !["www", "app", "api", "admin", "mail"].includes(sub) && String(import.meta.env.VITE_WEBSITE_STUDIO_SUBDOMAINS || "") === "true";
  }
  // Any other hostname is treated as a customer's custom domain only when explicitly enabled.
  return String(import.meta.env.VITE_WEBSITE_STUDIO_CUSTOM_DOMAINS || "") === "true";
}
