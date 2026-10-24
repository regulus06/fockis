import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";

import { shopAdminApi } from "../api/shopAdminApi";
import { RowActionMenu, ShopTableState, StatusBadge } from "../components/ShopAdminUi";

/* ============================================================================
   MARKETPLACE — STORES
   GET /admin/shop/stores (optional ?status=active|inactive) and
   POST /admin/shop/stores/:id/action (approve / suspend / block / delete) —
   unchanged, including the delete confirmation.
============================================================================ */

export default function ShopAdminStoresPage() {
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
      .stores(status || undefined)
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load stores."))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const action = async (id: string, a: string) => {
    if (a === "delete" && !window.confirm("Delete this store?")) return;
    setBusyId(id);
    try {
      await shopAdminApi.storeAction(id, a);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = q
    ? items.filter((x) => `${x.name ?? ""} ${x.storeName ?? ""} ${String(x.ownerId ?? x.userId ?? "")}`.toLowerCase().includes(q))
    : items;

  return (
    <div className="shop-admin-page">
      <div className="shop-admin-toolbar fk-toolbar">
        <label className="fk-search fk-toolbar__grow">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search stores..."
            aria-label="Search stores"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select className="fk-select" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <ShopTableState
        loading={loading && items.length === 0}
        error={error}
        empty={visible.length === 0}
        emptyText="No stores match these filters."
        onRetry={() => void load()}
      >
        <div className="fk-table-wrap shop-admin-table">
          <table className="fk-table">
            <thead>
              <tr>
                <th scope="col">Store</th>
                <th scope="col">Owner</th>
                <th scope="col">Status</th>
                <th scope="col" className="fk-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((x) => {
                const name = x.name || x.storeName || x._id;
                return (
                  <tr key={x._id}>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td className="fk-muted">{String(x.ownerId || x.userId || "—")}</td>
                    <td>
                      <StatusBadge status={x.active ? "active" : "inactive"} />
                    </td>
                    <td className="fk-table__actions">
                      <RowActionMenu
                        label={String(name)}
                        busy={busyId === x._id}
                        actions={[
                          { label: "Open", onSelect: () => void action(x._id, "approve") },
                          { label: "Suspend", onSelect: () => void action(x._id, "suspend") },
                          { label: "Block", danger: true, onSelect: () => void action(x._id, "block") },
                          { label: "Delete", danger: true, onSelect: () => void action(x._id, "delete") },
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
