import { useEffect } from "react";
import { Link } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopEmptyState } from "../components/common/ShopEmptyState";

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

  const isEmpty = !isHydrating && sellerGroups.length === 0;

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main className="fk-container fk-page">
        <ShopBreadcrumbs
          items={[
            { label: "Shop", to: "/shop" },
            { label: "Cart" },
          ]}
        />

        <div className="fk-page__head">
          <div>
            <h1>Shopping cart</h1>

            {isHydrating ? (
              <p>Loading your cart…</p>
            ) : totals.itemCount > 0 ? (
              <p>
                {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"} from{" "}
                {sellerGroups.length} {sellerGroups.length === 1 ? "store" : "stores"}
              </p>
            ) : null}
          </div>

          {isSyncing && (
            <div className="cart-sync-status" aria-live="polite">
              Saving cart…
            </div>
          )}
        </div>

        {isHydrating ? (
          <ShopLoading label="Loading your cart…" rows={3} />
        ) : isEmpty ? (
          <ShopEmptyState
            icon="🛒"
            title="Your Fockis cart is empty"
            message="Browse today’s deals and new arrivals to find something you like."
            action={
              <div className="fk-empty-actions">
                <Link to="/shop" className="fk-btn fk-btn--cart">
                  Continue shopping
                </Link>
                <Link to="/shop/deals" className="fk-btn fk-btn--outline">
                  Today’s deals
                </Link>
              </div>
            }
          />
        ) : (
          <div className="cart-page-layout">
            <CartList groups={sellerGroups} />

            {sellerGroups.length > 0 && (
              <CartSummary totals={totals} selectedTotals={selectedTotals} />
            )}
          </div>
        )}
      </main>

      <ShopFooter />
    </div>
  );
}
