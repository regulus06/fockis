/**
 * Site-wide Academy information (contact details, footer, social links,
 * Campus page hero and statistics), edited in Admin → Settings → Institution.
 *
 * Stored in the existing Academy content system — no new backend:
 *   section "site-info"     one item per field: title = key, description = value
 *   section "campus-stats"  one item per statistic: title = value ("5,000+"), description = label ("Students")
 *
 * Public pages read it with useSiteInfo(); anything an administrator has not
 * filled in is simply not shown (no invented phone numbers or statistics).
 */
import { useEffect, useState } from "react";
import { createContentItem, deleteContentItem, getContent, updateContentItem, type AcademyContent } from "./academyApi";

export const SITE_FIELDS = [
  { key: "name", label: "Academy name", group: "Identity", placeholder: "Fockis Academy" },
  { key: "tagline", label: "Footer tagline", group: "Identity", placeholder: "Career-focused education for a technology-driven world.", multiline: true },
  { key: "website", label: "Website", group: "Identity", placeholder: "https://…" },
  { key: "email", label: "Contact email", group: "Contact", placeholder: "admissions@your-academy.edu" },
  { key: "phone", label: "Contact phone", group: "Contact", placeholder: "+1 (555) 000-0000" },
  { key: "address", label: "Address", group: "Contact", placeholder: "Street, city, state, postal code", multiline: true },
  { key: "office_hours", label: "Office hours", group: "Contact", placeholder: "Mon–Fri, 8:00 AM – 6:00 PM" },
  { key: "social_facebook", label: "Facebook URL", group: "Social links", placeholder: "https://facebook.com/…" },
  { key: "social_instagram", label: "Instagram URL", group: "Social links", placeholder: "https://instagram.com/…" },
  { key: "social_youtube", label: "YouTube URL", group: "Social links", placeholder: "https://youtube.com/…" },
  { key: "social_linkedin", label: "LinkedIn URL", group: "Social links", placeholder: "https://linkedin.com/…" },
  { key: "social_x", label: "X (Twitter) URL", group: "Social links", placeholder: "https://x.com/…" },
  { key: "social_tiktok", label: "TikTok URL", group: "Social links", placeholder: "https://tiktok.com/@…" },
  { key: "campus_eyebrow", label: "Small heading above the title", group: "Campus page", placeholder: "Fockis Academy · Est. purpose-built for careers" },
  { key: "campus_title", label: "Title", group: "Campus page", placeholder: "Build Your Future at Fockis Academy" },
  { key: "campus_lead", label: "Introduction", group: "Campus page", placeholder: "Career-focused education, innovative programs…", multiline: true },
  { key: "campus_image", label: "Photo URL", group: "Campus page", placeholder: "https://… (leave empty for the illustration)" },
  { key: "campus_badge_title", label: "Photo badge title", group: "Campus page", placeholder: "e.g. Cybersecurity Lab" },
  { key: "campus_badge_subtitle", label: "Photo badge subtitle", group: "Campus page", placeholder: "e.g. Fockis Technology Center" },
] as const;

export type SiteKey = (typeof SITE_FIELDS)[number]["key"];
export type SiteInfo = Partial<Record<SiteKey, string>>;
export type CampusStat = { _id?: string; value: string; label: string };

export const SOCIALS: { key: SiteKey; short: string; label: string }[] = [
  { key: "social_facebook", short: "FB", label: "Facebook" },
  { key: "social_instagram", short: "IG", label: "Instagram" },
  { key: "social_youtube", short: "YT", label: "YouTube" },
  { key: "social_linkedin", short: "IN", label: "LinkedIn" },
  { key: "social_x", short: "X", label: "X" },
  { key: "social_tiktok", short: "TT", label: "TikTok" },
];

type Raw = AcademyContent & { description?: string; order?: number };
const asList = (r: AcademyContent | AcademyContent[]): Raw[] => (Array.isArray(r) ? (r as Raw[]) : r ? [r as Raw] : []);

