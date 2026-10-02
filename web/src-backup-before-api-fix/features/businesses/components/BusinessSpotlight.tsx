import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  businessesApi,
} from "../services/businessesApi";

import type {
  Business,
} from "../types/business.types";

import BusinessSpotlightCard
  from "./BusinessSpotlightCard";

import "../styles/BusinessSpotlight.scss";


export default function BusinessSpotlight() {

  const navigate = useNavigate();

  const [
    businesses,
    setBusinesses,
  ] = useState<Business[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);


  useEffect(() => {

    let mounted = true;

    businessesApi
      .getSpotlight()
      .then((data: Business[]) => {

        if (mounted) {
          setBusinesses(data);
        }

      })
      .catch((error: unknown) => {

        console.error(
          "Business spotlight:",
          error,
        );

      })
      .finally(() => {

        if (mounted) {
          setLoading(false);
        }

      });


    return () => {
      mounted = false;
    };

  }, []);


  if (
    !loading &&
    businesses.length === 0
  ) {
    return null;
  }


  function handleViewAll() {
    navigate("/businesses");
  }


  return (
    <section
      className="fk-business-spotlight"
      aria-label="Business Spotlight"
    >

      <div className="fk-business-spotlight__header">

        <div className="fk-business-spotlight__heading">

          <div className="fk-business-spotlight__icon">
            🏢
          </div>

          <div>

            <h2>
              Business Spotlight
            </h2>

            <p>
              Discover businesses, offers & local deals
            </p>

          </div>

        </div>


        <button
          type="button"
          className="fk-business-spotlight__view-all"
          onClick={handleViewAll}
        >
          View all
        </button>

      </div>


      <div
        className="fk-business-spotlight__scroller"
      >

        {loading

          ? Array.from({
              length: 3,
            }).map((_, index) => (

              <div
                key={index}
                className="fk-business-card fk-business-card--skeleton"
              />

            ))

          : businesses.map(
              (business: Business) => (

                <BusinessSpotlightCard
                  key={business._id}
                  business={business}
                />

              ),
            )}

      </div>

    </section>
  );
}