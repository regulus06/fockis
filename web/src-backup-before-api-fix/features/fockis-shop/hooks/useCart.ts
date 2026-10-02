import { useCallback, useMemo } from "react";

import { useCartStore } from "../store/cartStore";

import {
  computeCartTotals,
  groupItemsBySeller,
} from "../utils/pricing";

// ============================================================================
// FOCKIS SHOP — CART HOOK
// ============================================================================
//
// The Zustand cart store is the single source of truth for cart mutations.
//
// cartStore.ts already handles:
//   - local optimistic updates
//   - backend add/update/remove
//   - clearing the server cart
//   - server-cart hydration
//
// This hook must NOT call cartApi directly.
// Otherwise every mutation can be sent to the backend twice.
// ============================================================================

export function useCart() {
  // ==========================================================================
  // CART STATE
  // ==========================================================================

  const items = useCartStore((state) => state.items);

  const selectedLineIds = useCartStore(
    (state) => state.selectedLineIds,
  );

  const isOpen = useCartStore(
    (state) => state.isOpen,
  );

  const isHydrating = useCartStore(
    (state) => state.isHydrating,
  );

  const isSyncing = useCartStore(
    (state) => state.isSyncing,
  );

  // ==========================================================================
  // CART MUTATIONS
  // ==========================================================================

  const addItemLocal = useCartStore(
    (state) => state.addItem,
  );

  const removeItemLocal = useCartStore(
    (state) => state.removeItem,
  );

  const setQuantityLocal = useCartStore(
    (state) => state.setQuantity,
  );

  const clearLocal = useCartStore(
    (state) => state.clear,
  );

  const clearSelectedLocal = useCartStore(
    (state) => state.clearSelected,
  );

  // ==========================================================================
  // SELECTION ACTIONS
  // ==========================================================================

  const selectItem = useCartStore(
    (state) => state.selectItem,
  );

  const deselectItem = useCartStore(
    (state) => state.deselectItem,
  );

  const toggleItemSelection = useCartStore(
    (state) => state.toggleItemSelection,
  );

  const selectSeller = useCartStore(
    (state) => state.selectSeller,
  );

  const deselectSeller = useCartStore(
    (state) => state.deselectSeller,
  );

  const toggleSellerSelection = useCartStore(
    (state) => state.toggleSellerSelection,
  );

  const selectAll = useCartStore(
    (state) => state.selectAll,
  );

  const deselectAll = useCartStore(
    (state) => state.deselectAll,
  );

  // ==========================================================================
  // DRAWER ACTIONS
  // ==========================================================================

  const openCart = useCartStore(
    (state) => state.openCart,
  );

  const closeCart = useCartStore(
    (state) => state.closeCart,
  );

  // ==========================================================================
  // SERVER HYDRATION
  // ==========================================================================

  const hydrateServerCart = useCartStore(
    (state) => state.hydrateServerCart,
  );

  // ==========================================================================
  // BACKEND-CONNECTED MUTATIONS
  // ==========================================================================
  //
  // These functions intentionally delegate directly to cartStore.ts.
  //
  // cartStore.ts already calls cartApi:
  //
  // addItem       -> addItemToServerCart()
  // removeItem    -> removeServerCartItem()
  // setQuantity   -> updateServerCartItem()
  // clear         -> clearServerCart()
  // clearSelected -> removeServerCartItem()
  //
  // Do NOT call cartApi again here.
  // ==========================================================================

  const addItem = useCallback(
    async (
      input: Parameters<typeof addItemLocal>[0],
    ) => {
      await addItemLocal(input);
    },
    [addItemLocal],
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      await removeItemLocal(lineId);
    },
    [removeItemLocal],
  );

  const setQuantity = useCallback(
    async (
      lineId: string,
      quantity: number,
    ) => {
      await setQuantityLocal(
        lineId,
        quantity,
      );
    },
    [setQuantityLocal],
  );

  const clear = useCallback(
    async () => {
      await clearLocal();
    },
    [clearLocal],
  );

  const clearSelected = useCallback(
    async () => {
      await clearSelectedLocal();
    },
    [clearSelectedLocal],
  );

  // ==========================================================================
  // SELLER GROUPS
  // ==========================================================================

  const sellerGroups = useMemo(
    () => groupItemsBySeller(items),
    [items],
  );

  // ==========================================================================
  // SELECTED ITEMS
  // ==========================================================================

  const selectedItems = useMemo(() => {
    const selectedIds = new Set(
      selectedLineIds,
    );

    return items.filter((item) =>
      selectedIds.has(item.id),
    );
  }, [
    items,
    selectedLineIds,
  ]);

  // ==========================================================================
  // SELECTED SELLER GROUPS
  // ==========================================================================

  const selectedSellerGroups = useMemo(
    () =>
      groupItemsBySeller(
        selectedItems,
      ),
    [selectedItems],
  );

  // ==========================================================================
  // FULL CART TOTALS
  // ==========================================================================

  const totals = useMemo(
    () =>
      computeCartTotals(
        sellerGroups,
      ),
    [sellerGroups],
  );

  // ==========================================================================
  // SELECTED CART TOTALS
  // ==========================================================================

  const selectedTotals = useMemo(
    () =>
      computeCartTotals(
        selectedSellerGroups,
      ),
    [selectedSellerGroups],
  );

  // ==========================================================================
  // COUNTS
  // ==========================================================================

  const itemCount = useMemo(
    () => items.length,
    [items],
  );

  const quantityCount = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      ),
    [items],
  );

  const selectedItemCount = useMemo(
    () => selectedItems.length,
    [selectedItems],
  );

  const selectedQuantityCount = useMemo(
    () =>
      selectedItems.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      ),
    [selectedItems],
  );

  // ==========================================================================
  // SELECTION STATUS
  // ==========================================================================

  const allSelected =
    items.length > 0 &&
    selectedLineIds.length ===
      items.length;

  const someSelected =
    selectedLineIds.length > 0;

  const canCheckout =
    selectedItems.length > 0;

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // ------------------------------------------------------------------------
    // Cart
    // ------------------------------------------------------------------------

    items,
    sellerGroups,
    totals,

    itemCount,
    quantityCount,

    // ------------------------------------------------------------------------
    // Selection
    // ------------------------------------------------------------------------

    selectedLineIds,
    selectedItems,
    selectedSellerGroups,
    selectedTotals,

    selectedItemCount,
    selectedQuantityCount,

    allSelected,
    someSelected,
    canCheckout,

    // ------------------------------------------------------------------------
    // Backend-connected mutations
    // ------------------------------------------------------------------------

    addItem,
    removeItem,
    setQuantity,
    clear,
    clearSelected,

    // ------------------------------------------------------------------------
    // Selection mutations
    // ------------------------------------------------------------------------

    selectItem,
    deselectItem,
    toggleItemSelection,

    selectSeller,
    deselectSeller,
    toggleSellerSelection,

    selectAll,
    deselectAll,

    // ------------------------------------------------------------------------
    // Drawer
    // ------------------------------------------------------------------------

    isOpen,
    openCart,
    closeCart,

    // ------------------------------------------------------------------------
    // Server state
    // ------------------------------------------------------------------------

    isHydrating,
    isSyncing,
    hydrateServerCart,
  };
}