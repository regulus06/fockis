import {
  useEffect,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  sellerApi,
} from "../services/sellerApi";

import "../styles/SellerEntryPage.scss";

export default function SellerEntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    async function checkSeller() {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate(
          "/login",
          {
            replace: true,
          },
        );

        return;
      }

      try {
        const stores =
          await sellerApi.getMyStores();

        const storeList =
          Array.isArray(stores)
            ? stores
            : stores?.stores || [];

        /*
         * USER HAS NO STORE
         * SEND TO CREATE STORE
         */
        if (storeList.length === 0) {
          navigate(
            "/seller/create-store",
            {
              replace: true,
            },
          );

          return;
        }

        /*
         * USER HAS STORES
         * LET USER CHOOSE A STORE
         */
        navigate(
          "/seller/stores",
          {
            replace: true,
          },
        );
      } catch (error) {
        console.error(
          "Seller check failed:",
          error,
        );

        navigate(
          "/login",
          {
            replace: true,
          },
        );
      }
    }

    void checkSeller();
  }, [navigate]);

  return (
    <div className="seller-entry-page">
      <div className="seller-entry-loading">
        Checking seller account...
      </div>
    </div>
  );
}