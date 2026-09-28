import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { sellerApi } from "../services/sellerApi";

type Store = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
};

type SellerStoreGuardProps = {
  children?: React.ReactNode;
};

function normalizeStores(data: unknown): Store[] {
  if (Array.isArray(data)) {
    return data.filter(Boolean) as Store[];
  }

  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { stores?: unknown[] }).stores)
  ) {
    return ((data as { stores: unknown[] }).stores).filter(
      Boolean,
    ) as Store[];
  }

  if (data && typeof data === "object") {
    const store = data as Store;

    if (store._id || store.id) {
      return [store];
    }
  }

  return [];
}

const SellerStoreGuard: React.FC<SellerStoreGuardProps> = ({
  children,
}) => {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkStores = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await sellerApi.getMyStores();
        const stores = normalizeStores(response);

        if (!mounted) {
          return;
        }

        setHasStore(stores.length > 0);

        if (stores.length > 0) {
          const firstStore = stores[0];
          const storeId = firstStore._id || firstStore.id;

          if (storeId) {
            localStorage.setItem(
              "activeStoreId",
              String(storeId),
            );
          }
        }
      } catch (err) {
        console.error(
          "SELLER STORE GUARD: Cannot load stores",
          err,
        );

        if (!mounted) {
          return;
        }

        setHasStore(false);
        setError(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkStores();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="seller-store-guard">
        <div className="seller-store-guard__card">
          <div className="seller-store-guard__spinner" />

          <h2>Checking your store</h2>

          <p>
            We’re checking whether you have a Fockis store
            available.
          </p>
        </div>
      </div>
    );
  }

  /*
   * If the user has no store, they must create one before
   * accessing Seller Center.
   */
  if (!hasStore) {
    return (
      <Navigate
        to="/seller/create-store"
        replace
        state={{
          from: location.pathname,
          reason: error
            ? "store-check-failed"
            : "no-store",
        }}
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default SellerStoreGuard;