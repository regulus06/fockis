import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { shopAdminApi } from "../api/shopAdminApi";
import { RowActionMenu, ShopTableState, StatusBadge } from "../components/ShopAdminUi";

/* ============================================================================
   MARKETPLACE — SELLERS
   GET /admin/shop/sellers (optional ?status=) and
   POST /admin/shop/sellers/:id/action (approve / suspend / restore) — unchanged.
============================================================================ */

const STATUS_OPTIONS = [
  ["", "All Status"],
  ["pending", "Pending"],
  ["approved", "Approved"],
  ["suspended", "Suspended"],
] as const;

export default function ShopAdminSellersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    return shopAdminApi
      .sellers(status || undefined)
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load sellers."))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const action = async (id: string, a: string) => {
    setBusyId(id);
    try {
      await shopAdminApi.sellerAction(id, a);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = q
    ? items.filter((x) =>
        `${x.storeName ?? ""} ${x.businessName ?? ""} ${x.name ?? ""} ${String(x.userId ?? "")}`.toLowerCase().includes(q),
      )
    : items;

  return (
    <div className="shop-admin-page">
      <div className="shop-admin-toolbar fk-toolbar">
        <label className="fk-search fk-toolbar__grow">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search sellers..."
            aria-label="Search sellers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select className="fk-select" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={label} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <ShopTableState
        loading={loading && items.length === 0}
        error={error}
        empty={visible.length === 0}
        emptyText="No sellers match these filters."
        onRetry={() => void load()}
      >
        <div className="fk-table-wrap shop-admin-table">
          <table className="fk-table">
            <thead>
              <tr>
                <th scope="col">Seller</th>
                <th scope="col">Status</th>
                <th scope="col">Active</th>
                <th scope="col" className="fk-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => {
                const name = x.storeName || x.businessName || x.name || String(x.userId ?? x._id);
                return (
                  <tr key={x._id}>
                    <td>
                      <strong>{name}</strong>
                      {name !== String(x.userId) && x.userId && <div className="fk-muted">{String(x.userId)}</div>}
                    </td>
                    <td>
                      <StatusBadge status={x.status || "unknown"} />
                    </td>
                    <td>{x.active ? "Yes" : "No"}</td>
                    <td className="fk-table__actions">
                      <RowActionMenu
                        label={name}
                        busy={busyId === x._id}
                        actions={[
                          { label: "Approve", onSelect: () => void action(x._id, "approve") },
                          { label: "Restore", onSelect: () => void action(x._id, "restore") },
                          { label: "Suspend", danger: true, onSelect: () => void action(x._id, "suspend") },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ShopTableState>
    </div>
  );
}
