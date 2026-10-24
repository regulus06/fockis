
import { Link } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopEmptyState } from "../components/common/ShopEmptyState";

import { CheckoutForm } from "../components/checkout/CheckoutForm";

import { useCheckout } from "../hooks/useCheckout";

import StripeProvider from "../../payments/StripeProvider";

const CRUMBS = [
  { label: "Shop", to: "/shop" },
  { label: "Cart", to: "/shop/cart" },
  { label: "Checkout" },
];

function ShopCheckoutContent() {
  const checkout = useCheckout();

  const hasCheckoutItems =
    checkout.checkoutItems.length > 0 &&
    checkout.checkoutSellerGroups.length > 0;

  if (!hasCheckoutItems) {
    return (
      <main className="fk-container fk-page">
        <ShopBreadcrumbs items={CRUMBS} />

        <ShopEmptyState
          icon="🛒"
          title="Your cart is empty"
          message="Add products to your cart before continuing to checkout."
          action={
            <Link to="/shop" className="fk-btn fk-btn--cart">
              Continue shopping
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="fk-checkout">
      <div className="fk-container fk-page fk-page--flush">
        <ShopBreadcrumbs items={CRUMBS} />
      </div>

      <CheckoutForm checkout={checkout} />
    </main>
  );
}

export default function ShopCheckoutPage() {
  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <StripeProvider>
        <ShopCheckoutContent />
      </StripeProvider>

      <ShopFooter />
    </div>
  );
}
