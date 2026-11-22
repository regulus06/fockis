/**
 * Helpers used to author official templates as structured content.
 * Everything produced here is plain JSON (SiteContent) that is stored in
 * MongoDB, copied into customer websites and rendered by the universal
 * renderer. No template is ever a screenshot.
 */
import {
  CONTENT_SCHEMA_VERSION,
  CatalogProduct,
  CatalogService,
  NavLink,
  Section,
  SectionStyle,
  SectionType,
  SiteContent,
  SitePage,
  SiteSettings,
  SiteTheme,
  StaffMember,
} from '../content/content.types';

export class IdFactory {
  private counter = 0;
  constructor(private readonly prefix: string) {}
  next(kind: string): string {
    this.counter += 1;
    return `${this.prefix}-${kind}-${this.counter.toString(36)}`;
  }
}

export function section(
  ids: IdFactory,
  type: SectionType,
  props: Record<string, any>,
  style: SectionStyle = {},
  variant?: string,
  name?: string,
): Section {
  return {
    id: ids.next('s'),
    type,
    variant,
    name,
    props,
    style,
    elementStyles: {},
  };
}

export function page(
  ids: IdFactory,
  input: {
    title: string;
    slug: string;
    sections: Section[];
    isHomepage?: boolean;
    showInNav?: boolean;
    visibility?: 'public' | 'hidden';
    seoDescription?: string;
  },
  order: number,
): SitePage {
  return {
    id: ids.next('p'),
    title: input.title,
    slug: input.slug,
    sections: input.sections,
    seo: {
      title: input.title,
      description: input.seoDescription ?? '',
      noindex: false,
    },
    isHomepage: input.isHomepage ?? false,
    visibility: input.visibility ?? 'public',
    showInNav: input.showInNav ?? true,
    parentId: null,
    order,
  };
}

export function nav(ids: IdFactory, links: [string, string][]): NavLink[] {
  return links.map(([label, href]) => ({ id: ids.next('n'), label, href }));
}

export function defaultSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  const base: SiteSettings = {
    businessName: 'My Business',
    tagline: '',
    logoUrl: '',
    logoIcon: 'Store',
    faviconUrl: '',
    phone: '(614) 555-0100',
    email: 'hello@example.com',
    address: '123 Main St, Columbus, OH 43215',
    hours: [
      { label: 'Mon – Sat', value: '9:00 AM – 7:00 PM' },
      { label: 'Sunday', value: '11:00 AM – 5:00 PM' },
    ],
    social: { facebook: '#', instagram: '#', tiktok: '#', youtube: '#' },
    currency: 'USD',
    country: 'US',
    features: {
      cart: false,
      booking: false,
      reservations: false,
      customCakes: false,
      delivery: false,
      pickup: true,
      shipping: false,
      wishlist: false,
      accounts: true,
    },
    booking: {
      openTime: '09:00',
      closeTime: '19:00',
      daysOpen: [1, 2, 3, 4, 5, 6],
      slotMinutes: 30,
      maxPartySize: 12,
    },
    shipping: { flatRate: 7.99, freeOver: 50, deliveryFee: 4.99, taxRate: 0 },
    cakeOptions: {
      sizes: [],
      flavors: [],
      fillings: [],
      frostings: [],
      decorationFee: 0,
      leadTimeDays: 2,
    },
    seo: { siteTitle: '', description: '', ogImage: '', allowIndexing: true },
  };
  return {
    ...base,
    ...overrides,
    features: { ...base.features, ...(overrides.features ?? {}) },
    booking: { ...base.booking, ...(overrides.booking ?? {}) },
    shipping: { ...base.shipping, ...(overrides.shipping ?? {}) },
    cakeOptions: { ...base.cakeOptions, ...(overrides.cakeOptions ?? {}) },
    seo: { ...base.seo, ...(overrides.seo ?? {}) },
  };
}

export function product(
  id: string,
  name: string,
  price: number,
  category: string,
  image: string,
  extra: Partial<CatalogProduct> = {},
): CatalogProduct {
  return {
    id,
    name,
    description: extra.description ?? `${name} — made with care.`,
    price,
    compareAtPrice: null,
    image,
    category,
    rating: 4.8,
    reviewCount: 0,
    inventory: null,
    tags: [],
    featured: false,
    active: true,
    ...extra,
  };
}

export function service(
  id: string,
  name: string,
  price: number,
  durationMinutes: number,
  category: string,
  image: string,
  description: string,
  icon?: string,
): CatalogService {
  return { id, name, price, durationMinutes, category, image, description, icon };
}

export function staff(
  id: string,
  name: string,
  role: string,
  bio: string,
  serviceIds: string[] = [],
  image = '',
): StaffMember {
  return { id, name, role, bio, image, serviceIds };
}

export interface TemplateDefinition {
  slug: string;
  name: string;
  description: string;
  categorySlugs: string[];
  isDefaultFor: string[];
  isFeatured: boolean;
  accessLevel: 'free' | 'premium';
  thumbnail: string;
  previewImages: string[];
  tags: string[];
  content: SiteContent;
}

export function content(input: {
  theme: SiteTheme;
  header: Section;
  footer: Section;
  navigation: NavLink[];
  pages: SitePage[];
  settings: SiteSettings;
  products?: CatalogProduct[];
  productCategories?: string[];
  services?: CatalogService[];
  staffMembers?: StaffMember[];
  reviews?: SiteContent['catalog']['reviews'];
}): SiteContent {
  return {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    theme: input.theme,
    header: input.header,
    footer: input.footer,
    navigation: input.navigation,
    pages: input.pages,
    settings: input.settings,
    catalog: {
      products: input.products ?? [],
      productCategories: input.productCategories ?? [],
      services: input.services ?? [],
      staff: input.staffMembers ?? [],
      reviews: input.reviews ?? [],
    },
  };
}

/** Deep clone that is safe for plain JSON content. */
export function cloneContent<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
