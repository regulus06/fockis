import { useEffect, useState } from "react";
import { shopAdminApi } from "../api/shopAdminApi";
import type { ShopAdminStats } from "../types/shopAdmin.types";

export default function ShopAdminDashboard() {
  const [stats, setStats] = useState<ShopAdminStats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { shopAdminApi.dashboard().then(setStats).catch(e => setError(e.message)); }, []);
  if (error) return <section className="shop-admin-page"><h2>Shop Administration</h2><div className="admin-error">{error}</div></section>;
  if (!stats) return <section className="shop-admin-page"><h2>Shop Administration</h2><div className="admin-loading">Loading…</div></section>;
  const cards = [["Pending Products", stats.pendingProducts], ["Flagged Products", stats.flaggedProducts], ["Pending Sellers", stats.pendingSellers], ["Suspended Sellers", stats.suspendedSellers], ["Stores", stats.stores]];
  return <section className="shop-admin-page"><div className="page-title"><div><span>FOCKIS SHOP</span><h2>Administration Dashboard</h2><p>Control sellers, stores, products and marketplace governance.</p></div></div><div className="stat-grid">{cards.map(([label, value]) => <div className="stat-card" key={label as string}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="admin-panel"><h3>Moderation workflow</h3><p>New sellers and products should remain pending until Shop Administration approves them.</p></div></section>;
}
