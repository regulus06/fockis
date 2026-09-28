import { NavLink, Outlet } from "react-router-dom";
import "../styles/ShopAdmin.scss";

const links = [
  ["/admin/shop", "Dashboard"],
  ["/admin/shop/products", "Product Approval"],
  ["/admin/shop/sellers", "Sellers"],
  ["/admin/shop/stores", "Stores"],
  ["/admin/shop/moderation", "Moderation"],
  ["/admin/shop/rules", "Shop Rules"],
  ["/admin/shop/settings", "Settings"],
] as const;

export default function ShopAdminLayout() {
  return <div className="shop-admin-shell">
    <aside className="shop-admin-sidebar">
      <div className="shop-admin-brand"><strong>FOCKIS</strong><span>SHOP ADMIN</span></div>
      <nav>{links.map(([to, label]) => <NavLink key={to} to={to} end={to === "/admin/shop"}>{label}</NavLink>)}</nav>
    </aside>
    <main className="shop-admin-main"><header><div><span>Fockis Shop</span><h1>Platform Administration</h1></div><span className="admin-pill">Super Admin</span></header><Outlet /></main>
  </div>;
}
