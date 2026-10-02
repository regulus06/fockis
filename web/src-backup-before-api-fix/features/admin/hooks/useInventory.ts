import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  marketplaceAdminApi,
} from "../service/marketplaceAdminApi";


export interface InventoryItem {

  _id: string;

  product?: {
    name: string;
  };

  quantity: number;

  updatedAt?: string;

}



export const useInventory = () => {


  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);



  const [loading, setLoading] =
    useState(false);




  const loadInventory = useCallback(
    async () => {

      try {

        setLoading(true);


        const response =
          await marketplaceAdminApi.getInventory();



        setInventory(

          response.data?.inventory ??
          response.data ??
          []

        );


      } catch (error) {

        console.error(
          "Failed loading inventory",
          error
        );


      } finally {

        setLoading(false);

      }

    },
    []
  );





  useEffect(() => {

    loadInventory();

  }, [loadInventory]);







  const updateInventory = useCallback(
    async (
      id: string,
      quantity: number
    ) => {

      try {


        await marketplaceAdminApi.updateInventory(
          id,
          quantity
        );


        await loadInventory();



      } catch (error) {

        console.error(
          "Inventory update failed",
          error
        );

      }


    },
    [loadInventory]
  );







  return {

    inventory,

    loading,

    loadInventory,

    updateInventory,

  };


};