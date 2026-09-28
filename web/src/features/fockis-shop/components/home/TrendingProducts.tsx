import { ProductRail } from '../products/ProductRail';
import { useProducts } from '../../hooks/useProducts';
import { ShopLoading } from '../common/ShopLoading';
import { ShopError } from '../common/ShopError';

export function TrendingProducts() {
const { data, loading, error } = useProducts({
sort: 'bestselling',
page: 1,
pageSize: 8,
});

return ( <section className="tight"> <div className="wrap"> <div className="reco-header"> <div> <div className="sec-label"> <span className="num">04</span>
TRENDING NOW </div>

```
        <h2 style={{ fontSize: 26 }}>
          Trending products
        </h2>
      </div>

      <span className="why">
        Based on marketplace popularity
      </span>
    </div>

    {loading && (
      <ShopLoading
        rows={1}
      />
    )}

    {!loading && error && (
      <ShopError message={error} />
    )}

    {!loading && !error && (
      <ProductRail
        products={data?.items ?? []}
        ariaLabel="Trending products"
      />
    )}
  </div>
</section>

);
}
