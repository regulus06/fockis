import { randomBytes } from 'crypto';
import { SiteContent } from './content.types';

export function newId(prefix: string): string {
  return `${prefix}-${randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 10)}`;
}

export const cloneJson = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Gives every page/section/nav link a fresh unique id (used when copying templates). */
export function reassignIds(content: SiteContent): SiteContent {
  const c = cloneJson(content);
  const pageIdMap = new Map<string, string>();
  c.header.id = newId('h');
  c.footer.id = newId('f');
  for (const p of c.pages) {
    const id = newId('p');
    pageIdMap.set(p.id, id);
    p.id = id;
    for (const s of p.sections) s.id = newId('s');
  }
  for (const p of c.pages) if (p.parentId) p.parentId = pageIdMap.get(p.parentId) ?? null;
  const renav = (links: any[]) => links.forEach((l) => ((l.id = newId('n')), l.children && renav(l.children)));
  renav(c.navigation);
  return c;
}

/** Applies a business name to a fresh copy of a template. */
export function personalize(content: SiteContent, businessName: string): SiteContent {
  const c = cloneJson(content);
  const name = businessName.trim();
  if (!name) return c;
  const oldName = c.settings.businessName;
  c.settings.businessName = name;
  c.settings.seo.siteTitle = name;
  const words = name.split(/\s+/);
  if (c.header.props.logoText !== undefined) {
    // Keep two-line logos (e.g. "Fockis" / "Barbershop") when the name has several words.
    if (words.length > 1 && c.header.props.logoSubtext !== undefined && c.header.props.logoStyle !== 'simple') {
      c.header.props.logoText = words.slice(0, Math.ceil(words.length / 2)).join(' ');
      c.header.props.logoSubtext = words.slice(Math.ceil(words.length / 2)).join(' ');
    } else {
      c.header.props.logoText = name;
      if (c.header.props.logoStyle === 'simple') c.header.props.logoSubtext = '';
    }
  }
  if (typeof c.footer.props.copyright === 'string' && oldName) {
    c.footer.props.copyright = c.footer.props.copyright.split(oldName).join(name);
  }
  return c;
}
