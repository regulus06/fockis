export type AiDiscoveryTool =
  | "search_fockis_stores"
  | "search_fockis_products"
  | "search_fockis_businesses"
  | "search_fockis_jobs"
  | "search_fockis_courses"
  | "search_fockis_programs"
  | "search_fockis_real_estate"
  | "search_fockis_events"
  | "search_fockis_posts";

export interface AiDiscoveryQuery {
  tool: AiDiscoveryTool;

  /**
   * Natural-language search text.
   */
  query?: string;

  /**
   * Geographic filters.
   */
  city?: string;
  state?: string;
  country?: string;

  /**
   * General category filter.
   */
  category?: string;

  /**
   * Domain-specific type.
   */
  type?: string;

  /**
   * Product/property price filters.
   */
  minPrice?: number;
  maxPrice?: number;

  /**
   * Maximum number of results.
   */
  limit?: number;
}

export interface AiDiscoveryResultItem {
  id: string;

  /**
   * Fockis domain type:
   *
   * store
   * product
   * business
   * job
   * course
   * program
   * real_estate
   * event
   * post
   */
  type: string;

  title: string;

  description?: string;

  /**
   * Optional frontend route for future AI navigation.
   */
  url?: string;

  location?: {
    city?: string;
    state?: string;
    country?: string;
  };

  price?: number;

  metadata?: Record<string, unknown>;
}

export interface AiDiscoveryResult {
  tool: AiDiscoveryTool;

  query: string;

  count: number;

  results: AiDiscoveryResultItem[];

  /**
   * Confirms that the response came from
   * the current Fockis database rather than
   * static AI knowledge.
   */
  searchedLiveDatabase: true;
}

/**
 * ============================================================
 * VAPI FUNCTION TOOL TYPES
 * ============================================================
 *
 * These types describe the tools that will eventually be
 * registered with Vapi.
 *
 * Vapi will decide WHEN a tool should be called.
 * Fockis controls WHAT the tool is allowed to search.
 *
 * We never expose arbitrary MongoDB queries to Vapi.
 */

export interface VapiFunctionToolParameterProperty {
  type: "string" | "number" | "integer" | "boolean";

  description?: string;

  enum?: string[];
}

export interface VapiFunctionToolParameters {
  type: "object";

  properties: Record<
    string,
    VapiFunctionToolParameterProperty
  >;

  required?: string[];

  additionalProperties?: boolean;
}

export interface VapiFunctionDefinition {
  name: AiDiscoveryTool;

  description: string;

  parameters: VapiFunctionToolParameters;

  strict?: boolean;
}

export interface VapiFunctionTool {
  type: "function";

  async?: boolean;

  function: VapiFunctionDefinition;
}

/**
 * ============================================================
 * FOCKIS AI TOOL DEFINITIONS
 * ============================================================
 *
 * These are model-facing definitions.
 *
 * The model can provide search criteria, but it cannot provide
 * MongoDB filters or database queries.
 */
