import { ProductRail } from '../products/ProductRail';
import { useProducts } from '../../hooks/useProducts';
import { ShopLoading } from '../common/ShopLoading';
import { ShopError } from '../common/ShopError';

export function NewArrivals() {
const {
data,
loading,
error,
} = useProducts({
sort: 'newest',
page: 1,
pageSize: 8,
});

return ( <section className="tight"> <div className="wrap"> <div className="reco-header"> <div> <div className="sec-label"> <span className="num">08</span>
JUST LISTED </div>

```
        <h2 style={{ fontSize: 26 }}>
          New arrivals
        </h2>
      </div>

      <span className="why">
        Recently added to the marketplace
      </span>
    </div>

    {loading && (
      <ShopLoading rows={1} />
    )}

    {!loading && error && (
      <ShopError message={error} />
    )}

    {!loading && !error && (
      <ProductRail
        products={data?.items ?? []}
        ariaLabel="New arrivals"
      />
    )}
  </div>
</section>

);
}
