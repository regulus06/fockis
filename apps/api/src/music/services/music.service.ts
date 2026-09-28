import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  MediaProcessingState,
  MusicAccessType,
  MusicContent,
  MusicPublishStatus,
} from "../schemas/music-content.schema";

import { CreateMusicDto } from "../dto/create-music.dto";
import { UpdateMusicDto } from "../dto/update-music.dto";
import { MusicQueryDto } from "../dto/music-query.dto";

import { ProducerService } from "./producer.service";
import slugify from "./slugify";

export interface MusicUpdateResult {
  content: MusicContent;
  mediaChanged: boolean;
}

// ============================================================================
// PROFESSIONAL MEDIA LIMITS
// ============================================================================

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export const FOCKIS_MUSIC_MEDIA_LIMITS = {
  song: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  single: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  track: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  beat: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  instrumental: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  album: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 2 * GB,
  },

  ep: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 2 * GB,
  },

  music: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 2 * GB,
  },

  audio: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 2 * GB,
  },

  music_video: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 4 * GB,
  },

  video: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  live_performance: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 30 * GB,
  },

  interview: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  behind_the_scenes: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  tutorial: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  exclusive: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  exclusive_video: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },
} as const;

const GLOBAL_MAX_UPLOAD_BYTES = 30 * GB;

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class MusicService {
  constructor(
    @InjectModel(MusicContent.name)
    private readonly model: Model<MusicContent>,

    private readonly producerService: ProducerService,
  ) {}

  // ==========================================================================
  // CREATE
  // ==========================================================================

  async create(
    producerId: string,
    dto: CreateMusicDto,
  ): Promise<MusicContent> {
    this.assertObjectId(
      producerId,
      "producerId",
    );

    await this.producerService.requireApprovedProducer(
      producerId,
    );

    // ------------------------------------------------------------------------
    // MEDIA
    // ------------------------------------------------------------------------

    const mediaStorageKey =
      dto.mediaStorageKey?.trim();

    if (!mediaStorageKey) {
      throw new BadRequestException(
        "A media storage key is required.",
      );
    }

    // ------------------------------------------------------------------------
    // TITLE
    // ------------------------------------------------------------------------

    const title =
      dto.title?.trim();

    if (!title) {
      throw new BadRequestException(
        "Title is required.",
      );
    }

    // ------------------------------------------------------------------------
    // MEDIA TYPE VALIDATION
    // ------------------------------------------------------------------------

    this.validateMediaConfiguration(
      dto.type,
      dto.mediaKind,
    );

    // ------------------------------------------------------------------------
    // PAID CONTENT
    // ------------------------------------------------------------------------

    if (
      [
        MusicAccessType.PAID,
        MusicAccessType.PREVIEW_PAID,
      ].includes(dto.accessType) &&
      (
        dto.priceCents === undefined ||
        dto.priceCents <= 0
      )
    ) {
      throw new BadRequestException(
        "Paid music must have a price greater than zero.",
      );
    }

    // ------------------------------------------------------------------------
    // PRICE
    // ------------------------------------------------------------------------

    const priceCents =
      dto.accessType ===
      MusicAccessType.FREE
        ? 0
        : dto.priceCents ?? 0;

    if (priceCents < 0) {
      throw new BadRequestException(
        "Price cannot be negative.",
      );
    }

    // ------------------------------------------------------------------------
    // CURRENCY
    // ------------------------------------------------------------------------

    const currency =
      (
        dto.currency ??
        "usd"
      )
        .trim()
        .toLowerCase();

    if (!currency) {
      throw new BadRequestException(
        "Currency is required.",
      );
    }

    // ------------------------------------------------------------------------
    // SLUG
    // ------------------------------------------------------------------------

    const slug =
      await this.uniqueSlug(title);

    // ------------------------------------------------------------------------
    // PUBLISHING STATE
    // ------------------------------------------------------------------------

    const requestedStatus =
      dto.status ??
      MusicPublishStatus.DRAFT;

    const initialStatus =
      requestedStatus ===
      MusicPublishStatus.PUBLISHED
        ? MusicPublishStatus.PROCESSING
        : requestedStatus;

    // ------------------------------------------------------------------------
    // RELEASE DATE
    // ------------------------------------------------------------------------

    let releaseDate:
      | Date
      | undefined;

    if (dto.releaseDate) {
      const parsedDate =
        new Date(
          dto.releaseDate,
        );

      if (
        Number.isNaN(
          parsedDate.getTime(),
        )
      ) {
        throw new BadRequestException(
          "Invalid release date.",
        );
      }

      releaseDate =
        parsedDate;
    }

    // ------------------------------------------------------------------------
    // ALBUM
    // ------------------------------------------------------------------------

    const albumId =
      dto.albumId
        ? this.toObjectId(
            dto.albumId,
            "albumId",
          )
        : undefined;

    // ------------------------------------------------------------------------
    // TAGS
    // ------------------------------------------------------------------------

    const tags =
      Array.isArray(dto.tags)
        ? dto.tags
            .filter(
              (
                tag,
              ): tag is string =>
                typeof tag ===
                "string",
            )
            .map(
              (tag) =>
                tag.trim(),
            )
            .filter(Boolean)
        : [];

    // ------------------------------------------------------------------------
    // CREATE DATABASE RECORD
    // ------------------------------------------------------------------------

    const content =
      await this.model.create({
        producerId:
          new Types.ObjectId(
            producerId,
          ),

        type:
          dto.type,

        mediaKind:
          dto.mediaKind,

        title,

        slug,

        description:
          dto.description?.trim(),

        media: {
          storageKey:
            mediaStorageKey,

          processingState:
            MediaProcessingState.UPLOADING,
        },

        coverImage:
          dto.coverStorageKey
            ? {
                storageKey:
                  dto.coverStorageKey.trim(),

                processingState:
                  MediaProcessingState.READY,
              }
            : undefined,

        previewMedia:
          dto.previewMediaStorageKey
            ? {
                storageKey:
                  dto.previewMediaStorageKey.trim(),

                processingState:
                  MediaProcessingState.UPLOADING,
              }
            : undefined,

        genre:
          dto.genre,

        tags,

        accessType:
          dto.accessType,

        priceCents,

        currency,

        previewDurationSeconds:
          dto.previewDurationSeconds ??
          30,

        allowComments:
          dto.allowComments ??
          true,

        allowSharing:
          dto.allowSharing ??
          true,

        allowDownloads:
          dto.allowDownloads ??
          false,

        status:
          initialStatus,

        releaseDate,

        albumId,

        // --------------------------------------------------------------------
        // SERVER CONTROLLED ANALYTICS
        // --------------------------------------------------------------------

        playCount: 0,
        viewCount: 0,
        favoriteCount: 0,
        purchaseCount: 0,
        shareCount: 0,
        rankScore: 0,
      });

    return content;
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  async update(
    id: string,
    producerId: string,
    dto: UpdateMusicDto,
  ): Promise<MusicUpdateResult> {
    this.assertObjectId(
      id,
      "contentId",
    );

    this.assertObjectId(
      producerId,
      "producerId",
    );

    const content =
      await this.model.findById(id);

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    // ------------------------------------------------------------------------
    // OWNERSHIP
    // ------------------------------------------------------------------------

    if (
      content.producerId.toString() !==
      producerId
    ) {
      throw new ForbiddenException(
        "You do not own this content.",
      );
    }

    /*
     * Media replacement is intentionally handled by the
     * upload/media-processing pipeline rather than this DTO.
     */
    const mediaChanged = false;

    // ------------------------------------------------------------------------
    // TYPE / MEDIA KIND
    // ------------------------------------------------------------------------

    const effectiveType =
      dto.type ??
      content.type;

    const effectiveMediaKind =
      dto.mediaKind ??
      content.mediaKind;

    this.validateMediaConfiguration(
      effectiveType,
      effectiveMediaKind,
    );

    // ------------------------------------------------------------------------
    // PUBLISHING PROTECTION
    // ------------------------------------------------------------------------

    if (
      dto.status ===
        MusicPublishStatus.PUBLISHED &&
      (
        !content.media ||
        content.media.processingState !==
          MediaProcessingState.READY
      )
    ) {
      throw new BadRequestException(
        "Cannot publish while media is still processing.",
      );
    }

    // ------------------------------------------------------------------------
    // PRICE PROTECTION
    // ------------------------------------------------------------------------

    if (
      dto.accessType &&
      [
        MusicAccessType.PAID,
        MusicAccessType.PREVIEW_PAID,
      ].includes(dto.accessType)
    ) {
      const effectivePrice =
        dto.priceCents ??
        content.priceCents ??
        0;

      if (
        effectivePrice <= 0
      ) {
        throw new BadRequestException(
          "Paid music must have a price greater than zero.",
        );
      }
    }

    if (
      dto.accessType ===
      MusicAccessType.FREE
    ) {
      content.priceCents =
        0;
    } else if (
      dto.priceCents !==
      undefined
    ) {
      if (
        dto.priceCents < 0
      ) {
        throw new BadRequestException(
          "Price cannot be negative.",
        );
      }

      content.priceCents =
        dto.priceCents;
    }

    // ------------------------------------------------------------------------
    // TYPE
    // ------------------------------------------------------------------------

    if (
      dto.type !==
      undefined
    ) {
      content.type =
        dto.type;
    }

    // ------------------------------------------------------------------------
    // MEDIA KIND
    // ------------------------------------------------------------------------

    if (
      dto.mediaKind !==
      undefined
    ) {
      content.mediaKind =
        dto.mediaKind;
    }

    // ------------------------------------------------------------------------
    // TITLE / SLUG
    // ------------------------------------------------------------------------

    if (
      dto.title !==
      undefined
    ) {
      const trimmedTitle =
        dto.title.trim();

      if (!trimmedTitle) {
        throw new BadRequestException(
          "Title cannot be empty.",
        );
      }

      if (
        trimmedTitle !==
        content.title
      ) {
        content.title =
          trimmedTitle;

        content.slug =
          await this.uniqueSlug(
            trimmedTitle,
            content._id.toString(),
          );
      }
    }

    // ------------------------------------------------------------------------
    // DESCRIPTION
    // ------------------------------------------------------------------------

    if (
      dto.description !==
      undefined
    ) {
      content.description =
        dto.description?.trim();
    }

    // ------------------------------------------------------------------------
    // COVER
    // ------------------------------------------------------------------------

    if (
      dto.coverStorageKey !==
      undefined
    ) {
      const coverStorageKey =
        dto.coverStorageKey.trim();

      content.coverImage =
        coverStorageKey
          ? {
              storageKey:
                coverStorageKey,

              processingState:
                MediaProcessingState.READY,
            }
          : undefined;
    }

    // ------------------------------------------------------------------------
    // PREVIEW MEDIA
    // ------------------------------------------------------------------------

    if (
      dto.previewMediaStorageKey !==
      undefined
    ) {
      const previewStorageKey =
        dto.previewMediaStorageKey.trim();

      content.previewMedia =
        previewStorageKey
          ? {
              storageKey:
                previewStorageKey,

              processingState:
                MediaProcessingState.UPLOADING,
            }
          : undefined;
    }

    // ------------------------------------------------------------------------
    // GENRE
    // ------------------------------------------------------------------------

    if (
      dto.genre !==
      undefined
    ) {
      content.genre =
        dto.genre;
    }

    // ------------------------------------------------------------------------
    // TAGS
    // ------------------------------------------------------------------------

    if (
      dto.tags !==
      undefined
    ) {
      content.tags =
        dto.tags
          .filter(
            (
              tag,
            ): tag is string =>
              typeof tag ===
              "string",
          )
          .map(
            (tag) =>
              tag.trim(),
          )
          .filter(Boolean);
    }

    // ------------------------------------------------------------------------
    // ACCESS TYPE
    // ------------------------------------------------------------------------

    if (
      dto.accessType !==
      undefined
    ) {
      content.accessType =
        dto.accessType;
    }

    // ------------------------------------------------------------------------
    // CURRENCY
    // ------------------------------------------------------------------------

    if (
      dto.currency !==
      undefined
    ) {
      const currency =
        dto.currency
          .trim()
          .toLowerCase();

      if (!currency) {
        throw new BadRequestException(
          "Currency cannot be empty.",
        );
      }

      content.currency =
        currency;
    }

    // ------------------------------------------------------------------------
    // PREVIEW DURATION
    // ------------------------------------------------------------------------

    if (
      dto.previewDurationSeconds !==
      undefined
    ) {
      if (
        !Number.isFinite(
          dto.previewDurationSeconds,
        ) ||
        dto.previewDurationSeconds <= 0
      ) {
        throw new BadRequestException(
          "Preview duration must be greater than zero.",
        );
      }

      content.previewDurationSeconds =
        dto.previewDurationSeconds;
    }

    // ------------------------------------------------------------------------
    // PERMISSIONS
    // ------------------------------------------------------------------------

    if (
      dto.allowComments !==
      undefined
    ) {
      content.allowComments =
        dto.allowComments;
    }

    if (
      dto.allowSharing !==
      undefined
    ) {
      content.allowSharing =
        dto.allowSharing;
    }

    if (
      dto.allowDownloads !==
      undefined
    ) {
      content.allowDownloads =
        dto.allowDownloads;
    }

    // ------------------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------------------

    if (
      dto.status !==
      undefined
    ) {
      if (
        dto.status ===
        MusicPublishStatus.PUBLISHED
      ) {
        if (
          !content.media ||
          content.media.processingState !==
            MediaProcessingState.READY
        ) {
          throw new BadRequestException(
            "Cannot publish while media is still processing.",
          );
        }

        content.status =
          MusicPublishStatus.PUBLISHED;

        if (
          !content.releaseDate
        ) {
          content.releaseDate =
            new Date();
        }
      } else {
        content.status =
          dto.status;
      }
    }

    // ------------------------------------------------------------------------
    // RELEASE DATE
    // ------------------------------------------------------------------------

    if (
      dto.releaseDate !==
      undefined
    ) {
      const parsedDate =
        new Date(
          dto.releaseDate,
        );

      if (
        Number.isNaN(
          parsedDate.getTime(),
        )
      ) {
        throw new BadRequestException(
          "Invalid release date.",
        );
      }

      content.releaseDate =
        parsedDate;
    }

    // ------------------------------------------------------------------------
    // ALBUM
    // ------------------------------------------------------------------------

    if (
      dto.albumId !==
      undefined
    ) {
      content.albumId =
        dto.albumId
          ? this.toObjectId(
              dto.albumId,
              "albumId",
            )
          : undefined;
    }

    // ------------------------------------------------------------------------
    // SAVE
    // ------------------------------------------------------------------------

    await content.save();

    return {
      content,
      mediaChanged,
    };
  }

  // ==========================================================================
  // MEDIA PROCESSING — START
  // ==========================================================================

  async markMediaProcessing(
    id: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    const content =
      await this.model.findById(id);

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    if (!content.media) {
      throw new BadRequestException(
        "Content does not contain a media asset.",
      );
    }

    content.media.processingState =
      MediaProcessingState.PROCESSING;

    await content.save();
  }

  // ==========================================================================
  // MEDIA PROCESSING — STORAGE KEY
  // ==========================================================================

  async updateProcessedMediaStorageKey(
    id: string,
    storageKey: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    const normalizedStorageKey =
      storageKey?.trim();

    if (!normalizedStorageKey) {
      throw new BadRequestException(
        "Processed media storage key is required.",
      );
    }

    const content =
      await this.model.findById(id);

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    if (!content.media) {
      throw new BadRequestException(
        "Content does not contain a media asset.",
      );
    }

    content.media.storageKey =
      normalizedStorageKey;

    await content.save();
  }

  // ==========================================================================
  // MEDIA PROCESSING — GENERATED COVER
  // ==========================================================================

  /**
   * Saves an automatically generated video cover.
   *
   * IMPORTANT:
   * If the producer already supplied a custom cover, this method preserves it.
   * Automatic cover generation must never overwrite creator artwork.
   */
  async updateGeneratedCover(
    id: string,
    coverStorageKey: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    const normalizedStorageKey =
      coverStorageKey?.trim();

    if (!normalizedStorageKey) {
      throw new BadRequestException(
        "Generated cover storage key is required.",
      );
    }

    const content =
      await this.model.findById(id);

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    /*
     * A producer supplied cover always wins over
     * an automatically generated cover.
     */
    const existingCoverStorageKey =
      content.coverImage?.storageKey?.trim();

    if (existingCoverStorageKey) {
      return;
    }

    content.coverImage = {
      storageKey:
        normalizedStorageKey,

      processingState:
        MediaProcessingState.READY,
    };

    await content.save();
  }

  // ==========================================================================
  // MEDIA PROCESSING — SUCCESS
  // ==========================================================================

  async markMediaReady(
    id: string,
    durationSeconds: number,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    if (
      !Number.isFinite(
        durationSeconds,
      ) ||
      durationSeconds <= 0
    ) {
      throw new BadRequestException(
        "Invalid media duration.",
      );
    }

    const content =
      await this.model.findById(id);

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    if (!content.media) {
      throw new BadRequestException(
        "Content does not contain a media asset.",
      );
    }

    // ------------------------------------------------------------------------
    // DURATION PROTECTION
    // ------------------------------------------------------------------------

    const limit =
      this.getMediaLimit(
        content.type,
        content.mediaKind,
      );

    if (
      durationSeconds >
      limit.maxDurationSeconds
    ) {
      throw new BadRequestException(
        `Media duration exceeds the ${this.formatDuration(limit.maxDurationSeconds)} limit for ${content.type}.`,
      );
    }

    content.media.processingState =
      MediaProcessingState.READY;

    content.media.durationSeconds =
      durationSeconds;

    content.durationSeconds =
      durationSeconds;

    // ------------------------------------------------------------------------
    // AUTOMATIC PUBLICATION
    // ------------------------------------------------------------------------

    if (
      content.status ===
      MusicPublishStatus.PROCESSING
    ) {
      content.status =
        MusicPublishStatus.PUBLISHED;

      if (
        !content.releaseDate
      ) {
        content.releaseDate =
          new Date();
      }
    }

    await content.save();
  }

  // ==========================================================================
  // MEDIA PROCESSING — FAILURE
  // ==========================================================================

  async markMediaFailed(
    id: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    const content =
      await this.model.findById(id);

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    if (!content.media) {
      throw new BadRequestException(
        "Content does not contain a media asset.",
      );
    }

    content.media.processingState =
      MediaProcessingState.FAILED;

    content.status =
      MusicPublishStatus.FAILED;

    await content.save();
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  async delete(
    id: string,
    producerId: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    this.assertObjectId(
      producerId,
      "producerId",
    );

    const content =
      await this.model
        .findById(id)
        .select("producerId");

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    if (
      content.producerId.toString() !==
      producerId
    ) {
      throw new ForbiddenException(
        "You do not own this content.",
      );
    }

    await this.model.deleteOne({
      _id: id,
    });
  }

  // ==========================================================================
  // GET ONE
  // ==========================================================================

  async findById(
    id: string,
  ): Promise<MusicContent> {
    this.assertObjectId(
      id,
      "contentId",
    );

    const content =
      await this.model
        .findById(id)
        .lean();

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    return content as MusicContent;
  }

  // ==========================================================================
  // GET BY SLUG
  // ==========================================================================

  async findBySlug(
    slug: string,
  ): Promise<MusicContent> {
    const normalizedSlug =
      slug?.trim();

    if (!normalizedSlug) {
      throw new BadRequestException(
        "Slug is required.",
      );
    }

    const content =
      await this.model
        .findOne({
          slug:
            normalizedSlug,

          status:
            MusicPublishStatus.PUBLISHED,
        })
        .lean();

    if (!content) {
      throw new NotFoundException(
        "Content not found.",
      );
    }

    return content as MusicContent;
  }

  // ==========================================================================
  // MARKETPLACE QUERY
  // ==========================================================================

  async query(
    dto: MusicQueryDto,
  ) {
    const filter: Record<
      string,
      any
    > = {
      status:
        MusicPublishStatus.PUBLISHED,
    };

    // ------------------------------------------------------------------------
    // TYPE
    // ------------------------------------------------------------------------

    if (dto.type) {
      filter.type =
        dto.type;
    }

    // ------------------------------------------------------------------------
    // GENRE
    // ------------------------------------------------------------------------

    if (dto.genre) {
      filter.genre =
        dto.genre;
    }

    // ------------------------------------------------------------------------
    // ACCESS TYPE
    // ------------------------------------------------------------------------

    if (dto.accessType) {
      filter.accessType =
        dto.accessType;
    }

    // ------------------------------------------------------------------------
    // PRODUCER
    // ------------------------------------------------------------------------

    if (dto.producerId) {
      this.assertObjectId(
        dto.producerId,
        "producerId",
      );

      filter.producerId =
        new Types.ObjectId(
          dto.producerId,
        );
    }

    // ------------------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------------------

    if (
      dto.search?.trim()
    ) {
      filter.$text = {
        $search:
          dto.search.trim(),
      };
    }

    // ------------------------------------------------------------------------
    // PAGINATION
    // ------------------------------------------------------------------------

    const offset =
      Math.max(
        dto.offset ?? 0,
        0,
      );

    const limit =
      Math.min(
        Math.max(
          dto.limit ?? 24,
          1,
        ),
        100,
      );

    // ------------------------------------------------------------------------
    // SORT
    // ------------------------------------------------------------------------

    const sort =
      this.resolveSort(
        dto.sort,
      );

    // ------------------------------------------------------------------------
    // DATABASE QUERY
    // ------------------------------------------------------------------------

    const [
      items,
      total,
    ] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .lean(),

      this.model.countDocuments(
        filter,
      ),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  // ==========================================================================
  // PRODUCER CONTENT
  // ==========================================================================

  async listForProducer(
    producerId: string,
    includeUnpublished = false,
  ) {
    this.assertObjectId(
      producerId,
      "producerId",
    );

    const filter: Record<
      string,
      any
    > = {
      producerId:
        new Types.ObjectId(
          producerId,
        ),
    };

    if (
      !includeUnpublished
    ) {
      filter.status =
        MusicPublishStatus.PUBLISHED;
    }

    return this.model
      .find(filter)
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // ==========================================================================
  // ANALYTICS — PLAY
  // ==========================================================================

  async recordPlay(
    id: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    await this.model.updateOne(
      {
        _id: id,

        status:
          MusicPublishStatus.PUBLISHED,
      },
      {
        $inc: {
          playCount: 1,
        },
      },
    );
  }

  // ==========================================================================
  // ANALYTICS — VIEW
  // ==========================================================================

  async recordView(
    id: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    await this.model.updateOne(
      {
        _id: id,

        status:
          MusicPublishStatus.PUBLISHED,
      },
      {
        $inc: {
          viewCount: 1,
        },
      },
    );
  }

  // ==========================================================================
  // ANALYTICS — SHARE
  // ==========================================================================

  async recordShare(
    id: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    await this.model.updateOne(
      {
        _id: id,

        status:
          MusicPublishStatus.PUBLISHED,
      },
      {
        $inc: {
          shareCount: 1,
        },
      },
    );
  }

  // ==========================================================================
  // PURCHASE
  // ==========================================================================

  async recordSuccessfulPurchase(
    id: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    await this.model.updateOne(
      {
        _id: id,
      },
      {
        $inc: {
          purchaseCount: 1,
        },
      },
    );
  }

  // ==========================================================================
  // FAVORITES — INCREMENT
  // ==========================================================================

  async incrementFavorite(
    id: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    await this.model.updateOne(
      {
        _id: id,
      },
      {
        $inc: {
          favoriteCount: 1,
        },
      },
    );
  }

  // ==========================================================================
  // FAVORITES — DECREMENT
  // ==========================================================================

  async decrementFavorite(
    id: string,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    await this.model.updateOne(
      {
        _id: id,

        favoriteCount: {
          $gt: 0,
        },
      },
      {
        $inc: {
          favoriteCount: -1,
        },
      },
    );
  }

  // ==========================================================================
  // RANK SCORE
  // ==========================================================================

  async setRankScore(
    id: string,
    rankScore: number,
  ): Promise<void> {
    this.assertObjectId(
      id,
      "contentId",
    );

    if (
      !Number.isFinite(
        rankScore,
      ) ||
      rankScore < 0
    ) {
      throw new BadRequestException(
        "Invalid ranking score.",
      );
    }

    await this.model.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          rankScore,
        },
      },
    );
  }

  // ==========================================================================
  // MEDIA LIMIT HELPERS
  // ==========================================================================

  getMediaLimit(
    type?: string,
    mediaKind?: string,
  ): {
    maxDurationSeconds: number;
    maxFileSizeBytes: number;
  } {
    const normalizedType =
      this.normalizeContentType(
        type,
      );

    const configured =
      normalizedType
        ? FOCKIS_MUSIC_MEDIA_LIMITS[
            normalizedType as keyof typeof FOCKIS_MUSIC_MEDIA_LIMITS
          ]
        : undefined;

    if (configured) {
      return configured;
    }

    if (
      String(mediaKind)
        .toLowerCase() ===
      "video"
    ) {
      return {
        maxDurationSeconds:
          8 * 60 * 60,

        maxFileSizeBytes:
          20 * GB,
      };
    }

    return {
      maxDurationSeconds:
        12 * 60 * 60,

      maxFileSizeBytes:
        2 * GB,
    };
  }

  // ==========================================================================
  // GLOBAL UPLOAD LIMIT
  // ==========================================================================

  getGlobalMaxUploadBytes(): number {
    return GLOBAL_MAX_UPLOAD_BYTES;
  }

  // ==========================================================================
  // CONTENT TYPE NORMALIZATION
  // ==========================================================================

  private normalizeContentType(
    type?: string,
  ): string {
    const normalized =
      String(type ?? "")
        .trim()
        .toLowerCase()
        .replace(/-/g, "_")
        .replace(/\s+/g, "_");

    switch (normalized) {
      case "musicvideo":
        return "music_video";

      case "liveperformance":
        return "live_performance";

      case "behindthescenes":
        return "behind_the_scenes";

      case "exclusivevideo":
        return "exclusive_video";

      case "movie":
      case "film":
        return "video";

      default:
        return normalized;
    }
  }

  // ==========================================================================
  // MEDIA CONFIGURATION VALIDATION
  // ==========================================================================

  private validateMediaConfiguration(
    type?: string,
    mediaKind?: string,
  ): void {
    const normalizedKind =
      String(mediaKind ?? "")
        .trim()
        .toLowerCase();

    if (
      normalizedKind !== "audio" &&
      normalizedKind !== "video"
    ) {
      throw new BadRequestException(
        "Media kind must be either audio or video.",
      );
    }

    const normalizedType =
      this.normalizeContentType(
        type,
      );

    if (!normalizedType) {
      throw new BadRequestException(
        "Music content type is required.",
      );
    }

    const audioTypes = new Set([
      "song",
      "single",
      "track",
      "beat",
      "instrumental",
      "album",
      "ep",
      "music",
      "audio",
    ]);

    const videoTypes = new Set([
      "music_video",
      "video",
      "live_performance",
      "interview",
      "behind_the_scenes",
      "tutorial",
      "exclusive",
      "exclusive_video",
    ]);

    if (
      normalizedKind === "audio" &&
      !audioTypes.has(
        normalizedType,
      )
    ) {
      throw new BadRequestException(
        `Content type "${type}" is not configured as an audio format.`,
      );
    }

    if (
      normalizedKind === "video" &&
      !videoTypes.has(
        normalizedType,
      )
    ) {
      throw new BadRequestException(
        `Content type "${type}" is not configured as a video format.`,
      );
    }
  }

  // ==========================================================================
  // DURATION FORMAT
  // ==========================================================================

  private formatDuration(
    seconds: number,
  ): string {
    const hours =
      Math.floor(
        seconds / 3600,
      );

    const minutes =
      Math.floor(
        (seconds % 3600) / 60,
      );

    if (
      hours > 0 &&
      minutes > 0
    ) {
      return `${hours} hours ${minutes} minutes`;
    }

    if (hours > 0) {
      return `${hours} hours`;
    }

    return `${minutes} minutes`;
  }

  // ==========================================================================
  // SORTING
  // ==========================================================================

  private resolveSort(
    sort?: string,
  ): Record<
    string,
    1 | -1
  > {
    switch (sort) {
      case "trending":
        return {
          rankScore: -1,
          playCount: -1,
          createdAt: -1,
        };

      case "most_played":
        return {
          playCount: -1,
          viewCount: -1,
          createdAt: -1,
        };

      case "most_viewed":
        return {
          viewCount: -1,
          playCount: -1,
          createdAt: -1,
        };

      case "most_purchased":
        return {
          purchaseCount: -1,
          playCount: -1,
          createdAt: -1,
        };

      case "highest_rated":
        return {
          favoriteCount: -1,
          playCount: -1,
          createdAt: -1,
        };

      case "price_asc":
        return {
          priceCents: 1,
          createdAt: -1,
        };

      case "price_desc":
        return {
          priceCents: -1,
          createdAt: -1,
        };

      case "newest":
      default:
        return {
          releaseDate: -1,
          createdAt: -1,
        };
    }
  }

  // ==========================================================================
  // UNIQUE SLUG
  // ==========================================================================

  private async uniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const base =
      slugify(title) ||
      "music";

    let slug =
      base;

    let suffix = 1;

    while (true) {
      const filter: Record<
        string,
        any
      > = {
        slug,
      };

      if (excludeId) {
        this.assertObjectId(
          excludeId,
          "excludeId",
        );

        filter._id = {
          $ne:
            new Types.ObjectId(
              excludeId,
            ),
        };
      }

      const exists =
        await this.model.exists(
          filter,
        );

      if (!exists) {
        return slug;
      }

      slug =
        `${base}-${suffix++}`;
    }
  }

  // ==========================================================================
  // OBJECT ID HELPERS
  // ==========================================================================

  private assertObjectId(
    value: string,
    fieldName: string,
  ): void {
    if (
      !value ||
      !Types.ObjectId.isValid(
        value,
      )
    ) {
      throw new BadRequestException(
        `Invalid ${fieldName}.`,
      );
    }
  }

  private toObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    this.assertObjectId(
      value,
      fieldName,
    );

    return new Types.ObjectId(
      value,
    );
  }
}