import { Link } from "react-router-dom";
import { ChevronRight, Package, ShieldCheck, Store, UserPlus } from "lucide-react";

/* ============================================================================
   MARKETPLACE — OVERVIEW
   The live counts (pending products, sellers, flagged, stores) are loaded once
   by ShopAdminLayout and shown in the KPI row above the tabs, so this tab
   focuses on the moderation workflow and where to act on it.
============================================================================ */

const STEPS = [
  {
    to: "/admin/shop/sellers",
    icon: UserPlus,
    title: "Approve sellers",
    text: "New seller profiles stay pending until Shop Administration approves them.",
  },
  {
    to: "/admin/shop/products",
    icon: Package,
    title: "Review products",
    text: "New and edited products remain pending until they are approved, rejected or flagged.",
  },
  {
    to: "/admin/shop/stores",
    icon: Store,
    title: "Manage stores",
    text: "Open, suspend, block or delete storefronts operating on Fockis Shop.",
  },
  {
    to: "/admin/shop/moderation",
    icon: ShieldCheck,
    title: "Moderation & rules",
    text: "Shop governance controls and marketplace rules.",
  },
];

export default function ShopAdminDashboard() {
  return (
    <div className="shop-admin-page">
      <div className="shop-admin-intro">
        <h2>Moderation workflow</h2>
        <p>New sellers and products should remain pending until Shop Administration approves them.</p>
      </div>

      <ul className="shop-admin-steps">
        {STEPS.map(({ to, icon: Icon, title, text }) => (
          <li key={to}>
            <Link to={to} className="shop-admin-step">
              <span className="shop-admin-step__icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="shop-admin-step__text">
                <strong>{title}</strong>
                <span>{text}</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" className="shop-admin-step__chevron" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
