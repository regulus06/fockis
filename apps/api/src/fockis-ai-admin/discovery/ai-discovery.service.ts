import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";

import {
  InjectConnection,
} from "@nestjs/mongoose";

import {
  Connection,
} from "mongoose";

import {
  AiDiscoveryQuery,
  AiDiscoveryResult,
  AiDiscoveryResultItem,
} from "./ai-discovery.types";

/**
 * Fockis AI Live Discovery
 *
 * IMPORTANT:
 * - AI never receives arbitrary MongoDB queries.
 * - Every domain has a controlled search implementation.
 * - Public/active/approved records are preferred.
 * - New records become searchable automatically.
 * - No AI retraining is required when Fockis data changes.
 */
@Injectable()
export class AiDiscoveryService {
  private readonly logger = new Logger(
    AiDiscoveryService.name,
  );

  /**
   * Maximum number of records returned to AI.
   */
  private readonly MAX_LIMIT = 20;

  /**
   * MongoDB collection names.
   *
   * These correspond to the existing Fockis Mongoose models.
   */
  private readonly COLLECTIONS = {
    stores: "stores",
    products: "products",
    businesses: "businesses",
    jobs: "jobs",
    courses: "courses",
    programs: "programs",
    properties: "properties",
    events: "events",
    posts: "posts",
  } as const;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  // ============================================================
  // MAIN DISPATCHER
  // ============================================================

  async search(
    request: AiDiscoveryQuery,
  ): Promise<AiDiscoveryResult> {
    const tool = request?.tool;

    if (!tool) {
      throw new BadRequestException(
        "An AI discovery tool is required.",
      );
    }

    const limit = this.normalizeLimit(
      request?.limit,
    );

    const query = this.cleanText(
      request?.query,
    );

    this.logger.debug(
      `AI discovery request: ${tool} "${query}"`,
    );

    switch (tool) {
      case "search_fockis_stores":
        return this.searchStores(
          query,
          request,
          limit,
        );

      case "search_fockis_products":
        return this.searchProducts(
          query,
          request,
          limit,
        );

      case "search_fockis_businesses":
        return this.searchBusinesses(
          query,
          request,
          limit,
        );

      case "search_fockis_jobs":
        return this.searchJobs(
          query,
          request,
          limit,
        );

      case "search_fockis_courses":
        return this.searchCourses(
          query,
          request,
          limit,
        );

      case "search_fockis_programs":
        return this.searchPrograms(
          query,
          request,
          limit,
        );

      case "search_fockis_real_estate":
        return this.searchRealEstate(
          query,
          request,
          limit,
        );

      case "search_fockis_events":
        return this.searchEvents(
          query,
          request,
          limit,
        );

      case "search_fockis_posts":
        return this.searchPosts(
          query,
          request,
          limit,
        );

      default:
        throw new BadRequestException(
          `Unsupported Fockis AI discovery tool: ${tool}`,
        );
    }
  }

  // ============================================================
  // AVAILABLE TOOLS
  // ============================================================

  getAvailableTools() {
    return [
      {
        name: "search_fockis_stores",
        description:
          "Search public active Fockis stores using live marketplace data.",
      },
      {
        name: "search_fockis_products",
        description:
          "Search active Fockis products using live marketplace data.",
      },
      {
        name: "search_fockis_businesses",
        description:
          "Search public active Fockis businesses.",
      },
      {
        name: "search_fockis_jobs",
        description:
          "Search active and approved Fockis jobs and internships.",
      },
      {
        name: "search_fockis_courses",
        description:
          "Search Fockis Academy courses.",
      },
      {
        name: "search_fockis_programs",
        description:
          "Search Fockis Academy programs.",
      },
      {
        name: "search_fockis_real_estate",
        description:
          "Search approved public Fockis real estate listings.",
      },
      {
        name: "search_fockis_events",
        description:
          "Search public Fockis events that are not cancelled.",
      },
      {
        name: "search_fockis_posts",
        description:
          "Search public Fockis posts.",
      },
    ];
  }

  // ============================================================
  // STORES
  // ============================================================

  private async searchStores(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.stores,
      );

    const filter: Record<string, any> = {
      active: true,
    };

