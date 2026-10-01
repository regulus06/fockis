import { FOCKIS_API_URL } from "../../../config/fockisConfig";

/* ============================================================================

   FOCKIS MARKETING API

============================================================================ */



import type {

  Advertisement,

  CreateAdPayload,

  UpdateAdPayload,

  MarketingDashboardData,

  DeliveredFeedAd,

  ExtendedAdPlacement,

  FeedAdEventType,

  Campaign,

} from "../types/marketingTypes";



/* ============================================================================

   API CONFIGURATION

============================================================================ */



const API_URL =

  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||

  FOCKIS_API_URL;



/* ============================================================================

   AUTHENTICATION

============================================================================ */



function getToken(): string | null {

  if (typeof window === "undefined") {

    return null;

  }



  const possibleKeys = [

    "token",

    "access_token",

    "accessToken",

    "jwt",

  ];



  for (const key of possibleKeys) {

    const value =

      window.localStorage.getItem(key);



    if (value && value.trim()) {

      return value.trim();

    }

  }



  return null;

}



/* ============================================================================

   GENERIC REQUEST

============================================================================ */



async function request<T>(

  path: string,

  options: RequestInit = {},

): Promise<T> {

  const token = getToken();



  const headers = new Headers(

    options.headers,

  );



  /* --------------------------------------------------------------------------

     JSON CONTENT TYPE

  -------------------------------------------------------------------------- */



  if (

    options.body &&

    !(options.body instanceof FormData)

  ) {

    headers.set(

      "Content-Type",

      "application/json",

    );

  }



  /* --------------------------------------------------------------------------

     JWT

  -------------------------------------------------------------------------- */



  if (token) {

    headers.set(

      "Authorization",

      `Bearer ${token}`,

    );

  }



  /* --------------------------------------------------------------------------

     DEVELOPMENT LOGGING

  -------------------------------------------------------------------------- */



  if (

    import.meta.env.DEV &&

    path.startsWith("/marketing/")

  ) {

    console.debug(

      "[Fockis Marketing API]",

      {

        method:

          options.method ?? "GET",



        url:

          `${API_URL}${path}`,



        authenticated:

          Boolean(token),



        hasAuthorizationHeader:

          headers.has(

            "Authorization",

          ),

      },

    );

  }



  /* --------------------------------------------------------------------------

     AUTH CHECK

  -------------------------------------------------------------------------- */



  if (!token) {

    throw new Error(

      "Authentication required. No Fockis JWT token was found in localStorage.",

    );

  }



  /* --------------------------------------------------------------------------

     FETCH

  -------------------------------------------------------------------------- */



  let response: Response;



  try {

    response =

      await fetch(

        `${API_URL}${path}`,

        {

          ...options,

          headers,

        },

      );

  } catch (error) {

    console.error(

      "[Fockis Marketing API] Network error:",

      error,

    );



    throw new Error(

      "Unable to connect to the Fockis API. Make sure the NestJS backend is running on http://localhost:3000.",

    );

  }



  /* --------------------------------------------------------------------------

     READ RESPONSE

  -------------------------------------------------------------------------- */



  const text =

    await response.text();



  let parsed: unknown = null;



  if (text.trim()) {

    try {

      parsed =

        JSON.parse(text);

    } catch {

      parsed = text;

    }

  }



  /* ==========================================================================

     401

  ========================================================================== */



  if (

    response.status === 401

  ) {

    let message =

      "Unauthorized. Your Fockis login session is invalid or expired.";



    if (

      typeof parsed === "string" &&

      parsed.trim()

    ) {

      message =

        parsed.trim();

    }



    if (

      parsed &&

      typeof parsed === "object" &&

      "message" in parsed

    ) {

      const value =

        (

          parsed as {

            message?: unknown;

          }

        ).message;



      if (

        typeof value === "string"

      ) {

        message = value;

      }



      if (

        Array.isArray(value)

      ) {

        message =

          value.join(", ");

      }

    }



    console.error(

      "[Fockis Marketing API] HTTP 401",

      {

        path,

        message,

        hasToken:

          Boolean(token),

      },

    );



    throw new Error(

      `${message} [HTTP 401]`,

    );

  }



  /* ==========================================================================

     OTHER HTTP ERRORS

  ========================================================================== */



  if (!response.ok) {

    let message =

      `Request failed: ${response.status}`;



    if (

      typeof parsed === "string" &&

      parsed.trim()

    ) {

      message =

        parsed.trim();

    }



    if (

      parsed &&

      typeof parsed === "object" &&

      "message" in parsed

    ) {

      const value =

        (

          parsed as {

            message?: unknown;

          }

        ).message;



      if (

        typeof value === "string"

      ) {

        message = value;

      }



      if (

        Array.isArray(value)

      ) {

        message =

          value.join(", ");

      }

    }



    console.error(

      "[Fockis Marketing API] HTTP ERROR",

      {

        method:

          options.method ?? "GET",



        path,



        status:

          response.status,



        response:

          parsed,

      },

    );



    throw new Error(

      `${message} [HTTP ${response.status}]`,

    );

  }



  /* ==========================================================================

     EMPTY RESPONSE

  ========================================================================== */



  if (

    response.status === 204 ||

    !text.trim()

  ) {

    return undefined as T;

  }



  /* ==========================================================================

     JSON RESPONSE

  ========================================================================== */



  return parsed as T;

}



