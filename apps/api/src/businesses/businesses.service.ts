import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  InjectModel,
} from "@nestjs/mongoose";
import {
  Model,
  Types,
} from "mongoose";
import {
  Business,
  BusinessDocument,
  BusinessImageSource,
  BusinessPrimaryAction,
} from "./schemas/business.schema";
import {
  BusinessDeal,
  BusinessDealDocument,
} from "./schemas/business-deal.schema";
import {
  Store,
  StoreDocument,
} from "../stores/schemas/store.schema";
import {
  Post,
} from "../posts/post.schema";
import {
  CreateBusinessDto,
} from "./dto/create-business.dto";
import {
  UpdateBusinessDto,
} from "./dto/update-business.dto";
import {
  CreateBusinessDealDto,
} from "./dto/create-business-deal.dto";
import {
  UpdateBusinessDealDto,
} from "./dto/update-business-deal.dto";
import {
  BusinessStatus,
} from "./enums/business-status.enum";
import {
  BusinessCategory,
} from "./enums/business-category.enum";
/* ============================================================================
   TYPES
\\============================================================================ */
/*
 * The authenticated user as seen by the service. Only the fields the
 * service needs; populated by BusinessesController from req.user.
 */
export interface BusinessViewer {
  id?: string;
  isAdmin?: boolean;
}
export interface PublicBusinessQuery {
  q?: string;
  category?: string;
  city?: string;
  sort?: string;
  page?: number;
  limit?: number;
}
/*
 * Public-safe summary of a connected Fockis Shop store.
 */
export interface BusinessStoreSummary {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  verified: boolean;
}
type ImageKind =
  | "logo"
  | "cover";
/* ============================================================================
   HELPERS
\\============================================================================ */
const DEFAULT_PUBLIC_LIMIT = 100;
const MAX_PUBLIC_LIMIT = 100;
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/*
 * Image values may be absolute http(s) URLs or files uploaded through the
 * business upload endpoints (/uploads/businesses/...). Everything else
 * (javascript:, data:, relative paths outside uploads) is rejected.
 */
function isSafeImageValue(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("/uploads/");
}
/*
 * Optional string fields: "" or null mean "remove".
 */
