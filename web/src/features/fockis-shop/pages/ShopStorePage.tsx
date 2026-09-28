import { useParams } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopEmptyState } from "../components/common/ShopEmptyState";
import { ShopError } from "../components/common/ShopError";

import { StoreHeader } from "../components/stores/StoreHeader";
import { StoreInfo } from "../components/stores/StoreInfo";
import { StoreProducts } from "../components/stores/StoreProducts";
import { StorePolicies } from "../components/stores/StorePolicies";
import { StoreShipping } from "../components/stores/StoreShipping";
import { StoreReviews } from "../components/stores/StoreReviews";

import { useStore } from "../hooks/useStore";
import { useProducts } from "../hooks/useProducts";

export default function ShopStorePage() {
const { slug } = useParams<{ slug: string }>();

const normalizedSlug = slug?.trim() || undefined;

const {
store,
loading,
error,
notFound,
} = useStore(normalizedSlug);

const {
data: productsData,
loading: productsLoading,
error: productsError,
} = useProducts(
normalizedSlug
? {
storeSlug: normalizedSlug,
page: 1,
pageSize: 100,
}
: undefined,
);

if (!normalizedSlug) {
return ( <div className="shop-page-root"> <ShopHeader />

```
    <main>
      <div
        className="wrap"
        style={{
          padding: "60px 32px",
        }}
      >
        <ShopEmptyState
          icon="🏪"
          title="Store not found"
          message="No store was specified."
        />
      </div>
    </main>

    <ShopFooter />
  </div>
);

}

if (loading) {
return ( <div className="shop-page-root"> <ShopHeader />
    <main>
      <div
        className="wrap"
        style={{
          padding: "60px 32px",
        }}
      >
        <ShopLoading
          label="Loading store…"
          rows={4}
        />
      </div>
    </main>

    <ShopFooter />
  </div>
);

}

if (error) {
return ( <div className="shop-page-root"> <ShopHeader />

    <main>
      <div
        className="wrap"
        style={{
          padding: "60px 32px",
        }}
      >
        <ShopError message={error} />
      </div>
    </main>

    <ShopFooter />
  </div>
);

}

if (notFound || !store) {
return ( <div className="shop-page-root"> <ShopHeader />

    <main>
      <div
        className="wrap"
        style={{
          padding: "60px 32px",
        }}
      >
        <ShopEmptyState
          icon="🏪"
          title="Store not found"
          message="This store may have been closed, renamed, or does not exist."
        />
      </div>
    </main>

    <ShopFooter />
  </div>
);

}

const products = productsData?.items ?? [];

return ( <div className="shop-page-root"> <ShopHeader />

  <StoreHeader store={store} />

  <div
    className="wrap"
    style={{
      paddingTop: 20,
    }}
  >
    <ShopBreadcrumbs
      items={[
        {
          label: "Shop",
          to: "/shop",
        },
        {
          label: "Stores",
          to: "/shop/stores",
        },
        {
          label: store.name,
        },
      ]}
    />
  </div>

  <section className="tight">
    <div className="wrap">
      <div className="store-page-layout">
        <div>
          <StoreInfo store={store} />

          <StoreShipping store={store} />

          <StorePolicies store={store} />
        </div>
      </div>
    </div>
  </section>

  <section>
    <div className="wrap">
      {productsLoading ? (
        <ShopLoading
          label="Loading products…"
          rows={3}
        />
      ) : productsError ? (
        <ShopError message={productsError} />
      ) : products.length === 0 ? (
        <ShopEmptyState
          icon="📦"
          title="No products yet"
          message="This store does not have any products available right now."
        />
      ) : (
        <StoreProducts products={products} />
      )}
    </div>
  </section>

  <section className="shaded">
    <div className="wrap">
      <StoreReviews store={store} />
    </div>
  </section>

  <ShopFooter />
</div>
);
}
