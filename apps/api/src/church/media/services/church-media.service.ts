/**
 * church-media.service.ts
 * -----------------------------------------------------------------------------
 * Business logic for the Documents & Media library: list (optionally
 * filtered by media type), create, and remove.
 * -----------------------------------------------------------------------------
 */

import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  ChurchMedia,
  ChurchMediaDocument,
  ChurchMediaType,
} from "../schemas/church-media.schema";

import { CreateMediaDto } from "../dto/create-media.dto";

import { MembersService } from "../../members/services/members.service";

/* ============================================================================
   QUERY
   ========================================================================== */

export interface ListMediaQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  mediaType?: ChurchMediaType;
}

/* ============================================================================
   RESPONSE MAPPER
   ========================================================================== */

function toResponse(
  doc: ChurchMediaDocument,
) {
  return {
    id: String(doc._id),

    organizationId:
      String(doc.organizationId),

    mediaType:
      doc.mediaType,

    title:
      doc.title,

    description:
      doc.description,

    thumbnailUrl:
      doc.thumbnailUrl ?? null,

    fileUrl:
      doc.fileUrl,

    durationSeconds:
      doc.durationSeconds ?? null,

    speaker:
      doc.speaker,

    publishedAt:
      doc.publishedAt,

    tags:
      doc.tags,
  };
}

/* ============================================================================
   SERVICE
   ========================================================================== */

@Injectable()
export class ChurchMediaService {
  constructor(
    @InjectModel(ChurchMedia.name)
    private readonly mediaModel:
      Model<ChurchMediaDocument>,

    private readonly membersService:
      MembersService,
  ) {}

  /* ==========================================================================
     LIST
     ========================================================================== */

  async listByOrganization(
    organizationId: string,
    query: ListMediaQuery,
  ) {
    const page =
      query.page && query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize && query.pageSize > 0
        ? Math.min(query.pageSize, 100)
        : 20;

    const filter = {
      organizationId:
        new Types.ObjectId(organizationId),
    };

    if (query.mediaType) {
      Object.assign(filter, {
        mediaType: query.mediaType,
      });
    }

    if (query.search) {
      Object.assign(filter, {
        title: {
          $regex: query.search,
          $options: "i",
        },
      });
    }

    const [docs, total] =
      await Promise.all([
        this.mediaModel
          .find(filter)
          .sort({
            publishedAt: -1,
          })
          .skip(
            (page - 1) * pageSize,
          )
          .limit(pageSize)
          .exec(),

        this.mediaModel.countDocuments(
          filter,
        ),
      ]);

    return {
      items: docs.map(toResponse),
      total,
      page,
      pageSize,
      hasMore:
        page * pageSize < total,
    };
  }

  /* ==========================================================================
     GET ONE
     ========================================================================== */

  async getById(
    organizationId: string,
    mediaId: string,
  ) {
    const doc =
      await this.findOrThrow(
        organizationId,
        mediaId,
      );

    return toResponse(doc);
  }

  /* ==========================================================================
     CREATE
     ========================================================================== */

  async create(
    organizationId: string,
    dto: CreateMediaDto,
    actorUserId: string,
  ) {
    const actor =
      await this.membersService
        .getMembershipOrNull(
          organizationId,
          actorUserId,
        );

    this.membersService.requireAdmin(
      actor,
    );

    const created =
      await this.mediaModel.create({
        organizationId:
          new Types.ObjectId(
            organizationId,
          ),

        mediaType:
          dto.mediaType,

        title:
          dto.title,

        description:
          dto.description,

        thumbnailUrl:
          dto.thumbnailUrl ?? null,

        fileUrl:
          dto.fileUrl,

        durationSeconds:
          dto.durationSeconds ?? null,

        speaker:
          dto.speaker,

        tags:
          dto.tags ?? [],
      });

    return toResponse(created);
  }

  /* ==========================================================================
     REMOVE
     ========================================================================== */

  async remove(
    organizationId: string,
    mediaId: string,
    actorUserId: string,
  ): Promise<void> {
    const actor =
      await this.membersService
        .getMembershipOrNull(
          organizationId,
          actorUserId,
        );

    this.membersService.requireAdmin(
      actor,
    );

    const result =
      await this.mediaModel.deleteOne({
        _id:
          new Types.ObjectId(
            mediaId,
          ),

        organizationId:
          new Types.ObjectId(
            organizationId,
          ),
      });

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        "Media item not found.",
      );
    }
  }

  /* ==========================================================================
     DELETE ORGANIZATION MEDIA
     ========================================================================== */

  /**
   * Used by OrganizationsService when
   * an organization is deleted.
   */
  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    await this.mediaModel.deleteMany({
      organizationId:
        new Types.ObjectId(
          organizationId,
        ),
    });
  }

  /* ==========================================================================
     FIND ONE
     ========================================================================== */

  private async findOrThrow(
    organizationId: string,
    mediaId: string,
  ): Promise<ChurchMediaDocument> {
    const doc =
      await this.mediaModel.findOne({
        _id:
          new Types.ObjectId(
            mediaId,
          ),

        organizationId:
          new Types.ObjectId(
            organizationId,
          ),
      });

    if (!doc) {
      throw new NotFoundException(
        "Media item not found.",
      );
    }

    return doc;
  }
}