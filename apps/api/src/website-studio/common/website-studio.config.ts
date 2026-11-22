/** Environment-driven configuration for Website Studio (all optional). */
export const wsConfig = {
  /** Root domain for <slug>.<root> subdomains. */
  rootDomain: (process.env.WEBSITE_STUDIO_ROOT_DOMAIN || 'fockis.com').toLowerCase().trim(),
  /** Set to "true" once wildcard DNS (*.fockis.com) points at the web app. */
  subdomainsEnabled: String(process.env.WEBSITE_STUDIO_SUBDOMAINS_ENABLED || '').toLowerCase() === 'true',
  /** Public web app base URL used for /s/<slug> links. */
  publicBaseUrl: (process.env.WEBSITE_STUDIO_PUBLIC_BASE_URL || process.env.FRONTEND_URL || 'https://fockis.com').replace(/\/+$/, ''),
  /** CNAME target customers point their custom domain to. */
  cnameTarget: (process.env.WEBSITE_STUDIO_CNAME_TARGET || 'sites.fockis.com').toLowerCase().trim(),
  /** When "true", premium templates require a premium/subscribed account. */
  enforcePremium: String(process.env.WEBSITE_STUDIO_ENFORCE_PREMIUM || '').toLowerCase() === 'true',
  /** Max websites per user (0 = unlimited). */
  maxWebsitesPerUser: Number(process.env.WEBSITE_STUDIO_MAX_WEBSITES_PER_USER || 50),
};

export function websiteUrl(slug: string, primaryDomain?: string | null): string {
  if (primaryDomain) return `https://${primaryDomain}`;
  if (wsConfig.subdomainsEnabled) return `https://${slug}.${wsConfig.rootDomain}`;
  return `${wsConfig.publicBaseUrl}/s/${slug}`;
}
