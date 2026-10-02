import { Link } from 'react-router-dom';
import type { Product } from '../../types/product.types';
import { Rail } from '../common/Rail';
import { Stars } from '../common/Stars';
import { Badge } from '../common/Badge';
import { effectivePrice } from '../../utils/pricing';
import { formatPrice } from '../../utils/currency';

interface ProductRailProps {
  products: Product[];
  ariaLabel: string;
}

export function ProductRail({ products, ariaLabel }: ProductRailProps) {
  if (products.length === 0) return null;
  return (
    <Rail ariaLabel={ariaLabel}>
      {products.map((p) => (
        <Link to={`/shop/product/${p.slug}`} className="pcard rail-item" key={p.id} style={{ display: 'flex' }}>
          <div className="thumb">{p.emoji ?? '📦'}</div>
          <div className="body">
            {p.badge && (
              <div className="badge-row">
                <Badge variant={p.badge} />
              </div>
            )}
            <div className="store-line">{p.storeName}</div>
            <h5>{p.name}</h5>
            <Stars rating={p.reviews.averageRating} reviews={p.reviews.totalReviews} />
            <div className="price-line">
              <span className="price-now mono">{formatPrice(effectivePrice(p))}</span>
              {p.salePrice != null && p.salePrice < p.price && <span className="price-old mono">{formatPrice(p.price)}</span>}
            </div>
          </div>
        </Link>
      ))}
    </Rail>
  );
}
