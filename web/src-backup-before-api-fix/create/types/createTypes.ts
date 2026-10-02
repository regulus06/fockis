export interface ToolItem {
  icon: string;
  title: string;
  desc: string;
  label: string;
}

export interface CreateToolItem {
  icon: string;
  title: string;
  desc: string;
}

export type TemplatePreviewType =
  | 'business-mock'
  | 'brand-shapes'
  | 'flyer'
  | 'invite'
  | 'menu'
  | 'card'
  | 'photo'
  | 'social-quote'
  | 'social-photo'
  | 'badge'
  | 'list'
  | 'bracket'
  | 'app';

export interface BusinessMockPreview {
  type: 'business-mock';
  initials: string;
  small?: boolean;
}

export interface BrandShapesPreview {
  type: 'brand-shapes';
}

export interface FlyerPreview {
  type: 'flyer';
  big: string[];
  small: string;
}

export interface InvitePreview {
  type: 'invite';
  line: string;
  sub: string;
}

export interface MenuRow {
  name: string;
  price: string;
}

export interface MenuPreview {
  type: 'menu';
  rows: MenuRow[];
}

export interface CardPreview {
  type: 'card';
  name: string;
  role: string;
  contact: string;
  dark?: boolean;
  bg?: string;
}

export interface PhotoPreview {
  type: 'photo';
  p1: string;
  p2: string;
  eyebrow: string;
  headline: string[];
  sub?: string;
}

export interface SocialQuotePreview {
  type: 'social-quote';
  quote: string[];
}

export interface SocialPhotoPreview {
  type: 'social-photo';
  p1: string;
  p2: string;
  eyebrow: string;
  headline: string[];
}

export interface BadgePreview {
  type: 'badge';
  bg: string;
  num: string;
  cap: string;
}

export interface ListRow {
  p1: string;
  p2: string;
  num?: string;
}

export interface ListPreview {
  type: 'list';
  rows: ListRow[];
}

export interface BracketRow {
  left?: 'win';
  right?: 'win';
  label: string;
}

export interface BracketPreview {
  type: 'bracket';
  rows: BracketRow[];
}

export interface AppPreview {
  type: 'app';
  p1: string;
  p2: string;
}

export type TemplatePreviewData =
  | BusinessMockPreview
  | BrandShapesPreview
  | FlyerPreview
  | InvitePreview
  | MenuPreview
  | CardPreview
  | PhotoPreview
  | SocialQuotePreview
  | SocialPhotoPreview
  | BadgePreview
  | ListPreview
  | BracketPreview
  | AppPreview;

export interface Template {
  cat: string;
  category: string;
  title: string;
  preview: TemplatePreviewData;
}

export interface TemplateCategory {
  key: string;
  label: string;
}
