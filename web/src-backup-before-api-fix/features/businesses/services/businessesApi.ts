import type {
  Business,
  BusinessDeal,
} from "../types/business.types";

/* ============================================================================
   API CONFIG
============================================================================ */

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");


/* ============================================================================
   AUTH
============================================================================ */

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    null
  );
}

function requireToken(
  message = "You must be logged in.",
): string {
  const token = getToken();

  if (!token) {
    throw new Error(message);
  }

  return token;
}

function authHeaders(
  includeJson = false,
): Headers {
  const headers = new Headers();

  headers.set(
    "Accept",
    "application/json",
  );

  const token = getToken();

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  if (includeJson) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  return headers;
}


/* ============================================================================
   MEDIA URL
============================================================================ */

function normalizeMediaUrl(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const url = value.trim();

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  if (url.startsWith("//")) {
    return `http:${url}`;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  }

  return `${API_URL}/${url}`;
}


/* ============================================================================
   SAFE STRING
============================================================================ */

function stringValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}


/* ============================================================================
   SAFE NUMBER
============================================================================ */

function numberValue(
  value: unknown,
  fallback = 0,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  return fallback;
}


/* ============================================================================
   RESPONSE ERROR
============================================================================ */

async function getErrorMessage(
  response: Response,
): Promise<string> {
  let text = "";

  try {
    text =
      await response.text();
  } catch {
    return `Request failed with status ${response.status}`;
  }

  if (!text) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const data =
      JSON.parse(text);

    if (
      Array.isArray(
        data?.message,
      )
    ) {
      return data.message
        .map(
          (item: unknown) =>
            typeof item === "string"
              ? item
              : JSON.stringify(item),
        )
        .join(", ");
    }

    if (
      typeof data?.message ===
      "string"
    ) {
      return data.message;
    }

    if (
      data?.message !== undefined &&
      data?.message !== null
    ) {
      return String(
        data.message,
      );
    }

    if (
      typeof data?.error ===
      "string"
    ) {
      return data.error;
    }

    if (
      data?.error !== undefined &&
      data?.error !== null
    ) {
      return String(
        data.error,
      );
    }

    return text;
  } catch {
    return text;
  }
}


/* ============================================================================
   JSON REQUEST
============================================================================ */

async function requestJson<T>(
  response: Response,
): Promise<T> {
  if (!response.ok) {
    const message =
      await getErrorMessage(
        response,
      );

    console.error(
      "[businessesApi] API ERROR",
      {
        status:
          response.status,
        statusText:
          response.statusText,
        message,
      },
    );

    throw new Error(
      `${response.status}: ${message}`,
    );
  }

  const text =
    await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(
      text,
    ) as T;
  } catch {
    throw new Error(
      "Server returned invalid JSON.",
    );
  }
}


/* ============================================================================
   RESPONSE ARRAY
============================================================================ */

function extractArray(
  data: any,
): any[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data?.businesses,
    )
  ) {
    return data.businesses;
  }

  if (
    Array.isArray(
      data?.data,
    )
  ) {
    return data.data;
  }

  if (
    Array.isArray(
      data?.items,
    )
  ) {
    return data.items;
  }

  if (
    Array.isArray(
      data?.results,
    )
  ) {
    return data.results;
  }

  return [];
}


/* ============================================================================
   RESPONSE BUSINESS
============================================================================ */

function extractBusiness(
  data: any,
): Business {
  return normalizeBusiness(
    data?.business ??
      data?.data ??
      data,
  );
}


/* ============================================================================
   NORMALIZE DEAL
============================================================================ */

