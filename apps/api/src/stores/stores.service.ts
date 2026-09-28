import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Store,
  StoreDocument,
} from "./schemas/store.schema";
import { SellerService } from "../seller/services/seller.service";

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,
    private readonly sellerService: SellerService,
  ) {}

  // =====================================================
  // PUBLIC STORE FILTER
  //
  // A store is publicly visible unless it has explicitly
  // been disabled or suspended.
  //
  // This also keeps older stores visible when they were
  // created before the active/status fields were added.
  // =====================================================

  private publicStoreFilter() {
    return {
      active: { $ne: false },
      status: { $ne: "SUSPENDED" as const },
    };
  }

  // =====================================================
  // DOMAIN NORMALIZATION
  // =====================================================

  private normalizeDomain(value: string): string {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0]
      .replace(/\.$/, "");
  }

  private normalizeDomainPrefix(value: string): string {
    let domain = this.normalizeDomain(value);

    if (domain.endsWith(".fockis.com")) {
      domain = domain.slice(
        0,
        -".fockis.com".length,
      );
    }

    if (domain.endsWith(".fockis")) {
      domain = domain.slice(
        0,
        -".fockis".length,
      );
    }

    return domain;
  }

  private validateDomainPrefix(
    prefix: string,
  ): void {
    if (
      prefix.length < 2 ||
      prefix.length > 63
    ) {
      throw new BadRequestException(
        "Fockis domain must be between 2 and 63 characters.",
      );
    }

    if (
      !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
        prefix,
      )
    ) {
      throw new BadRequestException(
        "Fockis domain can contain only lowercase letters, numbers, and hyphens and cannot start or end with a hyphen.",
      );
    }

    const reservedDomains = new Set([
      "www",
      "admin",
      "api",
      "app",
      "account",
      "accounts",
      "auth",
      "login",
      "logout",
      "support",
      "help",
      "shop",
      "seller",
      "sellers",
      "travel",
      "academy",
      "mail",
      "email",
      "security",
      "billing",
      "payments",
      "checkout",
      "dashboard",
      "staff",
      "superadmin",
      "system",
      "fockis",
    ]);

    if (reservedDomains.has(prefix)) {
      throw new BadRequestException(
        "This Fockis domain name is reserved.",
      );
    }
  }

  // =====================================================
  // FOCKIS STORE ID
  // =====================================================

  private generateStoreId(
    countryCode: string,
  ): string {
    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let randomPart = "";

    for (
      let index = 0;
      index < 10;
      index++
    ) {
      randomPart +=
        alphabet[
          Math.floor(
            Math.random() *
              alphabet.length,
          )
        ];
    }

    return `FK${countryCode}ST${randomPart}`;
  }

  private async generateUniqueStoreId(
    countryCode: string,
  ): Promise<string> {
    for (
      let attempt = 0;
      attempt < 10;
      attempt++
    ) {
      const storeId =
        this.generateStoreId(
          countryCode,
        );

      const exists =
        await this.storeModel.exists({
          fockisStoreId: storeId,
        });

      if (!exists) {
        return storeId;
      }
    }

    throw new BadRequestException(
      "Unable to generate a unique Fockis Store ID. Please try again.",
    );
  }

  // =====================================================
  // COUNTRY HANDLING
  // =====================================================

  private normalizeCountryCode(
    countryCode: string,
  ): string {
    const normalized =
      String(countryCode || "")
        .trim()
        .toUpperCase();

    if (!/^[A-Z]{2}$/.test(normalized)) {
      throw new BadRequestException(
        "Country code must contain exactly two letters.",
      );
    }

    return normalized;
  }

  // =====================================================
  // ZIP / POSTAL CODE VALIDATION
  //
  // Haiti:
  //   Optional
  //
  // Every other country:
  //   Required
  // =====================================================

  private validateZipCode(
    countryCode: string,
    zipCode: unknown,
  ): string {
    const normalizedCountryCode =
      this.normalizeCountryCode(
        countryCode,
      );

    const normalizedZipCode =
      String(zipCode ?? "").trim();

    if (
      normalizedCountryCode === "HT"
    ) {
      return normalizedZipCode;
    }

    if (!normalizedZipCode) {
      throw new BadRequestException(
        "ZIP/postal code is required for this country.",
      );
    }

    if (
      normalizedZipCode.length > 20
    ) {
      throw new BadRequestException(
        "ZIP/postal code cannot exceed 20 characters.",
      );
    }

    return normalizedZipCode;
  }

  // =====================================================
  // DOMAIN AVAILABILITY
  // =====================================================

  async checkDomainAvailability(
    domain: string,
  ) {
    const prefix =
      this.normalizeDomainPrefix(
        domain,
      );

    this.validateDomainPrefix(
      prefix,
    );

    const normalizedDomain =
      `${prefix}.fockis.com`;

    const existing =
      await this.storeModel.exists({
        domainName:
          normalizedDomain,
      });

    return {
      available: !existing,
      domain: normalizedDomain,
      message: existing
        ? "This Fockis domain is already in use."
        : "This Fockis domain is available.",
    };
  }

  // =====================================================
  // CREATE STORE
  // =====================================================

  async create(
    data: any,
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "User required",
      );
    }

    const sellerProfile =
      await this.sellerService.getActiveProfile(
        userId,
      );

    if (
      !data?.name ||
      String(data.name).trim().length < 3
    ) {
      throw new BadRequestException(
        "Store name must contain at least 3 characters.",
      );
    }

    if (!data.country) {
      throw new BadRequestException(
        "Country is required.",
      );
    }

    if (!data.countryCode) {
      throw new BadRequestException(
        "Country code is required.",
      );
    }

    if (!data.city) {
      throw new BadRequestException(
        "City is required.",
      );
    }

    if (!data.address) {
      throw new BadRequestException(
        "Address is required.",
      );
    }

    // ===================================================
    // COUNTRY
    // ===================================================

    const countryCode =
      this.normalizeCountryCode(
        data.countryCode,
      );

    const country =
      String(data.country).trim();

    // ===================================================
    // ZIP / POSTAL CODE
    // ===================================================

    const zipCode =
      this.validateZipCode(
        countryCode,
        data.zipCode,
      );

    // ===================================================
    // DOMAIN
    // ===================================================

    if (!data.domainName) {
      throw new BadRequestException(
        "Fockis domain name is required.",
      );
    }

    const domainPrefix =
      this.normalizeDomainPrefix(
        data.domainName,
      );

    this.validateDomainPrefix(
      domainPrefix,
    );

    const domainName =
      `${domainPrefix}.fockis.com`;

    const existingDomain =
      await this.storeModel.exists({
        domainName,
      });

    if (existingDomain) {
      throw new BadRequestException(
        "This Fockis domain is already in use.",
      );
    }

    // ===================================================
    // SLUG
    // ===================================================

    const baseSlug =
      String(
        data.slug ||
          data.name ||
          domainPrefix,
      )
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/^-+|-+$/g, "");

    let slug =
      baseSlug || domainPrefix;

    let count = 1;

    while (
      await this.storeModel.findOne({
        slug,
      })
    ) {
      slug =
        `${baseSlug || domainPrefix}-${count}`;

      count++;
    }

    // ===================================================
    // FOCKIS STORE ID
    //
    // Seller never supplies this.
    // ===================================================

    const fockisStoreId =
      await this.generateUniqueStoreId(
        countryCode,
      );

    // ===================================================
    // CREATE
    // ===================================================

    try {
      const store =
        await this.storeModel.create({
          ownerId:
            new Types.ObjectId(userId),

          sellerId:
            sellerProfile?._id,

          fockisStoreId,

          domainName,

          name:
            String(data.name).trim(),

          slug,

          description:
            String(
              data.description || "",
            ).trim(),

          category:
            String(
              data.category || "",
            ).trim(),

          logo:
            data.logo ||
            data.profilePhoto ||
            "",

          banner:
            data.banner ||
            data.coverPhoto ||
            "",

          email:
            data.email ||
            data.businessEmail ||
            "",

          phone:
            data.phone || "",

          website:
            data.website || "",

          country,

          countryCode,

          city:
            String(data.city).trim(),

          state:
            data.state
              ? String(data.state).trim()
              : "",

          zipCode,

          address:
            String(data.address).trim(),

          currency:
            data.currency || "USD",

          shippingPolicy:
            data.shippingPolicy || "",

          returnPolicy:
            data.returnPolicy || "",

          facebook:
            data.facebook || "",

          instagram:
            data.instagram || "",

          twitter:
            data.twitter || "",

          followers: 0,

          followersList: [],

          rating: 0,

          reviewCount: 0,

          totalSales: 0,

          totalProducts: 0,

          totalViews: 0,

          status: "ACTIVE",

          verified: false,

          active: true,
        });

      return store;
    } catch (error: any) {
      if (error?.code === 11000) {
        const duplicateFields =
          Object.keys(
            error?.keyPattern || {},
          );

        if (
          duplicateFields.includes(
            "domainName",
          )
        ) {
          throw new BadRequestException(
            "This Fockis domain is already in use.",
          );
        }

        if (
          duplicateFields.includes(
            "fockisStoreId",
          )
        ) {
          throw new BadRequestException(
            "A unique Fockis Store ID could not be generated. Please try again.",
          );
        }

        if (
          duplicateFields.includes(
            "slug",
          )
        ) {
          throw new BadRequestException(
            "The store slug already exists.",
          );
        }
      }

      throw error;
    }
  }

  // =====================================================
  // GET ALL PUBLIC STORES
  // =====================================================

  async getAll() {
    return this.storeModel
      .find(
        this.publicStoreFilter(),
      )
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // =====================================================
  // GET PUBLIC STORE BY DOMAIN
  // =====================================================

  async getByDomain(
    domain: string,
  ) {
    const normalizedDomain =
      this.normalizeDomain(
        domain,
      );

    const store =
      await this.storeModel
        .findOne({
          domainName:
            normalizedDomain,
          ...this.publicStoreFilter(),
        })
        .lean();

    if (!store) {
      throw new NotFoundException(
        "Store not found",
      );
    }

    return store;
  }

  // =====================================================
  // GET PUBLIC STORE BY SLUG
  // =====================================================

  async getBySlug(
    slug: string,
  ) {
    const normalizedSlug =
      String(slug || "")
        .trim()
        .toLowerCase();

    if (!normalizedSlug) {
      throw new BadRequestException(
        "Store slug is required.",
      );
    }

    const store =
      await this.storeModel
        .findOne({
          slug: normalizedSlug,
          ...this.publicStoreFilter(),
        })
        .lean();

    if (!store) {
      throw new NotFoundException(
        "Store not found",
      );
    }

    return store;
  }

  // =====================================================
  // GET USER STORES
  // =====================================================

  async getBySeller(
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "User required",
      );
    }

    return this.storeModel
      .find({
        ownerId:
          new Types.ObjectId(userId),
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // =====================================================
  // UPDATE STORE
  // =====================================================

  async update(
    id: string,
    data: any,
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "User required",
      );
    }

    if (!id) {
      throw new BadRequestException(
        "Store ID is required.",
      );
    }

    const allowedFields = [
      "name",
      "description",
      "category",
      "logo",
      "banner",
      "profilePhoto",
      "coverPhoto",
      "email",
      "phone",
      "website",
      "country",
      "city",
      "address",
      "state",
      "zipCode",
      "currency",
      "shippingPolicy",
      "returnPolicy",
      "facebook",
      "instagram",
      "twitter",
    ];

    const updateData: Record<
      string,
      any
    > = {};

    for (
      const field of allowedFields
    ) {
      if (
        data?.[field] !==
        undefined
      ) {
        updateData[field] =
          data[field];
      }
    }

    // ===================================================
    // PROFILE PHOTO
    // ===================================================

    if (
      updateData.profilePhoto !==
      undefined
    ) {
      updateData.logo =
        updateData.profilePhoto;

      delete updateData.profilePhoto;
    }

    // ===================================================
    // COVER PHOTO
    // ===================================================

    if (
      updateData.coverPhoto !==
      undefined
    ) {
      updateData.banner =
        updateData.coverPhoto;

      delete updateData.coverPhoto;
    }

    // ===================================================
    // BASIC TEXT VALIDATION
    // ===================================================

    if (
      updateData.name !==
      undefined
    ) {
      updateData.name =
        String(
          updateData.name,
        ).trim();

      if (
        updateData.name.length < 3
      ) {
        throw new BadRequestException(
          "Store name must contain at least 3 characters.",
        );
      }
    }

    if (
      updateData.country !==
      undefined
    ) {
      updateData.country =
        String(
          updateData.country,
        ).trim();

      if (
        updateData.country.length < 2
      ) {
        throw new BadRequestException(
          "Country is required.",
        );
      }
    }

    if (
      updateData.city !==
      undefined
    ) {
      updateData.city =
        String(
          updateData.city,
        ).trim();

      if (
        updateData.city.length < 2
      ) {
        throw new BadRequestException(
          "City must contain at least 2 characters.",
        );
      }
    }

    if (
      updateData.address !==
      undefined
    ) {
      updateData.address =
        String(
          updateData.address,
        ).trim();

      if (
        updateData.address.length < 2
      ) {
        throw new BadRequestException(
          "Address must contain at least 2 characters.",
        );
      }
    }

    // ===================================================
    // EXISTING STORE
    // ===================================================

    const existingStore =
      await this.storeModel
        .findOne({
          _id: id,
          ownerId:
            new Types.ObjectId(
              userId,
            ),
        })
        .lean();

    if (!existingStore) {
      throw new NotFoundException(
        "Store not found",
      );
    }

    // ===================================================
    // ZIP / POSTAL CODE
    // ===================================================

    if (
      updateData.zipCode !==
      undefined
    ) {
      updateData.zipCode =
        this.validateZipCode(
          String(
            (existingStore as any)
              .countryCode || "",
          ),
          updateData.zipCode,
        );
    }

    // ===================================================
    // UPDATE
    // ===================================================

    const store =
      await this.storeModel.findOneAndUpdate(
        {
          _id: id,
          ownerId:
            new Types.ObjectId(
              userId,
            ),
        },
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!store) {
      throw new NotFoundException(
        "Store not found",
      );
    }

    return store;
  }

  // =====================================================
  // DELETE
  // =====================================================

  async delete(
    id: string,
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "User required",
      );
    }

    const store =
      await this.storeModel.findOneAndDelete({
        _id: id,
        ownerId:
          new Types.ObjectId(userId),
      });

    if (!store) {
      throw new NotFoundException(
        "Store not found",
      );
    }

    return {
      message: "Store deleted",
    };
  }

  // =====================================================
  // FOLLOW / UNFOLLOW
  // =====================================================

  async followStore(
    storeId: string,
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "User required",
      );
    }

    const store =
      await this.storeModel.findById(
        storeId,
      );

    if (!store) {
      throw new NotFoundException(
        "Store not found",
      );
    }

    const isFollowing =
      store.followersList?.some(
        (id: any) =>
          id.toString() === userId,
      );

    if (isFollowing) {
      store.followersList =
        store.followersList.filter(
          (id: any) =>
            id.toString() !== userId,
        );

      store.followers =
        Math.max(
          0,
          store.followers - 1,
        );
    } else {
      store.followersList.push(
        new Types.ObjectId(userId),
      );

      store.followers =
        store.followers + 1;
    }

    await store.save();

    return {
      following:
        !isFollowing,
      followers:
        store.followers,
    };
  }
}