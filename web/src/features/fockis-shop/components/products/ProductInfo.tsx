import { Link } from 'react-router-dom';
import type { Product } from '../../types/product.types';
import { Stars } from '../common/Stars';
import { Badge } from '../common/Badge';
import { ProductPrice } from './ProductPrice';

export function ProductInfo({ product }: { product: Product }) {
  return (
    <div className="pdp-info">
      {product.badge && (
        <div className="badge-row">
          <Badge variant={product.badge} />
        </div>
      )}
      <h1 className="pdp-title">{product.name}</h1>
      <div className="pdp-store-line">
        Sold by{' '}
        <Link to={`/shop/store/${product.storeSlug}`}>
          {product.storeName} {product.storeCountryFlag}
        </Link>
        {product.storeVerified && <Badge variant="verified" />}
      </div>
      <Stars rating={product.reviews.averageRating} reviews={product.reviews.totalReviews} />
      <ProductPrice product={product} size="lg" />
      {product.shortDescription && <p className="pdp-short-desc">{product.shortDescription}</p>}
    </div>
  );
}