let infoCache: Promise<{ info: SiteInfo; items: Raw[] }> | null = null;
let statsCache: Promise<CampusStat[]> | null = null;

function loadInfo() {
  if (!infoCache)
    infoCache = getContent("site-info")
      .then((r) => {
        const items = asList(r);
        const info: SiteInfo = {};
        items.forEach((it) => {
          if (it.title && typeof it.description === "string" && it.description.trim()) info[it.title as SiteKey] = it.description.trim();
        });
        return { info, items };
      })
      .catch((e) => {
        infoCache = null;
        throw e;
      });
  return infoCache;
}

function loadStats() {
  if (!statsCache)
    statsCache = getContent("campus-stats")
      .then((r) =>
        asList(r)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((it) => ({ _id: String(it._id ?? ""), value: String(it.title ?? ""), label: String(it.description ?? "") }))
          .filter((s) => s.value),
      )
      .catch((e) => {
        statsCache = null;
        throw e;
      });
  return statsCache;
}

/** Public read. Never throws: a failed load just means "nothing set". */
export function useSiteInfo(): { info: SiteInfo; ready: boolean } {
  const [state, setState] = useState<{ info: SiteInfo; ready: boolean }>({ info: {}, ready: false });
  useEffect(() => {
    let off = false;
    loadInfo()
      .then(({ info }) => !off && setState({ info, ready: true }))
      .catch(() => !off && setState({ info: {}, ready: true }));
    return () => {
      off = true;
    };
  }, []);
  return state;
}

export function useCampusStats(): { stats: CampusStat[]; ready: boolean } {
  const [state, setState] = useState<{ stats: CampusStat[]; ready: boolean }>({ stats: [], ready: false });
  useEffect(() => {
    let off = false;
    loadStats()
      .then((stats) => !off && setState({ stats, ready: true }))
      .catch(() => !off && setState({ stats: [], ready: true }));
    return () => {
      off = true;
    };
  }, []);
  return state;
}

export async function fetchSiteInfoForEdit() {
  infoCache = null;
  statsCache = null;
  const [{ info }, stats] = await Promise.all([loadInfo(), loadStats()]);
  return { info, stats };
}

/** Admin save: create / update / delete one content item per field. */
export async function saveSiteInfo(next: SiteInfo) {
  const { items } = await loadInfo();
  const byKey = new Map(items.map((it) => [String(it.title), it]));
  const ops: Promise<unknown>[] = [];
  SITE_FIELDS.forEach((f, order) => {
    const value = (next[f.key] ?? "").trim();
    const existing = byKey.get(f.key);
    const id = existing ? String(existing._id ?? existing.id ?? "") : "";
    if (!value) {
      if (id) ops.push(deleteContentItem(id));
    } else if (id) {
      if ((existing?.description ?? "") !== value) ops.push(updateContentItem(id, { description: value } as Partial<AcademyContent>));
    } else {
      ops.push(createContentItem({ section: "site-info", title: f.key, description: value, order } as Partial<AcademyContent>));
    }
  });
  await Promise.all(ops);
  infoCache = null;
}

export async function saveCampusStats(next: CampusStat[]) {
  const current = await loadStats();
  const keep = new Set(next.map((s) => s._id).filter(Boolean));
  const ops: Promise<unknown>[] = [];
  current.forEach((s) => s._id && !keep.has(s._id) && ops.push(deleteContentItem(s._id)));
  next.forEach((s, order) => {
    const value = s.value.trim();
    const label = s.label.trim();
    if (!value) {
      if (s._id) ops.push(deleteContentItem(s._id));
      return;
    }
    if (s._id) ops.push(updateContentItem(s._id, { title: value, description: label, order } as Partial<AcademyContent>));
    else ops.push(createContentItem({ section: "campus-stats", title: value, description: label, order } as Partial<AcademyContent>));
  });
  await Promise.all(ops);
  statsCache = null;
}
