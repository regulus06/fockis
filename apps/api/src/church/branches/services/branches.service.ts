/**
 * branches.service.ts
 * -----------------------------------------------------------------------------
 * Production-ready business logic for Church Branches / Locations.
 *
 * RULES
 * -----------------------------------------------------------------------------
 *
 * - Every organization should have at least one main location.
 * - Only administrators / management can create, update, or delete branches.
 * - There can only be ONE main location per organization.
 * - Creating a main location automatically demotes the previous main location.
 * - The system can create the first/main location without an authenticated actor.
 * - Organization creation can provide complete branch information.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Branch,
  BranchDocument,
} from '../schemas/branch.schema';

import { CreateBranchDto } from '../dto/create-branch.dto';
import { UpdateBranchDto } from '../dto/update-branch.dto';

import { MembersService } from '../../members/services/members.service';

/* ============================================================================
   RESPONSE
============================================================================ */

function toResponse(doc: BranchDocument) {
  return {
    id: String(doc._id),

    organizationId: String(
      doc.organizationId,
    ),

    name: doc.name,

    isMainLocation:
      doc.isMainLocation,

    address:
      doc.address ?? undefined,

    contact:
      doc.contact ?? undefined,

    serviceTimes:
      doc.serviceTimes ?? [],

    timezone:
      doc.timezone ?? undefined,

    photoUrl:
      doc.photoUrl ?? null,
  };
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class BranchesService {
  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,

    private readonly membersService: MembersService,
  ) {}

  /* ==========================================================================
     HELPERS
  ========================================================================== */

  private toObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (
      !value ||
      !Types.ObjectId.isValid(value)
    ) {
      throw new BadRequestException(
        `${fieldName} is invalid.`,
      );
    }

    return new Types.ObjectId(value);
  }

  /**
   * Ensure the organization has exactly one
   * main location whenever a branch is promoted.
   */
  private async setMainLocation(
    organizationId: string,
    branchId?: Types.ObjectId,
  ): Promise<void> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const filter: Record<string, unknown> = {
      organizationId:
        organizationObjectId,
    };

    if (branchId) {
      filter._id = {
        $ne: branchId,
      };
    }

    await this.branchModel.updateMany(
      filter,
      {
        $set: {
          isMainLocation: false,
        },
      },
    );
  }

  /* ==========================================================================
     LIST
  ========================================================================== */

  async listByOrganization(
    organizationId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const docs =
      await this.branchModel
        .find({
          organizationId:
            organizationObjectId,
        })
        .sort({
          isMainLocation: -1,
          name: 1,
        })
        .exec();

    return docs.map(toResponse);
  }

  /* ==========================================================================
     GET
  ========================================================================== */

  async getById(
    organizationId: string,
    branchId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const branchObjectId =
      this.toObjectId(
        branchId,
        'branchId',
      );

    const doc =
      await this.branchModel.findOne({
        _id: branchObjectId,

        organizationId:
          organizationObjectId,
      });

    if (!doc) {
      throw new NotFoundException(
        'Branch not found.',
      );
    }

    return toResponse(doc);
  }

  /* ==========================================================================
     CREATE
  ========================================================================== */

  async create(
    organizationId: string,
    dto: CreateBranchDto,
    actorUserId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const actor =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    this.membersService.requireAdmin(
      actor,
    );

    if (dto.isMainLocation) {
      await this.setMainLocation(
        organizationId,
      );
    }

    const created =
      await this.branchModel.create({
        ...dto,

        organizationId:
          organizationObjectId,
      });

    return toResponse(created);
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  async update(
    organizationId: string,
    branchId: string,
    dto: UpdateBranchDto,
    actorUserId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const branchObjectId =
      this.toObjectId(
        branchId,
        'branchId',
      );

    const actor =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    this.membersService.requireAdmin(
      actor,
    );

    const doc =
      await this.branchModel.findOne({
        _id: branchObjectId,

        organizationId:
          organizationObjectId,
      });

    if (!doc) {
      throw new NotFoundException(
        'Branch not found.',
      );
    }

    if (dto.isMainLocation === true) {
      await this.setMainLocation(
        organizationId,
        doc._id,
      );
    }

    Object.assign(
      doc,
      dto,
    );

    await doc.save();

    return toResponse(doc);
  }

  /* ==========================================================================
     REMOVE
  ========================================================================== */

  async remove(
    organizationId: string,
    branchId: string,
    actorUserId: string,
  ): Promise<void> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    const branchObjectId =
      this.toObjectId(
        branchId,
        'branchId',
      );

    const actor =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    this.membersService.requireAdmin(
      actor,
    );

    const doc =
      await this.branchModel.findOne({
        _id: branchObjectId,

        organizationId:
          organizationObjectId,
      });

    if (!doc) {
      throw new NotFoundException(
        'Branch not found.',
      );
    }

    await doc.deleteOne();

    /*
     * Safety repair:
     *
     * If the deleted branch was the main location,
     * promote another branch automatically.
     */
    if (doc.isMainLocation) {
      const replacement =
        await this.branchModel
          .findOne({
            organizationId:
              organizationObjectId,
          })
          .sort({
            name: 1,
          })
          .exec();

      if (replacement) {
        replacement.isMainLocation =
          true;

        await replacement.save();
      }
    }
  }

  /* ==========================================================================
     CREATE MAIN BRANCH
  ========================================================================== */

  /**
   * System-initiated branch creation.
   *
   * Used during organization creation.
   *
   * Unlike create(), this method does NOT require
   * an authenticated membership because the organization
   * and its owner membership may be created at the same time.
   *
   * The method accepts either:
   *
   *   createMainBranch(organizationId)
   *
   * or:
   *
   *   createMainBranch(organizationId, {
   *     name,
   *     address,
   *     contact,
   *     serviceTimes,
   *     timezone,
   *     photoUrl,
   *   })
   */

  async createMainBranch(
    organizationId: string,
    data?: Partial<CreateBranchDto> | string,
  ): Promise<void> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    let branchData:
      Partial<CreateBranchDto>;

    if (typeof data === 'string') {
      branchData = {
        name: data,
      };
    } else {
      branchData = data ?? {};
    }

    /*
     * If this is the first branch, it becomes
     * the main location automatically.
     */
    await this.setMainLocation(
      organizationId,
    );

    await this.branchModel.create({
      ...branchData,

      organizationId:
        organizationObjectId,

      name:
        branchData.name?.trim() ||
        'Main Location',

      isMainLocation: true,

      serviceTimes:
        branchData.serviceTimes ?? [],
    });
  }

  /* ==========================================================================
     DELETE ALL
  ========================================================================== */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        'organizationId',
      );

    await this.branchModel.deleteMany({
      organizationId:
        organizationObjectId,
    });
  }
}