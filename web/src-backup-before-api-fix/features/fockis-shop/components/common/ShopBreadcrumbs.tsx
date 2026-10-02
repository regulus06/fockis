import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function ShopBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="shop-breadcrumbs mono" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          {i < items.length - 1 && <span className="sep"> / </span>}
        </span>
      ))}
    </nav>
  );
}