/* ============================================================================

   DASHBOARD

============================================================================ */



/**

 * GET /marketing/dashboard

 */

export async function getMarketingDashboard() {

  return request<MarketingDashboardData>(

    "/marketing/dashboard",

  );

}



/* ============================================================================

   CAMPAIGNS

============================================================================ */



/**

 * GET /marketing/campaigns

 */

export async function getCampaigns() {

  return request<Campaign[]>(

    "/marketing/campaigns",

  );

}



/**

 * GET /marketing/campaigns/:id

 */

export async function getCampaign(

  id: string,

) {

  return request<Campaign>(

    `/marketing/campaigns/${id}`,

  );

}



/**

 * POST /marketing/campaigns

 */

export async function createCampaign(

  payload: Record<string, unknown>,

) {

  return request<Campaign>(

    "/marketing/campaigns",

    {

      method: "POST",



      body:

        JSON.stringify(

          payload,

        ),

    },

  );

}



/**

 * PATCH /marketing/campaigns/:id

 */

export async function updateCampaign(

  id: string,

  payload: Record<string, unknown>,

) {

  return request<Campaign>(

    `/marketing/campaigns/${id}`,

    {

      method: "PATCH",



      body:

        JSON.stringify(

          payload,

        ),

    },

  );

}



/**

 * POST /marketing/campaigns/:id/submit

 */

export async function submitCampaignForReview(

  id: string,

) {

  return request<Campaign>(

    `/marketing/campaigns/${id}/submit`,

    {

      method: "POST",

    },

  );

}



/**

 * POST /marketing/campaigns/:id/pause

 */

export async function pauseCampaign(

  id: string,

) {

  return request<Campaign>(

    `/marketing/campaigns/${id}/pause`,

    {

      method: "POST",

    },

  );

}



/**

 * POST /marketing/campaigns/:id/resume

 */

export async function resumeCampaign(

  id: string,

) {

  return request<Campaign>(

    `/marketing/campaigns/${id}/resume`,

    {

      method: "POST",

    },

  );

}



/**

 * DELETE /marketing/campaigns/:id

 */

export async function deleteCampaign(

  id: string,

) {

  return request<{

    message: string;

  }>(

    `/marketing/campaigns/${id}`,

    {

      method: "DELETE",

    },

  );

}



/* ============================================================================

   ADVERTISEMENTS

============================================================================ */



/**

 * GET /marketing/ads

 */