    const searchConditions =
      this.textConditions(
        query,
        [
          "name",
          "description",
          "slug",
          "category",
          "categories",
          "city",
          "state",
          "country",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    this.addLocationFilters(
      filter,
      request,
    );

    const results =
      await collection
        .find(filter)
        .sort({
          verified: -1,
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_stores",
      query,
      results,
      "store",
    );
  }

  // ============================================================
  // PRODUCTS
  // ============================================================

  private async searchProducts(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.products,
      );

    const filter: Record<string, any> = {
      isActive: true,
    };

    const searchConditions =
      this.textConditions(
        query,
        [
          "name",
          "description",
          "brand",
          "category",
          "location",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    if (request.category) {
      filter.category = {
        $regex: this.escapeRegex(
          request.category,
        ),
        $options: "i",
      };
    }

    this.addLocationFilters(
      filter,
      request,
    );

    this.addPriceFilters(
      filter,
      request,
    );

    const results =
      await collection
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_products",
      query,
      results,
      "product",
    );
  }

  // ============================================================
  // BUSINESSES
  // ============================================================

  private async searchBusinesses(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.businesses,
      );

    const filter: Record<string, any> = {
      status: "active",
      feedEnabled: true,
    };

    const searchConditions =
      this.textConditions(
        query,
        [
          "name",
          "description",
          "category",
          "city",
          "state",
          "country",
          "address",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    if (request.category) {
      filter.category = {
        $regex: this.escapeRegex(
          request.category,
        ),
        $options: "i",
      };
    }

    this.addLocationFilters(
      filter,
      request,
    );

    const results =
      await collection
        .find(filter)
        .sort({
          verified: -1,
          spotlightPriority: -1,
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_businesses",
      query,
      results,
      "business",
    );
  }

  // ============================================================
  // JOBS
  // ============================================================

  private async searchJobs(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.jobs,
      );

    const filter: Record<string, any> = {
      isActive: true,
      isApproved: true,
    };

    const searchConditions =
      this.textConditions(
        query,
        [
          "title",
          "description",
          "company",
          "companyDescription",
          "type",
          "workplaceType",
          "skills",
          "city",
          "stateProvince",
          "country",
          "location",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    if (request.type) {
      filter.type = {
        $regex: this.escapeRegex(
          request.type,
        ),
        $options: "i",
      };
    }

    this.addLocationFilters(
      filter,
      request,
      "stateProvince",
    );

    const results =
      await collection
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_jobs",
      query,
      results,
      "job",
    );
  }

  // ============================================================
  // COURSES
  // ============================================================

  private async searchCourses(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.courses,
      );

    const filter: Record<string, any> = {};

    const searchConditions =
      this.textConditions(
        query,
        [
          "code",
          "name",
          "description",
          "instructor",
          "programId",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    const results =
      await collection
        .find(filter)
        .sort({
          code: 1,
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_courses",
      query,
      results,
      "course",
    );
  }

  // ============================================================
  // PROGRAMS
  // ============================================================

  private async searchPrograms(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.programs,
      );

    const filter: Record<string, any> = {};

    const searchConditions =
      this.textConditions(
        query,
        [
          "name",
          "slug",
          "desc",
          "description",
          "cat",
          "level",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    if (request.category) {
      filter.cat = {
        $regex: this.escapeRegex(
          request.category,
        ),
        $options: "i",
      };
    }

    const results =
      await collection
        .find(filter)
        .sort({
          name: 1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_programs",
      query,
      results,
      "program",
    );
  }

  // ============================================================
  // REAL ESTATE
  // ============================================================

  private async searchRealEstate(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.properties,
      );

    /**
     * CRITICAL:
     *
     * PropertyService does not necessarily enforce
     * public approval by itself.
     *
     * Therefore the AI discovery layer explicitly
     * restricts results to approved listings.
     */
    const filter: Record<string, any> = {
      status: "approved",
    };

    const searchConditions =
      this.textConditions(
        query,
        [
          "title",
          "description",
          "type",
          "listingStatus",
          "city",
          "state",
          "country",
          "zipCode",
          "location",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    if (request.type) {
      filter.type = {
        $regex: this.escapeRegex(
          request.type,
        ),
        $options: "i",
      };
    }

    this.addLocationFilters(
      filter,
      request,
    );

    this.addPriceFilters(
      filter,
      request,
    );

    const results =
      await collection
        .find(filter)
        .sort({
          featured: -1,
          verified: -1,
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_real_estate",
      query,
      results,
      "real_estate",
    );
  }

  // ============================================================
  // EVENTS
  // ============================================================

  private async searchEvents(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.events,
      );

    const filter: Record<string, any> = {
      visibility: "public",
      isCancelled: false,
    };

    const searchConditions =
      this.textConditions(
        query,
        [
          "title",
          "description",
          "category",
          "locationName",
          "address",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    if (request.category) {
      filter.category = {
        $regex: this.escapeRegex(
          request.category,
        ),
        $options: "i",
      };
    }

    this.addLocationFilters(
      filter,
      request,
    );

    const results =
      await collection
        .find(filter)
        .sort({
          startDate: 1,
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_events",
      query,
      results,
      "event",
    );
  }

  // ============================================================
  // POSTS
  // ============================================================

  private async searchPosts(
    query: string,
    request: AiDiscoveryQuery,
    limit: number,
  ): Promise<AiDiscoveryResult> {
    const collection =
      this.getCollection(
        this.COLLECTIONS.posts,
      );

    /**
     * Only public posts are searchable.
     *
     * We intentionally do NOT expose:
     * - private posts
     * - friends-only posts
     * - viewedBy
     * - likedBy
     * - repostedBy
     * - private user information
     */
    const filter: Record<string, any> = {
      audience: "public",
    };

    const searchConditions =
      this.textConditions(
        query,
        [
          "content",
          "username",
          "type",
        ],
      );

    if (searchConditions.length) {
      filter.$or = searchConditions;
    }

    const results =
      await collection
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .limit(limit)
        .toArray();

    return this.buildResult(
      "search_fockis_posts",
      query,
      results,
      "post",
    );
  }

  // ============================================================
  // MONGO COLLECTION
  // ============================================================

  private getCollection(
    collectionName: string,
  ) {
    if (!this.connection?.db) {
      throw new Error(
        "MongoDB connection is not ready.",
      );
    }

    return this.connection.db.collection(
      collectionName,
    );
  }

  // ============================================================
  // SEARCH CONDITIONS
  // ============================================================

  private textConditions(
    query: string,
    fields: string[],
  ): Record<string, unknown>[] {
    if (!query) {
      return [];
    }

    const escaped =
      this.escapeRegex(query);

    return fields.map(
      (field) => ({
        [field]: {
          $regex: escaped,
          $options: "i",
        },
      }),
    );
  }

  // ============================================================
  // LOCATION FILTERS
  // ============================================================

  private addLocationFilters(
    filter: Record<string, any>,
    request: AiDiscoveryQuery,
    stateField = "state",
  ) {
    if (request.city) {
      filter.city = {
        $regex: this.escapeRegex(
          request.city,
        ),
        $options: "i",
      };
    }

    if (request.state) {
      filter[stateField] = {
        $regex: this.escapeRegex(
          request.state,
        ),
        $options: "i",
      };
    }

    if (request.country) {
      filter.country = {
        $regex: this.escapeRegex(
          request.country,
        ),
        $options: "i",
      };
    }
  }

  // ============================================================
  // PRICE FILTERS
  // ============================================================

  private addPriceFilters(
    filter: Record<string, any>,
    request: AiDiscoveryQuery,
  ) {
    if (
      request.minPrice === undefined &&
      request.maxPrice === undefined
    ) {
      return;
    }

    const price: Record<
      string,
      number
    > = {};

    if (
      typeof request.minPrice ===
      "number"
    ) {
      price.$gte =
        request.minPrice;
    }

    if (
      typeof request.maxPrice ===
      "number"
    ) {
      price.$lte =
        request.maxPrice;
    }

    if (Object.keys(price).length) {
      filter.price = price;
    }
  }

  // ============================================================
  // RESULT BUILDER
  // ============================================================

  private buildResult(
    tool: AiDiscoveryQuery["tool"],
    query: string,
    documents: any[],
    type: string,
  ): AiDiscoveryResult {
    const results =
      documents.map(
        (item) =>
          this.mapResult(
            item,
            type,
          ),
      );

    return {
      tool,
      query,
      count: results.length,
      results,
      searchedLiveDatabase: true,
    };
  }

  // ============================================================
  // RESULT MAPPER
  // ============================================================

  protected mapResult(
    item: any,
    type: string,
    titleField = "name",
  ): AiDiscoveryResultItem {
    const id = String(
      item?._id ??
        item?.id ??
        "",
    );

    const title =
      item?.[titleField] ??
      item?.title ??
      item?.name ??
      item?.code ??
      "Fockis result";

    const description =
      item?.description ??
      item?.desc ??
      item?.companyDescription ??
      undefined;

    const location = {
      city:
        item?.city ??
        item?.location?.city,

      state:
        item?.state ??
        item?.stateProvince ??
        item?.location?.state,

      country:
        item?.country ??
        item?.location?.country,
    };

    const price =
      typeof item?.price === "number"
        ? item.price
        : undefined;

    return {
      id,
      type,
      title: String(title),

      description:
        description
          ? String(description).slice(
              0,
              1000,
            )
          : undefined,

      location,

      price,

      metadata:
        this.buildMetadata(
          item,
          type,
        ),
    };
  }

  // ============================================================
  // SAFE METADATA
  // ============================================================

  private buildMetadata(
    item: any,
    type: string,
  ): Record<string, unknown> {
    const metadata: Record<
      string,
      unknown
    > = {};

    switch (type) {
      case "store":
        this.addIfPresent(
          metadata,
          "slug",
          item?.slug,
        );

        this.addIfPresent(
          metadata,
          "category",
          item?.category,
        );

        this.addIfPresent(
          metadata,
          "categories",
          item?.categories,
        );

        this.addIfPresent(
          metadata,
          "verified",
          item?.verified,
        );

        this.addIfPresent(
          metadata,
          "rating",
          item?.rating ??
            item?.averageRating,
        );

        break;

      case "product":
        this.addIfPresent(
          metadata,
          "category",
          item?.category,
        );

        this.addIfPresent(
          metadata,
          "brand",
          item?.brand,
        );

        this.addIfPresent(
          metadata,
          "stock",
          item?.stock,
        );

        this.addIfPresent(
          metadata,
          "rating",
          item?.rating,
        );

        this.addIfPresent(
          metadata,
          "totalReviews",
          item?.totalReviews,
        );

        this.addIfPresent(
          metadata,
          "storeId",
          item?.storeId,
        );

        break;

      case "business":
        this.addIfPresent(
          metadata,
          "category",
          item?.category,
        );

        this.addIfPresent(
          metadata,
          "verified",
          item?.verified,
        );

        this.addIfPresent(
          metadata,
          "website",
          item?.website,
        );

        this.addIfPresent(
          metadata,
          "phone",
          item?.phone ??
            item?.phoneNumber,
        );

        break;

      case "job":
        this.addIfPresent(
          metadata,
          "company",
          item?.company,
        );

        this.addIfPresent(
          metadata,
          "type",
          item?.type,
        );

        this.addIfPresent(
          metadata,
          "workplaceType",
          item?.workplaceType,
        );

        this.addIfPresent(
          metadata,
          "remote",
          item?.remote,
        );

        this.addIfPresent(
          metadata,
          "salary",
          item?.salary,
        );

        this.addIfPresent(
          metadata,
          "currency",
          item?.currency,
        );

        this.addIfPresent(
          metadata,
          "salaryPeriod",
          item?.salaryPeriod,
        );

        break;

      case "course":
        this.addIfPresent(
          metadata,
          "code",
          item?.code,
        );

        this.addIfPresent(
          metadata,
          "instructor",
          item?.instructor,
        );

        this.addIfPresent(
          metadata,
          "programId",
          item?.programId,
        );

        break;

      case "program":
        this.addIfPresent(
          metadata,
          "slug",
          item?.slug,
        );

        this.addIfPresent(
          metadata,
          "category",
          item?.cat,
        );

        this.addIfPresent(
          metadata,
          "level",
          item?.level,
        );

        break;

      case "real_estate":
        this.addIfPresent(
          metadata,
          "type",
          item?.type,
        );

        this.addIfPresent(
          metadata,
          "listingStatus",
          item?.listingStatus,
        );

        this.addIfPresent(
          metadata,
          "bedrooms",
          item?.bedrooms,
        );

        this.addIfPresent(
          metadata,
          "bathrooms",
          item?.bathrooms,
        );

        this.addIfPresent(
          metadata,
          "squareFeet",
          item?.squareFeet,
        );

        this.addIfPresent(
          metadata,
          "verified",
          item?.verified,
        );

        this.addIfPresent(
          metadata,
          "featured",
          item?.featured,
        );

        break;

      case "event":
        this.addIfPresent(
          metadata,
          "category",
          item?.category,
        );

        this.addIfPresent(
          metadata,
          "startDate",
          item?.startDate,
        );

        this.addIfPresent(
          metadata,
          "endDate",
          item?.endDate,
        );

        this.addIfPresent(
          metadata,
          "locationName",
          item?.locationName,
        );

        this.addIfPresent(
          metadata,
          "isOnline",
          item?.isOnline,
        );

        break;

      case "post":
        this.addIfPresent(
          metadata,
          "username",
          item?.username,
        );

        this.addIfPresent(
          metadata,
          "type",
          item?.type,
        );

        this.addIfPresent(
          metadata,
          "createdAt",
          item?.createdAt,
        );

        break;
    }

    return metadata;
  }

  // ============================================================
  // SAFE VALUE HELPER
  // ============================================================

  private addIfPresent(
    target: Record<string, unknown>,
    key: string,
    value: unknown,
  ) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      if (
        key === "storeId" ||
        key === "programId"
      ) {
        target[key] = String(value);
        return;
      }

      target[key] = value;
    }
  }

  // ============================================================
  // LIMIT
  // ============================================================

  private normalizeLimit(
    value?: number,
  ): number {
    if (
      typeof value !== "number" ||
      Number.isNaN(value)
    ) {
      return 10;
    }

    return Math.min(
      Math.max(
        Math.floor(value),
        1,
      ),
      this.MAX_LIMIT,
    );
  }

  // ============================================================
  // TEXT CLEANING
  // ============================================================

  private cleanText(
    value?: string,
  ): string {
    if (!value) {
      return "";
    }

    return String(value)
      .trim()
      .slice(0, 500);
  }

  // ============================================================
  // REGEX ESCAPING
  // ============================================================

  private escapeRegex(
    value: string,
  ): string {
    return value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
  }
}