export function getVapiDiscoveryTools(): VapiFunctionTool[] {
  return [
    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_stores",

        description:
          "Search the current public and active Fockis stores. Use this when the user is looking for a Fockis store, shop, seller, marketplace store, or place to buy from.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "What the user is looking for, such as clothing, electronics, Haitian products, shoes, or a specific store name.",
            },

            city: {
              type: "string",
              description:
                "Optional city where the store should be located.",
            },

            state: {
              type: "string",
              description:
                "Optional state or province where the store should be located.",
            },

            country: {
              type: "string",
              description:
                "Optional country where the store should be located.",
            },

            category: {
              type: "string",
              description:
                "Optional store category.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of stores to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },

    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_products",

        description:
          "Search current active Fockis products. Use this when the user wants to find, compare, or learn about products available on Fockis.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "Product or product category the user is looking for.",
            },

            city: {
              type: "string",
              description:
                "Optional city.",
            },

            state: {
              type: "string",
              description:
                "Optional state or province.",
            },

            country: {
              type: "string",
              description:
                "Optional country.",
            },

            category: {
              type: "string",
              description:
                "Optional product category.",
            },

            minPrice: {
              type: "number",
              description:
                "Optional minimum price.",
            },

            maxPrice: {
              type: "number",
              description:
                "Optional maximum price.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of products to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },

    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_businesses",

        description:
          "Search current public active Fockis businesses. Use this when the user is looking for a business, restaurant, salon, barber, company, or local service.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "Business, company, service, restaurant, salon, barber, or other business the user is looking for.",
            },

            city: {
              type: "string",
              description:
                "Optional city.",
            },

            state: {
              type: "string",
              description:
                "Optional state or province.",
            },

            country: {
              type: "string",
              description:
                "Optional country.",
            },

            category: {
              type: "string",
              description:
                "Optional business category.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of businesses to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },

    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_jobs",

        description:
          "Search current active and approved Fockis jobs and internships. Use this when the user is looking for employment, internships, careers, or job opportunities.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "Job title, skill, industry, company, or employment opportunity.",
            },

            city: {
              type: "string",
              description:
                "Optional city.",
            },

            state: {
              type: "string",
              description:
                "Optional state or province.",
            },

            country: {
              type: "string",
              description:
                "Optional country.",
            },

            type: {
              type: "string",
              description:
                "Optional job type such as internship, full-time, part-time, contract, or temporary.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of jobs to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },

    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_courses",

        description:
          "Search current Fockis Academy courses. Use this when the user wants a course, class, lesson, or specific subject to study.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "Course name, course code, subject, instructor, or topic.",
            },

            category: {
              type: "string",
              description:
                "Optional course category.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of courses to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },

    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_programs",

        description:
          "Search current Fockis Academy programs. Use this when the user is looking for a degree, major, academic program, or field of study.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "Program name, major, field of study, or academic subject.",
            },

            category: {
              type: "string",
              description:
                "Optional program category such as technology, business, healthcare, or trades.",
            },

            type: {
              type: "string",
              description:
                "Optional program level or type.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of programs to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },

    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_real_estate",

        description:
          "Search current approved Fockis real estate listings. Use this when the user is looking for homes, apartments, rentals, properties, or properties for sale.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "Property, neighborhood, home, apartment, rental, or real estate search.",
            },

            city: {
              type: "string",
              description:
                "Optional city.",
            },

            state: {
              type: "string",
              description:
                "Optional state or province.",
            },

            country: {
              type: "string",
              description:
                "Optional country.",
            },

            type: {
              type: "string",
              description:
                "Optional property type such as house, apartment, condo, land, or commercial.",
            },

            minPrice: {
              type: "number",
              description:
                "Optional minimum property price.",
            },

            maxPrice: {
              type: "number",
              description:
                "Optional maximum property price.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of listings to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },

    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_events",

        description:
          "Search current public Fockis events that are not cancelled. Use this when the user is looking for events, concerts, festivals, conferences, or other public activities.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "Event, activity, concert, festival, conference, or topic.",
            },

            city: {
              type: "string",
              description:
                "Optional city.",
            },

            state: {
              type: "string",
              description:
                "Optional state or province.",
            },

            country: {
              type: "string",
              description:
                "Optional country.",
            },

            category: {
              type: "string",
              description:
                "Optional event category.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of events to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },

    {
      type: "function",

      async: false,

      function: {
        name: "search_fockis_posts",

        description:
          "Search current public Fockis posts. Use this when the user specifically asks what people posted or is looking for public Fockis posts about a topic.",

        parameters: {
          type: "object",

          properties: {
            query: {
              type: "string",
              description:
                "Topic, phrase, username, or subject to search for in public posts.",
            },

            category: {
              type: "string",
              description:
                "Optional post type or category.",
            },

            limit: {
              type: "integer",
              description:
                "Maximum number of posts to return.",
            },
          },

          required: [],

          additionalProperties: false,
        },

        strict: true,
      },
    },
  ];
}