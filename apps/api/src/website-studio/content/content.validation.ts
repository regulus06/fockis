import { BadRequestException } from '@nestjs/common';
import { CONTENT_SCHEMA_VERSION, SECTION_TYPES, SiteContent } from './content.types';

/**
 * Validates and sanitizes website content coming from the editor, AI, imports
 * or administrators before it is stored or published.
 *
 * Security notes:
 * - React escapes all text on render, so the main risks are dangerous URL
 *   schemes and CSS injection through style values. Both are neutralised here.
 * - Custom HTML blocks are rendered inside a sandboxed iframe (no scripts) on
 *   the client; script tags and inline event handlers are stripped here too.
 */

const MAX_CONTENT_BYTES = 3 * 1024 * 1024;
const MAX_PAGES = 80;
const MAX_SECTIONS_PER_PAGE = 120;
const MAX_STRING = 20000;
const MAX_HTML = 100000;
const MAX_DEPTH = 12;
const SECTION_TYPE_SET = new Set<string>(SECTION_TYPES);
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DANGEROUS_URL = /^\s*(javascript|vbscript|data\s*:\s*text\/html|data\s*:\s*image\/svg)/i;
const SAFE_CSS_VALUE = /^[#a-zA-Z0-9(),.%\s\-+/]*$/;
const SAFE_FONT = /^[A-Za-z0-9 ]{1,48}$/;

function fail(msg: string): never {
  throw new BadRequestException(`Invalid website content: ${msg}`);
}

export function sanitizeHtml(html: string): string {
  return String(html)
    .slice(0, MAX_HTML)
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|base|meta|link)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src|action)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}

function cleanCssValue(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v).slice(0, 300);
  if (!SAFE_CSS_VALUE.test(s) || /url\s*\(|expression|@import|[;{}<>\\]/i.test(s)) return undefined;
  return s;
}

function cleanUrl(v: unknown): string {
  const s = String(v ?? '').trim().slice(0, 2000);
  if (!s || DANGEROUS_URL.test(s)) return '';
  return s;
}

function num(v: unknown, min: number, max: number): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

const URL_KEYS = /^(href|src|image|images|url|logoUrl|backgroundImage|poster|decorImage|ogImage|faviconUrl|canonicalUrl)$/;

/** Recursively cleans arbitrary section props. */
function cleanValue(value: unknown, key: string, depth: number): unknown {
  if (depth > MAX_DEPTH) return undefined;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (key === 'html') return sanitizeHtml(value);
    const s = value.slice(0, MAX_STRING);
    if (URL_KEYS.test(key) || DANGEROUS_URL.test(s)) return cleanUrl(s);
    return s;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 500).map((v) => cleanValue(v, key === 'images' ? 'src' : key, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 200)) {
      if (k.startsWith('$') || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[k] = cleanValue(v, k, depth + 1);
    }
    return out;
  }
  return undefined;
}

