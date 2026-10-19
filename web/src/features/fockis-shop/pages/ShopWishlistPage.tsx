import { useEffect, useState } from 'react';

import { ShopHeader } from '../components/common/ShopHeader';
import { ShopFooter } from '../components/common/ShopFooter';
import { ShopBreadcrumbs } from '../components/common/ShopBreadcrumbs';
import { ShopError } from '../components/common/ShopError';
import { ProductGridSkeleton } from '../components/products/ProductGridSkeleton';

import { WishlistGrid } from '../components/wishlist/WishlistGrid';

import { useWishlist } from '../hooks/useWishlist';
import { getProductById } from '../services/productApi';

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
        // Load each saved product directly by ID (one request per item)
        // instead of paging through the whole catalogue.
        const results = await Promise.allSettled(
          productIds.map((id) => getProductById(id)),
        );

        if (cancelled) return;

        const failures = results.filter((result) => result.status === 'rejected');
        const found = results
          .map((result) => (result.status === 'fulfilled' ? result.value : null))
          .filter((product): product is Product => Boolean(product));

        setProducts(found);

        if (found.length === 0 && failures.length > 0) {
          const first = failures[0] as PromiseRejectedResult;
          setError(first.reason instanceof Error ? first.reason.message : 'Unable to load your wishlist.');
        }
      } catch (err) {
        if (cancelled) return;
        setProducts([]);
        setError(err instanceof Error ? err.message : 'Unable to load your wishlist.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWishlistProducts();

    return () => {
      cancelled = true;
    };
  }, [productIds]);

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main className="fk-container fk-page">
        <ShopBreadcrumbs items={[{ label: 'Shop', to: '/shop' }, { label: 'Wishlist' }]} />

        <div className="fk-page__head">
          <div>
            <h1>Your wishlist</h1>
            {!loading && products.length > 0 && (
              <p>
                {products.length} saved item{products.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </div>

        {loading && <ProductGridSkeleton count={Math.min(8, productIds.length || 4)} />}

        {!loading && error && <ShopError message={error} />}

        {!loading && !error && <WishlistGrid products={products} />}
      </main>

      <ShopFooter />
    </div>
  );
}
