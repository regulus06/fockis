import {
  BadRequestException,
  ConflictException,
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
  isValidObjectId,
} from "mongoose";

import {
  ProducerProfile,
  ProducerProfileDocument,
  ProducerStatus,
} from "../schemas/producer-profile.schema";

import {
  CreateProducerProfileDto,
} from "../dto/create-producer-profile.dto";

import {
  UpdateProducerProfileDto,
} from "../dto/update-producer-profile.dto";

import {
  MusicSettingsService,
} from "./music-settings.service";

@Injectable()
export class ProducerService {
  constructor(
    @InjectModel(ProducerProfile.name)
    private readonly producerModel: Model<ProducerProfileDocument>,

    private readonly musicSettingsService: MusicSettingsService,
  ) {}

  /* ==========================================================
     VALIDATION
  ========================================================== */

  private validateUserId(
    userId: string,
  ): void {
    if (
      !userId ||
      !isValidObjectId(userId)
    ) {
      throw new BadRequestException(
        "Invalid user ID",
      );
    }
  }

  private validateProducerId(
    producerId: string,
  ): void {
    if (
      !producerId ||
      !isValidObjectId(producerId)
    ) {
      throw new BadRequestException(
        "Invalid producer ID",
      );
    }
  }

  private normalizeGenres(
    genres?: string[],
  ): string[] {
    if (!Array.isArray(genres)) {
      return [];
    }

    return Array.from(
      new Set(
        genres
          .filter(
            (
              genre,
            ): genre is string =>
              typeof genre === "string",
          )
          .map((genre) =>
            genre
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean),
      ),
    ).slice(0, 10);
  }

  /* ==========================================================
     MY PROFILE
  ========================================================== */

  async getMyProfile(
    userId: string,
  ) {
    this.validateUserId(userId);

    const profile =
      await this.producerModel
        .findOne({
          userId:
            new Types.ObjectId(userId),
        })
        .lean();

    return {
      exists: Boolean(profile),
      profile: profile
        ? this.formatProfile(profile)
        : null,
    };
  }

  /* ==========================================================
     CREATE APPLICATION
  ========================================================== */

