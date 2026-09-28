import { useEffect, useState } from "react";

import { sellerApi } from "../services/sellerApi";



export function useSellerProducts(
  storeId?:string
){


  const [products,setProducts] =
  useState<any[]>([]);


  const [loading,setLoading] =
  useState(false);



  const [error,setError] =
  useState<string | null>(null);






  // =========================
  // LOAD PRODUCTS
  // =========================


  const loadProducts =
  async()=>{


    if(!storeId){

      setProducts([]);

      return;

    }



    try{


      setLoading(true);


      setError(null);




      const data =
      await sellerApi.getStoreProducts(
        storeId
      );




      setProducts(

        Array.isArray(data)

        ?

        data

        :

        data.items || []

      );



    }
    catch(err:any){


      console.error(err);


      setError(

        err?.response?.data?.message

        ||

        "Unable to load products"

      );


    }
    finally{


      setLoading(false);


    }


  };








  useEffect(()=>{


    loadProducts();


  },[storeId]);








  // =========================
  // CREATE PRODUCT
  // =========================


  const createProduct =
  async(data:any)=>{


    const product =
    await sellerApi.createProduct({

      ...data,

      storeId,

    });



    await loadProducts();


    return product;


  };








  // =========================
  // UPDATE PRODUCT
  // =========================


  const updateProduct =
  async(
    id:string,
    data:any
  )=>{


    const product =
    await sellerApi.updateProduct(

      id,

      data

    );



    await loadProducts();



    return product;


  };








  // =========================
  // DELETE PRODUCT
  // =========================


  const deleteProduct =
  async(
    id:string
  )=>{


    const result =
    await sellerApi.deleteProduct(
      id
    );



    await loadProducts();



    return result;


  };







  return {


    products,


    loading,


    error,


    reload:
    loadProducts,


    createProduct,


    updateProduct,


    deleteProduct,


  };


}