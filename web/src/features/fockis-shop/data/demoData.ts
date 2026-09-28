// Homepage/marketing demo content that doesn't fit product/store/category
// shapes. Kept separate from shopData.ts so the "real" marketplace data
// stays clean and swappable for API data independently of marketing copy.

export interface BannerSlide {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  img: string;
}

export const BANNER_SLIDES: BannerSlide[] = [
  {
    eyebrow: 'SELLER SPOTLIGHT',
    title: 'Meet the makers behind Haiti Home Collection',
    body: 'Handmade textiles and decor, shipped worldwide from Port-au-Prince.',
    cta: 'Shop the collection',
    href: '/shop/store/haiti-home-collection',
    img: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200',
  },
  {
    eyebrow: 'SEASONAL SALE',
    title: 'Up to 30% off tools & hardware',
    body: 'Construction essentials from verified local sellers, delivered or ready for pickup.',
    cta: 'Shop tools & hardware',
    href: '/shop/category/tools-construction',
    img: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200',
  },
  {
    eyebrow: 'NEW ON FOCKIS',
    title: '1,200 new sellers joined this month',
    body: 'Fresh storefronts across fashion, electronics and home — from 40+ countries.',
    cta: 'Discover new stores',
    href: '/shop/stores',
    img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
  },
];

export interface NearbyStore {
  name: string;
  slug: string;
  city: string;
}

export const NEARBY_STORES: NearbyStore[] = [
  { name: 'Anacaona Construction Supply', slug: 'anacaona-construction-supply', city: 'Ouanaminthe, Haiti' },
  { name: 'Haiti Home Collection', slug: 'haiti-home-collection', city: 'Ouanaminthe, Haiti' },
  { name: 'Santo Domingo Hardware', slug: 'santo-domingo-hardware', city: 'Cap-Haïtien, Haiti' },
];

export interface WorldStoreCountry {
  flag: string;
  name: string;
  countryCode: string;
  count: string;
}

export const WORLD_STORES: WorldStoreCountry[] = [
  { flag: '🇭🇹', name: 'Haiti', countryCode: 'HT', count: '640 stores' },
  { flag: '🇩🇴', name: 'Dominican Rep.', countryCode: 'DO', count: '1,120 stores' },
  { flag: '🇲🇽', name: 'Mexico', countryCode: 'MX', count: '2,940 stores' },
  { flag: '🇨🇴', name: 'Colombia', countryCode: 'CO', count: '1,860 stores' },
  { flag: '🇧🇷', name: 'Brazil', countryCode: 'BR', count: '3,410 stores' },
  { flag: '🇺🇸', name: 'United States', countryCode: 'US', count: '6,220 stores' },
  { flag: '🇨🇦', name: 'Canada', countryCode: 'CA', count: '1,540 stores' },
  { flag: '🇫🇷', name: 'France', countryCode: 'FR', count: '980 stores' },
  { flag: '🇯🇵', name: 'Japan', countryCode: 'JP', count: '1,205 stores' },
];

export const FD_EXAMPLES = [
  { store: 'Anacaona Construction Supply', label: 'Spend $150 → Free Delivery' },
  { store: 'Haiti Home Collection', label: 'Spend $200 → Free Intl. Shipping' },
];

export const INTL_ROUTES = [
  { from: '🇭🇹 Haiti', to: '🇺🇸 United States' },
  { from: '🇲🇽 Mexico', to: '🇨🇦 Canada' },
  { from: '🇫🇷 France', to: '🇺🇸 United States' },
];

export const SELL_BENEFITS = [
  '🏪 Your own storefront', '🌎 Global customers', '💳 Online payments', '📦 Order management',
  '🚚 Delivery options', '📊 Analytics', '💬 Customer messaging', '⭐ Reviews',
];

export const SELL_FLOW = ['Create Account', 'Create Business', 'Open Store', 'Add Products', 'Set Prices', 'Configure Delivery', 'Start Selling'];

export const DASH_NAV = ['Sales', 'Orders', 'Products', 'Inventory', 'Customers', 'Shipping', 'Discounts', 'Reviews', 'Messages', 'Payments', 'Analytics', 'Settings'];

export const TRUST_ITEMS = [
  { title: 'Verified businesses', body: 'Every seller is reviewed before they can open a store.' },
  { title: 'Secure checkout', body: 'Encrypted payments on every order.' },
  { title: 'Product & store reviews', body: 'Only verified buyers can leave a review.' },
  { title: 'Order tracking', body: 'Follow your order from purchase to delivery.' },
  { title: 'Clear delivery information', body: 'Know shipping options before you check out.' },
  { title: 'Customer support', body: 'Help available before and after your purchase.' },
];

export const BUNDLE_DEMO = {
  productSlugs: ['dewalt-cordless-drill', 'heavy-duty-work-gloves'],
  savings: 8,
};
