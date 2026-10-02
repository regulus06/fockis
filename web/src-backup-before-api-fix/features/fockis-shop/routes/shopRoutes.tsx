import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { ShopLoading } from "../components/common/ShopLoading";

import "../styles/shop-original.css";
import "../styles/shop-extensions.css";

const ShopHomePage = lazy(
() => import("../pages/ShopHomePage"),
);

const ShopSearchPage = lazy(
() => import("../pages/ShopSearchPage"),
);

const ShopCategoriesPage = lazy(
() => import("../pages/ShopCategoriesPage"),
);

const ShopCategoryPage = lazy(
() => import("../pages/ShopCategoryPage"),
);

const ShopProductsPage = lazy(
() => import("../pages/ShopProductsPage"),
);

const ShopProductPage = lazy(
() => import("../pages/ShopProductPage"),
);

const ShopStoresPage = lazy(
() => import("../pages/ShopStoresPage"),
);

const ShopStorePage = lazy(
() => import("../pages/ShopStorePage"),
);

const ShopDealsPage = lazy(
() => import("../pages/ShopDealsPage"),
);

const ShopCountriesPage = lazy(
() => import("../pages/ShopCountriesPage"),
);

const ShopCartPage = lazy(
() => import("../pages/ShopCartPage"),
);

const ShopCheckoutPage = lazy(
() => import("../pages/ShopCheckoutPage"),
);

const ShopOrderConfirmationPage = lazy(
() => import("../pages/ShopOrderConfirmationPage"),
);

const ShopWishlistPage = lazy(
() => import("../pages/ShopWishlistPage"),
);

const ShopOrdersPage = lazy(
() => import("../pages/ShopOrdersPage"),
);

const ShopOrderDetailsPage = lazy(
() => import("../pages/ShopOrderDetailsPage"),
);

const SellerEntryPage = lazy(
() =>
import("../../seller/pages/SellerEntryPage"),
);

function withSuspense(
element: React.ReactNode,
) {
return (
<Suspense
fallback={
<div
className="wrap"
style={{
padding: "80px 32px",
}}
> <ShopLoading /> </div>
}
>
{element} </Suspense>
);
}

export const shopRoutes: RouteObject[] = [
{
path: "/shop",
element: withSuspense( <ShopHomePage />,
),
},

{
path: "/shop/search",
element: withSuspense( <ShopSearchPage />,
),
},

{
path: "/shop/categories",
element: withSuspense( <ShopCategoriesPage />,
),
},

{
path: "/shop/category/:slug",
element: withSuspense( <ShopCategoryPage />,
),
},

{
path: "/shop/products",
element: withSuspense( <ShopProductsPage />,
),
},

{
path: "/shop/product/:productId",
element: withSuspense( <ShopProductPage />,
),
},

{
path: "/shop/stores",
element: withSuspense( <ShopStoresPage />,
),
},

{
path: "/shop/store/:slug",
element: withSuspense( <ShopStorePage />,
),
},

{
path: "/shop/deals",
element: withSuspense( <ShopDealsPage />,
),
},

{
path: "/shop/countries",
element: withSuspense( <ShopCountriesPage />,
),
},

{
path: "/shop/cart",
element: withSuspense( <ShopCartPage />,
),
},

{
path: "/shop/checkout",
element: withSuspense( <ShopCheckoutPage />,
),
},

{
path: "/shop/order-confirmation",
element: withSuspense( <ShopOrderConfirmationPage />,
),
},

{
path: "/shop/wishlist",
element: withSuspense( <ShopWishlistPage />,
),
},

{
path: "/shop/orders",
element: withSuspense( <ShopOrdersPage />,
),
},

{
path: "/shop/orders/:orderId",
element: withSuspense( <ShopOrderDetailsPage />,
),
},

/*

* =========================================================
* SELL ON FOCKIS
*
* Fockis Shop remains the customer-facing marketplace.
* Seller management stays in the existing Seller Console.
*
* /shop/sell
* ```
   ↓
  ```
* SellerEntryPage
* ```
   ↓
  ```
* /seller/create-store  (new seller)
* ```
   OR
  ```
* /seller/stores        (existing seller)
* =========================================================
  */

{
path: "/shop/sell",
element: withSuspense( <SellerEntryPage />,
),
},
];

export default shopRoutes;
