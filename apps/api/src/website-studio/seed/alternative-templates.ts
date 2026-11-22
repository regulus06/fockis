/**
 * Alternative designs for each category. Each alternative is a full, editable
 * template derived from an official template's page structure with its own
 * color palette, typography and layout variants (hero / cards / header style).
 * Administrators can add unlimited further templates from the admin center.
 */
import { Section, SiteContent, SiteTheme } from '../content/content.types';
import {
  fockisBarbershop,
  fockisBeautyStudio,
  fockisRestaurant,
  fockisRetailStore,
  sweetCrumbsBakery,
} from './official-templates';
import { TemplateDefinition, cloneContent } from './template-builder';

interface AltSpec {
  slug: string;
  name: string;
  description: string;
  colors: Partial<SiteTheme['colors']>;
  fonts: Partial<SiteTheme['fonts']>;
  buttonShape?: SiteTheme['buttonShape'];
  radius?: number;
  heroVariant?: string;
  cardVariant?: string;
  dark?: boolean;
  premium?: boolean;
}

function luminance(color: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function restyleSections(c: SiteContent, spec: AltSpec) {
  const dark = !!spec.dark;
  const visit = (s: Section) => {
    if (s.type === 'hero' && spec.heroVariant) {
      s.variant = spec.heroVariant;
      if (spec.heroVariant === 'split' || spec.heroVariant === 'centered') {
        s.style.background = spec.heroVariant === 'centered' ? spec.colors.secondary ?? c.theme.colors.secondary : c.theme.colors.surface;
        s.style.textColor = spec.heroVariant === 'centered' ? '#FFFFFF' : c.theme.colors.heading;
        s.style.minHeight = 520;
      } else if (spec.heroVariant === 'overlay') {
        s.style.background = c.theme.colors.secondary;
        s.style.textColor = '#FFFFFF';
      }
    }
    if (s.type === 'category-cards' && spec.cardVariant) s.variant = spec.cardVariant;
    // Strip hard-coded backgrounds so the new palette applies everywhere.
    if (s.type !== 'hero' && s.type !== 'promo-banner') {
      if (s.style.background) {
        const l = luminance(s.style.background);
        if (dark) {
          s.style.background = l < 0.2 ? c.theme.colors.background : c.theme.colors.surface;
          delete s.style.textColor;
        } else if (l > 0.93) {
          s.style.background = c.theme.colors.background;
          delete s.style.textColor;
        } else if (l < 0.2) {
          s.style.background = c.theme.colors.secondary;
          s.style.textColor = '#FFFFFF';
        } else {
          s.style.background = c.theme.colors.surface;
          delete s.style.textColor;
        }
      } else if (s.style.textColor) {
        delete s.style.textColor;
      }
    }
    if (s.type === 'promo-banner') {
      s.style.background = c.theme.colors.secondary;
      s.style.textColor = '#FFFFFF';
    }
  };
  c.pages.forEach((p) => p.sections.forEach(visit));
  if (c.header.variant && spec.slug) c.header.variant = c.header.props.layout === 'retail' ? 'retail' : 'simple-alt';
  c.footer.variant = 'simple-alt';
  // Header logo styling follows the alternative design.
  c.header.props.logoStyle = c.header.props.layout === 'retail' ? 'retail' : 'simple';
}

function derive(base: () => TemplateDefinition, categorySlugs: string[], spec: AltSpec): TemplateDefinition {
  const t = base();
  const c = cloneContent(t.content);
  c.theme = {
    ...c.theme,
    skin: 'modern',
    colors: { ...c.theme.colors, ...spec.colors },
    fonts: { ...c.theme.fonts, ...spec.fonts },
    buttonShape: spec.buttonShape ?? c.theme.buttonShape,
    radius: spec.radius ?? c.theme.radius,
  };
  restyleSections(c, spec);
  c.settings.seo.ogImage = '';
  return {
    slug: spec.slug,
    name: spec.name,
    description: spec.description,
    categorySlugs,
    isDefaultFor: [],
    isFeatured: false,
    accessLevel: spec.premium ? 'premium' : 'free',
    thumbnail: '',
    previewImages: [],
    tags: ['alternative', ...categorySlugs],
    content: c,
  };
}

const light = (primary: string, secondary: string, accent: string, surface: string, heading: string, text = '#2B2B2B') => ({
  primary, primaryText: '#FFFFFF', secondary, accent, background: '#FFFFFF', surface, text, heading, muted: '#6B6B6B', border: '#E8E4E0',
  headerBg: '#FFFFFF', headerText: heading, topBarBg: secondary, topBarText: '#FFFFFF', footerBg: secondary, footerText: '#EEEEEE',
});
const darkPalette = (primary: string, accent: string, bg = '#0E0E0E', surface = '#181818') => ({
  primary, primaryText: '#111111', secondary: '#000000', accent, background: bg, surface, text: '#EDEDED', heading: '#FFFFFF', muted: '#A8A8A8', border: '#2A2A2A',
  headerBg: bg, headerText: '#FFFFFF', topBarBg: '#000000', topBarText: '#FFFFFF', footerBg: '#000000', footerText: '#D0D0D0',
});

export function alternativeTemplates(): TemplateDefinition[] {
  const bakery = ['bakery', 'cafe', 'coffee-shop'];
  const restaurant = ['restaurant', 'cafe', 'catering', 'food-truck'];
  const retail = ['general-retail', 'fashion', 'clothing', 'electronics', 'furniture', 'jewelry', 'beauty-products', 'gift-shops'];
  const beauty = ['beauty-studio', 'hair-salon', 'nail-salon', 'spa', 'makeup-artist', 'skincare', 'wellness'];
  const barber = ['barbershop'];

  return [
    // BAKERY
    derive(sweetCrumbsBakery, bakery, { slug: 'minimal-bakery', name: 'Minimal Bakery', description: 'Clean white bakery design with black typography.', colors: light('#111111', '#111111', '#C8A27A', '#F6F4F1', '#111111'), fonts: { heading: 'DM Serif Display', body: 'DM Sans', nav: 'DM Sans' }, buttonShape: 'square', radius: 2, heroVariant: 'split', cardVariant: 'overlay' }),
    derive(sweetCrumbsBakery, bakery, { slug: 'luxury-bakery', name: 'Luxury Bakery', description: 'Black and gold patisserie elegance.', colors: darkPalette('#C9A45C', '#C9A45C'), fonts: { heading: 'Cormorant Garamond', body: 'Montserrat', nav: 'Montserrat' }, buttonShape: 'square', radius: 0, heroVariant: 'overlay', cardVariant: 'overlay', dark: true, premium: true }),
    derive(sweetCrumbsBakery, bakery, { slug: 'french-patisserie', name: 'French Patisserie', description: 'Pastel blue and blush Parisian style.', colors: light('#5C7FA8', '#2E4A6B', '#F2B8C6', '#EEF4FA', '#2E4A6B'), fonts: { heading: 'Cormorant Garamond', body: 'Lato', script: 'Great Vibes', nav: 'Lato' }, buttonShape: 'pill', heroVariant: 'centered', cardVariant: 'circle' }),
    derive(sweetCrumbsBakery, bakery, { slug: 'rustic-bakery', name: 'Rustic Bakery', description: 'Kraft-paper browns with farmhouse warmth.', colors: light('#7A5230', '#3E2A18', '#8A9A5B', '#F3ECE2', '#3E2A18'), fonts: { heading: 'Lora', body: 'Karla', nav: 'Karla' }, buttonShape: 'rounded', heroVariant: 'split', cardVariant: 'caption-bar' }),
    derive(sweetCrumbsBakery, bakery, { slug: 'modern-bakery', name: 'Modern Bakery', description: 'Bold terracotta with modern sans typography.', colors: light('#D2583A', '#2D1E2F', '#F2C14E', '#FFF4EE', '#2D1E2F'), fonts: { heading: 'Outfit', body: 'Outfit', nav: 'Outfit' }, buttonShape: 'pill', heroVariant: 'split', cardVariant: 'overlay' }),
    derive(sweetCrumbsBakery, bakery, { slug: 'cupcake-shop', name: 'Cupcake Shop', description: 'Playful pink cupcake boutique.', colors: light('#E2557F', '#7A2849', '#6CC4C1', '#FFF0F5', '#7A2849'), fonts: { heading: 'Fredoka', body: 'Nunito', script: 'Pacifico', nav: 'Nunito' }, buttonShape: 'pill', heroVariant: 'bakery', cardVariant: 'circle' }),
    // RESTAURANT
    derive(fockisRestaurant, restaurant, { slug: 'fine-dining', name: 'Fine Dining', description: 'Champagne and black luxury dining.', colors: darkPalette('#C8A96A', '#C8A96A', '#0B0B0B', '#141414'), fonts: { heading: 'Cormorant Garamond', body: 'Montserrat', script: 'Great Vibes', nav: 'Montserrat' }, buttonShape: 'square', radius: 0, heroVariant: 'centered', cardVariant: 'overlay', dark: true, premium: true }),
    derive(fockisRestaurant, restaurant, { slug: 'modern-restaurant', name: 'Modern Restaurant', description: 'Fresh olive and cream modern bistro.', colors: light('#4F6B3A', '#1F2A18', '#E0A458', '#F5F3EC', '#1F2A18'), fonts: { heading: 'DM Serif Display', body: 'DM Sans', nav: 'DM Sans' }, buttonShape: 'rounded', heroVariant: 'split', cardVariant: 'overlay' }),
    derive(fockisRestaurant, restaurant, { slug: 'fast-food', name: 'Fast Food', description: 'Bold red and yellow quick-service design.', colors: light('#E4002B', '#1A1A1A', '#FFC300', '#FFF8E1', '#1A1A1A'), fonts: { heading: 'Anton', body: 'Roboto', script: 'Anton', nav: 'Roboto' }, buttonShape: 'pill', heroVariant: 'split', cardVariant: 'caption-bar' }),
    derive(fockisRestaurant, restaurant, { slug: 'italian-restaurant', name: 'Italian Restaurant', description: 'Trattoria green, red and cream.', colors: light('#1F7A3E', '#8C1C13', '#C8102E', '#FBF6EC', '#2B1B12'), fonts: { heading: 'Playfair Display', body: 'Lato', script: 'Great Vibes', nav: 'Lato' }, buttonShape: 'rounded', heroVariant: 'overlay', cardVariant: 'caption-below' }),
    derive(fockisRestaurant, restaurant, { slug: 'asian-restaurant', name: 'Asian Restaurant', description: 'Lacquer red and black with refined serif.', colors: darkPalette('#C8102E', '#D4AF37', '#111111', '#1B1B1B'), fonts: { heading: 'Noto Serif', body: 'Noto Sans', nav: 'Noto Sans' }, buttonShape: 'square', radius: 4, heroVariant: 'overlay', cardVariant: 'overlay', dark: true }),
    derive(fockisRestaurant, restaurant, { slug: 'cafe', name: 'Cafe', description: 'Cozy coffee browns and cream.', colors: light('#6F4E37', '#3B2A20', '#D8A47F', '#F7F1EA', '#3B2A20'), fonts: { heading: 'Lora', body: 'Work Sans', nav: 'Work Sans' }, buttonShape: 'pill', heroVariant: 'split', cardVariant: 'circle' }),
    derive(fockisRestaurant, restaurant, { slug: 'seafood-restaurant', name: 'Seafood Restaurant', description: 'Coastal navy and teal.', colors: light('#0E7490', '#0B2545', '#F4A261', '#ECF8FB', '#0B2545'), fonts: { heading: 'Playfair Display', body: 'Source Sans 3', nav: 'Source Sans 3' }, buttonShape: 'rounded', heroVariant: 'centered', cardVariant: 'caption-bar' }),
    // RETAIL
    derive(fockisRetailStore, retail, { slug: 'minimal-retail', name: 'Minimal Retail', description: 'Monochrome minimalist storefront.', colors: light('#111111', '#111111', '#E11D48', '#F5F5F5', '#111111'), fonts: { heading: 'Inter', body: 'Inter', nav: 'Inter' }, buttonShape: 'square', radius: 0, heroVariant: 'split' }),
    derive(fockisRetailStore, retail, { slug: 'luxury-retail', name: 'Luxury Retail', description: 'Black and gold premium boutique.', colors: darkPalette('#C9A45C', '#C9A45C'), fonts: { heading: 'Cormorant Garamond', body: 'Montserrat', nav: 'Montserrat' }, buttonShape: 'square', radius: 0, heroVariant: 'centered', dark: true, premium: true }),
    derive(fockisRetailStore, retail, { slug: 'fashion-store', name: 'Fashion Store', description: 'Blush and black editorial fashion.', colors: light('#111111', '#2B2B2B', '#E8B4B8', '#FBF1F1', '#111111'), fonts: { heading: 'Bodoni Moda', body: 'Jost', nav: 'Jost' }, buttonShape: 'square', radius: 0, heroVariant: 'split' }),
    derive(fockisRetailStore, retail, { slug: 'electronics-store', name: 'Electronics Store', description: 'Dark slate and electric cyan.', colors: darkPalette('#22D3EE', '#22D3EE', '#0F172A', '#1E293B'), fonts: { heading: 'Space Grotesk', body: 'Inter', nav: 'Inter' }, buttonShape: 'rounded', heroVariant: 'retail', dark: true }),
    derive(fockisRetailStore, retail, { slug: 'furniture-store', name: 'Furniture Store', description: 'Sage and oak home living store.', colors: light('#5E7C64', '#2F3E34', '#C08A5B', '#F2F4EF', '#2F3E34'), fonts: { heading: 'Fraunces', body: 'Manrope', nav: 'Manrope' }, buttonShape: 'pill', heroVariant: 'split' }),
    derive(fockisRetailStore, retail, { slug: 'general-ecommerce', name: 'General Ecommerce', description: 'Energetic orange and indigo marketplace.', colors: light('#F97316', '#312E81', '#4F46E5', '#FFF7ED', '#1E1B4B'), fonts: { heading: 'Poppins', body: 'Poppins', nav: 'Poppins' }, buttonShape: 'rounded', heroVariant: 'retail' }),
    // BEAUTY
    derive(fockisBeautyStudio, beauty, { slug: 'luxury-salon', name: 'Luxury Salon', description: 'Black and rose-gold luxury salon.', colors: darkPalette('#D9A88F', '#D9A88F'), fonts: { heading: 'Cormorant Garamond', body: 'Montserrat', script: 'Great Vibes', nav: 'Montserrat' }, buttonShape: 'square', radius: 0, heroVariant: 'overlay', cardVariant: 'overlay', dark: true, premium: true }),
    derive(fockisBeautyStudio, beauty, { slug: 'modern-hair-studio', name: 'Modern Hair Studio', description: 'Teal and coral contemporary studio.', colors: light('#0F766E', '#134E4A', '#FB7185', '#F0FDFA', '#134E4A'), fonts: { heading: 'Outfit', body: 'Outfit', nav: 'Outfit' }, buttonShape: 'pill', heroVariant: 'split', cardVariant: 'overlay' }),
    derive(fockisBeautyStudio, beauty, { slug: 'minimal-beauty', name: 'Minimal Beauty', description: 'Soft nude minimal beauty brand.', colors: light('#B08968', '#5C4033', '#DDB892', '#F8F3EE', '#3E2C23'), fonts: { heading: 'DM Serif Display', body: 'DM Sans', nav: 'DM Sans' }, buttonShape: 'square', radius: 2, heroVariant: 'split', cardVariant: 'caption-below' }),
    derive(fockisBeautyStudio, beauty, { slug: 'spa-and-wellness', name: 'Spa and Wellness', description: 'Calming sage green spa.', colors: light('#6B8F71', '#2F4A35', '#D9C5A0', '#F1F6F1', '#2F4A35'), fonts: { heading: 'Cormorant Garamond', body: 'Lato', script: 'Great Vibes', nav: 'Lato' }, buttonShape: 'pill', heroVariant: 'centered', cardVariant: 'circle' }),
    derive(fockisBeautyStudio, beauty, { slug: 'makeup-studio', name: 'Makeup Studio', description: 'Hot pink and black glam studio.', colors: light('#DB2777', '#111111', '#F9A8D4', '#FDF2F8', '#111111'), fonts: { heading: 'Bodoni Moda', body: 'Jost', script: 'Pacifico', nav: 'Jost' }, buttonShape: 'pill', heroVariant: 'overlay', cardVariant: 'overlay' }),
    derive(fockisBeautyStudio, beauty, { slug: 'nail-salon', name: 'Nail Salon', description: 'Lilac and blush nail bar.', colors: light('#9B5DE5', '#4A1D6E', '#F15BB5', '#F7F0FF', '#4A1D6E'), fonts: { heading: 'Fredoka', body: 'Nunito', script: 'Pacifico', nav: 'Nunito' }, buttonShape: 'pill', heroVariant: 'split', cardVariant: 'circle' }),
    // BARBER
    derive(fockisBarbershop, barber, { slug: 'classic-barbershop', name: 'Classic Barbershop', description: 'Navy, red and cream traditional shop.', colors: { ...light('#B91C1C', '#1E3A5F', '#B91C1C', '#F5EFE6', '#1E3A5F'), primaryText: '#FFFFFF', headerBg: '#1E3A5F', headerText: '#FFFFFF', topBarBg: '#B91C1C' }, fonts: { heading: 'Playfair Display', body: 'Lato', nav: 'Lato' }, buttonShape: 'square', radius: 2, heroVariant: 'split', cardVariant: 'caption-below' }),
    derive(fockisBarbershop, barber, { slug: 'luxury-barbershop', name: 'Luxury Barbershop', description: 'Champagne and black gentleman’s club.', colors: darkPalette('#CBB27C', '#CBB27C', '#0A0A0A', '#161616'), fonts: { heading: 'Cormorant Garamond', body: 'Montserrat', nav: 'Montserrat' }, buttonShape: 'square', radius: 0, heroVariant: 'centered', cardVariant: 'overlay', dark: true, premium: true }),
    derive(fockisBarbershop, barber, { slug: 'modern-barber-studio', name: 'Modern Barber Studio', description: 'Crisp white and black modern studio.', colors: { ...light('#111111', '#111111', '#2563EB', '#F4F4F5', '#111111'), primaryText: '#FFFFFF' }, fonts: { heading: 'Outfit', body: 'Inter', nav: 'Inter' }, buttonShape: 'rounded', heroVariant: 'split', cardVariant: 'overlay' }),
    derive(fockisBarbershop, barber, { slug: 'vintage-barbershop', name: 'Vintage Barbershop', description: 'Leather brown and cream vintage parlor.', colors: { ...light('#8B5A2B', '#3B2416', '#C19A6B', '#F4EBDD', '#3B2416'), primaryText: '#FFFFFF' }, fonts: { heading: 'Rye', body: 'Lora', nav: 'Lora' }, buttonShape: 'square', radius: 4, heroVariant: 'centered', cardVariant: 'caption-below' }),
    derive(fockisBarbershop, barber, { slug: 'urban-barber-shop', name: 'Urban Barber Shop', description: 'Charcoal and neon-yellow street style.', colors: darkPalette('#FACC15', '#FACC15', '#18181B', '#27272A'), fonts: { heading: 'Bebas Neue', body: 'Inter', script: 'Permanent Marker', nav: 'Inter' }, buttonShape: 'square', radius: 0, heroVariant: 'overlay', cardVariant: 'caption-bar', dark: true }),
  ];
}
