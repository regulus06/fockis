import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type { Property } from "../types/Property";

const API =
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

/* ============================================================================
   AUTH
============================================================================ */

const getToken = (): string | null =>
  localStorage.getItem("token");

/* ============================================================================
   BACKEND IMAGE TYPES
============================================================================ */

interface BackendImageObject {
  url?: string;
  path?: string;
  src?: string;
  imageUrl?: string;
  filename?: string;
  fileName?: string;
}

type BackendImage =
  | string
  | BackendImageObject
  | null
  | undefined;

/* ============================================================================
   BACKEND PROPERTY TYPE
============================================================================ */

interface BackendProperty {
  _id: string;

  title: string;
  description?: string;
  price: number;

  type?: string;

  bedrooms?: number;
  bathrooms?: number;

  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;

  parking?: string;
  heating?: string;
  cooling?: string;
  stories?: number;
  hoa?: string;
  propertyTax?: string;
  mlsId?: string;

  location?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;

  latitude?: number;
  longitude?: number;

  images?: BackendImage[];

  documents?: string[];

  agent?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
        phone?: string;
        avatar?: string;
      };

  status?: string;
  listingStatus?: string;

  featured?: boolean;
  verified?: boolean;

  virtualTour?: boolean;

  features?: string[];
  utilities?: string[];

  views?: number;
  favorites?: number;
  shares?: number;
  inquiries?: number;
  tourRequests?: number;
  reports?: number;

  rejectionReason?: string;
  suspensionReason?: string;

  approvedAt?: string;

  createdAt?: string;
  updatedAt?: string;
}

