/*
 * Seller Promotion API
 *
 * Used by SellerBoostForm for the paid
 * "Boost Your Store" promotion flow.
 */

export interface BoostPlan {
  id: string;
  days: number;
  price: number;
}


/*
 * Promotion pricing.
 *
 * These can later be loaded from the backend.
 */

export const BOOST_PLANS: BoostPlan[] = [
  {
    id: "3d",
    days: 3,
    price: 15,
  },
  {
    id: "7d",
    days: 7,
    price: 30,
  },
  {
    id: "14d",
    days: 14,
    price: 55,
  },
  {
    id: "30d",
    days: 30,
    price: 100,
  },
];


export interface CreatePromotionPayload {
  storeId: string;
  title: string;
  description: string;
  ctaLabel: string;
  categoryName: string;
  image: string;
  planId: string;
}


export interface CreatePromotionResponse {
  promotionId: string;
  checkoutUrl: string;
}


export interface SellerPromotion {
  id: string;
  title: string;
  image: string;
  status: string;
  startDate?: string;
  endDate?: string;
  planId: string;
}


/*
 * Helper for extracting backend errors.
 */

async function getErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const data: unknown =
      await response.json();

    if (
      data &&
      typeof data === "object"
    ) {
      const body =
        data as Record<
          string,
          unknown
        >;

      if (
        typeof body.message === "string"
      ) {
        return body.message;
      }

      if (
        Array.isArray(body.message)
      ) {
        return body.message
          .map(String)
          .join(", ");
      }
    }
  } catch {
    // Ignore JSON parsing errors.
  }

  return `Request failed with status ${response.status}`;
}


/*
 * Seller Promotion API
 */

export const sellerPromotionApi = {

  /*
   * Create a new promotion.
   */

  async createPromotion(
    payload: CreatePromotionPayload,
  ): Promise<CreatePromotionResponse> {

    const response =
      await fetch(
        "/api/seller/promotions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify(
            payload,
          ),
        },
      );


    if (!response.ok) {
      throw new Error(
        await getErrorMessage(
          response,
        ),
      );
    }


    const data: unknown =
      await response.json();


    if (
      !data ||
      typeof data !== "object"
    ) {
      throw new Error(
        "Invalid promotion response from server.",
      );
    }


    const result =
      data as Partial<CreatePromotionResponse>;


    if (
      typeof result.checkoutUrl !==
      "string"
    ) {
      throw new Error(
        "The server did not return a checkout URL.",
      );
    }


    return {
      promotionId:
        typeof result.promotionId ===
        "string"
          ? result.promotionId
          : "",

      checkoutUrl:
        result.checkoutUrl,
    };
  },


  /*
   * Get promotions belonging
   * to the authenticated seller.
   */

  async getMyPromotions(): Promise<
    SellerPromotion[]
  > {

    try {

      const response =
        await fetch(
          "/api/seller/promotions/mine",
          {
            method: "GET",

            credentials:
              "include",

            headers: {
              Accept:
                "application/json",
            },
          },
        );


      if (!response.ok) {
        console.error(
          "GET MY PROMOTIONS ERROR:",
          response.status,
        );

        return [];
      }


      const data: unknown =
        await response.json();


      if (!Array.isArray(data)) {
        return [];
      }


      return data as SellerPromotion[];

    } catch (error) {

      console.error(
        "Failed to load seller promotions:",
        error,
      );

      return [];
    }
  },
};