import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  sellerApi,
} from "../services/sellerApi";

import {
  orderApi,
} from "../../orders/services/orderApi";

import ShippingPanel from "../components/ShippingPanel";

import "../styles/SellerDashboard.scss";

type IconProps = {
  size?: number;
};

// =====================================================
// ICONS
// =====================================================

const IconPlus = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const IconImage = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2"
    />

    <circle
      cx="9"
      cy="10"
      r="1.8"
    />

    <path d="m21 16-5.5-5.5L4 21" />
  </svg>
);

const IconStore = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9 4.5 4h15L21 9" />
    <path d="M3 9v11h18V9" />
    <path d="M3 9a3 3 0 0 0 6 0" />
    <path d="M9 9a3 3 0 0 0 6 0" />
    <path d="M15 9a3 3 0 0 0 6 0" />
  </svg>
);

// =====================================================
// SELLER DASHBOARD
// =====================================================

export default function SellerDashboard() {
  const navigate = useNavigate();

  const [
    products,
    setProducts,
  ] = useState<any[]>([]);

  const [
    orders,
    setOrders,
  ] = useState<any[]>([]);

  const [
    stores,
    setStores,
  ] = useState<any[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);

      const [
        productData,
        orderData,
        storeData,
      ] = await Promise.all([
        sellerApi.getSellerProducts(),
        orderApi.getSellerOrders(),
        sellerApi.getMyStores(),
      ]);

      setProducts(
        Array.isArray(productData)
          ? productData
          : [],
      );

      setOrders(
        Array.isArray(orderData)
          ? orderData
          : [],
      );

      setStores(
        Array.isArray(storeData)
          ? storeData
          : [],
      );
    } catch (error) {
      console.error(
        "Seller dashboard loading error:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // REVENUE
  // =====================================================

  const revenue = useMemo(() => {
    return orders.reduce(
      (
        total,
        order,
      ) =>
        total +
        Number(
          order.totalAmount || 0,
        ),
      0,
    );
  }, [orders]);

  // =====================================================
  // KPI VALUES
  // =====================================================

  const totalOrders = orders.length;

  const totalProducts = products.length;

  const totalStores = stores.length;

  // =====================================================
  // INVENTORY ALERTS
  // =====================================================

  const inventoryAlerts = useMemo(() => {
    return [
      ...products,
    ]
      .sort(
        (
          a,
          b,
        ) =>
          Number(a.stock || 0) -
          Number(b.stock || 0),
      )
      .slice(0, 5);
  }, [products]);

  // =====================================================
  // RECENT ORDERS
  // =====================================================

  const recentOrders = useMemo(() => {
    return orders.slice(0, 5);
  }, [orders]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="seller-dashboard">
        <div className="dashboard-body">
          <div className="skeleton skeleton-hero" />

          <div className="skeleton-kpi-row">
            {Array.from({
              length: 4,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="skeleton skeleton-kpi"
                />
              ),
            )}
          </div>

          <div className="skeleton skeleton-block" />
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="seller-dashboard">
      <div className="dashboard-body">
        {/* ================= WELCOME ================= */}

        <div className="welcome-box">
          <div className="welcome-copy">
            <span className="eyebrow">
              Store overview
            </span>

            <h1>
              Welcome back
            </h1>

            <p>
              Manage your stores, products and
              orders from one place.
            </p>
          </div>

          <div className="welcome-actions">
            <button
              className="btn btn-primary"
              onClick={() =>
                navigate(
                  "/seller/create-store",
                )
              }
            >
              <IconStore size={16} />

              Open Store
            </button>

            <button
              className="btn btn-primary"
              onClick={() =>
                navigate(
                  "/seller/products/add",
                )
              }
            >
              <IconPlus size={16} />

              Add product
            </button>

            <button
              className="btn btn-ghost"
              onClick={() =>
                navigate(
                  "/seller/stories",
                )
              }
            >
              <IconImage size={16} />

              Create story
            </button>
          </div>
        </div>

        {/* ================= RECENT ORDERS ================= */}

        <div className="seller-section">
          <div className="section-head">
            <h2>
              Recent orders
            </h2>
          </div>

          <div className="orders-list">
            {recentOrders.map(
              (order) => (
                <div
                  key={order._id}
                  className="order-row"
                >
                  <div>
                    <strong>
                      Order #
                      {order._id?.slice(-6)}
                    </strong>

                    <span>
                      {order.status ||
                        "Pending"}
                    </span>
                  </div>

                  <strong>
                    $
                    {Number(
                      order.totalAmount ||
                        0,
                    ).toFixed(2)}
                  </strong>
                </div>
              ),
            )}

            {recentOrders.length === 0 && (
              <p>
                No recent orders
              </p>
            )}
          </div>
        </div>

        {/* ================= SHIPPING ================= */}

        <div className="seller-section">
          <div className="section-head">
            <h2>
              Shipping
            </h2>
          </div>

          <ShippingPanel />
        </div>
      </div>

      <div className="dashboard-footer" />
    </div>
  );
}