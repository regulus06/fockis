import type { Template, TemplateCategory } from '../types/createTypes';

// Each template drives a CSS-only preview mockup (no external images),
// mirroring the original static markup. `preview.type` selects which
// mockup renderer to use inside <TemplatePreview />.

const templates: Template[] = [
  {
    cat: 'business',
    category: 'Business',
    title: 'Luxury Business',
    preview: { type: 'business-mock', initials: 'LB' },
  },
  {
    cat: 'business',
    category: 'Business',
    title: 'Modern Brand',
    preview: { type: 'brand-shapes' },
  },
  {
    cat: 'marketing',
    category: 'Marketing',
    title: 'Grand Opening',
    preview: { type: 'flyer', big: ['GRAND', 'OPENING'], small: 'JOIN US THIS WEEKEND' },
  },
  {
    cat: 'events',
    category: 'Events',
    title: 'Elegant Event',
    preview: { type: 'invite', line: "You're Invited", sub: 'SAVE THE DATE' },
  },
  {
    cat: 'restaurants',
    category: 'Restaurants',
    title: 'Fresh Menu',
    preview: {
      type: 'menu',
      rows: [
        { name: 'Herb Roasted Chicken', price: '$18' },
        { name: 'Wild Mushroom Risotto', price: '$21' },
        { name: 'Seasonal Greens', price: '$9' },
      ],
    },
  },
  {
    cat: 'business',
    category: 'Business',
    title: 'Professional Card',
    preview: {
      type: 'card',
      name: 'Alex Morgan',
      role: 'CREATIVE DIRECTOR',
      contact: 'alex@company.com · (555) 012-0199',
    },
  },
  {
    cat: 'marketing',
    category: 'Marketing',
    title: 'Bold Sale',
    preview: {
      type: 'photo',
      p1: '#B9862F',
      p2: '#7A5419',
      eyebrow: 'LIMITED TIME',
      headline: ['30% Off', 'Everything'],
      sub: 'This weekend only',
    },
  },
  {
    cat: 'events',
    category: 'Events',
    title: 'Festival Poster',
    preview: {
      type: 'photo',
      p1: '#2B5D8C',
      p2: '#0D2740',
      eyebrow: 'LIVE MUSIC · FOOD · ART',
      headline: ['Summer', 'Festival'],
      sub: 'June 14 · Riverside Park',
    },
  },
  {
    cat: 'social',
    category: 'Social Media',
    title: 'Quote Card',
    preview: { type: 'social-quote', quote: ['Great work speaks', 'for itself.'] },
  },
  {
    cat: 'social',
    category: 'Social Media',
    title: 'Product Launch',
    preview: {
      type: 'social-photo',
      p1: '#C79A3E',
      p2: '#8A6423',
      eyebrow: 'NEW ARRIVAL',
      headline: ['Shop the', 'Collection'],
    },
  },
  {
    cat: 'restaurants',
    category: 'Restaurants',
    title: 'Cafe Signage',
    preview: {
      type: 'photo',
      p1: '#8C4A2B',
      p2: '#4A2814',
      eyebrow: 'EST. 1998',
      headline: ['The Corner', 'Cafe'],
      sub: 'Breakfast · Lunch · Coffee',
    },
  },
  {
    cat: 'realestate',
    category: 'Real Estate',
    title: 'Open House',
    preview: {
      type: 'photo',
      p1: '#6B7B6E',
      p2: '#3A4A3C',
      eyebrow: 'OPEN HOUSE · SAT 12–3',
      headline: ['4 Bed · 3 Bath'],
      sub: '142 Maple Ridge Lane',
    },
  },
  {
    cat: 'realestate',
    category: 'Real Estate',
    title: 'Listing Sheet',
    preview: {
      type: 'list',
      rows: [
        { p1: '#6B7B6E', p2: '#3A4A3C' },
        { p1: '#8C4A2B', p2: '#4A2814' },
        { p1: '#2B5D8C', p2: '#0D2740' },
      ],
    },
  },
  {
    cat: 'beauty',
    category: 'Beauty',
    title: 'Spa Promo',
    preview: {
      type: 'photo',
      p1: '#B98A8C',
      p2: '#6E3B44',
      eyebrow: 'THIS MONTH',
      headline: ['Spa Day', 'Special'],
      sub: 'Facials · Massage · Glow',
    },
  },
  {
    cat: 'beauty',
    category: 'Beauty',
    title: 'Gift Card',
    preview: {
      type: 'card',
      dark: true,
      bg: 'linear-gradient(155deg, #B98A8C, #6E3B44)',
      name: 'Gift Card',
      role: 'BLOOM SALON & SPA',
      contact: 'Redeemable in-store or online',
    },
  },
  {
    cat: 'education',
    category: 'Education',
    title: 'Certificate of Completion',
    preview: { type: 'business-mock', initials: 'CERT', small: true },
  },
  {
    cat: 'education',
    category: 'Education',
    title: 'Campus Event',
    preview: {
      type: 'photo',
      p1: '#2B5D8C',
      p2: '#0D2740',
      eyebrow: 'FALL SEMESTER',
      headline: ['Campus', 'Open Day'],
      sub: 'Tours · Info Sessions · Q&A',
    },
  },
  {
    cat: 'sports',
    category: 'Sports',
    title: 'Team Roster',
    preview: {
      type: 'list',
      rows: [
        { p1: '#3B5B3E', p2: '#1E3320', num: '1' },
        { p1: '#3B5B3E', p2: '#1E3320', num: '9' },
        { p1: '#3B5B3E', p2: '#1E3320', num: '14' },
      ],
    },
  },
  {
    cat: 'sports',
    category: 'Sports',
    title: 'Tournament Bracket',
    preview: {
      type: 'bracket',
      rows: [
        { left: 'win', label: 'VS' },
        { right: 'win', label: 'VS' },
        { left: 'win', label: 'FINAL' },
      ],
    },
  },
  {
    cat: 'technology',
    category: 'Technology',
    title: 'App Launch',
    preview: { type: 'app', p1: '#2B5D8C', p2: '#0D2740' },
  },
  {
    cat: 'technology',
    category: 'Technology',
    title: 'Conference Badge',
    preview: { type: 'badge', bg: 'linear-gradient(155deg, #2B5D8C, #0D2740)', num: 'DEV', cap: 'CONFERENCE' },
  },
];

export const categories: TemplateCategory[] = [
  { key: 'all', label: 'All' },
  { key: 'business', label: 'Business' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'events', label: 'Events' },
  { key: 'social', label: 'Social Media' },
  { key: 'restaurants', label: 'Restaurants' },
  { key: 'realestate', label: 'Real Estate' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'education', label: 'Education' },
  { key: 'sports', label: 'Sports' },
  { key: 'technology', label: 'Technology' },
];

export default templates;
