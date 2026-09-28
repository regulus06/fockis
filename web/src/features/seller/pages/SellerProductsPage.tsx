import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useActiveStore } from "../store/activeStore";
import { useSellerProducts } from "../hooks/useSellerProducts";
import { sellerApi } from "../services/sellerApi";

import "../styles/SellerProductsPage.scss";

// Inline SVG data URI — no external file needed, so this can never 404.
const placeholderImg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='14' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

function getImageUrl(image: any) {
  if (!image) {
    return placeholderImg;
  }

  let img = image;

  if (typeof img === "object") {
    img =
      img.url ||
      img.path ||
      img.filename ||
      img.fileName ||
      img.file;
  }

  if (!img) {
    return placeholderImg;
  }

  img = String(img);

  // Guard against corrupted upload data.
  if (
    img.includes("undefined") ||
    img.includes("null") ||
    img.trim() === ""
  ) {
    return placeholderImg;
  }

  if (img.startsWith("http")) {
    return img;
  }

  if (img.startsWith("/uploads")) {
    return "http://localhost:3000" + img;
  }

  if (img.startsWith("/")) {
    return "http://localhost:3000" + img;
  }

  return "http://localhost:3000/uploads/" + img;
}

const LOW_STOCK_THRESHOLD = 5;

export default function SellerProductsPage() {
  const navigate = useNavigate();

  const { activeStore } = useActiveStore();

  const {
    products,
    loading,
    error,
  } = useSellerProducts(
    activeStore?._id
  );

  // Local mirror of the product list so a delete
  // can remove an item immediately.
  const [
    items,
    setItems,
  ] = useState<any[]>([]);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(
    null
  );

  const [
    deleteError,
    setDeleteError,
  ] = useState<string | null>(
    null
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  useEffect(() => {
    setItems(products || []);
  }, [products]);

  const filteredItems = useMemo(() => {
    const term =
      searchTerm
        .trim()
        .toLowerCase();

    if (!term) {
      return items;
    }

    return items.filter(
      (product: any) =>
        product.name
          ?.toLowerCase()
          .includes(term)
    );
  }, [
    items,
    searchTerm,
  ]);

  const totalCount =
    items.length;

  const lowStockCount =
    items.filter(
      (product: any) =>
        product.stock !==
          undefined &&
        product.stock > 0 &&
        product.stock <=
          LOW_STOCK_THRESHOLD
    ).length;

  const outOfStockCount =
    items.filter(
      (product: any) =>
        product.stock !==
          undefined &&
        product.stock <= 0
    ).length;

  function handleEdit(
    productId: string
  ) {
    navigate(
      `/seller/products/edit/${productId}`
    );
  }

  async function handleDelete(
    productId: string,
    productName: string
  ) {
    const confirmed =
      window.confirm(
        `Delete "${productName}"? This can't be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setDeletingId(productId);

    try {
      await sellerApi.deleteProduct(
        productId
      );

      setItems((prev) =>
        prev.filter(
          (product) =>
            product._id !==
            productId
        )
      );
    } catch (err: any) {
      console.error(
        "Failed to delete product:",
        err
      );

      setDeleteError(
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

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="products-header">
          <div className="header-copy">
            <span className="eyebrow">
              Inventory
            </span>

            <h1>
              Products
            </h1>

            <p>
              Manage your store products
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() =>
              navigate(
                "/seller/products/add"
              )
            }
          >
            + Add Product
          </button>
        </div>

        {/* =================================================
            ERRORS
        ================================================= */}

        {error && (
          <p
            style={{
              color:
                "var(--danger)",
            }}
          >
            {error}
          </p>
        )}

        {deleteError && (
          <p
            style={{
              color:
                "var(--danger)",
            }}
          >
            {deleteError}
          </p>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <>
            <div className="skeleton skeleton-search" />

            <div className="skeleton skeleton-table" />
          </>
        ) : (
          <>
            {/* =============================================
                SUMMARY
            ============================================= */}

            <div className="products-summary">

              <div className="summary-chip">
                <span className="summary-count">
                  {totalCount}
                </span>

                <span>
                  Total products
                </span>
              </div>

              <div className="summary-chip summary-warning">
                <span className="summary-count">
                  {lowStockCount}
                </span>

                <span>
                  Low stock
                </span>
              </div>

              <div className="summary-chip summary-danger">
                <span className="summary-count">
                  {outOfStockCount}
                </span>

                <span>
                  Out of stock
                </span>
              </div>

            </div>

            {/* =============================================
                SEARCH
            ============================================= */}

            <div className="search-bar">
              <input
                className="product-search"
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
              />
            </div>

            {/* =============================================
                EMPTY STATE
            ============================================= */}

            {filteredItems.length === 0 ? (
              <div className="empty-state">

                <div className="empty-icon">
                  📦
                </div>

                <p>
                  {totalCount === 0
                    ? "No products yet"
                    : "No matching products"}
                </p>

                <span>
                  {totalCount === 0
                    ? "Start adding products to your store."
                    : "Try a different search term."}
                </span>

                {totalCount === 0 && (
                  <button
                    className="btn btn-primary"
                    style={{
                      marginTop: 16,
                    }}
                    onClick={() =>
                      navigate(
                        "/seller/products/add"
                      )
                    }
                  >
                    Create First Product
                  </button>
                )}

              </div>
            ) : (

              /* ===========================================
                 PRODUCT TABLE
              =========================================== */

              <div className="table-wrapper">

                <table className="inventory-table">

                  <thead>
                    <tr>
                      <th>
                        Product
                      </th>

                      <th>
                        Price
                      </th>

                      <th>
                        Stock
                      </th>

                      <th>
                        Status
                      </th>

                      <th
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredItems.map(
                      (product: any) => {

                        const stock =
                          product.stock ??
                          0;

                        const isOut =
                          stock <= 0;

                        const isLow =
                          !isOut &&
                          stock <=
                            LOW_STOCK_THRESHOLD;

                        return (
                          <tr
                            key={
                              product._id
                            }
                          >

                            {/* PRODUCT */}

                            <td>
                              <div className="product-cell">

                                <img
                                  className="product-thumb"
                                  src={getImageUrl(
                                    product
                                      .images?.[0]
                                  )}
                                  alt={
                                    product.name
                                  }
                                  onError={(
                                    event
                                  ) => {
                                    if (
                                      event
                                        .currentTarget
                                        .src !==
                                      placeholderImg
                                    ) {
                                      console.log(
                                        "FAILED IMAGE:",
                                        product.images
                                      );

                                      event
                                        .currentTarget
                                        .src =
                                        placeholderImg;
                                    }
                                  }}
                                />

                                <div>
                                  <h3>
                                    {
                                      product.name
                                    }
                                  </h3>

                                  {product.description && (
                                    <p>
                                      {
                                        product.description
                                      }
                                    </p>
                                  )}
                                </div>

                              </div>
                            </td>

                            {/* PRICE */}

                            <td className="price-cell">
                              $
                              {product.price}
                            </td>

                            {/* STOCK */}

                            <td>
                              <span
                                className={
                                  isLow ||
                                  isOut
                                    ? "stock-value stock-low"
                                    : "stock-value"
                                }
                              >
                                {stock}
                              </span>
                            </td>

                            {/* STATUS */}

                            <td>
                              <span
                                className={
                                  isOut
                                    ? "status-pill status-out"
                                    : "status-pill status-active"
                                }
                              >
                                {isOut
                                  ? "Out of stock"
                                  : "Active"}
                              </span>
                            </td>

                            {/* ACTIONS */}

                            <td>
                              <div className="actions-cell">

                                <button
                                  className="icon-btn"
                                  onClick={() =>
                                    handleEdit(
                                      product._id
                                    )
                                  }
                                >
                                  ✏️ Edit
                                </button>

                                <button
                                  className="icon-btn icon-btn-danger"
                                  onClick={() =>
                                    handleDelete(
                                      product._id,
                                      product.name
                                    )
                                  }
                                  disabled={
                                    deletingId ===
                                    product._id
                                  }
                                >
                                  {deletingId ===
                                  product._id
                                    ? "Deleting..."
                                    : "🗑️ Delete"}
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      }
                    )}

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