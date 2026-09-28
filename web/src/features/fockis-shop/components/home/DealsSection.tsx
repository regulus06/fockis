import { Link } from 'react-router-dom';

import { Rail } from '../common/Rail';
import { useProducts } from '../../hooks/useProducts';
import {
discountPercent,
effectivePrice,
} from '../../utils/pricing';
import { formatPrice } from '../../utils/currency';
import { ShopLoading } from '../common/ShopLoading';
import { ShopError } from '../common/ShopError';

export function DealsSection() {
const {
data,
loading,
error,
} = useProducts({
sort: 'newest',
page: 1,
pageSize: 24,
});

const deals = (data?.items ?? []).filter((product) => {
const price = Number(product.price);

const salePrice =
  product.salePrice == null
    ? null
    : Number(product.salePrice);

return (
  Number.isFinite(price) &&
  salePrice != null &&
  Number.isFinite(salePrice) &&
  salePrice > 0 &&
  salePrice < price
);

});

return ( <section
   className="shaded"
   id="deals"
 > <div className="wrap"> <div className="section-head"> <div> <div className="sec-label"> <span className="num">07</span>
DEALS </div>

        <h2>Today's deals</h2>
      </div>

      <Link
        to="/shop/deals"
        className="section-link"
      >
        View all deals →
      </Link>
    </div>

    {loading && (
      <ShopLoading rows={1} />
    )}

    {!loading && error && (
      <ShopError message={error} />
    )}

    {!loading &&
      !error &&
      deals.length === 0 && (
        <div className="empty-state">
          No active deals right now — check back soon.
        </div>
      )}

    {!loading &&
      !error &&
      deals.length > 0 && (
        <Rail ariaLabel="Today's deals">
          {deals.map((product) => {
            const percentage =
              discountPercent(product);

            return (
              <Link
                to={`/shop/product/${product.slug}`}
                key={product.id}
                className="deal-rail-card rail-item"
                style={{ display: 'block' }}
              >
                <span className="deal-pct">
                  -{percentage}%
                </span>

                <div className="thumb">
                  {product.emoji ?? '📦'}
                </div>

                <h5>
                  {product.name}
                </h5>

                <div className="price-line">
                  <span className="price-now mono">
                    {formatPrice(
                      effectivePrice(product),
                    )}
                  </span>

                  <span className="price-old mono">
                    {formatPrice(
                      product.price,
                    )}
                  </span>
                </div>
              </Link>
            );
          })}
        </Rail>
      )}
  </div>
</section>

);
}
