import { useEffect, useState } from 'react';

import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ShopLoading } from '../components/common/ShopLoading';
import { ShopError } from '../components/common/ShopError';

import { WishlistGrid } from '../components/wishlist/WishlistGrid';

import { useWishlist } from '../hooks/useWishlist';
import { listProducts } from '../services/productApi';

import type { Product } from '../types/product.types';

export default function ShopWishlistPage() {
const { productIds } = useWishlist();

const [products, setProducts] = useState<Product[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
let cancelled = false;


async function loadWishlistProducts() {
  if (!productIds || productIds.length === 0) {
    setProducts([]);
    setLoading(false);
    setError(null);
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const wantedIds = new Set(productIds);

    const firstPage = await listProducts({
      page: 1,
      pageSize: 100,
    });

    const allProducts: Product[] = [...firstPage.items];

    const totalPages = Math.max(
      1,
      Math.ceil(
        firstPage.total / firstPage.pageSize,
      ),
    );

    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page += 1) {
        if (cancelled) {
          return;
        }

        const pageResult = await listProducts({
          page,
          pageSize: 100,
        });

        allProducts.push(...pageResult.items);
      }
    }

    if (cancelled) {
      return;
    }

    const matchedProducts = allProducts.filter(
      (product) => wantedIds.has(product.id),
    );

    const productMap = new Map(
      matchedProducts.map((product) => [
        product.id,
        product,
      ]),
    );

    const orderedProducts = productIds
      .map((id) => productMap.get(id))
      .filter(
        (product): product is Product =>
          Boolean(product),
      );

    setProducts(orderedProducts);
  } catch (err) {
    if (cancelled) {
      return;
    }

    const message =
      err instanceof Error
        ? err.message
        : 'Unable to load your wishlist.';

    setProducts([]);
    setError(message);
  } finally {
    if (!cancelled) {
      setLoading(false);
    }
  }
}

void loadWishlistProducts();

return () => {
  cancelled = true;
};

}, [productIds]);

return ( <div className="shop-page-root"> <ShopHeader />

```
  <div
    className="wrap"
    style={{
      paddingTop: 32,
    }}
  >
    <ShopBreadcrumbs
      items={[
        {
          label: 'Shop',
          to: '/shop',
        },
        {
          label: 'Wishlist',
        },
      ]}
    />
  </div>

  <section className="tight">
    <div className="wrap">
      <div className="section-head">
        <div>
          <h1>Your wishlist</h1>

          {!loading && products.length > 0 && (
            <p>
              {products.length} saved item
              {products.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </div>

      {loading && (
        <ShopLoading
          label="Loading your wishlist…"
          rows={4}
        />
      )}

      {error && (
        <ShopError message={error} />
      )}

      {!loading && !error && (
        <WishlistGrid
          products={products}
        />
      )}
    </div>
  </section>

  <ShopFooter />
</div>

);
}
