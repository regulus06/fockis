/**
 * Every kind of organization that can own a Fockis domain (<name>.fockis.com).
 *
 * One price list covers both places that hand out Fockis domains:
 *   - Organization Identity (churches, ministries… — OrganizationType)
 *   - Fockis Academy schools (school, university, business… — INSTITUTION_TYPES)
 * Keys shared by both ("church", "other") use the same price.
 */
export interface DomainPriceType {
  key: string;
  label: string;
  group: "organizations" | "academy" | "both";
}

export const DOMAIN_PRICE_TYPES: DomainPriceType[] = [
  // Organization Identity (web: church.types.ts → OrganizationType)
  { key: "church", label: "Church", group: "both" },
  { key: "christian_ministry", label: "Christian ministry", group: "organizations" },
  { key: "christian_fellowship", label: "Christian fellowship", group: "organizations" },
  { key: "mission", label: "Mission", group: "organizations" },
  { key: "prayer_organization", label: "Prayer organization", group: "organizations" },
  { key: "christian_network", label: "Christian network", group: "organizations" },
  { key: "christian_nonprofit", label: "Christian nonprofit", group: "organizations" },
  { key: "bible_study_organization", label: "Bible study organization", group: "organizations" },
  // Fockis Academy (academy/institutions/schemas/institution.schema.ts → INSTITUTION_TYPES)
  { key: "school", label: "School", group: "academy" },
  { key: "university", label: "University", group: "academy" },
  { key: "college", label: "College", group: "academy" },
  { key: "training_center", label: "Training center", group: "academy" },
  { key: "business", label: "Business", group: "academy" },
  { key: "nonprofit", label: "Nonprofit", group: "academy" },
  { key: "other", label: "Other", group: "both" },
];

export const DOMAIN_PRICE_TYPE_KEYS = DOMAIN_PRICE_TYPES.map((t) => t.key);

export function periodLabel(months: number) {
  if (months === 0) return "one-time";
  if (months === 1) return "1 month";
  if (months === 12) return "1 year";
  if (months % 12 === 0) return `${months / 12} years`;
  return `${months} months`;
}

export function addMonths(d: Date, months: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

/** Names nobody can take as <name>.fockis.com. */
export const RESERVED_DOMAIN_NAMES = new Set([
  "www", "mail", "email", "api", "admin", "academy", "app", "apps", "support", "help", "static", "cdn", "fockis",
  "staff", "root", "test", "demo", "login", "auth", "billing", "pay", "payments", "meet", "meetings", "verify",
  "shop", "store", "music", "travel", "careers", "jobs", "news", "blog", "status", "docs", "dev", "staging",
]);

/** 3–30 lowercase letters, numbers or dashes, not starting/ending with a dash. */
export const DOMAIN_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
