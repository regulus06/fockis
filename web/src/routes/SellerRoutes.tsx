import { Route } from "react-router-dom";

import SellerLayout from "../features/seller/layout/SellerLayout";
import SellerStoreGuard from "../features/seller/components/SellerStoreGuard";

import SellerEntryPage from "../features/seller/pages/SellerEntryPage";
import SellerDashboard from "../features/seller/pages/SellerDashboard";
import SellerProductsPage from "../features/seller/pages/SellerProductsPage";
import SellerOrdersPage from "../features/seller/pages/SellerOrdersPage";
import SellerAnalyticsPage from "../features/seller/pages/SellerAnalyticsPage";
import SellerMessagesPage from "../features/seller/pages/SellerMessagesPage";
import SellerSettingsPage from "../features/seller/pages/SellerSettingsPage";
import SellerShippingPage from "../features/seller/pages/SellerShippingPage";
import SellerStoriesPage from "../features/seller/pages/SellerStoriesPage";
import SellerStoresPage from "../features/seller/pages/SellerStoresPage";
import SellerStoreSelectorPage from "../features/seller/pages/SellerStoreSelectorPage";
import EditProductPage from "../features/seller/pages/EditProductPage";
import SellerCreateStorePage from "../features/seller/pages/SellerCreateStorePage";

import AddProductForm from "../features/seller/components/AddProductForm";

export function SellerRoutes() {
  return (
    <>
      <Route
        path="/seller/entry"
        element={<SellerEntryPage />}
      />

      {/* This page must remain outside SellerStoreGuard */}
      <Route
        path="/seller/create-store"
        element={<SellerCreateStorePage />}
      />

      <Route
        path="/seller"
        element={<SellerLayout />}
      >
        <Route
          element={<SellerStoreGuard />}
        >
          <Route
            index
            element={<SellerDashboard />}
          />

          <Route
            path="stores"
            element={<SellerStoreSelectorPage />}
          />

          <Route
            path="store"
            element={<SellerStoresPage />}
          />

          <Route
            path="products"
            element={<SellerProductsPage />}
          />

          <Route
            path="products/add"
            element={<AddProductForm />}
          />

          <Route
            path="products/edit/:id"
            element={<EditProductPage />}
          />

          <Route
            path="orders"
            element={<SellerOrdersPage />}
          />

          <Route
            path="analytics"
            element={<SellerAnalyticsPage />}
          />

          <Route
            path="messages"
            element={<SellerMessagesPage />}
          />

          <Route
            path="settings"
            element={<SellerSettingsPage />}
          />

          <Route
            path="shipping"
            element={<SellerShippingPage />}
          />

          <Route
            path="stories"
            element={<SellerStoriesPage />}
          />
        </Route>
      </Route>
    </>
  );
}

export default SellerRoutes;