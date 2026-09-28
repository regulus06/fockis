/**
 * Product domain types for Fockis Shop.
 *
 * A Product belongs to a Store,
 * and a Store belongs to a Business/Seller.
 *
 * TYPES ONLY.
 *
 * Do not import API clients, React hooks,
 * demo data, or service functions here.
 */

export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "backorder";

export type ProductStatus =
  | "draft"
  | "active"
  | "unpublished"
  | "archived";

export type ProductBadge =
  | "bestseller"
  | "new"
  | "sponsored"
  | "sale"
  | null;

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariantOption {
  id: string;
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  options: ProductVariantOption[];
  price: number;
  salePrice?: number | null;
  stockQuantity: number;
  imageId?: string | null;
}

export interface ProductShippingInfo {
  localDelivery: boolean;
  nationalDelivery: boolean;
  internationalShipping: boolean;
  pickupAvailable: boolean;

  freeDeliveryThreshold?: number | null;

  estimatedDeliveryDays?: {
    min: number;
    max: number;
  } | null;

  weightKg?: number | null;

  dimensionsCm?: {
    length: number;
    width: number;
    height: number;
  } | null;
}

export interface ProductReviewSummary {
  averageRating: number;
  totalReviews: number;

  ratingBreakdown: Record<
    1 | 2 | 3 | 4 | 5,
    number
  >;
}

export interface Product {
  id: string;
  slug: string;

  /**
   * Store ownership.
   */
  storeId: string;
  storeName: string;
  storeSlug: string;

  storeCountryFlag?: string;
  storeVerified?: boolean;

  /**
   * Product information.
   */
  name: string;
  description: string;
  shortDescription?: string;

  categoryId: string;
  categorySlug: string;

  tags: string[];

  /**
   * Pricing.
   */
  price: number;
  salePrice?: number | null;
  currency: string;

  /**
   * Convenience image field used by
   * existing Fockis Shop cards/components.
   *
   * Canonical image data remains `images`.
   */
  image?: string;

  images: ProductImage[];

  emoji?: string;

  /**
   * Inventory.
   */
  stockQuantity: number;
  stockStatus: StockStatus;
  lowStockThreshold?: number;

  sku: string;

  /**
   * Variants.
   */
  hasVariants: boolean;
  variants?: ProductVariant[];

  /**
   * Shipping.
   */
  shipping: ProductShippingInfo;

  /**
   * Reviews.
   */
  reviews: ProductReviewSummary;

  /**
   * Marketplace presentation.
   */
  badge?: ProductBadge;
  status: ProductStatus;

  /**
   * Timestamps.
   */
  createdAt: string;
  updatedAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;

  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;

  rating: 1 | 2 | 3 | 4 | 5;

  title?: string;
  body: string;

  verifiedPurchase: boolean;
  helpfulCount: number;

  createdAt: string;

  sellerReply?: {
    body: string;
    createdAt: string;
  } | null;
}

export interface ProductListFilters {
  categorySlug?: string;
  storeSlug?: string;

  query?: string;

  minPrice?: number;
  maxPrice?: number;

  inStockOnly?: boolean;

  minRating?: number;

  tags?: string[];

  sort?: ProductSortOption;

  page?: number;
  pageSize?: number;
}

export type ProductSortOption =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "rating"
  | "bestselling";

export interface PaginatedResult<T> {
  items: T[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;
}