  async createProfile(
    userId: string,
    dto: CreateProducerProfileDto,
  ) {
    this.validateUserId(userId);

    if (!dto) {
      throw new BadRequestException(
        "Producer application data is required.",
      );
    }

    const producerName =
      typeof dto.producerName === "string"
        ? dto.producerName.trim()
        : "";

    if (producerName.length < 2) {
      throw new BadRequestException(
        "Producer name must contain at least 2 characters.",
      );
    }

    const objectUserId =
      new Types.ObjectId(userId);

    const genres =
      this.normalizeGenres(
        dto.genres,
      );

    if (genres.length === 0) {
      throw new BadRequestException(
        "Please select at least one music genre.",
      );
    }

    if (genres.length > 10) {
      throw new BadRequestException(
        "You can select a maximum of 10 music genres.",
      );
    }

    /*
     * Read the manager setting at the exact moment
     * the application is submitted.
     *
     * This means changing the setting affects
     * future applications only.
     */
    const autoApprove =
      await this.musicSettingsService
        .getCreatorAutoApprovalEnabled();

    const existing =
      await this.producerModel.findOne({
        userId: objectUserId,
      });

    /* ========================================================
       RE-APPLICATION AFTER REJECTION
    ======================================================== */

    if (existing) {
      if (
        existing.status ===
        ProducerStatus.REJECTED
      ) {
        existing.producerName =
          producerName;

        existing.bio =
          typeof dto.bio === "string"
            ? dto.bio.trim()
            : "";

        existing.genres =
          genres;

        existing.profileImage =
          typeof dto.profileImage === "string"
            ? dto.profileImage.trim()
            : "";

        existing.coverImage =
          typeof dto.coverImage === "string"
            ? dto.coverImage.trim()
            : "";

        existing.website =
          typeof dto.website === "string"
            ? dto.website.trim()
            : "";

        existing.instagram =
          typeof dto.instagram === "string"
            ? dto.instagram.trim()
            : "";

        existing.youtube =
          typeof dto.youtube === "string"
            ? dto.youtube.trim()
            : "";

        existing.tiktok =
          typeof dto.tiktok === "string"
            ? dto.tiktok.trim()
            : "";

        existing.spotify =
          typeof dto.spotify === "string"
            ? dto.spotify.trim()
            : "";

        existing.status =
          autoApprove
            ? ProducerStatus.APPROVED
            : ProducerStatus.PENDING;

        existing.adminNote = "";

        existing.reviewedBy = null;

        existing.reviewedAt =
          autoApprove
            ? new Date()
            : null;

        return this.formatProfile(
          await existing.save(),
        );
      }

      throw new ConflictException(
        `You already have a producer application with status "${existing.status}".`,
      );
    }

    /* ========================================================
       NEW APPLICATION
    ======================================================== */

    const profile =
      await this.producerModel.create({
        userId: objectUserId,

        producerName,

        bio:
          typeof dto.bio === "string"
            ? dto.bio.trim()
            : "",

        genres,

        profileImage:
          typeof dto.profileImage === "string"
            ? dto.profileImage.trim()
            : "",

        coverImage:
          typeof dto.coverImage === "string"
            ? dto.coverImage.trim()
            : "",

        website:
          typeof dto.website === "string"
            ? dto.website.trim()
            : "",

        instagram:
          typeof dto.instagram === "string"
            ? dto.instagram.trim()
            : "",

        youtube:
          typeof dto.youtube === "string"
            ? dto.youtube.trim()
            : "",

        tiktok:
          typeof dto.tiktok === "string"
            ? dto.tiktok.trim()
            : "",

        spotify:
          typeof dto.spotify === "string"
            ? dto.spotify.trim()
            : "",

        status:
          autoApprove
            ? ProducerStatus.APPROVED
            : ProducerStatus.PENDING,

        adminNote: "",

        reviewedBy: null,

        reviewedAt:
          autoApprove
            ? new Date()
            : null,
      });

    return this.formatProfile(
      profile,
    );
  }

  /* ==========================================================
     UPDATE MY PROFILE
  ========================================================== */

  async updateMyProfile(
    userId: string,
    dto: UpdateProducerProfileDto,
  ) {
    this.validateUserId(userId);

    if (!dto) {
      throw new BadRequestException(
        "Profile update data is required.",
      );
    }

    const profile =
      await this.producerModel.findOne({
        userId:
          new Types.ObjectId(userId),
      });

    if (!profile) {
      throw new NotFoundException(
        "Producer profile not found.",
      );
    }

    if (
      profile.status ===
      ProducerStatus.SUSPENDED
    ) {
      throw new ForbiddenException(
        "Your producer account is suspended.",
      );
    }

    if (
      dto.producerName !== undefined
    ) {
      const producerName =
        typeof dto.producerName === "string"
          ? dto.producerName.trim()
          : "";

      if (producerName.length < 2) {
        throw new BadRequestException(
          "Producer name must contain at least 2 characters.",
        );
      }

      profile.producerName =
        producerName;
    }

    if (dto.bio !== undefined) {
      profile.bio =
        typeof dto.bio === "string"
          ? dto.bio.trim()
          : "";
    }

    if (dto.genres !== undefined) {
      const genres =
        this.normalizeGenres(
          dto.genres,
        );

      if (genres.length === 0) {
        throw new BadRequestException(
          "Please select at least one music genre.",
        );
      }

      if (genres.length > 10) {
        throw new BadRequestException(
          "You can select a maximum of 10 music genres.",
        );
      }

      profile.genres =
        genres;
    }

    if (
      dto.profileImage !== undefined
    ) {
      profile.profileImage =
        typeof dto.profileImage === "string"
          ? dto.profileImage.trim()
          : "";
    }

    if (
      dto.coverImage !== undefined
    ) {
      profile.coverImage =
        typeof dto.coverImage === "string"
          ? dto.coverImage.trim()
          : "";
    }

    if (
      dto.website !== undefined
    ) {
      profile.website =
        typeof dto.website === "string"
          ? dto.website.trim()
          : "";
    }

    if (
      dto.instagram !== undefined
    ) {
      profile.instagram =
        typeof dto.instagram === "string"
          ? dto.instagram.trim()
          : "";
    }

    if (
      dto.youtube !== undefined
    ) {
      profile.youtube =
        typeof dto.youtube === "string"
          ? dto.youtube.trim()
          : "";
    }

    if (
      dto.tiktok !== undefined
    ) {
      profile.tiktok =
        typeof dto.tiktok === "string"
          ? dto.tiktok.trim()
          : "";
    }

    if (
      dto.spotify !== undefined
    ) {
      profile.spotify =
        typeof dto.spotify === "string"
          ? dto.spotify.trim()
          : "";
    }

    return this.formatProfile(
      await profile.save(),
    );
  }

