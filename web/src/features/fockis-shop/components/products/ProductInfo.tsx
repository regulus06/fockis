import { Link } from 'react-router-dom';
import type { Product } from '../../types/product.types';
import { Stars } from '../common/Stars';
import { Badge } from '../common/Badge';
import { effectivePrice } from '../../utils/pricing';
import { formatPrice } from '../../utils/currency';
import { getRealDiscount } from '../../utils/productMedia';

export function ProductInfo({ product }: { product: Product }) {
  const title = product.name?.trim() || 'Product details unavailable';
  const discount = getRealDiscount(product);
  const price = effectivePrice(product);
  const hasPrice = Number(price) > 0;

  const optionGroups = new Map<string, Set<string>>();
  for (const variant of product.variants ?? []) {
    for (const option of variant.options ?? []) {
      if (!optionGroups.has(option.name)) optionGroups.set(option.name, new Set());
      optionGroups.get(option.name)!.add(option.value);
    }
  }

  return (
    <div className="pdp-info">
      {product.storeSlug ? (
        <Link to={`/shop/store/${product.storeSlug}`} className="pdp-store-link">
          Visit the {product.storeName || 'seller'} store {product.storeCountryFlag}
        </Link>
      ) : (
        <span className="pdp-store-link">Seller details unavailable</span>
      )}

      <h1 className="pdp-title">{title}</h1>

      <div className="pdp-rating-row">
        <Stars rating={product.reviews?.averageRating ?? 0} reviews={product.reviews?.totalReviews} showEmpty size="md" />
        {product.storeVerified && <Badge variant="verified" />}
      </div>

      <hr className="pdp-rule" />

      <div className="pdp-price-block">
        {hasPrice ? (
          <>
            {discount > 0 && <span className="pdp-price-block__pct">-{discount}%</span>}
            <span className="pdp-price-block__now">{formatPrice(price)}</span>
          </>
        ) : (
          <span className="pdp-price-block__now pdp-price-block__now--na">Price unavailable</span>
        )}
      </div>
      {discount > 0 && (
        <div className="pdp-price-block__list">
          List price: <s>{formatPrice(product.price)}</s>
        </div>
      )}

      {product.shortDescription && <p className="pdp-short-desc">{product.shortDescription}</p>}

      {optionGroups.size > 0 && (
        <div className="pdp-variants">
          {Array.from(optionGroups.entries()).map(([name, values]) => (
            <div key={name} className="pdp-variants__group">
              <span className="pdp-variants__label">{name}</span>
              <div className="pdp-variants__values">
                {Array.from(values).map((value) => (
                  <span key={value} className="pdp-variants__chip">{value}</span>
                ))}
              </div>
            </div>
          ))}
          <p className="pdp-variants__note">Option selection isn’t available in the cart yet — contact the seller for a specific option.</p>
        </div>
      )}
    </div>
  );
}
