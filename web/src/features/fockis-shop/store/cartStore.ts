import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CartLineItem } from "../types/cart.types";

import {
  addItemToServerCart,
  clearServerCart,
  fetchServerCart,
  removeServerCartItem,
  updateServerCartItem,
} from "../services/cartApi";

// ============================================================================
// TYPES
// ============================================================================

interface AddToCartInput {
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl?: string;
  productEmoji?: string;

  storeId: string;
  storeSlug: string;
  storeName: string;

  unitPrice: number;
  quantity?: number;
  maxQuantity: number;

  variant?: CartLineItem["variant"];

  sellerId?: string | null;
  sellerName?: string | null;

  originalPrice?: number;
  salePrice?: number | null;
  currency?: string;
  sku?: string | null;
}

interface CartState {
  items: CartLineItem[];

  selectedLineIds: string[];

  isOpen: boolean;

  isHydrating: boolean;

  isSyncing: boolean;

  addItem: (
    input: AddToCartInput,
  ) => Promise<void>;

  removeItem: (
    lineId: string,
  ) => Promise<void>;

  setQuantity: (
    lineId: string,
    quantity: number,
  ) => Promise<void>;

  clear: () => Promise<void>;

  clearSelected: () => Promise<void>;

  hydrateServerCart: () => Promise<void>;

  selectItem: (
    lineId: string,
  ) => void;

  deselectItem: (
    lineId: string,
  ) => void;

  toggleItemSelection: (
    lineId: string,
  ) => void;

  selectAll: () => void;

  deselectAll: () => void;

  selectSeller: (
    storeId: string,
  ) => void;

  deselectSeller: (
    storeId: string,
  ) => void;

  toggleSellerSelection: (
    storeId: string,
  ) => void;

  openCart: () => void;

  closeCart: () => void;
}

// ============================================================================
// AUTH
// ============================================================================

