import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  Partner,
  PartnerDocument,
} from "./partner.schema";

@Injectable()
export class PartnersService {
  constructor(
    @InjectModel(Partner.name)
    private readonly model: Model<PartnerDocument>,
  ) {}

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async getOwnerPartner(
    userId: string,
  ): Promise<PartnerDocument> {
    if (!userId) {
      throw new BadRequestException(
        "Authenticated user is required.",
      );
    }

    const normalizedUserId =
      String(userId).trim();

    const partner =
      await this.model.findOne({
        userId: normalizedUserId,
      });

    if (!partner) {
      throw new NotFoundException(
        "Business profile not found. Please create your business first.",
      );
    }

    return partner;
  }

  private normalizeCategories(
    categories: unknown,
  ): string[] {
    if (!Array.isArray(categories)) {
      return [];
    }

    return Array.from(
      new Set(
        categories
          .filter(
            (value): value is string =>
              typeof value === "string",
          )
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
  }

  private normalizeApplication(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const update: Record<string, unknown> = {};

    if (
      typeof data.businessName === "string"
    ) {
      const businessName =
        data.businessName.trim();

      if (businessName) {
        update.businessName =
          businessName;
      }
    }

    const categoriesFromData =
      this.normalizeCategories(
        data.categories,
      );

    const services =
      this.normalizeCategories(
        data.services,
      );

    const serviceCategories =
      this.normalizeCategories(
        data.serviceCategories,
      );

    const combinedCategories =
      this.normalizeCategories([
        ...categoriesFromData,
        ...services,
        ...serviceCategories,
      ]);

    const rawCategory =
      typeof data.category === "string"
        ? data.category.trim()
        : typeof data.primaryCategory ===
            "string"
          ? data.primaryCategory.trim()
          : "";

    const finalCategories =
      combinedCategories.length > 0
        ? combinedCategories
        : rawCategory
          ? [rawCategory]
          : [];

    if (finalCategories.length > 0) {
      update.categories =
        finalCategories;

      update.category =
        rawCategory &&
        finalCategories.includes(
          rawCategory,
        )
          ? rawCategory
          : finalCategories[0];
    }

    if (
      typeof data.description ===
      "string"
    ) {
      const description =
        data.description.trim();

      update.description =
        description || undefined;
    }

    if (
      typeof data.phone === "string"
    ) {
      const phone =
        data.phone.trim();

      update.phone =
        phone || undefined;
    }

    if (
      typeof data.website === "string"
    ) {
      const website =
        data.website.trim();

      update.website =
        website || undefined;
    }

    if (
      typeof data.email === "string"
    ) {
      const email =
        data.email.trim();

      update.email =
        email || undefined;
    }

    if (
      typeof data.address === "string"
    ) {
      const address =
        data.address.trim();

      update.address =
        address || undefined;
    }

    if (
      typeof data.city === "string"
    ) {
      const city =
        data.city.trim();

      update.city =
        city || undefined;
    }

    if (
      typeof data.state === "string"
    ) {
      const state =
        data.state.trim();

      update.state =
        state || undefined;
    }

    if (
      typeof data.postalCode === "string"
    ) {
      const postalCode =
        data.postalCode.trim();

      update.postalCode =
        postalCode || undefined;
    }

    if (
      typeof data.country === "string"
    ) {
      const country =
        data.country.trim();

      update.country =
        country || undefined;
    }

    if (
      data.documents !== undefined &&
      data.documents !== null &&
      typeof data.documents === "object" &&
      !Array.isArray(data.documents)
    ) {
      update.documents =
        data.documents;
    }

    return update;
  }

  private cleanUpdate(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const update = {
      ...data,
    };

    delete update.userId;
    delete update.status;
    delete update.verifiedAt;
    delete update.rejectionReason;
    delete update.suspensionReason;
    delete update.featured;
    delete update.paymentProvider;
    delete update.paymentAccountId;

    return update;
  }

  // ==========================================================================
  // CREATE NEW BUSINESS
  //
  // IMPORTANT:
  // This method ALWAYS creates a new Partner document.
  //
  // It intentionally does NOT use findOneAndUpdate().
  // Therefore a user can own:
  //
  // Business A
  // Business B
  // Business C
  //
  // without one replacing another.
  // ==========================================================================

  async create(
    userId: string,
    data: Record<string, unknown>,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "Authenticated user is required.",
      );
    }

    const normalizedUserId =
      String(userId).trim();

    const businessName =
      typeof data.businessName ===
      "string"
        ? data.businessName.trim()
        : "";

    if (!businessName) {
      throw new BadRequestException(
        "Business name is required.",
      );
    }

    const normalized =
      this.normalizeApplication(data);

    const categories =
      Array.isArray(
        normalized.categories,
      )
        ? (normalized.categories as string[])
        : [];

    if (categories.length === 0) {
      throw new BadRequestException(
        "Please select at least one business category.",
      );
    }

    const update =
      this.cleanUpdate(normalized);

    update.businessName =
      businessName;

    update.userId =
      normalizedUserId;

    update.categories =
      categories;

    update.category =
      typeof normalized.category ===
      "string"
        ? normalized.category
        : categories[0];

    update.status =
      "pending";

    update.active =
      true;

    update.acceptingBookings =
      true;

    update.instantBooking =
      false;

    update.featured =
      false;

    update.services =
      [];

    update.amenities =
      [];

    update.features =
      [];

    update.images =
      [];

    update.documentList =
      [];

    update.metadata =
      {};

    update.contact =
      {};

    update.addressInfo =
      {};

    update.businessHours =
      {};

    update.socialLinks =
      {};

    const partner =
      new this.model(update);

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // ALL BUSINESSES BELONGING TO USER
  // ==========================================================================

  async mineAll(
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "Authenticated user is required.",
      );
    }

