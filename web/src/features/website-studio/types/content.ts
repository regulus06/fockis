/**
 * ============================================================================
 * FOCKIS WEBSITE STUDIO — UNIVERSAL CONTENT MODEL
 * ============================================================================
 *
 * Every template, every customer website, and every AI-generated website is
 * stored with this single structured JSON model. The same model is rendered by
 * the visual editor and by the public website renderer.
 *
 * IMPORTANT: this file is mirrored 1:1 in
 *   web/src/features/website-studio/types/content.ts
 * Keep both copies identical when changing the model.
 * ============================================================================
 */

export const CONTENT_SCHEMA_VERSION = 1;

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export const SECTION_TYPES = [
  'header',
  'footer',
  'hero',
  'features-strip',
  'category-cards',
  'category-tiles',
  'product-grid',
  'product-catalog',
  'promo-banner',
  'text-block',
  'image-text',
  'image',
  'button-row',
  'gallery',
  'video',
  'testimonials',
  'team',
  'services-list',
  'pricing-table',
  'contact-form',
  'map',
  'faq',
  'newsletter',
  'booking-form',
  'reservation-form',
  'custom-cake-form',
  'events',
  'stats',
  'social-links',
  'countdown',
  'blog-posts',
  'hours',
  'cart',
  'account',
  'spacer',
  'custom-html',
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export interface StyleBox {
  background?: string;
  backgroundImage?: string;
  overlay?: string;
  textColor?: string;
  paddingTop?: number;
  paddingBottom?: number;
  marginTop?: number;
  marginBottom?: number;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
  minHeight?: number;
  columns?: number;
  fontScale?: number;
}

export interface SectionStyle extends StyleBox {
  hidden?: boolean;
  hideOn?: Partial<Record<Breakpoint, boolean>>;
  animation?: 'none' | 'fade-up' | 'fade-in' | 'zoom';
  fullWidth?: boolean;
  /** Per-breakpoint overrides. Desktop values are the base values above. */
  responsive?: {
    tablet?: StyleBox;
    mobile?: StyleBox;
  };
}

/** Style overrides for a single element (text, image, button) inside a section. */
export interface ElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  background?: string;
  borderRadius?: number;
  borderColor?: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain';
  objectPosition?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'square' | 'rounded' | 'pill';
  hoverEffect?: 'none' | 'lift' | 'darken' | 'glow';
}

export interface Section {
  id: string;
  type: SectionType;
  variant?: string;
  name?: string;
  props: Record<string, any>;
  style: SectionStyle;
  /** keyed by the element path inside props, e.g. "title" or "items.2.label" */
  elementStyles?: Record<string, ElementStyle>;
}

export interface PageSeo {
  title?: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
  canonicalUrl?: string;
}

export interface SitePage {
  id: string;
  title: string;
  slug: string;
  sections: Section[];
  seo: PageSeo;
  isHomepage: boolean;
  visibility: 'public' | 'hidden';
  showInNav: boolean;
  parentId: string | null;
  order: number;
}

export interface NavLink {
  id: string;
  label: string;
  /** "page:<slug>" for internal pages, or an absolute https:// URL, or "#anchor" */
  href: string;
  children?: NavLink[];
}

export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  image: string;
  images?: string[];
  category: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  /** null/undefined = unlimited */
  inventory?: number | null;
  variants?: { name: string; options: string[] }[];
  tags?: string[];
  featured?: boolean;
  active?: boolean;
}

export interface CatalogService {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  image: string;
  category: string;
  icon?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  serviceIds?: string[];
}

export interface SiteCatalog {
  products: CatalogProduct[];
  productCategories: string[];
  services: CatalogService[];
  staff: StaffMember[];
  reviews: { id: string; productId?: string; name: string; rating: number; text: string }[];
}

export interface CakeOptions {
  sizes: { label: string; price: number }[];
  flavors: string[];
  fillings: string[];
  frostings: string[];
  decorationFee: number;
  leadTimeDays: number;
}

export interface SiteFeatures {
  cart: boolean;
  booking: boolean;
  reservations: boolean;
  customCakes: boolean;
  delivery: boolean;
  pickup: boolean;
  shipping: boolean;
  wishlist: boolean;
  accounts: boolean;
}

export interface SiteSettings {
  businessName: string;
  tagline: string;
  logoUrl: string;
  logoIcon: string;
  faviconUrl: string;
  phone: string;
  email: string;
  address: string;
  hours: { label: string; value: string }[];
  social: Partial<Record<'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin', string>>;
  currency: string;
  country: string;
  features: SiteFeatures;
  booking: {
    openTime: string;
    closeTime: string;
    daysOpen: number[];
    slotMinutes: number;
    maxPartySize: number;
  };
  shipping: {
    flatRate: number;
    freeOver: number;
    deliveryFee: number;
    taxRate: number;
  };
  cakeOptions: CakeOptions;
  seo: {
    siteTitle: string;
    description: string;
    ogImage: string;
    allowIndexing: boolean;
  };
}

export interface SiteTheme {
  /** Visual skin used for fine design details (e.g. "bakery", "restaurant", "modern"). */
  skin: string;
  colors: {
    primary: string;
    primaryText: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    heading: string;
    muted: string;
    border: string;
    headerBg: string;
    headerText: string;
    topBarBg: string;
    topBarText: string;
    footerBg: string;
    footerText: string;
  };
  fonts: {
    heading: string;
    body: string;
    script: string;
    nav: string;
  };
  radius: number;
  buttonShape: 'square' | 'rounded' | 'pill';
  maxWidth: number;
}

export interface SiteContent {
  schemaVersion: number;
  theme: SiteTheme;
  header: Section;
  footer: Section;
  navigation: NavLink[];
  pages: SitePage[];
  catalog: SiteCatalog;
  settings: SiteSettings;
}
