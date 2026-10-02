import { Route, Navigate } from "react-router-dom";

import AdminRoute from "../components/AdminRoute";

import AdminDashboard from "../features/admin/pages/AdminDashboard";
import MarketplaceDashboard from "../features/admin/pages/MarketplaceDashboard";
import ProductManager from "../features/admin/pages/ProductManager";
import CategoryManager from "../features/admin/pages/CategoryManager";
import InventoryManager from "../features/admin/pages/InventoryManager";
import OrderManager from "../features/admin/pages/OrderManager";
import ReviewManager from "../features/admin/pages/ReviewManager";
import SellerManager from "../features/admin/pages/SellerManager";
import MarketingReviewManager from "../features/admin/pages/MarketingReviewManager";

import ShippingAdminPage from "../features/admin/ShippingAdminPage";

import RealestateDashboard from "../features/admin/realestate/pages/RealestateDashboard";

export function AdminRoutes() {
  return (
    <>
      {/* ================================================================
          ADMIN ROOT
          /admin
          
          Send the Administration sidebar button to the main dashboard.
      ================================================================ */}

      <Route
        path="/admin"
        element={
          <Navigate
            to="/admin/dashboard"
            replace
          />
        }
      />

      {/* ================================================================
          ADMIN DASHBOARD
      ================================================================ */}

      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* ================================================================
          MARKETPLACE
      ================================================================ */}

      <Route
        path="/admin/marketplace"
        element={
          <AdminRoute>
            <MarketplaceDashboard />
          </AdminRoute>
        }
      />

      {/* ================================================================
          PRODUCTS
      ================================================================ */}

      <Route
        path="/admin/products"
        element={
          <AdminRoute>
            <ProductManager />
          </AdminRoute>
        }
      />

      {/* ================================================================
          CATEGORIES
      ================================================================ */}

      <Route
        path="/admin/categories"
        element={
          <AdminRoute>
            <CategoryManager />
          </AdminRoute>
        }
      />

      {/* ================================================================
          INVENTORY
      ================================================================ */}

      <Route
        path="/admin/inventory"
        element={
          <AdminRoute>
            <InventoryManager />
          </AdminRoute>
        }
      />

      {/* ================================================================
          ORDERS
      ================================================================ */}

      <Route
        path="/admin/orders"
        element={
          <AdminRoute>
            <OrderManager />
          </AdminRoute>
        }
      />

      {/* ================================================================
          REVIEWS
      ================================================================ */}

      <Route
        path="/admin/reviews"
        element={
          <AdminRoute>
            <ReviewManager />
          </AdminRoute>
        }
      />

      {/* ================================================================
          SELLERS
      ================================================================ */}

      <Route
        path="/admin/sellers"
        element={
          <AdminRoute>
            <SellerManager />
          </AdminRoute>
        }
      />

      {/* ================================================================
          MARKETING REVIEW
      ================================================================ */}

      <Route
        path="/admin/marketing/review"
        element={
          <AdminRoute>
            <MarketingReviewManager />
          </AdminRoute>
        }
      />

      {/* ================================================================
          SHIPPING
      ================================================================ */}

      <Route
        path="/admin/shipping"
        element={
          <AdminRoute>
            <ShippingAdminPage />
          </AdminRoute>
        }
      />

      {/* ================================================================
          REAL ESTATE
      ================================================================ */}

      <Route
        path="/admin/realestate"
        element={
          <AdminRoute>
            <RealestateDashboard />
          </AdminRoute>
        }
      />
    </>
  );
}