    const normalizedUserId =
      String(userId).trim();

    return this.model
      .find({
        userId: normalizedUserId,
      })
      .sort({
        createdAt: -1,
        businessName: 1,
      })
      .lean()
      .exec();
  }

  // ==========================================================================
  // PRIMARY / COMPATIBILITY PROFILE
  // ==========================================================================

  async mine(
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        "Authenticated user is required.",
      );
    }

    const normalizedUserId =
      String(userId).trim();

    const partner =
      await this.model
        .findOne({
          userId: normalizedUserId,
        })
        .sort({
          createdAt: -1,
        })
        .lean()
        .exec();

    return partner ?? null;
  }

  // ==========================================================================
  // BUSINESS INFORMATION
  // ==========================================================================

  async updateProfile(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      typeof data.businessName ===
      "string"
    ) {
      const value =
        data.businessName.trim();

      if (value) {
        partner.businessName =
          value;
      }
    }

    if (
      typeof data.category ===
      "string"
    ) {
      const category =
        data.category.trim();

      if (category) {
        partner.category =
          category;

        if (
          !Array.isArray(
            partner.categories,
          ) ||
          partner.categories.length ===
            0
        ) {
          partner.categories = [
            category,
          ];
        } else if (
          !partner.categories.includes(
            category,
          )
        ) {
          partner.categories.unshift(
            category,
          );
        }
      }
    }

    if (
      Array.isArray(data.categories)
    ) {
      const categories =
        this.normalizeCategories(
          data.categories,
        );

      if (categories.length > 0) {
        partner.categories =
          categories;

        if (
          typeof data.category ===
            "string" &&
          categories.includes(
            data.category.trim(),
          )
        ) {
          partner.category =
            data.category.trim();
        } else if (
          !categories.includes(
            partner.category,
          )
        ) {
          partner.category =
            categories[0];
        }
      }
    }

    const fields = [
      "description",
      "businessType",
      "registrationNumber",
      "taxId",
    ] as const;

    for (const field of fields) {
      if (
        typeof data[field] ===
        "string"
      ) {
        (partner as any)[field] =
          data[field].trim();
      }
    }

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // CONTACT
  // ==========================================================================

  async updateContact(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    const existingContact =
      partner.contact ?? {};

    partner.contact = {
      ...existingContact,

      email:
        typeof data.email ===
        "string"
          ? data.email.trim()
          : existingContact.email,

      phone:
        typeof data.phone ===
        "string"
          ? data.phone.trim()
          : existingContact.phone,

      website:
        typeof data.website ===
        "string"
          ? data.website.trim()
          : existingContact.website,

      contactName:
        typeof data.contactName ===
        "string"
          ? data.contactName.trim()
          : existingContact.contactName,
    };

    if (
      typeof data.email ===
      "string"
    ) {
      partner.email =
        data.email.trim();
    }

    if (
      typeof data.phone ===
      "string"
    ) {
      partner.phone =
        data.phone.trim();
    }

    if (
      typeof data.website ===
      "string"
    ) {
      partner.website =
        data.website.trim();
    }

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  async updateLocation(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    const existing =
      partner.addressInfo ?? {};

    partner.addressInfo = {
      ...existing,

      address:
        typeof data.address ===
        "string"
          ? data.address.trim()
          : existing.address,

      addressLine2:
        typeof data.addressLine2 ===
        "string"
          ? data.addressLine2.trim()
          : existing.addressLine2,

      city:
        typeof data.city ===
        "string"
          ? data.city.trim()
          : existing.city,

      state:
        typeof data.state ===
        "string"
          ? data.state.trim()
          : existing.state,

      postalCode:
        typeof data.postalCode ===
        "string"
          ? data.postalCode.trim()
          : existing.postalCode,

      country:
        typeof data.country ===
        "string"
          ? data.country.trim()
          : existing.country,

      latitude:
        typeof data.latitude ===
        "number"
          ? data.latitude
          : existing.latitude,

      longitude:
        typeof data.longitude ===
        "number"
          ? data.longitude
          : existing.longitude,
    };

    if (
      typeof data.address ===
      "string"
    ) {
      partner.address =
        data.address.trim();
    }

    if (
      typeof data.city ===
      "string"
    ) {
      partner.city =
        data.city.trim();
    }

    if (
      typeof data.state ===
      "string"
    ) {
      partner.state =
        data.state.trim();
    }

    if (
      typeof data.postalCode ===
      "string"
    ) {
      partner.postalCode =
        data.postalCode.trim();
    }

    if (
      typeof data.country ===
      "string"
    ) {
      partner.country =
        data.country.trim();
    }

    if (
      typeof data.latitude ===
      "number"
    ) {
      partner.latitude =
        data.latitude;
    }

    if (
      typeof data.longitude ===
      "number"
    ) {
      partner.longitude =
        data.longitude;
    }

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // BUSINESS HOURS
  // ==========================================================================

  async updateHours(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    const current =
      partner.businessHours ?? {};

    const next: Record<
      string,
      string
    > = {
      ...(current as any),
    };

    for (const day of days) {
      if (
        typeof data[day] ===
        "string"
      ) {
        next[day] =
          (
            data[day] as string
          ).trim();
      }
    }

    partner.businessHours =
      next as any;

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // SERVICES
  // ==========================================================================

  async addService(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      typeof data.name !==
        "string" ||
      !data.name.trim()
    ) {
      throw new BadRequestException(
        "Service name is required.",
      );
    }

    const service = {
      name:
        data.name.trim(),

      description:
        typeof data.description ===
        "string"
          ? data.description.trim()
          : undefined,

      price:
        typeof data.price ===
        "number"
          ? data.price
          : undefined,

      currency:
        typeof data.currency ===
        "string"
          ? data.currency.trim()
          : "USD",

      active:
        typeof data.active ===
        "boolean"
          ? data.active
          : true,
    };

    partner.services =
      partner.services ?? [];

    partner.services.push(
      service as any,
    );

    await partner.save();

    return partner.toObject();
  }

  async removeService(
    userId: string,
    index: number,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >=
        partner.services.length
    ) {
      throw new BadRequestException(
        "Invalid service index.",
      );
    }

    partner.services.splice(
      index,
      1,
    );

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // AMENITIES
  // ==========================================================================

  async addAmenity(
    userId: string,
    amenity: string,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      typeof amenity !==
        "string" ||
      !amenity.trim()
    ) {
      throw new BadRequestException(
        "Amenity is required.",
      );
    }

    const value =
      amenity.trim();

    partner.amenities =
      partner.amenities ?? [];

    const exists =
      partner.amenities.some(
        (item) =>
          item.toLowerCase() ===
          value.toLowerCase(),
      );

    if (!exists) {
      partner.amenities.push(
        value,
      );
    }

    await partner.save();

    return partner.toObject();
  }

  async removeAmenity(
    userId: string,
    amenity: string,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    partner.amenities =
      (
        partner.amenities ?? []
      ).filter(
        (item) =>
          item.toLowerCase() !==
          amenity
            .trim()
            .toLowerCase(),
      );

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // IMAGES
  // ==========================================================================

  async addImage(
    userId: string,
    url: string,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      typeof url !== "string" ||
      !url.trim()
    ) {
      throw new BadRequestException(
        "Image URL is required.",
      );
    }

    partner.images =
      partner.images ?? [];

    partner.images.push(
      url.trim(),
    );

    await partner.save();

    return partner.toObject();
  }

  async removeImage(
    userId: string,
    index: number,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >=
        partner.images.length
    ) {
      throw new BadRequestException(
        "Invalid image index.",
      );
    }

    partner.images.splice(
      index,
      1,
    );

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // MEDIA / BRANDING
  // ==========================================================================

  async updateMedia(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      data.logo !== undefined
    ) {
      partner.logo =
        typeof data.logo ===
        "string"
          ? data.logo.trim() ||
            undefined
          : undefined;
    }

    if (
      data.coverImage !==
      undefined
    ) {
      partner.coverImage =
        typeof data.coverImage ===
        "string"
          ? data.coverImage.trim() ||
            undefined
          : undefined;
    }

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // SOCIAL LINKS
  // ==========================================================================

  async updateSocialLinks(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    const current =
      partner.socialLinks ?? {};

    partner.socialLinks = {
      ...current,

      facebook:
        typeof data.facebook ===
        "string"
          ? data.facebook.trim()
          : current.facebook,

      instagram:
        typeof data.instagram ===
        "string"
          ? data.instagram.trim()
          : current.instagram,

      tiktok:
        typeof data.tiktok ===
        "string"
          ? data.tiktok.trim()
          : current.tiktok,

      youtube:
        typeof data.youtube ===
        "string"
          ? data.youtube.trim()
          : current.youtube,

      linkedin:
        typeof data.linkedin ===
        "string"
          ? data.linkedin.trim()
          : current.linkedin,

      twitter:
        typeof data.twitter ===
        "string"
          ? data.twitter.trim()
          : current.twitter,
    };

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // BOOKING SETTINGS
  // ==========================================================================

  async updateBookingSettings(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      typeof data.acceptingBookings ===
      "boolean"
    ) {
      partner.acceptingBookings =
        data.acceptingBookings;
    }

    if (
      typeof data.instantBooking ===
      "boolean"
    ) {
      partner.instantBooking =
        data.instantBooking;
    }

    if (
      typeof data.cancellationPolicy ===
      "string"
    ) {
      partner.cancellationPolicy =
        data.cancellationPolicy.trim();
    }

    if (
      typeof data.bookingPolicy ===
      "string"
    ) {
      partner.bookingPolicy =
        data.bookingPolicy.trim();
    }

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // ACTIVE / INACTIVE
  // ==========================================================================

  async setActive(
    userId: string,
    active: boolean,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      typeof active !== "boolean"
    ) {
      throw new BadRequestException(
        "Active must be a boolean.",
      );
    }

    partner.active =
      active;

    if (!active) {
      partner.acceptingBookings =
        false;
    }

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  async submitVerification(
    userId: string,
  ) {
    const partner =
      await this.getOwnerPartner(
        userId,
      );

    if (
      partner.status ===
      "verified"
    ) {
      throw new BadRequestException(
        "This business is already verified.",
      );
    }

    if (
      partner.status ===
      "suspended"
    ) {
      throw new BadRequestException(
        "A suspended business cannot be submitted for verification.",
      );
    }

    if (
      !partner.businessName?.trim()
    ) {
      throw new BadRequestException(
        "Business name is required before verification.",
      );
    }

    if (
      !partner.category?.trim()
    ) {
      throw new BadRequestException(
        "Business category is required before verification.",
      );
    }

    if (
      !Array.isArray(
        partner.categories,
      ) ||
      partner.categories.length ===
        0
    ) {
      partner.categories = [
        partner.category,
      ];
    }

    if (
      !partner.description?.trim()
    ) {
      throw new BadRequestException(
        "Business description is required before verification.",
      );
    }

    partner.status =
      "pending";

    partner.rejectionReason =
      undefined;

    await partner.save();

    return partner.toObject();
  }

  // ==========================================================================
  // PUBLIC PARTNER
  // ==========================================================================

  async publicOne(
    id: string,
  ) {
    if (!id) {
      throw new NotFoundException(
        "Partner not found",
      );
    }

    const partner =
      await this.model
        .findOne({
          _id: id,
          status: "verified",
          active: true,
        })
        .lean();

    if (!partner) {
      throw new NotFoundException(
        "Partner not found",
      );
    }

    return partner;
  }

  // ==========================================================================
  // VERIFIED PARTNERS
  // ==========================================================================

  async listVerified() {
    return this.model
      .find({
        status: "verified",
        active: true,
      })
      .sort({
        featured: -1,
        businessName: 1,
      })
      .lean();
  }
}