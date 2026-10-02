/**
 * ============================================================================
 * FOCKIS SHOP — CART TYPES
 * ============================================================================
 *
 * IMPORTANT:
 * This is a multi-seller marketplace cart.
 *
 * Cart selection is intentionally NOT stored on CartLineItem.
 *
 * Selection is maintained separately by cartStore.ts through:
 *
 *   selectedLineIds: string[]
 *
 * This keeps checkout/UI state separate from canonical cart item data.
 *
 * Every line item preserves:
 * - product identity
 * - product display information
 * - seller identity
 * - store identity
 * - pricing
 * - quantity / stock information
 * - variant information
 *
 * The canonical fields remain:
 * - productName
 * - unitPrice
 *
 * Compatibility aliases are also included because existing Shop pages,
 * Checkout, Orders, and marketplace integrations may use:
 * - name
 * - title
 * - price
 * - sellerId
 * - sellerName
 * ============================================================================
 */

// ============================================================================
// CART LINE ITEM VARIANT
// ============================================================================

export interface CartLineItemVariant {
  /**
   * Product variant identifier.
   */
  variantId: string;

  /**
   * Precomputed display label.
   *
   * Example:
   * "Color: Navy / Size: L"
   */
  optionsLabel: string;
}

// ============================================================================
// CART LINE ITEM
// ============================================================================

export interface CartLineItem {
  /**
   * Stable cart-line identifier.
   *
   * Usually generated from:
   * productId + variantId
   */
  id: string;

  /**
   * Product identifier.
   */
  productId: string;

  /**
   * Product URL slug.
   */
  productSlug: string;

  /**
   * Canonical product display name.
   */
  productName: string;

  /**
   * Compatibility alias for productName.
   */
  name?: string;

  /**
   * Compatibility alias for productName.
   */
  title?: string;

  /**
   * Product image.
   */
  productImageUrl?: string;

  /**
   * Product emoji fallback.
   */
  productEmoji?: string;

  // --------------------------------------------------------------------------
  // SELLER
  // --------------------------------------------------------------------------

  /**
   * Seller/user identifier.
   *
   * Optional because some products may only have store-level ownership.
   */
  sellerId?: string | null;

  /**
   * Seller display name.
   */
  sellerName?: string | null;

  // --------------------------------------------------------------------------
  // STORE
  // --------------------------------------------------------------------------

  /**
   * Marketplace store identifier.
   */
  storeId: string;

  /**
   * Store URL slug.
   */
  storeSlug: string;

  /**
   * Store display name.
   */
  storeName: string;

  // --------------------------------------------------------------------------
  // VARIANT
  // --------------------------------------------------------------------------

  variant?: CartLineItemVariant | null;

  // --------------------------------------------------------------------------
  // PRICING
  // --------------------------------------------------------------------------

  /**
   * Canonical price actually used by the cart.
   */
  unitPrice: number;

  /**
   * Compatibility alias for unitPrice.
   */
  price?: number;

  /**
   * Optional original price.
   */
  originalPrice?: number;

  /**
   * Optional sale price.
   */
  salePrice?: number | null;

  // --------------------------------------------------------------------------
  // QUANTITY / INVENTORY
  // --------------------------------------------------------------------------

  /**
   * Quantity currently in the cart.
   */
  quantity: number;

  /**
   * Maximum quantity allowed by current stock.
   */
  maxQuantity: number;

  // --------------------------------------------------------------------------
  // CART METADATA
  // --------------------------------------------------------------------------

  /**
   * ISO timestamp indicating when the line was added.
   */
  addedAt: string;

  /**
   * Currency used for this line.
   *
   * Defaults to USD at the application level when omitted.
   */
  currency?: string;

  /**
   * Optional SKU.
   */
  sku?: string | null;
}

// ============================================================================
// CART SELLER / STORE GROUP
// ============================================================================

export interface CartSellerGroup {
  /**
   * Store identifier.
   */
  storeId: string;

  /**
   * Store URL slug.
   */
  storeSlug: string;

  /**
   * Store display name.
   */
  storeName: string;

  // --------------------------------------------------------------------------
  // SELLER
  // --------------------------------------------------------------------------

  /**
   * Seller/user identifier.
   */
  sellerId?: string | null;

  /**
   * Seller display name.
   */
  sellerName?: string | null;

  // --------------------------------------------------------------------------
  // ITEMS
  // --------------------------------------------------------------------------

  /**
   * All cart lines belonging to this store/seller.
   *
   * Selection is NOT stored on these objects.
   *
   * Use:
   *
   *   cartStore.selectedLineIds
   *
   * to determine which items are being checked out.
   */
  items: CartLineItem[];

  // --------------------------------------------------------------------------
  // TOTALS
  // --------------------------------------------------------------------------

  /**
   * Total merchandise value for this seller/store group.
   */
  subtotal: number;

  /**
   * Amount required to qualify for free delivery.
   */
  freeDeliveryThreshold?: number | null;

  /**
   * Current estimated shipping cost for this seller/store.
   */
  estimatedShipping: number;
}

// ============================================================================
// CART TOTALS
// ============================================================================

export interface CartTotals {
  /**
   * Total number of individual units represented by these totals.
   */
  itemCount: number;

  /**
   * Merchandise subtotal before shipping and tax.
   */
  subtotal: number;

  /**
   * Estimated combined shipping across seller/store groups.
   */
  estimatedShipping: number;

  /**
   * Estimated tax.
   */
  estimatedTax: number;

  /**
   * Final estimated cart total.
   */
  total: number;
}