function hasAuthToken(): boolean {
  if (
    typeof window === "undefined" ||
    !window.localStorage
  ) {
    return false;
  }

  const tokenKeys = [
    "access_token",
    "accessToken",
    "token",
    "authToken",
    "jwt",
    "fockis_token",
    "fockis_auth_token",
  ];

  for (const key of tokenKeys) {
    const token =
      window.localStorage.getItem(key);

    if (
      token &&
      token.trim()
    ) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// LINE ID
// ============================================================================

function getLineId(
  productId: string,
  variantId?: string | null,
): string {
  if (variantId) {
    return (
      productId +
      "::" +
      variantId
    );
  }

  return productId;
}

// ============================================================================
// PRODUCT ID
// ============================================================================

function getProductIdFromLine(
  item: CartLineItem,
): string {
  return item.productId;
}

// ============================================================================
// SERVER PRODUCT HELPERS
// ============================================================================
//
// These helpers intentionally accept the actual backend response shape
// without creating another ServerCartItem interface that can conflict
// with the type exported/used by cartApi.ts.
// ============================================================================

function getServerProduct(
  value: unknown,
): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

function getServerProductId(
  value: unknown,
): string | null {
  if (
    typeof value === "string"
  ) {
    return value;
  }

  const product =
    getServerProduct(value);

  if (!product) {
    return null;
  }

  const id =
    product._id ??
    product.id;

  if (
    typeof id === "string" &&
    id.trim()
  ) {
    return id;
  }

  return null;
}

function getServerProductName(
  product:
    | Record<string, unknown>
    | null,
): string {
  const name =
    product?.name;

  if (
    typeof name === "string" &&
    name.trim()
  ) {
    return name.trim();
  }

  return "Product";
}

function getServerProductSlug(
  product:
    | Record<string, unknown>
    | null,
  productId: string,
): string {
  const slug =
    product?.slug;

  if (
    typeof slug === "string" &&
    slug.trim()
  ) {
    return slug.trim();
  }

  return productId;
}

function getServerProductPrice(
  product:
    | Record<string, unknown>
    | null,
): number {
  const rawPrice =
    Number(
      product?.price ?? 0,
    );

  if (
    !Number.isFinite(
      rawPrice,
    ) ||
    rawPrice < 0
  ) {
    return 0;
  }

  const rawDiscount =
    Number(
      product?.discount ?? 0,
    );

  if (
    Number.isFinite(
      rawDiscount,
    ) &&
    rawDiscount > 0 &&
    rawDiscount <= 100
  ) {
    return (
      rawPrice *
      (1 -
        rawDiscount / 100)
    );
  }

  return rawPrice;
}

function getServerOriginalPrice(
  product:
    | Record<string, unknown>
    | null,
): number {
  const rawPrice =
    Number(
      product?.price ?? 0,
    );

  if (
    Number.isFinite(
      rawPrice,
    ) &&
    rawPrice >= 0
  ) {
    return rawPrice;
  }

  return 0;
}

function getServerProductImage(
  product:
    | Record<string, unknown>
    | null,
): string | undefined {
  const images =
    product?.images;

  if (
    Array.isArray(images)
  ) {
    const firstImage =
      images[0];

    if (
      typeof firstImage ===
        "string" &&
      firstImage.trim()
    ) {
      return firstImage;
    }
  }

  const image =
    product?.image;

  if (
    typeof image === "string" &&
    image.trim()
  ) {
    return image;
  }

  return undefined;
}

// ============================================================================
// MERGE SERVER CART
// ============================================================================
//
// `serverItems` is intentionally typed from the function argument rather
// than introducing another conflicting ServerCartItem declaration.
// The backend cart response is normalized here.
// ============================================================================

function mergeServerCart(
  serverItems: Array<{
    productId: unknown;
    quantity: number;
  }>,
  localItems: CartLineItem[],
): CartLineItem[] {
  const localByProductId =
    new Map<
      string,
      CartLineItem
    >();

  for (
    const item of localItems
  ) {
    localByProductId.set(
      item.productId,
      item,
    );
  }

  const merged: CartLineItem[] =
    [];

  for (
    const serverItem of serverItems
  ) {
    const productId =
      getServerProductId(
        serverItem.productId,
      );

    if (!productId) {
      continue;
    }

    const product =
      getServerProduct(
        serverItem.productId,
      );

    const localItem =
      localByProductId.get(
        productId,
      );

    const serverQuantity =
      Math.max(
        1,
        Number(
          serverItem.quantity,
        ) || 1,
      );

    // ------------------------------------------------------------------------
    // Product already exists locally.
    // Preserve all rich local product/store information.
    // ------------------------------------------------------------------------

    if (localItem) {
      const maxQuantity =
        Math.max(
          1,
          Number(
            localItem.maxQuantity,
          ) || 999,
        );

      merged.push({
        ...localItem,

        quantity:
          Math.min(
            serverQuantity,
            maxQuantity,
          ),
      });

      continue;
    }

    // ------------------------------------------------------------------------
    // Product exists on backend but not in persisted local state.
    // ------------------------------------------------------------------------

    const originalPrice =
      getServerOriginalPrice(
        product,
      );

    const price =
      getServerProductPrice(
        product,
      );

    const productName =
      getServerProductName(
        product,
      );

    const productSlug =
      getServerProductSlug(
        product,
        productId,
      );

    const productImageUrl =
      getServerProductImage(
        product,
      );

    merged.push({
      id: productId,

      productId,

      productSlug,

      productName,

      name: productName,

      title: productName,

      productImageUrl,

      productEmoji: "📦",

      sellerId: null,

      sellerName: null,

      storeId: "",

      storeSlug: "",

      storeName: "Fockis Shop",

      variant: null,

      unitPrice: price,

      price,

      originalPrice,

      salePrice:
        price < originalPrice
          ? price
          : null,

      quantity:
        serverQuantity,

      maxQuantity:
        Math.max(
          serverQuantity,
          999,
        ),

      addedAt:
        new Date().toISOString(),

      currency: "USD",

      sku: null,
    });
  }

  return merged;
}

// ============================================================================
// STORE
// ============================================================================

export const useCartStore =
  create<CartState>()(
    persist(
      (set, get) => ({
        // ====================================================================
        // INITIAL STATE
        // ====================================================================

        items: [],

        selectedLineIds: [],

        isOpen: false,

        isHydrating: false,

        isSyncing: false,

        // ====================================================================
        // HYDRATE SERVER CART
        // ====================================================================

        hydrateServerCart:
          async () => {
            if (
              !hasAuthToken()
            ) {
              return;
            }

            if (
              get().isHydrating
            ) {
              return;
            }

            set({
              isHydrating: true,
            });

            try {
              const serverCart =
                await fetchServerCart();

              const localItems =
                get().items;

              const mergedItems =
                mergeServerCart(
                  serverCart?.items ??
                    [],
                  localItems,
                );

              const validIds =
                new Set(
                  mergedItems.map(
                    (item) =>
                      item.id,
                  ),
                );

              const currentSelected =
                get()
                  .selectedLineIds;

              const selectedLineIds =
                currentSelected.length >
                0
                  ? currentSelected.filter(
                      (id) =>
                        validIds.has(
                          id,
                        ),
                    )
                  : mergedItems.map(
                      (item) =>
                        item.id,
                    );

              set({
                items:
                  mergedItems,

                selectedLineIds,
              });
            } catch (error) {
              console.error(
                "[CartStore] Failed to hydrate server cart:",
                error,
              );
            } finally {
              set({
                isHydrating: false,
              });
            }
          },

        // ====================================================================
        // ADD ITEM
        // ====================================================================

        addItem:
          async (input) => {
            const id =
              getLineId(
                input.productId,
                input.variant
                  ?.variantId,
              );

            const currentItems =
              get().items;

            const currentSelected =
              get()
                .selectedLineIds;

            const existing =
              currentItems.find(
                (item) =>
                  item.id === id,
              );

            const quantityToAdd =
              Math.max(
                1,
                Number(
                  input.quantity ??
                    1,
                ) || 1,
              );

            const authenticated =
              hasAuthToken();

            // ----------------------------------------------------------------
            // EXISTING ITEM
            // ----------------------------------------------------------------

            if (existing) {
              const previousItems =
                currentItems;

              const previousSelected =
                currentSelected;

              const newQuantity =
                Math.min(
                  existing.quantity +
                    quantityToAdd,
                  existing.maxQuantity,
                );

              set({
                items:
                  currentItems.map(
                    (item) =>
                      item.id === id
                        ? {
                            ...item,
                            quantity:
                              newQuantity,
                          }
                        : item,
                  ),

                selectedLineIds:
                  currentSelected.includes(
                    id,
                  )
                    ? currentSelected
                    : [
                        ...currentSelected,
                        id,
                      ],

                isSyncing:
                  authenticated,
              });

              if (
                !authenticated
              ) {
                return;
              }

              try {
                await addItemToServerCart(
                  existing.productId,
                  quantityToAdd,
                );
              } catch (error) {
                console.error(
                  "[CartStore] Failed to add existing item:",
                  error,
                );

                set({
                  items:
                    previousItems,

                  selectedLineIds:
                    previousSelected,
                });
              } finally {
                set({
                  isSyncing: false,
                });
              }

              return;
            }

            // ----------------------------------------------------------------
            // NEW ITEM
            // ----------------------------------------------------------------

            const safeMaxQuantity =
              Math.max(
                1,
                Number(
                  input.maxQuantity,
                ) || 1,
              );

            const newQuantity =
              Math.min(
                quantityToAdd,
                safeMaxQuantity,
              );

            const newItem: CartLineItem =
              {
                id,

                productId:
                  input.productId,

                productSlug:
                  input.productSlug,

                productName:
                  input.productName,

                name:
                  input.productName,

                title:
                  input.productName,

                productImageUrl:
                  input.productImageUrl,

                productEmoji:
                  input.productEmoji,

                sellerId:
                  input.sellerId ??
                  null,

                sellerName:
                  input.sellerName ??
                  null,

                storeId:
                  input.storeId,

                storeSlug:
                  input.storeSlug,

                storeName:
                  input.storeName,

                variant:
                  input.variant ??
                  null,

                unitPrice:
                  input.unitPrice,

                price:
                  input.unitPrice,

                originalPrice:
                  input.originalPrice,

                salePrice:
                  input.salePrice ??
                  null,

                quantity:
                  newQuantity,

                maxQuantity:
                  safeMaxQuantity,

                addedAt:
                  new Date().toISOString(),

                currency:
                  input.currency ??
                  "USD",

                sku:
                  input.sku ??
                  null,
              };

            const previousItems =
              currentItems;

            const previousSelected =
              currentSelected;

            set({
              items: [
                ...currentItems,
                newItem,
              ],

              selectedLineIds:
                currentSelected.includes(
                  id,
                )
                  ? currentSelected
                  : [
                      ...currentSelected,
                      id,
                    ],

              isSyncing:
                authenticated,
            });

            if (
              !authenticated
            ) {
              return;
            }

            try {
              await addItemToServerCart(
                input.productId,
                newQuantity,
              );
            } catch (error) {
              console.error(
                "[CartStore] Failed to add item to server cart:",
                error,
              );

              set({
                items:
                  previousItems,

                selectedLineIds:
                  previousSelected,
              });
            } finally {
              set({
                isSyncing: false,
              });
            }
          },

        // ====================================================================
        // REMOVE ITEM
        // ====================================================================

        removeItem:
          async (
            lineIdToRemove,
          ) => {
            const item =
              get().items.find(
                (cartItem) =>
                  cartItem.id ===
                  lineIdToRemove,
              );

            if (!item) {
              return;
            }

            const previousItems =
              get().items;

            const previousSelected =
              get()
                .selectedLineIds;

            const authenticated =
              hasAuthToken();

            set({
              items:
                previousItems.filter(
                  (cartItem) =>
                    cartItem.id !==
                    lineIdToRemove,
                ),

              selectedLineIds:
                previousSelected.filter(
                  (id) =>
                    id !==
                    lineIdToRemove,
                ),

              isSyncing:
                authenticated,
            });

            if (
              !authenticated
            ) {
              return;
            }

            try {
              await removeServerCartItem(
                item.productId,
              );
            } catch (error) {
              console.error(
                "[CartStore] Failed to remove cart item:",
                error,
              );

              set({
                items:
                  previousItems,

                selectedLineIds:
                  previousSelected,
              });
            } finally {
              set({
                isSyncing: false,
              });
            }
          },

        // ====================================================================
        // SET QUANTITY
        // ====================================================================

        setQuantity:
          async (
            lineIdToUpdate,
            quantity,
          ) => {
            const item =
              get().items.find(
                (cartItem) =>
                  cartItem.id ===
                  lineIdToUpdate,
              );

            if (!item) {
              return;
            }

            const safeQuantity =
              Number.isFinite(
                quantity,
              )
                ? Math.max(
                    1,
                    quantity,
                  )
                : 1;

            const nextQuantity =
              Math.min(
                safeQuantity,
                Math.max(
                  1,
                  item.maxQuantity,
                ),
              );

            const previousItems =
              get().items;

            const authenticated =
              hasAuthToken();

            set({
              items:
                previousItems.map(
                  (cartItem) =>
                    cartItem.id ===
                    lineIdToUpdate
                      ? {
                          ...cartItem,
                          quantity:
                            nextQuantity,
                        }
                      : cartItem,
                ),

              isSyncing:
                authenticated,
            });

            if (
              !authenticated
            ) {
              return;
            }

            try {
              await updateServerCartItem(
                item.productId,
                nextQuantity,
              );
            } catch (error) {
              console.error(
                "[CartStore] Failed to update cart quantity:",
                error,
              );

              set({
                items:
                  previousItems,
              });
            } finally {
              set({
                isSyncing: false,
              });
            }
          },

        // ====================================================================
        // CLEAR SELECTED
        // ====================================================================

        clearSelected:
          async () => {
            const selectedIds =
              new Set(
                get()
                  .selectedLineIds,
              );

            const selectedItems =
              get().items.filter(
                (item) =>
                  selectedIds.has(
                    item.id,
                  ),
              );

            if (
              selectedItems.length ===
              0
            ) {
              return;
            }

            const previousItems =
              get().items;

            const previousSelected =
              get()
                .selectedLineIds;

            const authenticated =
              hasAuthToken();

            set({
              items:
                previousItems.filter(
                  (item) =>
                    !selectedIds.has(
                      item.id,
                    ),
                ),

              selectedLineIds: [],

              isSyncing:
                authenticated,
            });

            if (
              !authenticated
            ) {
              return;
            }

            try {
              for (
                const item of
                  selectedItems
              ) {
                await removeServerCartItem(
                  item.productId,
                );
              }
            } catch (error) {
              console.error(
                "[CartStore] Failed to clear selected cart items:",
                error,
              );

              set({
                items:
                  previousItems,

                selectedLineIds:
                  previousSelected,
              });
            } finally {
              set({
                isSyncing: false,
              });
            }
          },

        // ====================================================================
        // CLEAR EVERYTHING
        // ====================================================================

        clear:
          async () => {
            const previousItems =
              get().items;

            const previousSelected =
              get()
                .selectedLineIds;

            const authenticated =
              hasAuthToken();

            set({
              items: [],

              selectedLineIds: [],

              isSyncing:
                authenticated,
            });

            if (
              !authenticated
            ) {
              return;
            }

            try {
              await clearServerCart();
            } catch (error) {
              console.error(
                "[CartStore] Failed to clear server cart:",
                error,
              );

              set({
                items:
                  previousItems,

                selectedLineIds:
                  previousSelected,
              });
            } finally {
              set({
                isSyncing: false,
              });
            }
          },

        // ====================================================================
        // SELECT ITEM
        // ====================================================================

        selectItem:
          (lineIdToSelect) => {
            const exists =
              get().items.some(
                (item) =>
                  item.id ===
                  lineIdToSelect,
              );

            if (!exists) {
              return;
            }

            const selected =
              get()
                .selectedLineIds;

            if (
              selected.includes(
                lineIdToSelect,
              )
            ) {
              return;
            }

            set({
              selectedLineIds: [
                ...selected,
                lineIdToSelect,
              ],
            });
          },

        // ====================================================================
        // DESELECT ITEM
        // ====================================================================

        deselectItem:
          (lineIdToDeselect) => {
            set({
              selectedLineIds:
                get()
                  .selectedLineIds
                  .filter(
                    (id) =>
                      id !==
                      lineIdToDeselect,
                  ),
            });
          },

        // ====================================================================
        // TOGGLE ITEM
        // ====================================================================

        toggleItemSelection:
          (lineIdToToggle) => {
            const exists =
              get().items.some(
                (item) =>
                  item.id ===
                  lineIdToToggle,
              );

            if (!exists) {
              return;
            }

            const selected =
              get()
                .selectedLineIds;

            if (
              selected.includes(
                lineIdToToggle,
              )
            ) {
              set({
                selectedLineIds:
                  selected.filter(
                    (id) =>
                      id !==
                      lineIdToToggle,
                  ),
              });
            } else {
              set({
                selectedLineIds: [
                  ...selected,
                  lineIdToToggle,
                ],
              });
            }
          },

        // ====================================================================
        // SELECT ALL
        // ====================================================================

        selectAll:
          () => {
            set({
              selectedLineIds:
                get().items.map(
                  (item) =>
                    item.id,
                ),
            });
          },

        // ====================================================================
        // DESELECT ALL
        // ====================================================================

        deselectAll:
          () => {
            set({
              selectedLineIds: [],
            });
          },

        // ====================================================================
        // SELECT STORE
        // ====================================================================

        selectSeller:
          (storeId) => {
            const storeItems =
              get().items.filter(
                (item) =>
                  item.storeId ===
                  storeId,
              );

            if (
              storeItems.length ===
              0
            ) {
              return;
            }

            const selected =
              new Set(
                get()
                  .selectedLineIds,
              );

            for (
              const item of
                storeItems
            ) {
              selected.add(
                item.id,
              );
            }

            set({
              selectedLineIds:
                Array.from(
                  selected,
                ),
            });
          },

        // ====================================================================
        // DESELECT STORE
        // ====================================================================

        deselectSeller:
          (storeId) => {
            const storeItemIds =
              new Set(
                get()
                  .items
                  .filter(
                    (item) =>
                      item.storeId ===
                      storeId,
                  )
                  .map(
                    (item) =>
                      item.id,
                  ),
              );

            set({
              selectedLineIds:
                get()
                  .selectedLineIds
                  .filter(
                    (id) =>
                      !storeItemIds.has(
                        id,
                      ),
                  ),
            });
          },

        // ====================================================================
        // TOGGLE STORE
        // ====================================================================

        toggleSellerSelection:
          (storeId) => {
            const storeItems =
              get().items.filter(
                (item) =>
                  item.storeId ===
                  storeId,
              );

            if (
              storeItems.length ===
              0
            ) {
              return;
            }

            const selected =
              new Set(
                get()
                  .selectedLineIds,
              );

            const allSelected =
              storeItems.every(
                (item) =>
                  selected.has(
                    item.id,
                  ),
              );

            for (
              const item of
                storeItems
            ) {
              if (allSelected) {
                selected.delete(
                  item.id,
                );
              } else {
                selected.add(
                  item.id,
                );
              }
            }

            set({
              selectedLineIds:
                Array.from(
                  selected,
                ),
            });
          },

        // ====================================================================
        // DRAWER
        // ====================================================================

        openCart:
          () => {
            set({
              isOpen: true,
            });
          },

        closeCart:
          () => {
            set({
              isOpen: false,
            });
          },
      }),

      {
        name: "fockis-shop-cart",

        version: 7,

        migrate:
          (
            persistedState: unknown,
          ) => {
            const state =
              persistedState as
                | Partial<CartState>
                | null;

            if (!state) {
              return {
                items: [],
                selectedLineIds: [],
                isOpen: false,
                isHydrating: false,
                isSyncing: false,
              };
            }

            const items =
              Array.isArray(
                state.items,
              )
                ? state.items
                : [];

            const validIds =
              new Set(
                items.map(
                  (item) =>
                    item.id,
                ),
              );

            const selectedLineIds =
              Array.isArray(
                state.selectedLineIds,
              )
                ? state.selectedLineIds.filter(
                    (id) =>
                      validIds.has(
                        id,
                      ),
                  )
                : [];

            return {
              items,

              selectedLineIds,

              isOpen:
                state.isOpen ??
                false,

              isHydrating: false,

              isSyncing: false,
            };
          },
      },
    ),
  );