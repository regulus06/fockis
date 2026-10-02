import React, { useEffect } from "react";
import { useOrders } from "../hooks/useOrders";
import OrderCard from "../components/OrderCard";

const OrdersPage: React.FC = () => {

  const {
    orders,
    loading,
    loadOrders,
  } = useOrders();


  useEffect(() => {

    loadOrders();

  }, [loadOrders]);


  if (loading) {
    return (
      <p>
        Loading orders...
      </p>
    );
  }


  return (

    <div className="p-4">

      <h1 className="text-2xl font-bold mb-4">
        My Orders
      </h1>


      {orders.length === 0 ? (

        <p>
          No orders yet
        </p>

      ) : (

        orders.map((order)=>(
          
          <OrderCard
            key={order._id}
            order={order}
          />

        ))

      )}

    </div>

  );
};


export default OrdersPage;