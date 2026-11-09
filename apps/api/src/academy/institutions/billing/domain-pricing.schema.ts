/**
 * Moved: Fockis domain prices are now one shared list for Organization
 * Identity domains and Academy schools —
 *   apps/api/src/organization-identity/billing/fockis-domain-pricing.schema.ts
 *   apps/api/src/organization-identity/billing/domain-pricing.service.ts
 * Nothing imports this file any more; it can be deleted. Prices saved here
 * before (collection academy_domain_pricing) are copied over automatically the
 * first time the shared list is read.
 */
export {};
