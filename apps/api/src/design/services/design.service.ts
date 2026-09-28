import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import { Model } from "mongoose";

import { CreateDesignDto } from "../dto/create-design.dto";
import { CreateDesignFromTemplateDto } from "../dto/create-design-from-template.dto";
import { UpdateDesignDto } from "../dto/update-design.dto";

import {
  Design,
  DesignDocumentEntity,
} from "../schemas/design.schema";

import { DesignTemplateService } from "./design-template.service";

import type {
  DesignCategory,
} from "../types/design.types";

// ============================================================================
// DESIGN SERVICE
// ============================================================================

@Injectable()
export class DesignService {
  constructor(
    @InjectModel(Design.name)
    private readonly model: Model<DesignDocumentEntity>,

    private readonly templates: DesignTemplateService,
  ) {}

  // ==========================================================================
  // CREATE
  // ==========================================================================

  async create(
    ownerId: string,
    dto: CreateDesignDto,
  ) {
    const design = await this.model.create({
      ownerId,

      name:
        dto.name?.trim() ||
        "Untitled Design",

      category:
        dto.category as DesignCategory,

      description:
        dto.description,

      thumbnailUrl:
        dto.thumbnailUrl,

      document: {
        canvas: {
          width:
            dto.canvasWidth,

          height:
            dto.canvasHeight,

          background:
            dto.background ||
            "#FFFFFF",

          backgroundImage:
            dto.backgroundImage,
        },

        /*
         * DesignElementDto.type is currently typed as string,
         * while the Mongoose schema expects DesignElementType.
         *
         * The DTO is validated at the API boundary, so we
         * intentionally cast the complete element array here.
         */
        elements:
          (dto.elements ?? []) as any,

        version: 1,
      },

      lastOpenedAt:
        new Date(),

      revision: 1,
    });

    return design;
  }

  // ==========================================================================
  // CREATE FROM TEMPLATE
  // ==========================================================================

  async createFromTemplate(
    ownerId: string,
    dto: CreateDesignFromTemplateDto,
  ) {
    const template =
      await this.templates.findByIdOrSlug(
        dto.templateId,
      );

    const design =
      await this.model.create({
        ownerId,

        name:
          dto.name?.trim() ||
          template.name,

        category:
          template.category as DesignCategory,

        description:
          template.description,

        sourceTemplateId:
          String(template._id),

        document:
          template.document,

        lastOpenedAt:
          new Date(),

        revision: 1,
      });

    await this.templates.incrementUsage(
      String(template._id),
    );

    return design;
  }

  // ==========================================================================
  // LIST MY DESIGNS
  // ==========================================================================

  async listMine(
    ownerId: string,
    params: {
      search?: string;
      category?: string;
      favorite?: boolean;
      archived?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const page =
      Math.max(
        1,
        params.page ?? 1,
      );

    const limit =
      Math.min(
        50,
        Math.max(
          1,
          params.limit ?? 24,
        ),
      );

    const filter: Record<
      string,
      unknown
    > = {
      ownerId,
      archived:
        params.archived ?? false,
    };

    // ------------------------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------------------------

    if (
      params.category
    ) {
      filter.category =
        params.category as DesignCategory;
    }

    // ------------------------------------------------------------------------
    // FAVORITE
    // ------------------------------------------------------------------------

    if (
      params.favorite !== undefined
    ) {
      filter.favorite =
        params.favorite;
    }

    // ------------------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------------------

    if (
      params.search?.trim()
    ) {
      const escaped =
        params.search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

      filter.name =
        new RegExp(
          escaped,
          "i",
        );
    }

    // ------------------------------------------------------------------------
    // QUERY
    // ------------------------------------------------------------------------

    const [
      items,
      total,
    ] = await Promise.all([
      this.model
        .find(filter)
        .sort({
          updatedAt: -1,
        })
        .skip(
          (page - 1) * limit,
        )
        .limit(limit)
        .lean(),

      this.model.countDocuments(
        filter,
      ),
    ]);

    return {
      items,
      page,
      limit,
      total,
      pages:
        Math.ceil(
          total / limit,
        ),
    };
  }

  // ==========================================================================
  // GET MY DESIGN
  // ==========================================================================

  async getMine(
    ownerId: string,
    id: string,
  ) {
    return this.getOwned(
      ownerId,
      id,
    );
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  async update(
    ownerId: string,
    id: string,
    dto: UpdateDesignDto,
  ) {
    const design =
      await this.getOwned(
        ownerId,
        id,
      );

    const patch: Record<
      string,
      unknown
    > = {};

    // ------------------------------------------------------------------------
    // BASIC PROPERTIES
    // ------------------------------------------------------------------------

    if (
      dto.name !== undefined
    ) {
      patch.name =
        dto.name;
    }

    if (
      dto.description !== undefined
    ) {
      patch.description =
        dto.description;
    }

    if (
      dto.thumbnailUrl !== undefined
    ) {
      patch.thumbnailUrl =
        dto.thumbnailUrl;
    }

    if (
      dto.favorite !== undefined
    ) {
      patch.favorite =
        dto.favorite;
    }

    if (
      dto.archived !== undefined
    ) {
      patch.archived =
        dto.archived;
    }

    // ------------------------------------------------------------------------
    // DOCUMENT / CANVAS
    // ------------------------------------------------------------------------

    const hasDocumentChanges =
      dto.canvasWidth !== undefined ||
      dto.canvasHeight !== undefined ||
      dto.background !== undefined ||
      dto.backgroundImage !== undefined ||
      dto.elements !== undefined;

    if (
      hasDocumentChanges
    ) {
      patch.document = {
        canvas: {
          width:
            dto.canvasWidth ??
            design.document.canvas.width,

          height:
            dto.canvasHeight ??
            design.document.canvas.height,

          background:
            dto.background ??
            design.document.canvas.background,

          backgroundImage:
            dto.backgroundImage ??
            design.document.canvas
              .backgroundImage,
        },

        /*
         * DTO elements currently use a broader string
         * type for `type`.
         *
         * Cast them to the schema's element structure
         * after DTO validation.
         */
        elements:
          (dto.elements ??
            design.document.elements) as any,

        version:
          design.document.version + 1,
      };
    }

    // ------------------------------------------------------------------------
    // REVISION
    // ------------------------------------------------------------------------

    patch.revision =
      design.revision + 1;

    patch.lastOpenedAt =
      new Date();

    // ------------------------------------------------------------------------
    // SAVE
    // ------------------------------------------------------------------------

    return this.model
      .findOneAndUpdate(
        {
          _id: id,
          ownerId,
        },

        {
          $set: patch,
        },

        {
          new: true,
          runValidators: true,
        },
      )
      .lean();
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  async remove(
    ownerId: string,
    id: string,
  ) {
    await this.getOwned(
      ownerId,
      id,
    );

    await this.model.deleteOne({
      _id: id,
      ownerId,
    });

    return {
      success: true,
    };
  }

  // ==========================================================================
  // OWNERSHIP
  // ==========================================================================

  private async getOwned(
    ownerId: string,
    id: string,
  ) {
    const design =
      await this.model
        .findById(id)
        .lean();

    if (!design) {
      throw new NotFoundException(
        "Design not found",
      );
    }

    if (
      design.ownerId !== ownerId
    ) {
      throw new ForbiddenException(
        "You do not have access to this design",
      );
    }

    return design;
  }
}

// ============================================================================
// END
// ============================================================================