export async function getAds() {

  return request<Advertisement[]>(

    "/marketing/ads",

  );

}



/**

 * GET /marketing/ads/:id

 */

export async function getAd(

  id: string,

) {

  return request<Advertisement>(

    `/marketing/ads/${id}`,

  );

}



/**

 * GET /marketing/ads/campaign/:campaignId

 */

export async function getAdsByCampaign(

  campaignId: string,

) {

  return request<Advertisement[]>(

    `/marketing/ads/campaign/${campaignId}`,

  );

}



/* ============================================================================

   CREATE AD

============================================================================ */



/**

 * POST /marketing/ads

 *

 * Creates an advertisement after media has been uploaded.

 */

export async function createAd(

  payload: CreateAdPayload,

): Promise<Advertisement> {



  console.log(

    "[Fockis Marketing API] Creating advertisement:",

    payload,

  );



  const response =

    await request<unknown>(

      "/marketing/ads",

      {

        method: "POST",



        body:

          JSON.stringify(

            payload,

          ),

      },

    );



  console.log(

    "[Fockis Marketing API] Create ad response:",

    response,

  );



  /* --------------------------------------------------------------------------

     BACKEND MAY RETURN:



     {

       ad: {...}

     }



     OR:



     {...}

  -------------------------------------------------------------------------- */



  if (

    response &&

    typeof response === "object" &&

    "ad" in response

  ) {

    const wrapped =

      response as {

        ad?: Advertisement;

      };



    if (wrapped.ad) {

      return wrapped.ad;

    }

  }



  /* --------------------------------------------------------------------------

     DIRECT ADVERTISEMENT

  -------------------------------------------------------------------------- */



  if (

    response &&

    typeof response === "object"

  ) {

    return response as Advertisement;

  }



  throw new Error(

    "The server returned an empty advertisement response.",

  );

}



/* ============================================================================

   UPLOAD ADVERTISEMENT MEDIA

============================================================================ */



/**

 * POST /marketing/ads/upload

 *

 * The advertiser does NOT need to have a URL.

 *

 * The user can select:

 *

 *   JPG

 *   PNG

 *   WebP

 *   MP4

 *   WebM

 *   MOV

 *

 * The backend saves the file and returns a public URL.

 */

export async function uploadAdMedia(

  file: File,

): Promise<{

  success: boolean;



  url: string;



  mediaUrl: string;



  fileUrl: string;



  filename: string;



  originalName: string;



  mimeType: string;



  size: number;



  type:

    | "IMAGE"

    | "VIDEO";

}> {



  if (!file) {

    throw new Error(

      "Advertisement media file is required.",

    );

  }



  /* --------------------------------------------------------------------------

     CLIENT-SIDE SIZE CHECK



     Backend allows 50 MB.

  -------------------------------------------------------------------------- */



  const maxSize =

    50 * 1024 * 1024;



  if (

    file.size >

    maxSize

  ) {

    throw new Error(

      "Advertisement media cannot be larger than 50 MB.",

    );

  }



  /* --------------------------------------------------------------------------

     CLIENT-SIDE TYPE CHECK

  -------------------------------------------------------------------------- */



  const allowedTypes = [

    "image/jpeg",

    "image/png",

    "image/webp",



    "video/mp4",

    "video/webm",

    "video/quicktime",

  ];



  if (

    !allowedTypes.includes(

      file.type,

    )

  ) {

    throw new Error(

      "Unsupported advertisement file type. Use JPG, PNG, WebP, MP4, WebM, or MOV.",

    );

  }



  /* --------------------------------------------------------------------------

     FORM DATA

  -------------------------------------------------------------------------- */



  const formData =

    new FormData();



  formData.append(

    "file",

    file,

  );



  console.log(

    "[Fockis Marketing API] Uploading advertisement media:",

    {

      name:

        file.name,



      type:

        file.type,



      size:

        file.size,

    },

  );



  /* --------------------------------------------------------------------------

     REQUEST



     IMPORTANT:



     Do NOT manually set Content-Type.



     The browser automatically creates:



     multipart/form-data; boundary=...

  -------------------------------------------------------------------------- */



  const response =

    await request<{

      success: boolean;



      url: string;



      mediaUrl: string;



      fileUrl: string;



      filename: string;



      originalName: string;



      mimeType: string;



      size: number;



      type:

        | "IMAGE"

        | "VIDEO";

    }>(

      "/marketing/ads/upload",

      {

        method: "POST",



        body:

          formData,

      },

    );



  console.log(

    "[Fockis Marketing API] Advertisement media uploaded:",

    response,

  );



  if (

    !response ||

    !response.mediaUrl

  ) {

    throw new Error(

      "Advertisement media was uploaded, but the server did not return a media URL.",

    );

  }



  return response;

}



