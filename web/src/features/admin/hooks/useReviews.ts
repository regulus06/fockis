import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { marketplaceAdminApi } from "../service/marketplaceAdminApi";



export interface Review {

  _id: string;

  rating: number;

  comment: string;

  approved: boolean;

  product?: string;

  user?: string;

  status?: string;

}





export const useReviews = () => {


  const [reviews, setReviews] =
    useState<Review[]>([]);


  const [loading, setLoading] =
    useState(false);





  const loadReviews = useCallback(async () => {


    try {


      setLoading(true);


      const response =
        await marketplaceAdminApi.getReviews();



      setReviews(
        response.data?.reviews ??
        response.data ??
        []
      );


    } catch (error) {


      console.error(
        "Reviews loading failed",
        error
      );


    } finally {


      setLoading(false);


    }


  }, []);







  useEffect(() => {


    loadReviews();


  }, [loadReviews]);









  const approveReview = useCallback(
    async (id: string) => {


      try {


        await marketplaceAdminApi.approveReview(
          id
        );


        await loadReviews();


      } catch (error) {


        console.error(
          "Approve review failed",
          error
        );


      }


    },
    [loadReviews]
  );









  const deleteReview = useCallback(
    async (id: string) => {


      try {


        await marketplaceAdminApi.deleteReview(
          id
        );


        await loadReviews();


      } catch (error) {


        console.error(
          "Delete review failed",
          error
        );


      }


    },
    [loadReviews]
  );








  return {


    reviews,

    loading,

    loadReviews,

    approveReview,

    deleteReview,


  };


};