import {
  useCallback,
  useEffect,
  useState,
} from "react";


import {
  marketplaceAdminApi,
} from "../service/marketplaceAdminApi";



export interface Order {


  _id: string;


  customer?: {

    name: string;

    email?: string;

  };


  total: number;


  status: string;


  createdAt?: string;


}







export const useOrders = () => {



  const [orders, setOrders] =
    useState<Order[]>([]);



  const [loading, setLoading] =
    useState(false);








  const loadOrders = useCallback(
    async () => {


      try {


        setLoading(true);



        const response =
          await marketplaceAdminApi.getOrders();




        setOrders(

          response.data?.orders ??

          response.data ??

          []

        );




      } catch (error) {


        console.error(
          "Failed loading orders",
          error
        );



      } finally {


        setLoading(false);


      }



    },
    []
  );








  useEffect(() => {


    loadOrders();


  }, [loadOrders]);









  return {


    orders,


    loading,


    loadOrders,


  };



};