/* ============================================================================

   UPDATE AD

============================================================================ */



/**

 * PATCH /marketing/ads/:id

 */

export async function updateAd(

  id: string,

  payload: UpdateAdPayload,

) {

  return request<Advertisement>(

    `/marketing/ads/${id}`,

    {

      method: "PATCH",



      body:

        JSON.stringify(

          payload,

        ),

    },

  );

}



/* ============================================================================

   ACTIVATE AD

============================================================================ */



/**

 * POST /marketing/ads/:id/activate

 */

export async function activateAd(

  id: string,

) {

  return request<Advertisement>(

    `/marketing/ads/${id}/activate`,

    {

      method: "POST",

    },

  );

}



/* ============================================================================

   PAUSE AD

============================================================================ */



/**

 * POST /marketing/ads/:id/pause

 */

export async function pauseAd(

  id: string,

) {

  return request<Advertisement>(

    `/marketing/ads/${id}/pause`,

    {

      method: "POST",

    },

  );

}



/* ============================================================================

   DELETE AD

============================================================================ */



/**

 * DELETE /marketing/ads/:id

 */

export async function deleteAd(

  id: string,

) {

  return request<{

    message: string;

  }>(

    `/marketing/ads/${id}`,

    {

      method: "DELETE",

    },

  );

}



/* ============================================================================

   FEED AD DELIVERY

============================================================================ */



/**

 * GET /marketing/delivery/feed-ads

 */

export async function getFeedAds(
  placement: ExtendedAdPlacement = "FEED",
  limit = 5,
): Promise<DeliveredFeedAd[]> {
  const safeLimit = Math.max(
    1,
    Math.min(Number(limit) || 5, 20),
  );

  const params = new URLSearchParams({
    placement,
    limit: String(safeLimit),
    _t: String(Date.now()),
  });

  const result = await request<{
    ads?: DeliveredFeedAd[];
    count?: number;
  }>(
    `/marketing/delivery/feed-ads?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
      },
    },
  );

  const ads = Array.isArray(result?.ads)
    ? result.ads
    : [];

  console.debug(
    "[Fockis Feed Ads] Fresh delivery response:",
    {
      placement,
      requestedLimit: safeLimit,
      returnedAds: ads.length,
      count: result?.count ?? ads.length,
      ads: ads.map((ad) => ({
        id: ad.id,
        campaignId: ad.campaignId,
        placement: ad.placement,
        type: ad.type,
      })),
    },
  );

  return ads;
}/* ============================================================================

   AD EVENT TRACKING

============================================================================ */



/**

 * POST /marketing/delivery/event

 */

export async function trackAdEvent(

  payload: {

    adId: string;



    campaignId: string;



    type:

      FeedAdEventType;



    placement?: string;



    sessionId?: string;



    deviceType?: string;

  },

) {



  return request<{

    recorded:

      boolean;

  }>(

    "/marketing/delivery/event",

    {

      method: "POST",



      body:

        JSON.stringify(

          payload,

        ),

    },

  );

}