function cleanBox(box: any): Record<string, unknown> {
  if (!box || typeof box !== 'object') return {};
  const out: Record<string, unknown> = {};
  const css = (k: string) => {
    const v = cleanCssValue(box[k]);
    if (v !== undefined) out[k] = v;
  };
  css('background');
  css('overlay');
  css('textColor');
  if (box.backgroundImage) out.backgroundImage = cleanUrl(box.backgroundImage).replace(/["'()\\]/g, '');
  for (const [k, min, max] of [
    ['paddingTop', 0, 600], ['paddingBottom', 0, 600], ['marginTop', -400, 600], ['marginBottom', -400, 600],
    ['maxWidth', 200, 4000], ['minHeight', 0, 2000], ['columns', 1, 12], ['fontScale', 0.5, 2.5],
  ] as const) {
    const n = num(box[k], min, max);
    if (n !== undefined) out[k] = n;
  }
  if (['left', 'center', 'right'].includes(box.align)) out.align = box.align;
  return out;
}

function cleanStyle(style: any): Record<string, unknown> {
  const out: Record<string, unknown> = cleanBox(style);
  if (!style || typeof style !== 'object') return out;
  if (style.hidden === true) out.hidden = true;
  if (style.fullWidth === true) out.fullWidth = true;
  if (['none', 'fade-up', 'fade-in', 'zoom'].includes(style.animation)) out.animation = style.animation;
  if (style.hideOn && typeof style.hideOn === 'object') {
    out.hideOn = {
      desktop: style.hideOn.desktop === true,
      tablet: style.hideOn.tablet === true,
      mobile: style.hideOn.mobile === true,
    };
  }
  if (style.responsive && typeof style.responsive === 'object') {
    out.responsive = {
      tablet: cleanBox(style.responsive.tablet),
      mobile: cleanBox(style.responsive.mobile),
    };
  }
  return out;
}

function cleanElementStyles(es: any): Record<string, unknown> {
  if (!es || typeof es !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [path, st] of Object.entries(es).slice(0, 300)) {
    if (!/^[A-Za-z0-9_.]{1,120}$/.test(path) || !st || typeof st !== 'object') continue;
    const s: any = st;
    const o: Record<string, unknown> = {};
    if (s.fontFamily && SAFE_FONT.test(String(s.fontFamily))) o.fontFamily = String(s.fontFamily);
    for (const [k, min, max] of [
      ['fontSize', 6, 240], ['fontWeight', 100, 900], ['lineHeight', 0.6, 4], ['letterSpacing', -10, 40],
      ['borderRadius', 0, 999], ['width', 0, 4000], ['height', 0, 4000],
    ] as const) {
      const n = num(s[k], min, max);
      if (n !== undefined) o[k] = n;
    }
    for (const k of ['color', 'background', 'borderColor', 'objectPosition']) {
      const v = cleanCssValue(s[k]);
      if (v !== undefined) o[k] = v;
    }
    if (['left', 'center', 'right'].includes(s.textAlign)) o.textAlign = s.textAlign;
    if (['cover', 'contain'].includes(s.objectFit)) o.objectFit = s.objectFit;
    if (['sm', 'md', 'lg'].includes(s.size)) o.size = s.size;
    if (['square', 'rounded', 'pill'].includes(s.shape)) o.shape = s.shape;
    if (['none', 'lift', 'darken', 'glow'].includes(s.hoverEffect)) o.hoverEffect = s.hoverEffect;
    out[path] = o;
  }
  return out;
}

function cleanSection(s: any, where: string, allowed?: string[]) {
  if (!s || typeof s !== 'object') fail(`${where} is not an object`);
  if (!ID_RE.test(String(s.id))) fail(`${where} has an invalid id`);
  if (!SECTION_TYPE_SET.has(s.type)) fail(`${where} has unknown type "${String(s.type).slice(0, 40)}"`);
  if (allowed && !allowed.includes(s.type)) fail(`${where} must be of type ${allowed.join('/')}`);
  return {
    id: String(s.id),
    type: s.type,
    variant: s.variant ? String(s.variant).slice(0, 40).replace(/[^a-z0-9-]/gi, '') : undefined,
    name: s.name ? String(s.name).slice(0, 80) : undefined,
    props: (cleanValue(s.props ?? {}, 'props', 0) as Record<string, unknown>) ?? {},
    style: cleanStyle(s.style),
    elementStyles: cleanElementStyles(s.elementStyles),
  };
}

function color(v: unknown, fallback: string): string {
  return cleanCssValue(v) ?? fallback;
}

export function validateSiteContent(input: unknown): SiteContent {
  if (!input || typeof input !== 'object') fail('content is required');
  let size = 0;
  try {
    size = Buffer.byteLength(JSON.stringify(input), 'utf8');
  } catch {
    fail('content is not serialisable');
  }
  if (size > MAX_CONTENT_BYTES) fail('content is too large (max 3 MB)');

  const c: any = input;
  const theme = c.theme ?? {};
  const colors = theme.colors ?? {};
  const fonts = theme.fonts ?? {};
  const colorKeys = ['primary', 'primaryText', 'secondary', 'accent', 'background', 'surface', 'text', 'heading', 'muted', 'border', 'headerBg', 'headerText', 'topBarBg', 'topBarText', 'footerBg', 'footerText'];
  const cleanColors: Record<string, string> = {};
  for (const k of colorKeys) cleanColors[k] = color(colors[k], '#000000');
  const font = (v: unknown, f: string) => (SAFE_FONT.test(String(v ?? '')) ? String(v) : f);

  if (!Array.isArray(c.pages) || !c.pages.length) fail('at least one page is required');
  if (c.pages.length > MAX_PAGES) fail(`a website can have at most ${MAX_PAGES} pages`);

  const slugs = new Set<string>();
  const pages = c.pages.map((p: any, i: number) => {
    if (!p || typeof p !== 'object') fail(`page ${i + 1} is invalid`);
    const slug = String(p.slug ?? '').toLowerCase();
    if (!SLUG_RE.test(slug) || slug.length > 80) fail(`page "${String(p.title ?? i + 1).slice(0, 40)}" has an invalid URL slug`);
    if (slugs.has(slug)) fail(`duplicate page URL "${slug}"`);
    if (slug === 'product') fail('the URL "product" is reserved');
    slugs.add(slug);
    if (!Array.isArray(p.sections)) fail(`page "${slug}" has no sections array`);
    if (p.sections.length > MAX_SECTIONS_PER_PAGE) fail(`page "${slug}" has too many sections`);
    const seo = p.seo ?? {};
    return {
      id: ID_RE.test(String(p.id)) ? String(p.id) : fail(`page "${slug}" has an invalid id`),
      title: String(p.title ?? slug).slice(0, 120) || slug,
      slug,
      sections: p.sections.map((s: any, j: number) => cleanSection(s, `section ${j + 1} on page "${slug}"`)),
      seo: {
        title: String(seo.title ?? '').slice(0, 160),
        description: String(seo.description ?? '').slice(0, 400),
        ogImage: cleanUrl(seo.ogImage),
        noindex: seo.noindex === true,
        canonicalUrl: cleanUrl(seo.canonicalUrl),
      },
      isHomepage: p.isHomepage === true,
      visibility: p.visibility === 'hidden' ? 'hidden' : 'public',
      showInNav: p.showInNav !== false,
      parentId: p.parentId && ID_RE.test(String(p.parentId)) ? String(p.parentId) : null,
      order: Number.isFinite(Number(p.order)) ? Number(p.order) : i,
    };
  });
  const homes = pages.filter((p: any) => p.isHomepage);
  if (homes.length !== 1) {
    pages.forEach((p: any, i: number) => (p.isHomepage = homes.length ? p === homes[0] : i === 0));
  }

  const cleanNav = (links: any, depth: number): any[] =>
    Array.isArray(links)
      ? links.slice(0, 40).map((l: any) => ({
          id: ID_RE.test(String(l?.id)) ? String(l.id) : `n-${Math.random().toString(36).slice(2, 10)}`,
          label: String(l?.label ?? '').slice(0, 60),
          href: cleanUrl(l?.href) || 'page:home',
          ...(depth < 1 && Array.isArray(l?.children) && l.children.length ? { children: cleanNav(l.children, depth + 1) } : {}),
        }))
      : [];

  const catalog = c.catalog ?? {};
  const settings = (cleanValue(c.settings ?? {}, 'settings', 0) as any) ?? {};

  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    theme: {
      skin: /^[a-z-]{1,30}$/.test(String(theme.skin ?? '')) ? String(theme.skin) : 'modern',
      colors: cleanColors as any,
      fonts: {
        heading: font(fonts.heading, 'Playfair Display'),
        body: font(fonts.body, 'Inter'),
        script: font(fonts.script, 'Great Vibes'),
        nav: font(fonts.nav, font(fonts.body, 'Inter')),
      },
      radius: num(theme.radius, 0, 40) ?? 12,
      buttonShape: ['square', 'rounded', 'pill'].includes(theme.buttonShape) ? theme.buttonShape : 'rounded',
      maxWidth: num(theme.maxWidth, 800, 2400) ?? 1280,
    },
    header: cleanSection(c.header, 'header', ['header']) as any,
    footer: cleanSection(c.footer, 'footer', ['footer']) as any,
    navigation: cleanNav(c.navigation, 0),
    pages: pages as any,
    catalog: {
      products: (cleanValue(Array.isArray(catalog.products) ? catalog.products.slice(0, 2000) : [], 'products', 0) as any[]).map((p: any) => ({
        ...p,
        id: ID_RE.test(String(p?.id)) ? String(p.id) : fail('a product has an invalid id'),
        name: String(p?.name ?? '').slice(0, 200),
        price: Math.max(0, Math.round(Number(p?.price ?? 0) * 100) / 100),
        compareAtPrice: p?.compareAtPrice ? Math.max(0, Number(p.compareAtPrice)) : null,
        inventory: p?.inventory === null || p?.inventory === undefined || p?.inventory === '' ? null : Math.max(0, Math.floor(Number(p.inventory) || 0)),
      })),
      productCategories: Array.isArray(catalog.productCategories) ? catalog.productCategories.slice(0, 200).map((x: any) => String(x).slice(0, 80)) : [],
      services: (cleanValue(Array.isArray(catalog.services) ? catalog.services.slice(0, 500) : [], 'services', 0) as any[]).map((s: any) => ({
        ...s,
        id: ID_RE.test(String(s?.id)) ? String(s.id) : fail('a service has an invalid id'),
        price: Math.max(0, Number(s?.price ?? 0)),
        durationMinutes: Math.min(1440, Math.max(5, Math.floor(Number(s?.durationMinutes ?? 30)))),
      })),
      staff: (cleanValue(Array.isArray(catalog.staff) ? catalog.staff.slice(0, 200) : [], 'staff', 0) as any[]).map((m: any) => ({
        ...m,
        id: ID_RE.test(String(m?.id)) ? String(m.id) : fail('a staff member has an invalid id'),
      })),
      reviews: (cleanValue(Array.isArray(catalog.reviews) ? catalog.reviews.slice(0, 2000) : [], 'reviews', 0) as any[]) ?? [],
    },
    settings,
  };
}

/** Normalises a requested slug and validates it. */
export function normalizeSlug(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export const RESERVED_SLUGS = new Set([
  'www', 'app', 'api', 'admin', 'mail', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'blog', 'help', 'support',
  'status', 'shop', 'studio', 'website-studio', 'login', 'register', 'dashboard', 'fockis', 'billing', 'payments',
  'sites', 'site', 's', 'docs', 'dev', 'staging', 'test', 'mobile', 'm', 'academy', 'travel', 'music', 'live',
]);
