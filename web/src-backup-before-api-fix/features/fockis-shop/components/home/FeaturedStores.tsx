import { Link } from "react-router-dom";

import { StoreGrid } from "../stores/StoreGrid";
import { useStores } from "../../hooks/useStores";
import { ShopLoading } from "../common/ShopLoading";
import { ShopError } from "../common/ShopError";

export function FeaturedStores() {
  const {
    data,
    loading,
    error,
  } = useStores({
    sort: "newest",
    page: 1,
    pageSize: 6,
  });

  const stores = data?.items ?? [];

  return (
    <section id="stores">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="sec-label">
              <span className="num">
                06
              </span>
              STORES
            </div>

            <h2>
              Fockis stores
            </h2>
          </div>

          <Link
            to="/shop/stores"
            className="section-link"
          >
            Browse all stores →
          </Link>
        </div>

        {loading && (
          <ShopLoading rows={2} />
        )}

        {!loading && error && (
          <ShopError
            message={error}
          />
        )}

        {!loading &&
          !error &&
          stores.length > 0 && (
            <StoreGrid
              stores={stores}
            />
          )}

        {!loading &&
          !error &&
          stores.length === 0 && (
            <div className="shop-empty-state">
              <h3>
                No Fockis stores yet
              </h3>

              <p>
                Stores will appear here as
                sellers create their storefronts.
              </p>

              <Link
                to="/seller/create-store"
                className="btn btn-brass"
              >
                Open a Store
              </Link>
            </div>
          )}
      </div>
    </section>
  );
}