function cleanOptionalString(
  value: unknown,
): string | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }
  const text =
    String(value).trim();
  return text || undefined;
}
function isPublicBusiness(
  business: {
    status?: string;
    feedEnabled?: boolean;
  },
): boolean {
  return (
    business.status ===
      BusinessStatus.ACTIVE &&
    business.feedEnabled === true
  );
}
@Injectable()
export class BusinessesService {
  constructor(
    @InjectModel(Business.name)
    private readonly businessModel:
      Model<BusinessDocument>,
    @InjectModel(BusinessDeal.name)
    private readonly dealModel:
      Model<BusinessDealDocument>,
    @InjectModel(Store.name)
    private readonly storeModel:
      Model<StoreDocument>,
    @InjectModel(Post.name)
    private readonly postModel: Model<any>,
  ) {}
  /*
   * Keeps one generated main-feed post per business.
   * Requires PostSchema.businessId to be an optional field.
   */
  private async syncBusinessFeedPost(business: any) {
    const businessId = String(business._id);
    const existing = await this.postModel.findOne({ businessId });
    if (!business.feedEnabled || business.status !== BusinessStatus.ACTIVE) {
      if (existing) {
        existing.audience = "private";
        await existing.save();
      }
      return;
    }
    const image = business.coverImageUrl || business.logoUrl || "";
    const description = cleanOptionalString(business.description) || "";
    const profileUrl = `/businesses/${businessId}`;
    const content = [
      business.name,
      description,
      `View business: ${profileUrl}`,
    ].filter(Boolean).join("\n\n");
    await this.postModel.findOneAndUpdate(
      { businessId },
      {
        $set: {
          user: String(business.ownerId),
          username: business.name,
          userPhoto: business.logoUrl || "",
          content,
          type: "post",
          media: image,
          audience: "public",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  /* ==========================================================================
     SERIALIZATION
  ========================================================================== */
  private serializeDeal(
    deal: any,
  ) {
    return {
      ...deal,
      id:
        deal._id.toString(),
      businessId:
        deal.businessId.toString(),
    };
  }
  /*
   * Loads public summaries for the connected stores of the given businesses.
   * Suspended or deactivated stores are left out, so their "Visit Store"
   * button is not rendered.
   */
  private async loadStoreSummaries(
    businesses: Array<{
      storeId?: Types.ObjectId | null;
    }>,
  ): Promise<Map<string, BusinessStoreSummary>> {
    const storeIds =
      Array.from(
        new Set(
          businesses
            .map(
              (business) =>
                business.storeId
                  ? business.storeId.toString()
                  : "",
            )
            .filter(
              (id) =>
                Types.ObjectId.isValid(id),
            ),
        ),
      );
    const summaries =
      new Map<string, BusinessStoreSummary>();
    if (!storeIds.length) {
      return summaries;
    }
    const stores =
      await this.storeModel
        .find({
          _id: {
            $in: storeIds.map(
              (id) =>
                new Types.ObjectId(id),
            ),
          },
          active: {
            $ne: false,
          },
          status: {
            $ne: "SUSPENDED",
          },
        })
        .select(
          "name slug logo banner verified",
        )
        .lean();
    for (const store of stores) {
      summaries.set(
        store._id.toString(),
        {
          id:
            store._id.toString(),
          name:
            store.name,
          slug:
            store.slug,
          logo:
            store.logo || undefined,
          banner:
            store.banner || undefined,
          verified:
            Boolean(store.verified),
        },
      );
    }
    return summaries;
  }
  private serializeBusiness(
    business: any,
    deals: any[],
    stores: Map<string, BusinessStoreSummary>,
  ) {
    const storeId =
      business.storeId
        ? business.storeId.toString()
        : undefined;
    return {
      ...business,
      id:
        business._id.toString(),
      storeId,
      /*
       * null when no store is connected, or when the connected store is
       * no longer publicly available.
       */
      store:
        storeId
          ? stores.get(storeId) ?? null
          : null,
      deals:
        deals
          .filter(
            (deal) =>
              deal.businessId.toString() ===
              business._id.toString(),
          )
          .map(
            (deal) =>
              this.serializeDeal(deal),
          ),
    };
  }
  private async serializeMany(
    businesses: any[],
    dealFilter: Record<string, unknown>,
  ) {
    if (!businesses.length) {
      return [];
    }
    const businessIds =
      businesses.map(
        (business) =>
          business._id,
      );
    const [
      deals,
      stores,
    ] = await Promise.all([
      this.dealModel
        .find({
          businessId: {
            $in: businessIds,
          },
          ...dealFilter,
        })
        .sort({
          expiresAt: 1,
        })
        .lean(),
      this.loadStoreSummaries(
        businesses,
      ),
    ]);
    return businesses.map(
      (business) =>
        this.serializeBusiness(
          business,
          deals,
          stores,
        ),
    );
  }
  private async serializeOne(
    business: any,
    dealFilter: Record<string, unknown>,
  ) {
    const [result] =
      await this.serializeMany(
        [business],
        dealFilter,
      );
    return result;
  }
  private activeDealFilter() {
    return {
      active: true,
      expiresAt: {
        $gt: new Date(),
      },
    };
  }
  /* ==========================================================================
     OWNERSHIP
  ========================================================================== */
  private async findOwnedBusiness(
    ownerId: string,
    businessId: string,
  ): Promise<BusinessDocument> {
    if (
      !Types.ObjectId.isValid(
        businessId,
      )
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }
    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new ForbiddenException(
        "Invalid authenticated user.",
      );
    }
    const business =
      await this.businessModel
        .findById(
          businessId,
        );
    if (!business) {
      throw new NotFoundException(
        "Business not found",
      );
    }
    if (
      business.ownerId.toString() !==
      ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this business",
      );
    }
    return business;
  }
  /*
   * A business may only be connected to a Fockis Shop store owned by the
   * same user. The client-supplied storeId is never trusted.
   */
  private async assertStoreOwnership(
    ownerId: string,
    storeId: string,
  ): Promise<Types.ObjectId> {
    if (
      !Types.ObjectId.isValid(
        storeId,
      )
    ) {
      throw new BadRequestException(
        "Invalid store.",
      );
    }
    const store =
      await this.storeModel
        .findById(storeId)
        .select(
          "ownerId active status",
        )
        .lean();
    if (!store) {
      throw new BadRequestException(
        "The selected Fockis Shop store does not exist.",
      );
    }
    if (
      store.ownerId?.toString() !==
      ownerId
    ) {
      throw new ForbiddenException(
        "You can only connect a Fockis Shop store you own.",
      );
    }
    if (
      store.active === false ||
      store.status === "SUSPENDED"
    ) {
      throw new BadRequestException(
        "The selected Fockis Shop store is not available.",
      );
    }
    return store._id as Types.ObjectId;
  }
  /*
   * The primary business card action must point at a configured
   * destination.
   */
  private assertPrimaryAction(
    business: {
      primaryAction?: BusinessPrimaryAction;
      websiteUrl?: string;
      storeId?: Types.ObjectId | null;
    },
  ) {
    if (
      business.primaryAction ===
        BusinessPrimaryAction.WEBSITE &&
      !business.websiteUrl
    ) {
      throw new BadRequestException(
        "Add a website URL before making Visit Website the primary action.",
      );
    }
    if (
      business.primaryAction ===
        BusinessPrimaryAction.STORE &&
      !business.storeId
    ) {
      throw new BadRequestException(
        "Connect a Fockis Shop store before making Visit Store the primary action.",
      );
    }
  }
  /* ==========================================================================
     PUBLIC BUSINESSES
     Only businesses explicitly published to the Fockis Feed are returned.
     Without query parameters the behaviour is unchanged: up to 100
     businesses ordered by Spotlight priority, then newest.
  ========================================================================== */
  async findPublic(
    query: PublicBusinessQuery = {},
  ) {
    const filter: Record<string, unknown> = {
      status:
        BusinessStatus.ACTIVE,
      feedEnabled: true,
    };
    const category =
      String(query.category || "")
        .trim()
        .toUpperCase();
    if (
      category &&
      (
        Object.values(
          BusinessCategory,
        ) as string[]
      ).includes(category)
    ) {
      filter.category = category;
    }
    const city =
      String(query.city || "")
        .trim()
        .slice(0, 100);
    if (city) {
      filter.city = new RegExp(
        `^${escapeRegex(city)}$`,
        "i",
      );
    }
    const search =
      String(query.q || "")
        .trim()
        .slice(0, 100);
    if (search) {
      const pattern =
        new RegExp(
          escapeRegex(search),
          "i",
        );
      filter.$or = [
        { name: pattern },
        { description: pattern },
        { tagline: pattern },
        { city: pattern },
        { state: pattern },
      ];
    }
    let sort: Record<string, 1 | -1> = {
      spotlightPriority: -1,
      createdAt: -1,
    };
    if (query.sort === "newest") {
      sort = {
        createdAt: -1,
      };
    } else if (query.sort === "name") {
      sort = {
        name: 1,
        createdAt: -1,
      };
    }
    const limit =
      Math.min(
        MAX_PUBLIC_LIMIT,
        Math.max(
          1,
          Number(query.limit) ||
            DEFAULT_PUBLIC_LIMIT,
        ),
      );
    const page =
      Math.max(
        1,
        Number(query.page) || 1,
      );
    const businesses =
      await this.businessModel
        .find(filter)
        .sort(sort)
        .skip(
          (page - 1) * limit,
        )
        .limit(limit)
        .lean();
    return this.serializeMany(
      businesses,
      this.activeDealFilter(),
    );
  }
  /* ==========================================================================
     CREATE BUSINESS
  ========================================================================== */
  async create(
    ownerId: string,
    dto: CreateBusinessDto,
  ) {
    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new ForbiddenException(
        "Invalid authenticated user.",
      );
    }
    const {
      storeId,
      primaryAction,
      ...fields
    } = dto;
    const connectedStoreId =
      storeId
        ? await this.assertStoreOwnership(
            ownerId,
            storeId,
          )
        : undefined;
    const draft = {
      ...fields,
      websiteUrl:
        cleanOptionalString(
          fields.websiteUrl,
        ),
      storeId:
        connectedStoreId,
      primaryAction:
        primaryAction ??
        undefined,
    };
    this.assertPrimaryAction(
      draft,
    );
    const business =
      await this.businessModel.create({
        ...draft,
        ownerId:
          new Types.ObjectId(
            ownerId,
          ),
        status:
          BusinessStatus.PENDING_REVIEW,
        feedEnabled:
          false,
        spotlightEnabled:
          false,
        spotlightPriority:
          0,
        coverImageSource:
          BusinessImageSource.URL,
        logoSource:
          BusinessImageSource.URL,
      });
    return this.serializeOne(
      business.toObject(),
      {},
    );
  }
  /* ==========================================================================
     MY BUSINESSES
  ========================================================================== */
  async findMine(
    ownerId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        ownerId,
      )
    ) {
      throw new ForbiddenException(
        "Invalid authenticated user.",
      );
    }
    const businesses =
      await this.businessModel
        .find({
          ownerId:
            new Types.ObjectId(
              ownerId,
            ),
        })
        .sort({
          createdAt: -1,
        })
        .lean();
    /*
     * Owners see every deal, including inactive and expired ones.
     */
    return this.serializeMany(
      businesses,
      {},
    );
  }
  /* ==========================================================================
     GET ONE BUSINESS
     Published businesses are public. Unpublished businesses (draft, pending,
     unpublished from the feed) are only visible to their owner and to
     super admins.
  ========================================================================== */
  async findOne(
    id: string,
    viewer?: BusinessViewer,
  ) {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }
    const business =
      await this.businessModel
        .findById(id)
        .lean();
    if (!business) {
      throw new NotFoundException(
        "Business not found",
      );
    }
    const isOwner =
      Boolean(viewer?.id) &&
      business.ownerId.toString() ===
        viewer?.id;
    if (
      !isPublicBusiness(business) &&
      !isOwner &&
      !viewer?.isAdmin
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }
    return this.serializeOne(
      business,
      this.activeDealFilter(),
    );
  }
  /* ==========================================================================
     UPDATE BUSINESS
  ========================================================================== */
  async update(
    ownerId: string,
    id: string,
    dto: UpdateBusinessDto,
    viewer?: BusinessViewer,
  ) {
    const business =
      await this.findOwnedBusiness(
        ownerId,
        id,
      );
    /* ------------------------------------------------------------------------
       REQUIRED FIELDS
    ------------------------------------------------------------------------ */
    if (dto.name !== undefined) {
      const name =
        dto.name.trim();
      if (!name) {
        throw new BadRequestException(
          "Business name is required.",
        );
      }
      business.name = name;
    }
    if (dto.category !== undefined) {
      business.category =
        dto.category;
    }
    /* ------------------------------------------------------------------------
       OPTIONAL TEXT FIELDS ("" clears the value)
    ------------------------------------------------------------------------ */
    const optionalTextFields = [
      "description",
      "tagline",
      "websiteUrl",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "zipCode",
      "country",
      "timeZone",
    ] as const;
    for (const field of optionalTextFields) {
      if (dto[field] !== undefined) {
        business.set(
          field,
          cleanOptionalString(
            dto[field],
          ),
        );
      }
    }
    if (dto.zipCode !== undefined) {
      business.set(
        "postalCode",
        cleanOptionalString(
          dto.zipCode,
        ),
      );
    }
    /* ------------------------------------------------------------------------
       OPTIONAL STRUCTURED FIELDS
    ------------------------------------------------------------------------ */
    if (dto.foundedYear !== undefined) {
      business.set(
        "foundedYear",
        dto.foundedYear ??
          undefined,
      );
    }
    if (dto.businessSize !== undefined) {
      business.set(
        "businessSize",
        dto.businessSize ||
          undefined,
      );
    }
    if (dto.latitude !== undefined) {
      business.set(
        "latitude",
        dto.latitude ??
          undefined,
      );
    }
    if (dto.longitude !== undefined) {
      business.set(
        "longitude",
        dto.longitude ??
          undefined,
      );
    }
    if (dto.hours !== undefined) {
      business.set(
        "hours",
        dto.hours.length
          ? dto.hours
          : undefined,
      );
    }
    if (dto.byAppointmentOnly !== undefined) {
      business.byAppointmentOnly =
        dto.byAppointmentOnly;
    }
    if (dto.socialLinks !== undefined) {
      const socialLinks: Record<string, string> = {};
      for (
        const [key, value] of Object.entries(
          dto.socialLinks,
        )
      ) {
        const cleaned =
          cleanOptionalString(value);
        if (cleaned) {
          socialLinks[key] = cleaned;
        }
      }
      business.socialLinks =
        socialLinks;
      business.markModified(
        "socialLinks",
      );
    }
    /* ------------------------------------------------------------------------
       IMAGES
    ------------------------------------------------------------------------ */
    this.applyImageUpdate(
      business,
      "logo",
      dto.logoUrl,
    );
    this.applyImageUpdate(
      business,
      "cover",
      dto.coverImageUrl,
    );
    /* ------------------------------------------------------------------------
       FOCKIS SHOP STORE
    ------------------------------------------------------------------------ */
    if (dto.storeId !== undefined) {
      if (dto.storeId) {
        business.storeId =
          await this.assertStoreOwnership(
            ownerId,
            dto.storeId,
          );
      } else {
        business.set(
          "storeId",
          undefined,
        );
        /*
         * Disconnecting the store also drops it as the primary action
         * unless the client sets a new one in the same request.
         */
        if (
          business.primaryAction ===
            BusinessPrimaryAction.STORE &&
          dto.primaryAction === undefined
        ) {
          business.set(
            "primaryAction",
            business.websiteUrl
              ? BusinessPrimaryAction.WEBSITE
              : undefined,
          );
        }
      }
    }
    /*
     * Clearing the website likewise drops it as the primary action.
     */
    if (
      dto.websiteUrl !== undefined &&
      !business.websiteUrl &&
      business.primaryAction ===
        BusinessPrimaryAction.WEBSITE &&
      dto.primaryAction === undefined
    ) {
      business.set(
        "primaryAction",
        business.storeId
          ? BusinessPrimaryAction.STORE
          : undefined,
      );
    }
    if (dto.primaryAction !== undefined) {
      business.set(
        "primaryAction",
        dto.primaryAction ||
          undefined,
      );
    }
    this.assertPrimaryAction(
      business,
    );
    /* ------------------------------------------------------------------------
       SPOTLIGHT
    ------------------------------------------------------------------------ */
    if (
      dto.spotlightEnabled !== undefined &&
      dto.spotlightEnabled !==
        business.spotlightEnabled
    ) {
      if (
        dto.spotlightEnabled &&
        !isPublicBusiness(business) &&
        !viewer?.isAdmin
      ) {
        throw new BadRequestException(
          "Publish this business before adding it to Spotlight.",
        );
      }
      business.spotlightEnabled =
        dto.spotlightEnabled;
    }
    if (
      dto.spotlightPriority !== undefined &&
      dto.spotlightPriority !==
        business.spotlightPriority
    ) {
      if (!viewer?.isAdmin) {
        throw new ForbiddenException(
          "Only Fockis administrators can change Spotlight priority.",
        );
      }
      business.spotlightPriority =
        dto.spotlightPriority;
    }
    const saved =
      await business.save();
    await this.syncBusinessFeedPost(saved);
    return this.serializeOne(
      saved.toObject(),
      {},
    );
  }
  /*
   * Applies a logo/cover URL coming from an update request.
   *
   * Older clients send the stored image back (sometimes expanded into an
   * absolute API URL); that is treated as "unchanged" so an uploaded image
   * keeps its UPLOAD source and relative path.
   */
  private applyImageUpdate(
    business: BusinessDocument,
    kind: ImageKind,
    value: string | undefined,
  ) {
    if (value === undefined) {
      return;
    }
    const urlField =
      kind === "logo"
        ? "logoUrl"
        : "coverImageUrl";
    const sourceField =
      kind === "logo"
        ? "logoSource"
        : "coverImageSource";
    const next =
      value.trim();
    const current =
      String(
        business.get(urlField) ||
          "",
      );
    if (!next) {
      business.set(
        urlField,
        undefined,
      );
      business.set(
        sourceField,
        BusinessImageSource.URL,
      );
      return;
    }
    if (
      next === current ||
      (
        current.startsWith("/uploads/") &&
        next.endsWith(current)
      )
    ) {
      return;
    }
    if (!isSafeImageValue(next)) {
      throw new BadRequestException(
        `${urlField} must be an http(s) URL or an uploaded image.`,
      );
    }
    business.set(
      urlField,
      next,
    );
    business.set(
      sourceField,
      next.startsWith("/uploads/")
        ? BusinessImageSource.UPLOAD
        : BusinessImageSource.URL,
    );
  }
  /* ==========================================================================
     PUBLISH / UNPUBLISH TO FOCKIS FEED
  ========================================================================== */
  async publishToFeed(
    ownerId: string,
    businessId: string,
    published: boolean,
  ) {
    const business =
      await this.findOwnedBusiness(
        ownerId,
        businessId,
      );
    if (published) {
      business.status =
        BusinessStatus.ACTIVE;
      business.feedEnabled =
        true;
    } else {
      business.feedEnabled =
        false;
    }
    const saved =
      await business.save();
    await this.syncBusinessFeedPost(saved);
    return {
      success: true,
      published:
        saved.feedEnabled,
      business:
        await this.serializeOne(
          saved.toObject(),
          {},
        ),
    };
  }
  /* ==========================================================================
     SET LOGO / COVER IMAGE (UPLOADS)
  ========================================================================== */
  async setImage(
    ownerId: string,
    businessId: string,
    kind: ImageKind,
    image: {
      url: string;
      source: BusinessImageSource;
    },
  ) {
    const business =
      await this.findOwnedBusiness(
        ownerId,
        businessId,
      );
    if (kind === "logo") {
      business.logoUrl =
        image.url;
      business.logoSource =
        image.source;
    } else {
      business.coverImageUrl =
        image.url;
      business.coverImageSource =
        image.source;
    }
    const saved =
      await business.save();
    await this.syncBusinessFeedPost(saved);
    return {
      success: true,
      business: {
        id:
          saved._id.toString(),
        logoUrl:
          saved.logoUrl,
        logoSource:
          saved.logoSource,
        coverImageUrl:
          saved.coverImageUrl,
        coverImageSource:
          saved.coverImageSource,
      },
    };
  }
  /*
   * Kept for backwards compatibility with existing callers.
   */
  async setCoverImage(
    ownerId: string,
    businessId: string,
    image: {
      url: string;
      source: BusinessImageSource;
    },
  ) {
    return this.setImage(
      ownerId,
      businessId,
      "cover",
      image,
    );
  }
  /* ==========================================================================
     DELETE BUSINESS
  ========================================================================== */
  async remove(
    ownerId: string,
    id: string,
  ) {
    const business =
      await this.findOwnedBusiness(
        ownerId,
        id,
      );
    await this.dealModel.deleteMany({
      businessId:
        business._id,
    });
    await this.postModel.deleteOne({ businessId: String(business._id) });
    await business.deleteOne();
    return {
      success: true,
    };
  }
  /* ==========================================================================
     BUSINESS SPOTLIGHT
  ========================================================================== */
  async getSpotlight() {
    const businesses =
      await this.businessModel
        .find({
          status:
            BusinessStatus.ACTIVE,
          feedEnabled:
            true,
          spotlightEnabled:
            true,
        })
        .sort({
          spotlightPriority: -1,
          createdAt: -1,
        })
        .limit(20)
        .lean();
    return this.serializeMany(
      businesses,
      this.activeDealFilter(),
    );
  }
  /* ==========================================================================
     CREATE DEAL
  ========================================================================== */
  async createDeal(
    ownerId: string,
    businessId: string,
    dto: CreateBusinessDealDto,
  ) {
    await this.findOwnedBusiness(
      ownerId,
      businessId,
    );
    const deal =
      await this.dealModel.create({
        ...dto,
        businessId:
          new Types.ObjectId(
            businessId,
          ),
        expiresAt:
          new Date(
            dto.expiresAt,
          ),
      });
    return this.serializeDeal(
      deal.toObject(),
    );
  }
  /* ==========================================================================
     UPDATE DEAL
  ========================================================================== */
  private async findOwnedDeal(
    ownerId: string,
    dealId: string,
    businessId?: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        dealId,
      )
    ) {
      throw new NotFoundException(
        "Deal not found",
      );
    }
    const deal =
      await this.dealModel
        .findById(
          dealId,
        );
    if (!deal) {
      throw new NotFoundException(
        "Deal not found",
      );
    }
    /*
     * When the route includes the business ID, the deal must belong to it.
     */
    if (
      businessId &&
      deal.businessId.toString() !==
        businessId
    ) {
      throw new NotFoundException(
        "Deal not found",
      );
    }
    const business =
      await this.businessModel
        .findById(
          deal.businessId,
        )
        .select("ownerId")
        .lean();
    if (
      !business ||
      business.ownerId.toString() !==
        ownerId
    ) {
      throw new ForbiddenException(
        "You do not own this deal",
      );
    }
    return deal;
  }
  async updateDeal(
    ownerId: string,
    dealId: string,
    dto: UpdateBusinessDealDto,
    businessId?: string,
  ) {
    const deal =
      await this.findOwnedDeal(
        ownerId,
        dealId,
        businessId,
      );
    Object.assign(
      deal,
      dto,
    );
    if (
      dto.expiresAt
    ) {
      deal.expiresAt =
        new Date(
          dto.expiresAt,
        );
    }
    const saved =
      await deal.save();
    return this.serializeDeal(
      saved.toObject(),
    );
  }
  /* ==========================================================================
     DELETE DEAL
  ========================================================================== */
  async deleteDeal(
    ownerId: string,
    dealId: string,
    businessId?: string,
  ) {
    const deal =
      await this.findOwnedDeal(
        ownerId,
        dealId,
        businessId,
      );
    await deal.deleteOne();
    return {
      success: true,
    };
  }
  /* ==========================================================================
     ANALYTICS COUNTERS
  ========================================================================== */
  private async incrementCounter(
    id: string,
    field:
      | "views"
      | "websiteClicks"
      | "storeClicks",
  ) {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        "Business not found",
      );
    }
    /*
     * Only published businesses collect public analytics.
     */
    const result =
      await this.businessModel
        .updateOne(
          {
            _id: id,
            status:
              BusinessStatus.ACTIVE,
            feedEnabled: true,
          },
          {
            $inc: {
              [field]: 1,
            },
          },
        );
    return {
      success:
        result.matchedCount > 0,
    };
  }
  async trackWebsiteClick(
    id: string,
  ) {
    return this.incrementCounter(
      id,
      "websiteClicks",
    );
  }
  async trackStoreClick(
    id: string,
  ) {
    return this.incrementCounter(
      id,
      "storeClicks",
    );
  }
  async trackView(
    id: string,
  ) {
    return this.incrementCounter(
      id,
      "views",
    );
  }
}