  /* ==========================================================
     REQUIRE APPROVED PRODUCER
  ========================================================== */

  async requireApprovedProducer(
    userId: string,
  ) {
    this.validateUserId(userId);

    const profile =
      await this.producerModel.findOne({
        userId:
          new Types.ObjectId(userId),
      });

    if (!profile) {
      throw new ForbiddenException(
        "You are not registered as a music producer. Apply to become a producer first.",
      );
    }

    if (
      profile.status ===
      ProducerStatus.PENDING
    ) {
      throw new ForbiddenException(
        "Your music producer application is still pending approval.",
      );
    }

    if (
      profile.status ===
      ProducerStatus.REJECTED
    ) {
      throw new ForbiddenException(
        "Your music producer application was rejected.",
      );
    }

    if (
      profile.status ===
      ProducerStatus.SUSPENDED
    ) {
      throw new ForbiddenException(
        "Your music producer account is suspended.",
      );
    }

    if (
      profile.status !==
      ProducerStatus.APPROVED
    ) {
      throw new ForbiddenException(
        "Your producer account is not approved.",
      );
    }

    return profile;
  }

  /* ==========================================================
     PUBLIC PROFILE
  ========================================================== */

  async getPublicProfile(
    producerId: string,
  ) {
    /*
     * Public producer profile URLs currently use
     * the producer's USER ID.
     *
     * Keep this behavior separate from admin
     * application management, which uses the
     * ProducerProfile document ID.
     */
    this.validateUserId(
      producerId,
    );

    const profile =
      await this.producerModel
        .findOne({
          userId:
            new Types.ObjectId(
              producerId,
            ),
          status:
            ProducerStatus.APPROVED,
        })
        .lean();

    if (!profile) {
      throw new NotFoundException(
        "Producer not found.",
      );
    }

    return this.formatProfile(
      profile,
    );
  }

  /* ==========================================================
     ADMIN APPLICATION LIST
  ========================================================== */

  async listApplications(
    status?: ProducerStatus,
  ) {
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    const profiles =
      await this.producerModel
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .lean();

    return profiles.map(
      (profile) =>
        this.formatProfile(profile),
    );
  }

  /* ==========================================================
     ADMIN AUTO APPROVAL SETTING
  ========================================================== */

  async getAutoApprovalSetting() {
    return this.musicSettingsService
      .getCreatorAutoApproval();
  }

  async setAutoApprovalSetting(
    enabled: boolean,
    adminUserId: string,
  ) {
    return this.musicSettingsService
      .setCreatorAutoApproval(
        enabled,
        adminUserId,
      );
  }

  /* ==========================================================
     ADMIN PROFILE LOOKUP
  ========================================================== */

  /**
   * Admin actions receive the ProducerProfile document ID.
   *
   * Example:
   *
   * Producer ID:
   * 6a9c6c233a5001ca1939fdcc
   *
   * This is profile._id, NOT profile.userId.
   */
  private async findAdminProducerProfile(
    producerId: string,
  ): Promise<ProducerProfileDocument> {
    this.validateProducerId(
      producerId,
    );

    const profile =
      await this.producerModel.findById(
        new Types.ObjectId(
          producerId,
        ),
      );

    if (!profile) {
      throw new NotFoundException(
        "Producer application not found.",
      );
    }

    return profile;
  }

  /* ==========================================================
     APPROVE
  ========================================================== */

