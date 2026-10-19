import type { Product } from '../../types/product.types';
import { shippingBadges } from '../../utils/shipping';

/**
 * Specifications built only from fields the product actually has.
 * Rows with no data are left out.
 */
export function ProductSpecs({ product, categoryName }: { product: Product; categoryName?: string }) {
  const legacy = product as Product & { brand?: unknown };
  const brand = typeof legacy.brand === 'string' ? legacy.brand.trim() : '';
  const dims = product.shipping?.dimensionsCm;
  const weight = product.shipping?.weightKg;

  const rows: Array<[string, string]> = [];

  if (brand) rows.push(['Brand', brand]);
  if (categoryName || product.categorySlug) rows.push(['Category', categoryName || product.categorySlug]);
  if (product.sku) rows.push(['SKU', product.sku]);
  if (typeof weight === 'number' && weight > 0) rows.push(['Item weight', `${weight} kg`]);
  if (dims && dims.length > 0 && dims.width > 0 && dims.height > 0) {
    rows.push(['Dimensions', `${dims.length} × ${dims.width} × ${dims.height} cm`]);
  }
  if (product.storeName) rows.push(['Seller', product.storeName]);

  const shipping = product.shipping ? shippingBadges(product.shipping) : [];
  if (shipping.length > 0) rows.push(['Delivery options', shipping.join(' · ')]);

  if (product.createdAt) {
    const date = new Date(product.createdAt);
    if (!Number.isNaN(date.getTime())) rows.push(['Listed', date.toLocaleDateString()]);
  }

  if (rows.length === 0) {
    return <p className="pdp-muted">The seller hasn’t added specifications for this product yet.</p>;
  }

  return (
    <table className="pdp-specs">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
