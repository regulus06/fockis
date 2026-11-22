import type { SiteContent } from "./content";

export interface WebsiteCategory {
  id: string;
  name: string;
  slug: string;
  group: string;
  description: string;
  icon: string;
  image: string;
  order: number;
  status: "active" | "hidden";
  defaultTemplateId: string | null;
  defaultTemplateSlug?: string | null;
  templateCount?: number;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  slug: string;
  categoryIds: string[];
  categorySlugs: string[];
  description: string;
  thumbnail: string;
  previewImages: string[];
  tags: string[];
  version: number;
  isOfficial: boolean;
  isDefault: boolean;
  isFeatured: boolean;
  accessLevel: "free" | "premium";
  visibility: "public" | "private";
  status: "draft" | "published" | "unpublished";
  usageCount?: number;
  theme?: SiteContent["theme"];
  updatedAt?: string;
}

export type WebsiteStatus = "draft" | "published" | "suspended";

export interface WebsiteSummary {
  id: string;
  name: string;
  slug: string;
  status: WebsiteStatus;
  categorySlug: string | null;
  categoryName: string | null;
  templateSlug: string | null;
  templateName: string | null;
  organizationId: string | null;
  thumbnail: string;
  url: string;
  primaryDomain: string | null;
  updatedAt: string;
  publishedAt: string | null;
  role: "owner" | "admin" | "editor" | "organization";
}

export interface WebsiteDetail extends WebsiteSummary {
  content: SiteContent;
  revision: number;
  hasUnpublishedChanges: boolean;
  publishedVersion: number | null;
}

export interface WebsiteVersion {
  id: string;
  versionNumber: number;
  label: string;
  kind: "manual" | "publish" | "autosave" | "before-template-switch" | "before-restore" | "ai";
  createdAt: string;
  createdByName: string;
}

export interface WebsiteDomain {
  id: string;
  domain: string;
  verificationStatus: "pending" | "verified" | "failed";
  verificationToken: string;
  verificationRecord: { type: "TXT"; host: string; value: string };
  routingRecord: { type: "CNAME"; host: string; value: string };
  sslStatus: "pending" | "active" | "unavailable";
  lastCheckedAt: string | null;
  lastError: string | null;
  isPrimary: boolean;
}

export interface WebsiteAsset {
  id: string;
  url: string;
  filename: string;
  fileType: string;
  folder: string;
  alt: string;
  size: number;
  createdAt: string;
}

export interface CartLine {
  key: string;
  productId?: string;
  kind: "product" | "custom-cake";
  name: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  options?: Record<string, string>;
}

export interface QuoteLine {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  available: boolean;
  message?: string;
}

export interface QuoteResponse {
  currency: string;
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  couponApplied: string | null;
  couponMessage: string | null;
  shipping: number;
  tax: number;
  total: number;
}

export interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  clientSecret: string | null;
  paymentIntentId: string | null;
  quote: QuoteResponse;
}

export interface WebsiteOrder {
  id: string;
  orderNumber: string;
  status: "pending_payment" | "paid" | "processing" | "ready" | "shipped" | "completed" | "cancelled" | "refunded";
  paymentStatus: string;
  items: { name: string; quantity: number; unitPrice: number; options?: Record<string, string> }[];
  fulfillment: { method: string; date?: string; time?: string; address?: string };
  customer: { name: string; email: string; phone?: string };
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  trackingNumber?: string;
  createdAt: string;
}

export interface WebsiteSubmission {
  id: string;
  type: "contact" | "booking" | "reservation" | "catering" | "newsletter" | "review" | string;
  data: Record<string, any>;
  status: "new" | "confirmed" | "completed" | "cancelled" | "archived";
  confirmationCode: string;
  createdAt: string;
}

export interface PublicSite {
  id: string;
  slug: string;
  name: string;
  content: SiteContent;
  primaryDomain: string | null;
  publishedAt: string;
}

export interface SwitchReport {
  templateSlug: string;
  templateName: string;
  preserved: string[];
  notTransferred: string[];
  keptPages: string[];
  warnings: string[];
}

export type AiAssistAction =
  | "rewrite"
  | "improve-section"
  | "color-scheme"
  | "add-section"
  | "add-page"
  | "improve-mobile"
  | "product-descriptions"
  | "improve-seo"
  | "suggest-design";
