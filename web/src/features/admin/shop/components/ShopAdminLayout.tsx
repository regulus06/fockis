import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Ban, Flag, Package, Store, UserPlus, type LucideIcon } from "lucide-react";

import { shopAdminApi } from "../api/shopAdminApi";
import type { ShopAdminStats } from "../types/shopAdmin.types";

import "../styles/ShopAdmin.scss";

/* ============================================================================
   MARKETPLACE (FOCKIS SHOP ADMIN) SECTION LAYOUT

   Previously this rendered a second dark sidebar inside the admin shell.
   It now uses the shared App Admin Center look: page heading, KPI cards and
   tabs. Every tab links to the same existing /admin/shop/* route.
============================================================================ */

const TABS = [
  ["/admin/shop", "Overview"],
  ["/admin/shop/products", "Products"],
  ["/admin/shop/sellers", "Sellers"],
  ["/admin/shop/stores", "Stores"],
  ["/admin/shop/moderation", "Moderation"],
  ["/admin/shop/rules", "Shop Rules"],
  ["/admin/shop/settings", "Settings"],
] as const;

const KPIS: { key: keyof ShopAdminStats; label: string; icon: LucideIcon; tone: "navy" | "gold" }[] = [
  { key: "pendingProducts", label: "Pending Products", icon: Package, tone: "navy" },
  { key: "pendingSellers", label: "Pending Sellers", icon: UserPlus, tone: "gold" },
  { key: "flaggedProducts", label: "Flagged Products", icon: Flag, tone: "gold" },
  { key: "suspendedSellers", label: "Suspended Sellers", icon: Ban, tone: "navy" },
  { key: "stores", label: "Stores", icon: Store, tone: "gold" },
];

export default function ShopAdminLayout() {
  const [stats, setStats] = useState<ShopAdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    shopAdminApi
      .dashboard()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load marketplace stats.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="shop-admin-shell">
      <header className="fk-page-header">
        <div>
          <h1>Marketplace</h1>
          <p>Manage products, sellers, stores, and marketplace governance.</p>
        </div>
      </header>

      {error ? (
        <div className="shop-admin-alert" role="alert">
          Marketplace statistics could not be loaded: {error}
        </div>
      ) : (
        <section className="shop-admin-kpis" aria-label="Marketplace metrics">
          {KPIS.map(({ key, label, icon: Icon, tone }) => (
            <article key={key} className="fk-kpi fk-kpi--compact" aria-busy={!stats || undefined}>
              <span className={`fk-kpi__icon fk-kpi__icon--${tone}`} aria-hidden="true">
                <Icon size={20} />
              </span>
              <div className="fk-kpi__body">
                <div className="fk-kpi__label">{label}</div>
                {stats ? (
                  <div className="fk-kpi__value">{Number(stats[key] ?? 0).toLocaleString()}</div>
                ) : (
                  <span className="fk-skeleton" style={{ width: 54, height: 22, marginTop: 4 }} />
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="fk-panel shop-admin-panel">
        <nav className="shop-admin-tabs fk-pill-tabs" aria-label="Marketplace sections">
          {TABS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin/shop"}
              className={({ isActive }) => `fk-pill-tab${isActive ? " is-active" : ""}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </section>
    </div>
  );
}
