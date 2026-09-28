import { useState } from 'react';
import type { Product } from '../../types/product.types';
import { ProductGrid } from '../products/ProductGrid';

export function StoreProducts({ products }: { products: Product[] }) {
  const [sort, setSort] = useState<'relevance' | 'price_asc' | 'price_desc' | 'newest'>('relevance');

  const sorted = [...products].sort((a, b) => {
    if (sort === 'price_asc') return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
    if (sort === 'price_desc') return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
    if (sort === 'newest') return +new Date(b.createdAt) - +new Date(a.createdAt);
    return 0;
  });

  return (
    <div className="store-page-products">
      <div className="section-head">
        <h3>Products ({products.length})</h3>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="shop-select">
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
      <ProductGrid products={sorted} emptyMessage="This store hasn't listed any products yet." />
    </div>
  );
}
