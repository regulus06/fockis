import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { shopAdminApi } from "../api/shopAdminApi";
import { RowActionMenu, ShopTableState, StatusBadge } from "../components/ShopAdminUi";

/* ============================================================================
   MARKETPLACE — PRODUCTS (product approval)

   Same API as before: GET /admin/shop/products with status/search/page/limit
   and POST /admin/shop/products/:id/action (approve / reject / flag).
   The default view is still "pending" so the approval workflow is unchanged.
============================================================================ */

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  ["pending", "Pending review"],
  ["approved", "Approved"],
  ["flagged", "Flagged"],
  ["", "All products"],
] as const;

function productStatus(p: any): string {
  if (p?.adminFlagged) return "flagged";
  if (p?.isActive === true) return "active";
  if (p?.isActive === false) return "pending";
  return String(p?.status ?? "pending");
}

export default function ShopAdminProductsPage() {
  const [data, setData] = useState<any>({ items: [] });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  // Debounce the server-side search.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("limit", String(PAGE_SIZE));
    params.set("page", String(page));

    setLoading(true);
    setError("");
    return shopAdminApi
      .products(params.toString())
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load products."))
      .finally(() => setLoading(false));
  }, [status, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const action = async (id: string, name: string, actionName: string) => {
    const reason =
      actionName === "reject"
        ? window.prompt(`Reason for rejecting ${name}?`) || "Rejected by Shop Admin"
        : "";
    setBusyId(id);
    try {
      await shopAdminApi.productAction(id, actionName, reason);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const categories = useMemo(
    () => [...new Set(items.map((p) => String(p.category ?? "")).filter(Boolean))].sort(),
    [items],
  );
  const visible = category ? items.filter((p) => String(p.category ?? "") === category) : items;

  const total = Number(data?.total ?? items.length);
  const pages = Math.max(1, Number(data?.pages ?? Math.ceil(total / PAGE_SIZE)));

  return (
    <div className="shop-admin-page">
      <div className="shop-admin-toolbar fk-toolbar">
        <label className="fk-search fk-toolbar__grow">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search products..."
            aria-label="Search products"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>

        <select
          className="fk-select"
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="fk-select"
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
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
        emptyText="No products match these filters."
        onRetry={() => void load()}
      >
        <div className="fk-table-wrap shop-admin-table">
          <table className="fk-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Price</th>
                <th scope="col">Stock</th>
                <th scope="col">Status</th>
                <th scope="col" className="fk-table__actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p._id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td className="fk-muted">{p.category || "—"}</td>
                  <td>${Number(p.price || 0).toFixed(2)}</td>
                  <td>{p.stock ?? "—"}</td>
                  <td>
                    <StatusBadge status={productStatus(p)} />
                  </td>
                  <td className="fk-table__actions">
                    <RowActionMenu
                      label={p.name}
                      busy={busyId === p._id}
                      actions={[
                        { label: "Approve", onSelect: () => void action(p._id, p.name, "approve") },
                        { label: "Flag", onSelect: () => void action(p._id, p.name, "flag") },
                        { label: "Reject", danger: true, onSelect: () => void action(p._id, p.name, "reject") },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="fk-table__pagination">
            <span>
              Page {page} of {pages} · {total.toLocaleString()} products
            </span>
            <div className="fk-toolbar">
              <button type="button" className="fk-btn fk-btn--sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                Previous
              </button>
              <button type="button" className="fk-btn fk-btn--sm" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </ShopTableState>
    </div>
  );
}