  async approve(
    producerId: string,
    adminUserId: string,
  ) {
    const profile =
      await this.findAdminProducerProfile(
        producerId,
      );

    this.validateUserId(
      adminUserId,
    );

    profile.status =
      ProducerStatus.APPROVED;

    profile.reviewedBy =
      new Types.ObjectId(
        adminUserId,
      );

    profile.reviewedAt =
      new Date();

    profile.adminNote = "";

    return this.formatProfile(
      await profile.save(),
    );
  }

  /* ==========================================================
     REJECT
  ========================================================== */

  async reject(
    producerId: string,
    adminUserId: string,
    note?: string,
  ) {
    const profile =
      await this.findAdminProducerProfile(
        producerId,
      );

    this.validateUserId(
      adminUserId,
    );

    profile.status =
      ProducerStatus.REJECTED;

    profile.reviewedBy =
      new Types.ObjectId(
        adminUserId,
      );

    profile.reviewedAt =
      new Date();

    profile.adminNote =
      typeof note === "string"
        ? note.trim()
        : "";

    return this.formatProfile(
      await profile.save(),
    );
  }

  /* ==========================================================
     SUSPEND
  ========================================================== */

  async suspend(
    producerId: string,
    adminUserId: string,
    note?: string,
  ) {
    const profile =
      await this.findAdminProducerProfile(
        producerId,
      );

    this.validateUserId(
      adminUserId,
    );

    profile.status =
      ProducerStatus.SUSPENDED;

    profile.reviewedBy =
      new Types.ObjectId(
        adminUserId,
      );

    profile.reviewedAt =
      new Date();

    profile.adminNote =
      typeof note === "string"
        ? note.trim()
        : "";

    return this.formatProfile(
      await profile.save(),
    );
  }

  /* ==========================================================
     RESTORE
  ========================================================== */

  async restore(
    producerId: string,
    adminUserId: string,
  ) {
    const profile =
      await this.findAdminProducerProfile(
        producerId,
      );

    this.validateUserId(
      adminUserId,
    );

    profile.status =
      ProducerStatus.APPROVED;

    profile.reviewedBy =
      new Types.ObjectId(
        adminUserId,
      );

    profile.reviewedAt =
      new Date();

    profile.adminNote = "";

    return this.formatProfile(
      await profile.save(),
    );
  }

  /* ==========================================================
     FORMAT PROFILE
  ========================================================== */

  private formatProfile(
    profile: any,
  ) {
    const genres =
      Array.isArray(profile.genres)
        ? profile.genres
        : profile.genre
          ? [profile.genre]
          : [];

    return {
      /*
       * IMPORTANT:
       * id is the ProducerProfile document ID.
       *
       * This is the ID used by the admin
       * approve/reject/suspend/restore endpoints.
       */
      id: String(
        profile._id,
      ),

      /*
       * userId remains separately available
       * for creator/account operations.
       */
      userId: String(
        profile.userId,
      ),

      producerName:
        profile.producerName,

      bio:
        profile.bio || "",

      genres:
        this.normalizeGenres(
          genres,
        ),

      profileImage:
        profile.profileImage || "",

      coverImage:
        profile.coverImage || "",

      website:
        profile.website || "",

      instagram:
        profile.instagram || "",

      youtube:
        profile.youtube || "",

      tiktok:
        profile.tiktok || "",

      spotify:
        profile.spotify || "",

      status:
        profile.status,

      adminNote:
        profile.adminNote || "",

      reviewedBy:
        profile.reviewedBy
          ? String(
              profile.reviewedBy,
            )
          : null,

      reviewedAt:
        profile.reviewedAt ||
        null,

      followersCount:
        profile.followersCount ||
        0,

      releasesCount:
        profile.releasesCount ||
        0,

      totalPlays:
        profile.totalPlays ||
        0,

      totalViews:
        profile.totalViews ||
        0,

      totalSales:
        profile.totalSales ||
        0,

      totalRevenueCents:
        profile.totalRevenueCents ||
        0,

      createdAt:
        profile.createdAt,

      updatedAt:
        profile.updatedAt,
    };
  }
}