function normalizeDeal(
  raw: any,
): BusinessDeal {
  const source =
    raw?.deal ??
    raw?.data ??
    raw ??
    {};

  const id =
    stringValue(
      source?.id ??
        source?._id ??
        source?.dealId,
    );

  const businessId =
    stringValue(
      source?.businessId ??
        source?.business?._id ??
        source?.business?.id,
    );

  const active =
    source?.active ??
    source?.isActive ??
    true;

  return {
    ...source,

    id,

    _id:
      source?._id
        ? stringValue(
            source._id,
          )
        : id,

    businessId,

    title:
      stringValue(
        source?.title ??
          source?.name,
      ),

    description:
      stringValue(
        source?.description,
      ),

    discount:
      stringValue(
        source?.discount,
      ),

    couponCode:
      stringValue(
        source?.couponCode,
      ),

    expiresAt:
      stringValue(
        source?.expiresAt ??
          source?.expirationDate,
      ),

    active:
      Boolean(active),

    isActive:
      Boolean(active),

    imageUrl:
      normalizeMediaUrl(
        source?.imageUrl ??
          source?.image,
      ),

    clicks:
      numberValue(
        source?.clicks,
      ),

    createdAt:
      source?.createdAt ??
      undefined,

    updatedAt:
      source?.updatedAt ??
      undefined,
  };
}


/* ============================================================================
   NORMALIZE BUSINESS
============================================================================ */

function normalizeBusiness(
  raw: any,
): Business {
  const source =
    raw?.business ??
    raw ??
    {};

  const id =
    stringValue(
      source?.id ??
        source?._id ??
        source?.businessId,
    );

  const ownerId =
    stringValue(
      source?.ownerId ??
        source?.owner?._id ??
        source?.owner?.id,
    );

  const socialLinks =
    source?.socialLinks ??
    {
      facebook:
        source?.facebookUrl ??
        source?.facebook ??
        undefined,

      instagram:
        source?.instagramUrl ??
        source?.instagram ??
        undefined,

      tiktok:
        source?.tiktokUrl ??
        source?.tiktok ??
        undefined,

      youtube:
        source?.youtubeUrl ??
        source?.youtube ??
        undefined,

      linkedin:
        source?.linkedinUrl ??
        source?.linkedin ??
        undefined,
    };

  const verified =
    Boolean(
      source?.verified ??
        source?.isVerified ??
        false,
    );

  const latitude =
    source?.latitude !==
      undefined &&
    source?.latitude !==
      null
      ? numberValue(
          source.latitude,
          NaN,
        )
      : undefined;

  const longitude =
    source?.longitude !==
      undefined &&
    source?.longitude !==
      null
      ? numberValue(
          source.longitude,
          NaN,
        )
      : undefined;

  return {
    ...source,

    id,

    _id:
      source?._id
        ? stringValue(
            source._id,
          )
        : id,

    ownerId,

    name:
      stringValue(
        source?.name ??
          source?.businessName,
      ),

    description:
      stringValue(
        source?.description,
      ),

    category:
      source?.category ??
      "OTHER",

    logoUrl:
      normalizeMediaUrl(
        source?.logoUrl ??
          source?.logo,
      ),

    coverImageUrl:
      normalizeMediaUrl(
        source?.coverImageUrl ??
          source?.coverImage,
      ),

    websiteUrl:
      source?.websiteUrl ??
      source?.website ??
      undefined,

    phone:
      source?.phone ??
      source?.phoneNumber ??
      undefined,

    email:
      source?.email ??
      undefined,

    address:
      stringValue(
        source?.address,
      ),

    city:
      stringValue(
        source?.city,
      ),

    state:
      stringValue(
        source?.state,
      ),

    zipCode:
      stringValue(
        source?.zipCode ??
          source?.postalCode,
      ),

    postalCode:
      stringValue(
        source?.postalCode ??
          source?.zipCode,
      ),

    country:
      stringValue(
        source?.country,
      ),

    latitude:
      Number.isFinite(
        latitude,
      )
        ? latitude
        : undefined,

    longitude:
      Number.isFinite(
        longitude,
      )
        ? longitude
        : undefined,

    facebookUrl:
      source?.facebookUrl ??
      socialLinks?.facebook ??
      undefined,

    instagramUrl:
      source?.instagramUrl ??
      socialLinks?.instagram ??
      undefined,

    tiktokUrl:
      source?.tiktokUrl ??
      socialLinks?.tiktok ??
      undefined,

    youtubeUrl:
      source?.youtubeUrl ??
      socialLinks?.youtube ??
      undefined,

    linkedinUrl:
      source?.linkedinUrl ??
      socialLinks?.linkedin ??
      undefined,

    socialLinks,

    status:
      source?.status ??
      "ACTIVE",

    spotlightEnabled:
      Boolean(
        source?.spotlightEnabled ??
          source?.spotlight ??
          false,
      ),

    spotlightPriority:
      numberValue(
        source?.spotlightPriority,
      ),

    views:
      numberValue(
        source?.views,
      ),

    websiteClicks:
      numberValue(
        source?.websiteClicks,
      ),

    verified,

    isVerified:
      verified,

    deals:
      Array.isArray(
        source?.deals,
      )
        ? source.deals.map(
            normalizeDeal,
          )
        : [],

    createdAt:
      source?.createdAt ??
      "",

    updatedAt:
      source?.updatedAt ??
      "",
  };
}


