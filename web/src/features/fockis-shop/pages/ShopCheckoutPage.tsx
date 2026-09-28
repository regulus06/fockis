import { Link } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";

import { CheckoutForm } from "../components/checkout/CheckoutForm";

import { useCheckout } from "../hooks/useCheckout";

import StripeProvider from "../../payments/StripeProvider";

function ShopCheckoutContent() {
const checkout = useCheckout();

if (
checkout.checkoutItems.length === 0 ||
checkout.checkoutSellerGroups.length === 0
) {
return (
<>
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
to: "/shop/cart",
},
{
label: "Checkout",
},
]}
/> </div>

```
    <section className="tight">
      <div className="wrap">
        <div className="shop-state-panel">
          <div className="shop-state-icon">
            🛒
          </div>

          <h4>Your cart is empty</h4>

          <p>
            Add products to your cart before continuing to checkout.
          </p>

          <Link
            to="/shop"
            className="btn btn-navy"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  </>
);

}

return (
<>
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
to: "/shop/cart",
},
{
label: "Checkout",
},
]}
/> </div>
  <CheckoutForm checkout={checkout} />
</>

);
}

export default function ShopCheckoutPage() {
return ( <div className="shop-page-root"> <ShopHeader />

```
  <StripeProvider>
    <ShopCheckoutContent />
  </StripeProvider>

  <ShopFooter />
</div>
);
}
