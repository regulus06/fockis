import { useMemo } from 'react';

import { useCart } from '../../hooks/useCart';
import { useProducts } from '../../hooks/useProducts';
import { effectivePrice } from '../../utils/pricing';
import { formatPrice } from '../../utils/currency';
import { ShopLoading } from '../common/ShopLoading';
import { ShopError } from '../common/ShopError';

export function BundleSection() {
const { addItem } = useCart();

const {
data,
loading,
error,
} = useProducts({
sort: 'bestselling',
page: 1,
pageSize: 4,
});

const items = useMemo(() => {
return (data?.items ?? [])
.filter((product) => {
const price = Number(
effectivePrice(product),
);

    return (
      Boolean(product.id) &&
      Boolean(product.slug) &&
      Boolean(product.name) &&
      Number.isFinite(price) &&
      price >= 0
    );
  })
  .slice(0, 4);

}, [data]);

const total = useMemo(() => {
return items.reduce(
(sum, product) =>
sum + effectivePrice(product),
0,
);
}, [items]);

function handleAddAll() {
for (const product of items) {
addItem({
productId: product.id,
productSlug: product.slug,
productName: product.name,
productEmoji: product.emoji,
storeId: product.storeId,
storeSlug: product.storeSlug,
storeName: product.storeName,
unitPrice: effectivePrice(product),
maxQuantity: product.stockQuantity,
});
}
}

return ( <section className="shaded"> <div className="wrap"> <div className="section-head"> <div> <div className="sec-label"> <span className="num">10</span>
BUNDLE & SAVE </div>

```
        <h2 style={{ fontSize: 26 }}>
          Build a marketplace bundle
        </h2>

        <p>
          Add several popular products to your cart
          together.
        </p>
      </div>
    </div>

    {loading && (
      <ShopLoading rows={1} />
    )}

    {!loading && error && (
      <ShopError message={error} />
    )}

    {!loading &&
      !error &&
      items.length === 0 && (
        <div className="empty-state">
          No products are available for a bundle right
          now.
        </div>
      )}

    {!loading &&
      !error &&
      items.length > 0 && (
        <div className="bundle-card">
          <div className="bundle-items">
            {items.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                  }}
                >
                  <div className="bundle-thumb">
                    {item.emoji ?? '📦'}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 6,
                      maxWidth: 90,
                    }}
                  >
                    {item.name}
                  </div>

                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      marginTop: 2,
                    }}
                  >
                    {formatPrice(
                      effectivePrice(item),
                    )}
                  </div>
                </div>

                {index < items.length - 1 && (
                  <span className="bundle-plus">
                    +
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="bundle-summary">
            <div className="bundle-total">
              {formatPrice(total)}{' '}
              <span>
                total for all {items.length} items
              </span>
            </div>

            <button
              type="button"
              className="btn btn-navy"
              onClick={handleAddAll}
            >
              Add all to cart
            </button>
          </div>
        </div>
      )}
  </div>
</section>

);
}
