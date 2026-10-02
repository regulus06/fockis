import { ProductGrid } from '../products/ProductGrid';
import { useProducts } from '../../hooks/useProducts';
import { ShopLoading } from '../common/ShopLoading';

export function RecommendedProducts() {
const { data, loading, error } = useProducts({
sort: 'rating',
page: 1,
pageSize: 4,
});

return (
<section>
<div className="wrap">
<div className="reco-header">
<div>
<div className="sec-label">
<span className="num">11</span>
TOP PICKS
</div>
<h2>Top-rated products</h2>
</div>

      <span className="why">
        Highly rated products from the marketplace
      </span>
    </div>

    {loading ? (
      <ShopLoading rows={2} />
    ) : error ? (
      <div className="shop-error">
        Unable to load recommended products right now.
      </div>
    ) : data?.items?.length ? (
      <ProductGrid products={data.items} />
    ) : (
      <div className="shop-empty">
        No products are available right now.
      </div>
    )}
  </div>
</section>

);
}