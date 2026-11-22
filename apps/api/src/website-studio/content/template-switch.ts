import { NavLink, Section, SiteContent, SitePage } from './content.types';

export interface SwitchReport {
  templateSlug: string;
  templateName: string;
  preserved: string[];
  notTransferred: string[];
  keptPages: string[];
  warnings: string[];
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Section types whose content is purely presentational and should never be duplicated. */
const SINGLETON_TYPES = new Set(['hero', 'header', 'footer']);

function pickSampleSource(original: SiteContent | null, slug: string, type: string, index: number): Section | undefined {
  if (!original) return undefined;
  const page = original.pages.find((p) => p.slug === slug);
  return page?.sections.filter((s) => s.type === type)[index];
}

/**
 * Merge the user's props into the new template's section.
 * A prop the user never changed (it still equals the old template's sample value)
 * is replaced by the new template's sample; anything the user customised wins.
 */
function mergeProps(target: Record<string, any>, current: Record<string, any>, sample?: Record<string, any>): Record<string, any> {
  const out = { ...target };
  for (const [key, value] of Object.entries(current)) {
    if (value === undefined || value === null || value === '') continue;
    if (sample && same(sample[key], value)) continue; // untouched sample content
    if (!(key in target)) continue; // the new design does not use this field
    out[key] = clone(value);
  }
  return out;
}

function refreshTopBar(header: Section, content: SiteContent) {
  const s = content.settings;
  const items = header.props.topBarLeft;
  if (!Array.isArray(items)) return;
  const hours = s.hours ?? [];
  let hourIndex = 0;
  header.props.topBarLeft = items.map((it: any) => {
    if (it.icon === 'MapPin') return { ...it, text: s.address };
    if (it.icon === 'Phone') return { ...it, text: s.phone };
    if (it.icon === 'Clock' || (!it.icon && hourIndex > 0)) {
      const h = hours[hourIndex++];
      return h ? { ...it, text: `${h.label}: ${h.value}` } : it;
    }
    return it;
  });
}

/**
 * Apply a new template design to an existing website while preserving the
 * user's content (business info, catalog, page text, images, custom pages).
 */
export function applyTemplateDesign(
  current: SiteContent,
  target: SiteContent,
  oldTemplateOriginal: SiteContent | null,
  meta: { slug: string; name: string },
): { content: SiteContent; report: SwitchReport } {
  const next = clone(target);
  const report: SwitchReport = { templateSlug: meta.slug, templateName: meta.name, preserved: [], notTransferred: [], keptPages: [], warnings: [] };

  // 1. Business information & settings always belong to the user.
  next.settings = clone(current.settings);
  report.preserved.push('Business name, contact details, hours, social links and store settings');

  // 2. Catalog: keep the user's data; only fall back to template samples when the user has none.
  const cat = current.catalog;
  const kept: string[] = [];
  if (cat.products.length) {
    next.catalog.products = clone(cat.products);
    next.catalog.productCategories = clone(cat.productCategories);
    kept.push(`${cat.products.length} products`);
  }
  if (cat.services.length) {
    next.catalog.services = clone(cat.services);
    kept.push(`${cat.services.length} services`);
  }
  if (cat.staff.length) {
    next.catalog.staff = clone(cat.staff);
    kept.push(`${cat.staff.length} team members`);
  }
  if (cat.reviews.length) next.catalog.reviews = clone(cat.reviews);
  if (kept.length) report.preserved.push(`Catalog: ${kept.join(', ')}`);

  // 3. Header & footer: new design, user's branding text.
  const oldHeaderSample = oldTemplateOriginal?.header.props;
  next.header.props = mergeProps(next.header.props, current.header.props, oldHeaderSample);
  for (const k of ['logoText', 'logoSubtext', 'logoUrl']) {
    if (current.header.props[k] && !(oldHeaderSample && same(oldHeaderSample[k], current.header.props[k]))) next.header.props[k] = current.header.props[k];
  }
  refreshTopBar(next.header, next);
  next.footer.props = mergeProps(next.footer.props, current.footer.props, oldTemplateOriginal?.footer.props);
  report.preserved.push('Logo and header/footer text');

  // 4. Pages: merge sections by type for pages that exist in both; keep every other page.
  let mergedSections = 0;
  let appendedSections = 0;
  const targetSlugs = new Set(next.pages.map((p) => p.slug));
  for (const page of next.pages) {
    const mine = current.pages.find((p) => p.slug === page.slug);
    if (!mine) continue;
    page.title = mine.title;
    page.seo = clone(mine.seo);
    page.showInNav = mine.showInNav;
    page.visibility = mine.visibility;
    const used = new Set<string>();
    const typeCounters: Record<string, number> = {};
    for (const section of page.sections) {
      const idx = (typeCounters[section.type] = (typeCounters[section.type] ?? -1) + 1);
      const match = mine.sections.find((s) => s.type === section.type && !used.has(s.id));
      if (!match) continue;
      used.add(match.id);
      const sample = pickSampleSource(oldTemplateOriginal, page.slug, section.type, idx)?.props;
      section.props = mergeProps(section.props, match.props, sample);
      if (match.style?.hidden) section.style.hidden = true;
      mergedSections++;
    }
    for (const s of mine.sections) {
      if (used.has(s.id) || SINGLETON_TYPES.has(s.type)) continue;
      const untouchedSample = oldTemplateOriginal?.pages
        .find((p) => p.slug === page.slug)
        ?.sections.some((x) => x.type === s.type && same(x.props, s.props));
      if (untouchedSample) continue; // unchanged sample section from the old design
      page.sections.push({ ...clone(s), style: { ...clone(s.style), background: undefined, textColor: undefined } });
      appendedSections++;
    }
  }
  if (mergedSections) report.preserved.push(`Text, images and buttons from ${mergedSections} matching sections`);
  if (appendedSections) report.preserved.push(`${appendedSections} of your own sections were moved to the end of their pages`);

  // 5. Pages that only exist in the user's site are kept as-is.
  const extraPages: SitePage[] = current.pages.filter((p) => !targetSlugs.has(p.slug));
  for (const p of extraPages) {
    const fromOldTemplate = oldTemplateOriginal?.pages.find((x) => x.slug === p.slug);
    const untouched = fromOldTemplate && same(fromOldTemplate.sections.map((s) => s.props), p.sections.map((s) => s.props));
    if (untouched) {
      report.notTransferred.push(`Unedited sample page "${p.title}" from the previous design`);
      continue;
    }
    next.pages.push({ ...clone(p), order: next.pages.length, isHomepage: false });
    report.keptPages.push(p.title);
  }

  // 6. Navigation: new design's menu + links to kept custom pages.
  const nav: NavLink[] = next.navigation;
  for (const title of report.keptPages) {
    const p = next.pages.find((x) => x.title === title);
    if (p && p.showInNav && !nav.some((l) => l.href === `page:${p.slug}`)) nav.push({ id: `n-${p.id}`, label: p.title, href: `page:${p.slug}` });
  }

  // 7. Things that intentionally do not carry over.
  report.notTransferred.push('Theme colors, fonts and per-element style tweaks (the new design provides its own)');
  if (current.pages.some((p) => p.sections.some((s) => Object.keys(s.elementStyles ?? {}).length))) {
    report.warnings.push('Custom text/image styling on individual elements will be reset to the new design.');
  }
  report.warnings.push('A backup version is created automatically, so you can undo this design change at any time.');
  return { content: next, report };
}
