import { useEffect } from "react";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopLoading } from "../components/common/ShopLoading";

import { CartList } from "../components/cart/CartList";
import { CartSummary } from "../components/cart/CartSummary";

import { useCart } from "../hooks/useCart";

export default function ShopCartPage() {
  const {
    sellerGroups,
    totals,
    selectedTotals,
    isHydrating,
    isSyncing,
    hydrateServerCart,
  } = useCart();

  useEffect(() => {
    void hydrateServerCart();
  }, [hydrateServerCart]);

  return (
    <div className="shop-page-root">
      <ShopHeader />

      <div
        className="wrap"
        style={{
          paddingTop: 32,
        }}
      >
        <ShopBreadcrumbs
          items={[
            {
              label: "Shop",
              to: "/shop",
            },
            {
              label: "Cart",
            },
          ]}
        />
      </div>

      <section className="tight">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h1>Your cart</h1>

              {isHydrating ? (
                <p>Loading your cart...</p>
              ) : totals.itemCount > 0 ? (
                <p>
                  {totals.itemCount}{" "}
                  {totals.itemCount === 1 ? "item" : "items"}{" "}
                  across{" "}
                  {sellerGroups.length}{" "}
                  {sellerGroups.length === 1 ? "store" : "stores"}
                </p>
              ) : (
                <p>Your cart is empty.</p>
              )}
            </div>

            {isSyncing && (
              <div
                className="cart-sync-status"
                aria-live="polite"
              >
                Saving cart...
              </div>
            )}
          </div>

          {isHydrating ? (
            <div
              style={{
                padding: "48px 0",
              }}
            >
              <ShopLoading />
            </div>
          ) : (
            <div className="cart-page-layout">
              <CartList groups={sellerGroups} />

              {sellerGroups.length > 0 && (
                <CartSummary
                  totals={totals}
                  selectedTotals={selectedTotals}
                />
              )}
            </div>
          )}
        </div>
      </section>

      <ShopFooter />
    </div>
  );
}