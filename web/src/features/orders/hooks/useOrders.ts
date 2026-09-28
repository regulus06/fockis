import { useEffect } from "react";

import { useOrderStore } from "../store/orderStore";

import { getToken } from "../../../utils/auth";


export const useOrders = () => {

  const orders = useOrderStore(
    (state) => state.orders
  );

  const loading = useOrderStore(
    (state) => state.loading
  );

  const fetchOrders = useOrderStore(
    (state) => state.fetchOrders
  );


  useEffect(() => {

    const token = getToken();


    if (!token) {

      console.log(
        "⛔ No token found. Skipping orders fetch."
      );

      return;

    }


    fetchOrders();


  }, [fetchOrders]);


  return {

    orders,

    loading,

    loadOrders: fetchOrders,

  };

};