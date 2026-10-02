import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import BusinessDealForm from "../components/BusinessDealForm";

import {
  businessesApi,
} from "../services/businessesApi";

import type {
  Business,
  BusinessDeal,
} from "../types/business.types";

import type {
  BusinessDealFormValues,
} from "../components/BusinessDealForm";

import "../styles/BusinessManagerPage.scss";


export default function BusinessManagerPage() {

  const navigate = useNavigate();

  const [
    businesses,
    setBusinesses,
  ] = useState<Business[]>([]);


  const [
    selectedBusiness,
    setSelectedBusiness,
  ] = useState<Business | null>(null);


  const [
    showDealForm,
    setShowDealForm,
  ] = useState(false);


  const [
    publishingId,
    setPublishingId,
  ] = useState<string | null>(null);


  const [
    spotlightingId,
    setSpotlightingId,
  ] = useState<string | null>(null);



  const loadBusinesses = async () => {

    try {

      const data =
        await businessesApi.getMine();

      setBusinesses(data);


      if (
        selectedBusiness
      ) {

        const updated =
          data.find(
            (item) =>
              item.id === selectedBusiness.id,
          );


        if (updated) {

          setSelectedBusiness(updated);

        }

      }


    } catch(error) {

      console.error(
        "Unable to load businesses",
        error,
      );

    }

  };



  useEffect(() => {

    loadBusinesses();

  }, []);





  const handleDealSubmit = async (
    values: BusinessDealFormValues,
  ) => {


    if (
      !selectedBusiness
    ) {
      return;
    }


    try {


      await businessesApi.createDeal(
        selectedBusiness.id,
        values,
      );


      setShowDealForm(false);


      await loadBusinesses();


    } catch(error) {

      console.error(
        "Create deal failed",
        error,
      );

      throw error;

    }

  };






  const handleDelete = async (
    id:string,
  ) => {


    try {


      await businessesApi.remove(
        id,
      );



      if (
        selectedBusiness?.id === id
      ) {

        setSelectedBusiness(null);

      }



      await loadBusinesses();



    } catch(error) {


      console.error(
        "Delete business failed",
        error,
      );

    }

  };






  const handleTogglePublish = async (
    business: Business,
  ) => {

    setPublishingId(
      business.id,
    );

    try {

      if (
        business.feedEnabled
      ) {

        await businessesApi.unpublish(
          business.id,
        );

      } else {

        await businessesApi.publish(
          business.id,
        );

      }

      await loadBusinesses();

    } catch(error) {

      console.error(
        "Publish toggle failed",
        error,
      );

    } finally {

      setPublishingId(
        null,
      );

    }

  };






  const handleToggleSpotlight = async (
    business: Business,
  ) => {

    /*
     * Spotlight requires a business to already be
     * published to the feed. Enforcing this in the
     * UI mirrors the backend gate in getSpotlight(),
     * which requires feedEnabled AND spotlightEnabled.
     */

    if (
      !business.feedEnabled &&
      !business.spotlightEnabled
    ) {

      console.warn(
        "Publish this business before adding it to Spotlight.",
      );

      return;

    }


    setSpotlightingId(
      business.id,
    );

    try {

      await businessesApi.update(
        business.id,
        {
          spotlightEnabled:
            !business.spotlightEnabled,
        },
      );

      await loadBusinesses();

    } catch(error) {

      console.error(
        "Spotlight toggle failed",
        error,
      );

    } finally {

      setSpotlightingId(
        null,
      );

    }

  };






  return (

    <div className="business-manager-page">


      <header className="manager-header">


        <div>

          <h1>
            Business Manager
          </h1>


          <p>
            Manage your businesses and deals.
          </p>


        </div>




        <button
          className="primary-button"
          onClick={() =>
            navigate("/businesses/create")
          }
        >
          + Create Business
        </button>


      </header>






      {
        showDealForm &&
        selectedBusiness && (

          <section className="panel">


            <BusinessDealForm

              onSubmit={
                handleDealSubmit
              }


              onCancel={() =>
                setShowDealForm(false)
              }

            />


          </section>

        )
      }







      <div className="business-grid">


        {
          businesses.map(
            (
              business,
            ) => (


              <article
                key={
                  business.id
                }
                className="business-card"
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

                      className="business-logo"

                    />

                  ) : (


                    <div className="business-logo-placeholder">

                      🏢

                    </div>


                  )
                }







                <div className="business-content">


                  <h2>

                    {
                      business.name
                    }

                  </h2>




                  <div className="status-badge-row">


                    <span
                      className={
                        business.feedEnabled
                          ? "status-badge status-badge--live"
                          : "status-badge status-badge--pending"
                      }
                    >

                      {
                        business.feedEnabled
                          ? "Live on Feed"
                          : "Not Published"
                      }

                    </span>



                    {
                      business.spotlightEnabled && (

                        <span className="status-badge status-badge--spotlight">

                          🔥 Spotlighted

                        </span>

                      )
                    }


                  </div>





                  <p>

                    {
                      business.description ||
                      "No description available."
                    }

                  </p>






                  <div className="business-actions">



                    <button

                      onClick={() =>
                        setSelectedBusiness(
                          business,
                        )
                      }

                    >

                      Select

                    </button>






                    <button

                      onClick={() => {

                        setSelectedBusiness(
                          business,
                        );


                        setShowDealForm(
                          true,
                        );

                      }}

                    >

                      Add Deal

                    </button>






                    <button

                      className={
                        business.feedEnabled
                          ? "secondary"
                          : "primary-button"
                      }

                      disabled={
                        publishingId ===
                        business.id
                      }

                      onClick={() =>
                        handleTogglePublish(
                          business,
                        )
                      }

                    >

                      {
                        publishingId ===
                        business.id
                          ? "Working..."
                          : business.feedEnabled
                            ? "Unpublish"
                            : "Publish"
                      }

                    </button>






                    <button

                      className={
                        business.spotlightEnabled
                          ? "secondary"
                          : "spotlight-button"
                      }

                      disabled={
                        spotlightingId ===
                          business.id ||
                        (
                          !business.feedEnabled &&
                          !business.spotlightEnabled
                        )
                      }

                      title={
                        !business.feedEnabled &&
                        !business.spotlightEnabled
                          ? "Publish this business before adding it to Spotlight"
                          : undefined
                      }

                      onClick={() =>
                        handleToggleSpotlight(
                          business,
                        )
                      }

                    >

                      {
                        spotlightingId ===
                        business.id
                          ? "Working..."
                          : business.spotlightEnabled
                            ? "Remove from Spotlight"
                            : "Add to Spotlight"
                      }

                    </button>






                    <button

                      className="danger"

                      onClick={() =>
                        handleDelete(
                          business.id,
                        )
                      }

                    >

                      Delete

                    </button>



                  </div>


                </div>



              </article>


            )
          )
        }


      </div>








      {
        selectedBusiness && (

          <section className="selected-panel">


            <h2>

              {
                selectedBusiness.name
              }

            </h2>




            <h3>
              Deals
            </h3>






            {
              selectedBusiness.deals?.length ? (


                selectedBusiness.deals.map(
                  (
                    deal: BusinessDeal,
                  ) => (


                    <div

                      key={
                        deal.id
                      }

                      className="deal-row"

                    >


                      <strong>

                        {
                          deal.title
                        }

                      </strong>



                      <span>

                        {
                          deal.discount ||
                          deal.couponCode
                        }

                      </span>


                    </div>


                  )
                )


              ) : (


                <p>
                  No deals available
                </p>


              )
            }



          </section>


        )
      }





    </div>

  );

}