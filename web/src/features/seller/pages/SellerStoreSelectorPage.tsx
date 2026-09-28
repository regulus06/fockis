import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  sellerApi,
} from "../services/sellerApi";

import {
  useActiveStore,
} from "../store/activeStore";

import "../styles/SellerStoreSelectorPage.scss";

interface Store {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  fockisStoreId?: string;
  domainName?: string;
  country?: string;
  city?: string;
}

export default function SellerStoreSelectorPage() {
  const navigate = useNavigate();

  const {
    setActiveStore,
  } = useActiveStore();

  const [
    stores,
    setStores,
  ] = useState<Store[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      setLoading(true);
      setError(null);

      const response =
        await sellerApi.getMyStores();

      const storeList: Store[] =
        Array.isArray(response)
          ? response
          : Array.isArray(
              response?.stores,
            )
            ? response.stores
            : [];

      setStores(storeList);
    } catch (error) {
      console.error(
        "Loading stores failed:",
        error,
      );

      setError(
        "We couldn't load your stores. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function selectStore(
    store: Store,
  ) {
    setActiveStore(store);

    localStorage.setItem(
      "activeStoreId",
      store._id,
    );

    localStorage.setItem(
      "activeStore",
      JSON.stringify(store),
    );

    navigate(
      "/seller",
      {
        replace: true,
      },
    );
  }

  function addProduct(
    store: Store,
  ) {
    setActiveStore(store);

    localStorage.setItem(
      "activeStoreId",
      store._id,
    );

    localStorage.setItem(
      "activeStore",
      JSON.stringify(store),
    );

    navigate(
      "/seller/products/add",
    );
  }

  function createStore() {
    navigate(
      "/seller/create-store",
    );
  }

  if (loading) {
    return (
      <div className="seller-loading">
        <div className="seller-loading__spinner" />

        <h2>
          Loading your stores
        </h2>

        <p>
          Please wait while we load your
          Fockis stores.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seller-store-selector">
        <div className="seller-store-selector__header">
          <div>
            <h1>
              My Stores
            </h1>

            <p>
              Manage your Fockis stores from
              one place.
            </p>
          </div>

          <button
            type="button"
            onClick={createStore}
          >
            + Create New Store
          </button>
        </div>

        <div className="seller-store-empty seller-store-empty--error">
          <div className="seller-store-empty__icon">
            !
          </div>

          <h2>
            Unable to load your stores
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={loadStores}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="seller-store-selector">
        <div className="seller-store-selector__header">
          <div>
            <h1>
              My Stores
            </h1>

            <p>
              Manage your Fockis stores from
              one place.
            </p>
          </div>

          <button
            type="button"
            onClick={createStore}
          >
            + Create New Store
          </button>
        </div>

        <div className="seller-store-empty">
          <div className="seller-store-empty__icon">
            F
          </div>

          <h2>
            No store yet
          </h2>

          <p>
            You haven't created a Fockis store
            yet. Create your first store to
            start selling products, managing
            orders, and building your business
            on Fockis.
          </p>

          <button
            type="button"
            onClick={createStore}
          >
            Create Your First Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-store-selector">
      <div className="seller-store-selector__header">
        <div>
          <h1>
            My Stores
          </h1>

          <p>
            Select the store you want to
            manage.
          </p>
        </div>

        <button
          type="button"
          onClick={createStore}
        >
          + Create New Store
        </button>
      </div>

      <div className="seller-store-list">
        {stores.map(
          (store) => (
            <div
              key={store._id}
              className="seller-store-card"
            >
              <div className="seller-store-card__image">
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                  />
                ) : (
                  <div className="seller-store-card__placeholder">
                    F
                  </div>
                )}
              </div>

              <div className="seller-store-card__content">
                <h2>
                  {store.name}
                </h2>

                <p className="seller-store-card__slug">
                  @{store.slug}
                </p>

                {store.domainName && (
                  <p className="seller-store-card__domain">
                    {store.domainName}
                  </p>
                )}

                {store.fockisStoreId && (
                  <p className="seller-store-card__id">
                    Store ID:{" "}
                    {store.fockisStoreId}
                  </p>
                )}

                {(store.city ||
                  store.country) && (
                  <p className="seller-store-card__location">
                    {[
                      store.city,
                      store.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}

                <div className="store-buttons">
                  <button
                    type="button"
                    onClick={() =>
                      selectStore(
                        store,
                      )
                    }
                  >
                    Manage Store
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      addProduct(
                        store,
                      )
                    }
                  >
                    + Add Product
                  </button>

                  <button
                    type="button"
                    className="store-buttons__view"
                    onClick={() =>
                      navigate(
                        `/shop/store/${encodeURIComponent(
                          store.slug,
                        )}`,
                      )
                    }
                  >
                    View Store
                  </button>
                </div>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}