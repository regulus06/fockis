import { Navigate, Route, Routes } from "react-router-dom";

import ShopAdminLayout from "../components/ShopAdminLayout";

import ShopAdminDashboard from "../pages/ShopAdminDashboard";
import ShopAdminProductsPage from "../pages/ShopAdminProductsPage";
import ShopAdminSellersPage from "../pages/ShopAdminSellersPage";
import ShopAdminStoresPage from "../pages/ShopAdminStoresPage";
import ShopAdminPlaceholderPage from "../pages/ShopAdminPlaceholderPage";

export default function ShopAdminRoutes() {
  return (
    <Routes>
      <Route element={<ShopAdminLayout />}>
        {/* ============================================================
            SHOP ADMIN DASHBOARD
        ============================================================ */}

        <Route
          index
          element={<ShopAdminDashboard />}
        />

        {/* ============================================================
            PRODUCTS
        ============================================================ */}

        <Route
          path="products"
          element={<ShopAdminProductsPage />}
        />

        {/* ============================================================
            SELLERS
        ============================================================ */}

        <Route
          path="sellers"
          element={<ShopAdminSellersPage />}
        />

        {/* ============================================================
            STORES
        ============================================================ */}

        <Route
          path="stores"
          element={<ShopAdminStoresPage />}
        />

        {/* ============================================================
            MODERATION
        ============================================================ */}

        <Route
          path="moderation"
          element={<ShopAdminPlaceholderPage />}
        />

        {/* ============================================================
            SHOP RULES
        ============================================================ */}

        <Route
          path="rules"
          element={<ShopAdminPlaceholderPage />}
        />

        {/* ============================================================
            SHOP SETTINGS
        ============================================================ */}

        <Route
          path="settings"
          element={<ShopAdminPlaceholderPage />}
        />

        {/* ============================================================
            FALLBACK
        ============================================================ */}

        <Route
          path="*"
          element={
            <Navigate
              to="/admin/shop"
              replace
            />
          }
        />
      </Route>
    </Routes>
  );
}