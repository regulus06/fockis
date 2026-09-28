import {
  useEffect,
  useState,
} from "react";

import {
  businessesApi,
} from "../services/businessesApi";

import type {
  Business,
} from "../types/business.types";

import "../styles/BusinessFeedRail.scss";


/* ============================================================================
   BUSINESS FEED RAIL
============================================================================ */

export default function BusinessFeedRail() {

  const [
    businesses,
    setBusinesses,
  ] = useState<Business[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<string | null>(null);



  useEffect(() => {

    async function loadBusinesses() {

      try {

        setLoading(true);
        setError(null);


        const data =
          await businessesApi.getAll();


        setBusinesses(data);


      } catch (err) {

        console.error(
          "[BusinessFeedRail] Failed",
          err,
        );


        setError(
          err instanceof Error
            ? err.message
            : "Failed to load businesses",
        );


      } finally {

        setLoading(false);

      }

    }


    loadBusinesses();

  }, []);





  if (loading) {

    return (

      <section className="fk-business-feed-rail">

        <div className="fk-business-feed-rail__header">

          <h3 className="fk-business-feed-rail__title">
            Businesses
          </h3>

        </div>


        <p className="fk-business-feed-rail__status">
          Loading businesses...
        </p>

      </section>

    );

  }





  if (error) {

    return (

      <section className="fk-business-feed-rail">

        <div className="fk-business-feed-rail__header">

          <h3 className="fk-business-feed-rail__title">
            Businesses
          </h3>

        </div>


        <p className="fk-business-feed-rail__status fk-business-feed-rail__status--error">
          {error}
        </p>

      </section>

    );

  }





  if (!businesses.length) {

    return (

      <section className="fk-business-feed-rail">

        <div className="fk-business-feed-rail__header">

          <h3 className="fk-business-feed-rail__title">
            Businesses
          </h3>

        </div>


        <p className="fk-business-feed-rail__status">
          No businesses available.
        </p>

      </section>

    );

  }





  return (

    <section className="fk-business-feed-rail">


      <div className="fk-business-feed-rail__header">

        <h3 className="fk-business-feed-rail__title">
          Businesses
        </h3>

      </div>




      {/* ==========================================================================
          SCROLLER

          This is the element FockisFeedPage.scss targets for horizontal
          scroll behavior (overflow-x: auto, touch-action: pan-x, mobile
          width overrides, etc). It must keep this exact class name.
      ========================================================================== */}

      <div className="fk-business-feed-rail__scroller">


        {
          businesses.map(
            (business) => (

              <article

                key={
                  business.id
                }

                className="fk-business-card"

              >


                {
                  business.logoUrl ? (

                    <img

                      src={
                        business.logoUrl
                      }

                      alt={
                        business.name
                      }

                      className="fk-business-card__logo"

                    />

                  ) : (

                    <div className="fk-business-card__logo-placeholder">

                      🏪

                    </div>

                  )

                }





                <div className="fk-business-card__content">


                  <h4 className="fk-business-card__name">

                    {
                      business.name
                    }

                  </h4>




                  <p className="fk-business-card__description">

                    {
                      business.description ||
                      "No description available."
                    }

                  </p>



                  <button
                    type="button"
                    className="fk-business-card__button"
                  >

                    View Business

                  </button>


                </div>


              </article>

            )
          )
        }


      </div>


    </section>

  );

}