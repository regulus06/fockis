import {
  useCallback,
  useEffect,
  useState,
} from "react";


import {
  marketplaceAdminApi,
} from "../service/marketplaceAdminApi";




export interface Product {

  _id: string;

  name: string;

  description?: string;

  price: number;

  stock?: number;

  images?: string[];

  status?:
    | "active"
    | "inactive"
    | "pending"
    | "hidden";

  featured?: boolean;


  category?:
    | string
    | {
        name: string;
      };

}







export const useProducts = () => {



  const [products, setProducts] =
    useState<Product[]>([]);



  const [loading, setLoading] =
    useState(false);








  const loadProducts = useCallback(
    async () => {


      try {


        setLoading(true);



        const response =
          await marketplaceAdminApi.getProducts();




        setProducts(

          response.data?.products ??

          response.data ??

          []

        );



      } catch(error) {


        console.error(
          "Failed loading products",
          error
        );


      } finally {


        setLoading(false);


      }



    },
    []
  );









  useEffect(() => {


    loadProducts();


  }, [loadProducts]);









  const createProduct = async (
    data: any
  ) => {


    try {


      await marketplaceAdminApi.createProduct(
        data
      );


      await loadProducts();



    } catch(error) {


      console.error(
        "Create product failed",
        error
      );


      throw error;


    }


  };









  const updateProduct = async (
    id: string,
    data: any
  ) => {


    try {


      await marketplaceAdminApi.updateProduct(
        id,
        data
      );


      await loadProducts();



    } catch(error) {


      console.error(
        "Update product failed",
        error
      );


      throw error;


    }


  };









  const deleteProduct = async (
    id: string
  ) => {


    try {


      await marketplaceAdminApi.deleteProduct(
        id
      );


      await loadProducts();



    } catch(error) {


      console.error(
        "Delete product failed",
        error
      );


      throw error;


    }


  };









  const featureProduct = async (
    id: string
  ) => {


    try {


      await marketplaceAdminApi.featureProduct(
        id
      );


      await loadProducts();



    } catch(error) {


      console.error(
        "Feature product failed",
        error
      );


      throw error;


    }


  };









  const hideProduct = async (
    id: string
  ) => {


    try {


      await marketplaceAdminApi.hideProduct(
        id
      );


      await loadProducts();



    } catch(error) {


      console.error(
        "Hide product failed",
        error
      );


      throw error;


    }


  };









  return {


    products,


    loading,


    loadProducts,


    createProduct,


    updateProduct,


    deleteProduct,


    featureProduct,


    hideProduct,


  };


};