import {
  useCallback,
  useEffect,
  useState,
} from "react";


import {
  marketplaceAdminApi,
} from "../service/marketplaceAdminApi";



export interface MarketplaceDashboard {

  products: number;

  sellers: number;

  orders: number;

  revenue: number;

}







export const useMarketplaceDashboard = () => {


  const [dashboard, setDashboard] =
    useState<MarketplaceDashboard | null>(
      null
    );



  const [loading, setLoading] =
    useState(false);







  const loadDashboard = useCallback(
    async () => {


      try {


        setLoading(true);



        const response =
          await marketplaceAdminApi.getDashboard();




        setDashboard(

          response.data?.dashboard ??
          response.data ??
          null

        );



      } catch (error) {


        console.error(
          "Dashboard loading failed",
          error
        );


      } finally {


        setLoading(false);


      }


    },
    []
  );







  useEffect(() => {


    loadDashboard();


  }, [loadDashboard]);









  return {


    dashboard,

    loading,

    loadDashboard,


  };


};