/* ============================================================================
   CLEAN BUSINESS PAYLOAD
============================================================================ */

function cleanBusinessPayload(
  data: Partial<Business>,
): Record<string, unknown> {
  const payload: Record<
    string,
    unknown
  > = {};

  if (
    data?.name !==
      undefined &&
    data?.name !== null
  ) {

    payload.name =
      stringValue(
        data.name,
      ).trim();

  }

  if (
    data?.description !==
      undefined &&
    data?.description !== null
  ) {

    payload.description =
      stringValue(
        data.description,
      ).trim();

  }

  if (
    data?.category !==
      undefined &&
    data?.category !== null
  ) {

    payload.category =
      data.category;

  }

  const optionalFields: Array<
    keyof Business
  > = [
    "logoUrl",
    "coverImageUrl",
    "websiteUrl",
    "phone",
    "email",
    "address",
    "city",
    "state",
    "country",
  ];

  for (
    const field of optionalFields
  ) {
    const value =
      data?.[field];

    if (
      value !==
        undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      payload[field] =
        String(value).trim();
    }
  }

  const zipCode =
    data?.zipCode ??
    data?.postalCode;

  if (
    zipCode !==
      undefined &&
    zipCode !== null &&
    String(zipCode).trim() !== ""
  ) {
    payload.zipCode =
      String(zipCode).trim();
  }

  if (
    typeof data?.latitude ===
      "number" &&
    Number.isFinite(
      data.latitude,
    )
  ) {
    payload.latitude =
      data.latitude;
  }

  if (
    typeof data?.longitude ===
      "number" &&
    Number.isFinite(
      data.longitude,
    )
  ) {
    payload.longitude =
      data.longitude;
  }

  if (
    data?.socialLinks &&
    typeof data.socialLinks ===
      "object"
  ) {
    payload.socialLinks =
      data.socialLinks;
  }

  if (
    typeof data?.spotlightEnabled ===
    "boolean"
  ) {
    payload.spotlightEnabled =
      data.spotlightEnabled;
  }

  if (
    typeof data?.spotlightPriority ===
      "number" &&
    Number.isFinite(
      data.spotlightPriority,
    )
  ) {
    payload.spotlightPriority =
      data.spotlightPriority;
  }

  return payload;
}


/* ============================================================================
   CLEAN DEAL PAYLOAD
============================================================================ */

function cleanDealPayload(
  data: Partial<BusinessDeal>,
): {
  title: string;
  description?: string;
  discount?: string;
  couponCode?: string;
  expiresAt: string;
} {
  const title =
    stringValue(
      data?.title,
    ).trim();

  const description =
    stringValue(
      data?.description,
    ).trim();

  const discount =
    stringValue(
      data?.discount,
    ).trim();

  const couponCode =
    stringValue(
      data?.couponCode,
    ).trim();

  const expiresAt =
    data?.expiresAt
      ? String(
          data.expiresAt,
        )
      : "";

  const payload: {
    title: string;
    description?: string;
    discount?: string;
    couponCode?: string;
    expiresAt: string;
  } = {
    title,
    expiresAt,
  };

  if (description) {
    payload.description =
      description;
  }

  if (discount) {
    payload.discount =
      discount;
  }

  if (couponCode) {
    payload.couponCode =
      couponCode;
  }

  console.log(
    "[businessesApi] DEAL PAYLOAD",
    payload,
  );

  return payload;
}


