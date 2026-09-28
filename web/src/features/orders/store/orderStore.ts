import { create } from "zustand";

import {
  orderApi,
} from "../services/orderApi";

import type {
  Order,
} from "../types/Order";



interface OrderState {

  orders: Order[];

  loading: boolean;


  fetchOrders: () => Promise<void>;


  getOrderById: (
    id:string
  ) => Promise<Order | null>;

}




export const useOrderStore = create<OrderState>(
  (set)=>({


    orders: [],


    loading:false,





    // =====================================
    // FETCH CUSTOMER ORDERS
    // =====================================

    fetchOrders: async()=>{


      try{


        set({

          loading:true

        });




        const data =

          await orderApi.getOrders();





        console.log(
          "CUSTOMER ORDERS:",
          data
        );





        set({

          orders:

            data ?? [],


          loading:false,

        });



      }


      catch(error){


        console.log(
          "fetchOrders error:",
          error
        );


        set({

          loading:false

        });


      }


    },







    // =====================================
    // GET SINGLE ORDER
    // =====================================

    getOrderById: async(
      id:string
    )=>{


      try{


        const order =

          await orderApi.getOrderById(
            id
          );



        return order;



      }


      catch(error){


        console.log(
          "getOrderById error:",
          error
        );


        return null;


      }


    },




  })

);