
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FOCKIS_API_URL } from "../../../config/fockisConfig";
import { useActiveStore } from "../store/activeStore";
import { useSellerProducts } from "../hooks/useSellerProducts";
import { sellerApi } from "../services/sellerApi";

import "../styles/SellerProductsPage.scss";

const placeholderImg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='14' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

function getImageUrl(image: any): string {
  if (!image) return placeholderImg;

  let raw: unknown = image;
  let storageKey = "";

  if (typeof image === "object") {
    storageKey = String(image.storageKey || image.key || "").trim();
    raw =
      image.url ||
      image.media ||
      image.path ||
      image.filename ||
      image.fileName ||
      image.file ||
      storageKey;
  }

  const value = String(raw ?? "").trim();

  if (!value || /^(undefined|null)$/i.test(value)) {
    return placeholderImg;
  }

  if (/^https?:\/\//i.test(value)) return value;
  if (/^(data:|blob:)/i.test(value)) return value;

  const normalized = (storageKey || value)
    .replace(/\\/g, "/")
    .replace(/^https?:\/\/[^/]+/i, "")
    .split(/[?#]/)[0]
    .replace(/^\/+/, "")
    .replace(/^uploads\/media\//i, "")
    .replace(/^uploads\//i, "")
    .replace(/^media\//i, "");

  if (!normalized) return placeholderImg;

  const objectKey = normalized.includes("/")
    ? normalized
    : `posts/images/${normalized}`;

  const apiBase = String(FOCKIS_API_URL || "").replace(/\/+$/, "");

  if (!apiBase) {
    console.error("FOCKIS_API_URL is empty; cannot resolve product image.");
    return placeholderImg;
  }

  const encodedKey = objectKey
    .split("/")
    .map((part: string) => encodeURIComponent(part))
    .join("/");

  return `${apiBase}/uploads/media/${encodedKey}`;
}

const LOW_STOCK_THRESHOLD = 5;

export default function SellerProductsPage() {
  const navigate = useNavigate();

  const activeStore = useActiveStore((state) => state.activeStore);
  const loadActiveStore = useActiveStore((state) => state.loadActiveStore);

  const [storeReady, setStoreReady] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const {
    products,
    loading,
    error,
    reload,
  } = useSellerProducts(storeReady ? activeStore?._id : undefined);

  const [items, setItems] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initializeStore() {
      setStoreReady(false);
      setStoreError(null);

      try {
        const store = await loadActiveStore();

        if (cancelled) return;

        if (store?._id) {
          setStoreReady(true);
        } else {
          setStoreError(
            "No store was returned for your account. Please check your store or sign in again."
          );
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Unable to initialize Seller Center store:", err);
        setStoreError("Unable to load your store. Please try again.");
      }
    }

    void initializeStore();

    return () => {
      cancelled = true;
    };
  }, [loadActiveStore]);

  useEffect(() => {
    setItems(products || []);
  }, [products]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return items;

    return items.filter((product: any) =>
      String(product.name || "").toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const totalCount = items.length;

  const lowStockCount = items.filter((product: any) => {
    const stock = Number(product.stock ?? 0);
    return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  }).length;

  const outOfStockCount = items.filter(
    (product: any) => Number(product.stock ?? 0) <= 0
  ).length;

  function handleEdit(productId: string) {
    navigate(`/seller/products/edit/${productId}`);
  }

  async function handleDelete(productId: string, productName: string) {
    const confirmed = window.confirm(
      `Delete "${productName}"? This can't be undone.`
    );

    if (!confirmed) return;

    setDeleteError(null);
    setDeletingId(productId);

    try {
      await sellerApi.deleteProduct(productId);

      setItems((previous) =>
        previous.filter((product) => product._id !== productId)
      );

      await reload();
    } catch (err: any) {
      console.error("Failed to delete product:", err);
      setDeleteError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete product. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="seller-products">
      <div className="products-body">
        <div className="products-header">
          <div className="header-copy">
            <span className="eyebrow">Inventory</span>
            <h1>Products</h1>
            <p>
              Manage your store products
              {activeStore?.name ? ` — ${activeStore.name}` : ""}
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => navigate("/seller/products/add")}
          >
            + Add Product
          </button>
        </div>

        {storeError && (
          <p style={{ color: "var(--danger)" }}>{storeError}</p>
        )}

        {error && (
          <p style={{ color: "var(--danger)" }}>{error}</p>
        )}

        {deleteError && (
          <p style={{ color: "var(--danger)" }}>{deleteError}</p>
        )}

        {!storeReady || loading ? (
          <>
            <div className="skeleton skeleton-search" />
            <div className="skeleton skeleton-table" />
          </>
        ) : (
          <>
            <div className="products-summary">
              <div className="summary-chip">
                <span className="summary-count">{totalCount}</span>
                <span>Total products</span>
              </div>

              <div className="summary-chip summary-warning">
                <span className="summary-count">{lowStockCount}</span>
                <span>Low stock</span>
              </div>

              <div className="summary-chip summary-danger">
                <span className="summary-count">{outOfStockCount}</span>
                <span>Out of stock</span>
              </div>
            </div>

            <div className="search-bar">
              <input
                className="product-search"
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {filteredItems.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p>
                  {totalCount === 0
                    ? "No products found for this store"
                    : "No matching products"}
                </p>
                <span>
                  {totalCount === 0
                    ? "Your existing products may not be linked to the selected store. Refresh and check the product API response before creating anything new."
                    : "Try a different search term."}
                </span>

                {totalCount === 0 && (
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 16 }}
                    onClick={() => void reload()}
                  >
                    Retry loading products
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredItems.map((product: any) => {
                      const stock = Number(product.stock ?? 0);
                      const isOut = stock <= 0;
                      const isLow = !isOut && stock <= LOW_STOCK_THRESHOLD;

                      return (
                        <tr key={product._id}>
                          <td>
                            <div className="product-cell">
                              <img
                                className="product-thumb"
                                src={getImageUrl(product.images?.[0])}
                                alt={product.name || "Product"}
                                onError={(event) => {
                                  if (
                                    event.currentTarget.src !== placeholderImg
                                  ) {
                                    event.currentTarget.src = placeholderImg;
                                  }
                                }}
                              />

                              <div>
                                <h3>{product.name}</h3>
                                {product.description && (
                                  <p>{product.description}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="price-cell">
                            ${Number(product.price ?? 0).toFixed(2)}
                          </td>

                          <td>
                            <span
                              className={
                                isLow || isOut
                                  ? "stock-value stock-low"
                                  : "stock-value"
                              }
                            >
                              {stock}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                isOut
                                  ? "status-pill status-out"
                                  : "status-pill status-active"
                              }
                            >
                              {isOut ? "Out of stock" : "Active"}
                            </span>
                          </td>

                          <td>
                            <div className="actions-cell">
                              <button
                                className="icon-btn"
                                onClick={() => handleEdit(product._id)}
                              >
                                ✏️ Edit
                              </button>

                              <button
                                className="icon-btn icon-btn-danger"
                                onClick={() =>
                                  handleDelete(product._id, product.name)
                                }
                                disabled={deletingId === product._id}
                              >
                                {deletingId === product._id
                                  ? "Deleting..."
                                  : "🗑️ Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