/* ============================================================================
   BUSINESSES API
============================================================================ */

export const businessesApi = {

  /* ==========================================================================
     GET ALL PUBLIC BUSINESSES
     GET /businesses
  ========================================================================== */

  async getAll(): Promise<
    Business[]
  > {
    const url =
      `${API_URL}/businesses`;

    console.log(
      "[businessesApi] GET ALL",
      url,
    );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers:
            authHeaders(),
        },
      );

    const data =
      await requestJson<any>(
        response,
      );

    return extractArray(data)
      .map(
        normalizeBusiness,
      )
      .filter(
        (
          business,
        ) =>
          Boolean(
            business.id,
          ),
      );
  },


  /* ==========================================================================
     GET SPOTLIGHT BUSINESSES
     GET /businesses/spotlight
  ========================================================================== */

  async getSpotlight(): Promise<
    Business[]
  > {
    const url =
      `${API_URL}/businesses/spotlight`;

    console.log(
      "[businessesApi] GET SPOTLIGHT",
      url,
    );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers:
            authHeaders(),
        },
      );

    const data =
      await requestJson<any>(
        response,
      );

    return extractArray(data)
      .map(
        normalizeBusiness,
      )
      .filter(
        (
          business,
        ) =>
          Boolean(
            business.id,
          ),
      );
  },


  /* ==========================================================================
     GET MY BUSINESSES
     GET /businesses/mine
  ========================================================================== */

  async getMine(): Promise<
    Business[]
  > {
    requireToken(
      "You must be logged in to manage businesses.",
    );

    const url =
      `${API_URL}/businesses/mine`;

    console.log(
      "[businessesApi] GET MINE",
      url,
    );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers:
            authHeaders(),
        },
      );

    const data =
      await requestJson<any>(
        response,
      );

    return extractArray(data)
      .map(
        normalizeBusiness,
      )
      .filter(
        (
          business,
        ) =>
          Boolean(
            business.id,
          ),
      );
  },


  /* ==========================================================================
     GET BUSINESS BY ID
     GET /businesses/:id
  ========================================================================== */

  async getById(
    id: string,
  ): Promise<Business> {
    if (!id) {
      throw new Error(
        "Business ID is required.",
      );
    }

    const url =
      `${API_URL}/businesses/${encodeURIComponent(
        id,
      )}`;

    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers:
            authHeaders(),
        },
      );

    const data =
      await requestJson<any>(
        response,
      );

    return extractBusiness(
      data,
    );
  },


  /* ==========================================================================
     CREATE BUSINESS
     POST /businesses
  ========================================================================== */

  async create(
    data: Partial<Business>,
  ): Promise<Business> {
    requireToken(
      "You must be logged in to create a business.",
    );

    const url =
      `${API_URL}/businesses`;

    const payload =
      cleanBusinessPayload(
        data,
      );

    console.log(
      "[businessesApi] CREATE",
      {
        url,
        payload,
      },
    );

    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers:
            authHeaders(true),
          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const result =
      await requestJson<any>(
        response,
      );

    return extractBusiness(
      result,
    );
  },


  /* ==========================================================================
     UPDATE BUSINESS
     PATCH /businesses/:id
  ========================================================================== */

  async update(
    id: string,
    data: Partial<Business>,
  ): Promise<Business> {
    requireToken(
      "You must be logged in to update a business.",
    );

    if (!id) {
      throw new Error(
        "Business ID is required.",
      );
    }

    const url =
      `${API_URL}/businesses/${encodeURIComponent(
        id,
      )}`;

    /*
     * IMPORTANT:
     *
     * Mongoose re-validates every required path on
     * business.save(), not just the fields touched by
     * this request. That means a partial update (e.g.
     * toggling spotlightEnabled alone) can still fail
     * with "name is required" / "category is required"
     * if the stored document is ever missing either
     * field for any reason.
     *
     * To make partial updates safe regardless of the
     * document's current state, fetch the business
     * first and merge it under the caller's changes so
     * required fields are always resent with a valid
     * current value.
     */

    const current =
      await businessesApi.getById(
        id,
      );

    const payload =
      cleanBusinessPayload({
        ...current,
        ...data,

        name:
          data.name ??
          current.name,

        category:
          data.category ??
          current.category,
      });

    console.log(
      "[businessesApi] UPDATE",
      {
        url,
        payload,
      },
    );

    const response =
      await fetch(
        url,
        {
          method: "PATCH",
          headers:
            authHeaders(true),
          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const result =
      await requestJson<any>(
        response,
      );

    return extractBusiness(
      result,
    );
  },


  /* ==========================================================================
     PUBLISH BUSINESS TO FEED
     POST /businesses/:id/publish
  ========================================================================== */

  async publish(
    id: string,
  ): Promise<Business> {
    requireToken(
      "You must be logged in to publish a business.",
    );

    if (!id) {
      throw new Error(
        "Business ID is required.",
      );
    }

    const url =
      `${API_URL}/businesses/${encodeURIComponent(
        id,
      )}/publish`;

    console.log(
      "[businessesApi] PUBLISH",
      url,
    );

    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers:
            authHeaders(),
        },
      );

    const result =
      await requestJson<any>(
        response,
      );

    return extractBusiness(
      result,
    );
  },


  /* ==========================================================================
     UNPUBLISH BUSINESS FROM FEED
     DELETE /businesses/:id/publish
  ========================================================================== */

  async unpublish(
    id: string,
  ): Promise<Business> {
    requireToken(
      "You must be logged in to unpublish a business.",
    );

    if (!id) {
      throw new Error(
        "Business ID is required.",
      );
    }

    const url =
      `${API_URL}/businesses/${encodeURIComponent(
        id,
      )}/publish`;

    console.log(
      "[businessesApi] UNPUBLISH",
      url,
    );

    const response =
      await fetch(
        url,
        {
          method: "DELETE",
          headers:
            authHeaders(),
        },
      );

    const result =
      await requestJson<any>(
        response,
      );

    return extractBusiness(
      result,
    );
  },


  /* ==========================================================================
     UPLOAD COVER IMAGE
     POST /businesses/:id/cover-image
  ========================================================================== */

  async uploadCoverImage(
    businessId: string,
    file: File,
  ): Promise<{
    success: boolean;
    business: {
      id: string;
      _id?: string;
      coverImageUrl?: string;
      coverImageSource?: string;
    };
  }> {
    requireToken(
      "You must be logged in to upload a business image.",
    );

    if (!businessId) {
      throw new Error(
        "Business ID is required.",
      );
    }

    if (!file) {
      throw new Error(
        "Cover image file is required.",
      );
    }

    const url =
      `${API_URL}/businesses/${encodeURIComponent(
        businessId,
      )}/cover-image`;

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    /*
     * DO NOT set Content-Type manually.
     * The browser adds the multipart boundary.
     */

    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers:
            authHeaders(),
          body:
            formData,
        },
      );

    const result =
      await requestJson<any>(
        response,
      );

    if (
      result?.business
    ) {
      result.business =
        normalizeBusiness(
          result.business,
        );
    }

    return result;
  },


  /* ==========================================================================
     DELETE BUSINESS
     DELETE /businesses/:id
  ========================================================================== */

  async remove(
    id: string,
  ): Promise<{
    success: boolean;
  }> {
    requireToken(
      "You must be logged in to delete a business.",
    );

    if (!id) {
      throw new Error(
        "Business ID is required.",
      );
    }

    const url =
      `${API_URL}/businesses/${encodeURIComponent(
        id,
      )}`;

    const response =
      await fetch(
        url,
        {
          method: "DELETE",
          headers:
            authHeaders(),
        },
      );

    return requestJson<{
      success: boolean;
    }>(
      response,
    );
  },


  /* ==========================================================================
     CREATE DEAL
     POST /businesses/:id/deals
  ========================================================================== */

  async createDeal(
    businessId: string,
    data: Partial<BusinessDeal>,
  ): Promise<BusinessDeal> {
    requireToken(
      "You must be logged in to create a deal.",
    );

    if (!businessId) {
      throw new Error(
        "Business ID is required.",
      );
    }

    const url =
      `${API_URL}/businesses/${encodeURIComponent(
        businessId,
      )}/deals`;

    const payload =
      cleanDealPayload(
        data,
      );

    console.log(
      "[businessesApi] CREATE DEAL",
      {
        url,
        businessId,
        payload,
      },
    );

    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers:
            authHeaders(true),
          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const result =
      await requestJson<any>(
        response,
      );

    return normalizeDeal(
      result?.deal ??
        result?.data ??
        result,
    );
  },


  /* ==========================================================================
     UPDATE DEAL
     PATCH /businesses/deals/:dealId
  ========================================================================== */

  async updateDeal(
    dealId: string,
    data: Partial<BusinessDeal>,
  ): Promise<BusinessDeal> {
    requireToken(
      "You must be logged in to update a deal.",
    );

    if (!dealId) {
      throw new Error(
        "Deal ID is required.",
      );
    }

    const url =
      `${API_URL}/businesses/deals/${encodeURIComponent(
        dealId,
      )}`;

    const payload =
      cleanDealPayload(
        data,
      );

    console.log(
      "[businessesApi] UPDATE DEAL",
      {
        url,
        dealId,
        payload,
      },
    );

    const response =
      await fetch(
        url,
        {
          method: "PATCH",
          headers:
            authHeaders(true),
          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const result =
      await requestJson<any>(
        response,
      );

    return normalizeDeal(
      result?.deal ??
        result?.data ??
        result,
    );
  },


  /* ==========================================================================
     DELETE DEAL
     DELETE /businesses/deals/:dealId
  ========================================================================== */

  async deleteDeal(
    dealId: string,
  ): Promise<{
    success: boolean;
  }> {
    requireToken(
      "You must be logged in to delete a deal.",
    );

    if (!dealId) {
      throw new Error(
        "Deal ID is required.",
      );
    }

    const url =
      `${API_URL}/businesses/deals/${encodeURIComponent(
        dealId,
      )}`;

    const response =
      await fetch(
        url,
        {
          method: "DELETE",
          headers:
            authHeaders(),
        },
      );

    return requestJson<{
      success: boolean;
    }>(
      response,
    );
  },


  /* ==========================================================================
     TRACK VIEW
     POST /businesses/:id/view
  ========================================================================== */

  async trackView(
    id: string,
  ): Promise<void> {
    if (!id) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL}/businesses/${encodeURIComponent(
            id,
          )}/view`,
          {
            method: "POST",
            headers:
              authHeaders(),
          },
        );

      if (!response.ok) {
        console.warn(
          "[businessesApi] trackView failed",
          response.status,
        );
      }
    } catch (
      error
    ) {
      console.warn(
        "[businessesApi] trackView error",
        error,
      );
    }
  },


  /* ==========================================================================
     TRACK WEBSITE CLICK
     POST /businesses/:id/website-click
  ========================================================================== */

  async trackWebsiteClick(
    id: string,
  ): Promise<void> {
    if (!id) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API_URL}/businesses/${encodeURIComponent(
            id,
          )}/website-click`,
          {
            method: "POST",
            headers:
              authHeaders(),
          },
        );

      if (!response.ok) {
        console.warn(
          "[businessesApi] trackWebsiteClick failed",
          response.status,
        );
      }
    } catch (
      error
    ) {
      console.warn(
        "[businessesApi] trackWebsiteClick error",
        error,
      );
    }
  },
};