/* ============================================================================
   REQUEST HELPER
============================================================================ */

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = getToken();

  const response = await fetch(`${API}${path}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message =
      `Real Estate API error: ${response.status}`;

    try {
      const errorBody = await response.json();

      if (errorBody?.message) {
        message = Array.isArray(errorBody.message)
          ? errorBody.message.join(", ")
          : String(errorBody.message);
      }
    } catch {
      // Ignore invalid JSON responses.
    }

    throw new Error(message);
  }

  return response.json();
};

/* ============================================================================
   RESPONSE UNWRAPPER
============================================================================ */

const unwrap = <T>(
  response: unknown,
): T => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response
  ) {
    return (
      response as {
        data: T;
      }
    ).data;
  }

  return response as T;
};

/* ============================================================================
   STATUS
============================================================================ */

const normalizeStatus = (
  listingStatus?: string,
  status?: string,
): "sale" | "rent" => {
  const value =
    listingStatus ||
    status ||
    "sale";

  return value.toLowerCase() === "rent"
    ? "rent"
    : "sale";
};

/* ============================================================================
   PROPERTY TYPE
============================================================================ */

const normalizeType = (
  type?: string,
): Property["type"] => {
  const validTypes: Property["type"][] = [
    "house",
    "apartment",
    "condo",
    "townhouse",
    "land",
    "commercial",
  ];

  const normalized =
    type?.toLowerCase();

  if (
    normalized &&
    validTypes.includes(
      normalized as Property["type"],
    )
  ) {
    return normalized as Property["type"];
  }

  return "house";
};

/* ============================================================================
   IMAGE URL RESOLVER
============================================================================ */

const resolveImageUrl = (
  image: BackendImage,
): string | null => {
  if (!image) {
    return null;
  }

  let value: string | undefined;

  /* --------------------------------------------------------------------------
     STRING
  -------------------------------------------------------------------------- */

  if (typeof image === "string") {
    value = image;
  }

  /* --------------------------------------------------------------------------
     OBJECT
  -------------------------------------------------------------------------- */

  else if (
    typeof image === "object"
  ) {
    value =
      image.url ||
      image.path ||
      image.src ||
      image.imageUrl ||
      image.filename ||
      image.fileName;
  }

  /* --------------------------------------------------------------------------
     INVALID
  -------------------------------------------------------------------------- */

  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  /* --------------------------------------------------------------------------
     ABSOLUTE URL
  -------------------------------------------------------------------------- */

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  /* --------------------------------------------------------------------------
     BACKEND RELATIVE PATH
  -------------------------------------------------------------------------- */

  const normalizedPath =
    trimmed.startsWith("/")
      ? trimmed
      : `/${trimmed}`;

  return `${API}${normalizedPath}`;
};

/* ============================================================================
   NORMALIZE IMAGES
============================================================================ */

const normalizeImages = (
  images?: BackendImage[],
): string[] => {
  if (!Array.isArray(images)) {
    return [];
  }

  const resolved: string[] = [];

  for (const image of images) {
    const url =
      resolveImageUrl(image);

    if (
      url &&
      !resolved.includes(url)
    ) {
      resolved.push(url);
    }
  }

  return resolved;
};

/* ============================================================================
   BACKEND → FRONTEND PROPERTY
============================================================================ */

const mapProperty = (
  property: BackendProperty,
): Property => {
  const agentId =
    typeof property.agent === "string"
      ? property.agent
      : property.agent?._id ||
        property.agent?.id ||
        "";

  const agentName =
    typeof property.agent === "object"
      ? property.agent?.name ||
        property.agent?.email ||
        "Property Agent"
      : "Property Agent";

  const agentPhone =
    typeof property.agent === "object"
      ? property.agent?.phone
      : undefined;

  const agentAvatar =
    typeof property.agent === "object"
      ? property.agent?.avatar
      : undefined;

  return {
    id:
      property._id,

    title:
      property.title ||
      "Untitled Property",

    description:
      property.description ||
      "",

    status:
      normalizeStatus(
        property.listingStatus,
        property.status,
      ),

    type:
      normalizeType(
        property.type,
      ),

    price:
      Number(property.price) || 0,

    address:
      property.address ||
      property.location ||
      property.city ||
      "Address unavailable",

    city:
      property.city ||
      "",

    state:
      property.state ||
      "",

    zip:
      property.zipCode,

    country:
      property.country,

    beds:
      property.bedrooms,

    baths:
      property.bathrooms,

    sqft:
      property.squareFeet,

    lot:
      property.lotSize !== undefined
        ? String(property.lotSize)
        : undefined,

    acreage:
      property.lotSize,

    images:
      normalizeImages(
        property.images,
      ),

    verified:
      property.verified,

    virtualTour:
      Boolean(
        property.virtualTour,
      ),

    features:
      Array.isArray(
        property.features,
      )
        ? property.features
        : [],

    utilities:
      Array.isArray(
        property.utilities,
      )
        ? property.utilities
        : [],

    agent: {
      id:
        agentId,

      name:
        agentName,

      role:
        "Agent",

      avatar:
        agentAvatar,

      verified:
        property.verified,

      phone:
        agentPhone,
    },

    details: {
      yearBuilt:
        property.yearBuilt,

      parking:
        property.parking,

      heating:
        property.heating,

      cooling:
        property.cooling,

      stories:
        property.stories,

      hoa:
        property.hoa,

      tax:
        property.propertyTax,

      mls:
        property.mlsId,
    },

    latitude:
      property.latitude,

    longitude:
      property.longitude,

    createdAt:
      property.createdAt,

    updatedAt:
      property.updatedAt,
  };
};

/* ============================================================================
   SEARCH PARAMETERS
============================================================================ */

export interface PropertySearchParams {
  search?: string;

  status?: "sale" | "rent";

  type?: string;

  minPrice?: number;

  maxPrice?: number;

  bedrooms?: number;

  bathrooms?: number;

  city?: string;

  state?: string;

  page?: number;

  limit?: number;
}

/* ============================================================================
   CREATE PROPERTY PAYLOAD
============================================================================ */

export interface CreatePropertyPayload {
  title: string;

  description: string;

  price: number;

  type: string;

  listingStatus:
    | "sale"
    | "rent";

  bedrooms?: number;

  bathrooms?: number;

  squareFeet?: number;

  lotSize?: number;

  yearBuilt?: number;

  parking?: string;

  heating?: string;

  cooling?: string;

  stories?: number;

  hoa?: string;

  propertyTax?: string;

  location?: string;

  address?: string;

  city?: string;

  state?: string;

  country?: string;

  zipCode?: string;

  latitude?: number;

  longitude?: number;

  images?: string[];

  features?: string[];

  utilities?: string[];

  virtualTour?: boolean;
}

/* ============================================================================
   PROPERTY API
============================================================================ */

export const propertyApi = {

  /* ==========================================================================
     GET PROPERTIES
  ========================================================================== */

  async getProperties(
    params?: PropertySearchParams,
  ): Promise<Property[]> {
    const query =
      new URLSearchParams();

    Object.entries(
      params || {},
    ).forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== ""
        ) {
          query.set(
            key,
            String(value),
          );
        }
      },
    );

    const suffix =
      query.toString()
        ? `?${query.toString()}`
        : "";

    const response =
      await request<unknown>(
        `/realestate/properties${suffix}`,
      );

    const unwrapped =
      unwrap<unknown>(
        response,
      );

    let properties:
      BackendProperty[] = [];

    if (
      unwrapped &&
      typeof unwrapped === "object" &&
      "data" in unwrapped
    ) {
      const data =
        (
          unwrapped as {
            data: unknown;
          }
        ).data;

      if (
        Array.isArray(data)
      ) {
        properties =
          data as BackendProperty[];
      }
    }

    else if (
      Array.isArray(
        unwrapped,
      )
    ) {
      properties =
        unwrapped as BackendProperty[];
    }

    return properties.map(
      mapProperty,
    );
  },

  /* ==========================================================================
     GET SINGLE PROPERTY
  ========================================================================== */

  async getProperty(
    id: string,
  ): Promise<Property> {
    const response =
      await request<unknown>(
        `/realestate/properties/${id}`,
      );

    const property =
      unwrap<BackendProperty>(
        response,
      );

    return mapProperty(
      property,
    );
  },

  /* ==========================================================================
     CREATE PROPERTY
  ========================================================================== */

  async createProperty(
    payload: CreatePropertyPayload,
  ): Promise<Property> {
    const response =
      await request<unknown>(
        "/realestate/properties",
        {
          method: "POST",

          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const property =
      unwrap<BackendProperty>(
        response,
      );

    return mapProperty(
      property,
    );
  },

  /* ==========================================================================
     UPLOAD PROPERTY IMAGES
  ========================================================================== */

  async uploadImages(
    files: File[],
  ): Promise<string[]> {
    if (!files.length) {
      return [];
    }

    const token =
      getToken();

    const formData =
      new FormData();

    files.forEach(
      (file: File) => {
        formData.append(
          "files",
          file,
        );
      },
    );

    const response =
      await fetch(
        `${API}/realestate/properties/upload`,
        {
          method: "POST",

          headers: {
            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },

          body:
            formData,
        },
      );

    if (!response.ok) {
      let message =
        `Image upload failed: ${response.status}`;

      try {
        const errorBody =
          await response.json();

        if (
          errorBody?.message
        ) {
          message =
            Array.isArray(
              errorBody.message,
            )
              ? errorBody.message.join(
                  ", ",
                )
              : String(
                  errorBody.message,
                );
        }
      } catch {
        // Ignore invalid response.
      }

      throw new Error(
        message,
      );
    }

    const data: unknown =
      await response.json();

    let urls: BackendImage[] = [];

    if (
      data &&
      typeof data === "object"
    ) {
      const body =
        data as {
          urls?: BackendImage[];
          data?: {
            urls?: BackendImage[];
          };
        };

      if (
        Array.isArray(
          body.urls,
        )
      ) {
        urls =
          body.urls;
      }

      else if (
        Array.isArray(
          body.data?.urls,
        )
      ) {
        urls =
          body.data.urls;
      }
    }

    const resolved: string[] = [];

    urls.forEach(
      (image: BackendImage) => {
        const url =
          resolveImageUrl(
            image,
          );

        if (
          url &&
          !resolved.includes(url)
        ) {
          resolved.push(url);
        }
      },
    );

    return resolved;
  },

  /* ==========================================================================
     UPDATE PROPERTY
  ========================================================================== */

  async updateProperty(
    id: string,
    payload:
      Partial<CreatePropertyPayload>,
  ): Promise<Property> {
    const response =
      await request<unknown>(
        `/realestate/properties/${id}`,
        {
          method: "PUT",

          body:
            JSON.stringify(
              payload,
            ),
        },
      );

    const property =
      unwrap<BackendProperty>(
        response,
      );

    return mapProperty(
      property,
    );
  },

  /* ==========================================================================
     DELETE PROPERTY
  ========================================================================== */

  async deleteProperty(
    id: string,
  ): Promise<void> {
    await request(
      `/realestate/properties/${id}`,
      {
        method: "DELETE",
      },
    );
  },

  /* ==========================================================================
     SAVE PROPERTY
  ========================================================================== */

  async saveProperty(
    id: string,
  ): Promise<void> {
    await request(
      `/realestate/properties/${id}/favorite`,
      {
        method: "POST",
      },
    );
  },

  /* ==========================================================================
     REMOVE SAVED PROPERTY
  ========================================================================== */

  async removeSavedProperty(
    id: string,
  ): Promise<void> {
    await request(
      `/realestate/properties/${id}/favorite`,
      {
        method: "DELETE",
      },
    );
  },
};