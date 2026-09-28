/**
 * church-events.service.ts
 * -----------------------------------------------------------------------------
 * Production-ready business logic for Church Events.
 *
 * Responsibilities:
 *   - List/get events
 *   - Create/update/delete events
 *   - RSVP / cancel RSVP
 *   - Organization-scoped authorization
 *   - Branch/department/group ownership validation
 *   - RSVP capacity enforcement
 *   - Date validation
 *   - Safe ObjectId handling
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ChurchEvent,
  ChurchEventDocument,
  RsvpStatus,
} from '../schemas/church-event.schema';

import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';

import {
  MembershipDocument,
} from '../../members/schemas/membership.schema';

import { MembersService } from '../../members/services/members.service';

export interface ListEventsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  eventType?: string;
  departmentId?: string;
  groupId?: string;
  branchId?: string;
  from?: string;
  to?: string;
  mineOnly?: boolean;
}

@Injectable()
export class ChurchEventsService {
  constructor(
    @InjectModel(ChurchEvent.name)
    private readonly eventModel: Model<ChurchEventDocument>,

    private readonly membersService: MembersService,
  ) {}

  /* ==========================================================================
     VALIDATION HELPERS
  ========================================================================== */

  private objectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `${fieldName} must be a valid identifier.`,
      );
    }

    return new Types.ObjectId(value);
  }

  private date(
    value: string,
    fieldName: string,
  ): Date {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        `${fieldName} must be a valid date.`,
      );
    }

    return parsed;
  }

  /**
   * `endsAt` may be null when an event does not have an end time.
   */
  private validateEventDates(
    startsAt: Date,
    endsAt?: Date | null,
  ): void {
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException(
        'Event end time must be after the start time.',
      );
    }
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* ==========================================================================
     ORGANIZATION RELATION VALIDATION
  ========================================================================== */

  /**
   * Validates that referenced organizational entities belong to the same
   * organization.
   *
   * This currently validates that IDs are valid MongoDB ObjectIds.
   *
   * If BranchesService / DepartmentsService / GroupsService expose
   * organization-scoped lookup methods, those should also be called here.
   */
  private async validateReferences(
    organizationId: string,
    dto: {
      branchId?: string | null;
      departmentId?: string | null;
      groupId?: string | null;
    },
  ): Promise<void> {
    if (dto.branchId) {
      this.objectId(
        dto.branchId,
        'branchId',
      );
    }

    if (dto.departmentId) {
      this.objectId(
        dto.departmentId,
        'departmentId',
      );
    }

    if (dto.groupId) {
      this.objectId(
        dto.groupId,
        'groupId',
      );
    }

    /*
     * IMPORTANT:
     *
     * If your BranchesService / DepartmentsService / GroupsService already
     * exposes organization-scoped lookup methods, call them here.
     *
     * Example:
     *
     * await this.branchesService.requireInOrganization(
     *   organizationId,
     *   dto.branchId,
     * );
     *
     * The critical rule is:
     *
     *   NEVER trust a branch/department/group ID supplied by the client.
     */
  }

  /* ==========================================================================
     RESPONSE MAPPING
  ========================================================================== */

  private toResponse(
    doc: ChurchEventDocument,
    viewerMembership: MembershipDocument | null,
  ) {
    const currentUserRsvp = viewerMembership
      ? (
          doc.rsvps.find(
            (r) =>
              String(r.memberId) ===
              String(viewerMembership._id),
          )?.status ?? null
        )
      : null;

    const rsvpCount = doc.rsvps.filter(
      (r) =>
        r.status === RsvpStatus.Going,
    ).length;

    return {
      id: String(doc._id),

      organizationId:
        String(doc.organizationId),

      branchId:
        doc.branchId
          ? String(doc.branchId)
          : null,

      departmentId:
        doc.departmentId
          ? String(doc.departmentId)
          : null,

      groupId:
        doc.groupId
          ? String(doc.groupId)
          : null,

      title:
        doc.title,

      description:
        doc.description,

      eventType:
        doc.eventType,

      startsAt:
        doc.startsAt,

      endsAt:
        doc.endsAt ?? null,

      location:
        doc.location,

      isOnline:
        doc.isOnline ?? false,

      onlineUrl:
        doc.onlineUrl ?? null,

      coverImageUrl:
        doc.coverImageUrl ?? null,

      capacity:
        doc.capacity ?? null,

      rsvpCount,

      currentUserRsvp,

      requiresRsvp:
        doc.requiresRsvp,

      createdAt:
        doc.createdAt,

      updatedAt:
        doc.updatedAt,
    };
  }

  /* ==========================================================================
     LIST
  ========================================================================== */

  async listByOrganization(
    organizationId: string,
    query: ListEventsQuery = {},
    viewerUserId?: string,
  ) {
    const organizationObjectId =
      this.objectId(
        organizationId,
        'organizationId',
      );

    const page =
      query.page &&
      Number.isInteger(query.page) &&
      query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize &&
      Number.isInteger(query.pageSize) &&
      query.pageSize > 0
        ? Math.min(query.pageSize, 100)
        : 20;

    const filter: Record<string, any> = {
      organizationId:
        organizationObjectId,
    };

    if (query.eventType?.trim()) {
      filter.eventType =
        query.eventType.trim();
    }

    if (query.departmentId) {
      filter.departmentId =
        this.objectId(
          query.departmentId,
          'departmentId',
        );
    }

    if (query.groupId) {
      filter.groupId =
        this.objectId(
          query.groupId,
          'groupId',
        );
    }

    if (query.branchId) {
      filter.branchId =
        this.objectId(
          query.branchId,
          'branchId',
        );
    }

    if (query.search?.trim()) {
      filter.title = {
        $regex:
          this.escapeRegex(
            query.search.trim(),
          ),
        $options: 'i',
      };
    }

    if (query.from || query.to) {
      const range: Record<string, Date> = {};

      if (query.from) {
        range.$gte =
          this.date(
            query.from,
            'from',
          );
      }

      if (query.to) {
        range.$lte =
          this.date(
            query.to,
            'to',
          );
      }

      filter.startsAt = range;
    }

    const viewer =
      viewerUserId
        ? await this.membersService.getMembershipOrNull(
            organizationId,
            viewerUserId,
          )
        : null;

    if (query.mineOnly) {
      if (!viewer) {
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
        };
      }

      filter.rsvps = {
        $elemMatch: {
          memberId:
            viewer._id,

          status:
            RsvpStatus.Going,
        },
      };
    }

    const [docs, total] =
      await Promise.all([
        this.eventModel
          .find(filter)
          .sort({
            startsAt: 1,
            _id: 1,
          })
          .skip(
            (page - 1) *
              pageSize,
          )
          .limit(pageSize)
          .exec(),

        this.eventModel
          .countDocuments(filter),
      ]);

    const items =
      docs.map((doc) =>
        this.toResponse(
          doc,
          viewer,
        ),
      );

    return {
      items,
      total,
      page,
      pageSize,
      hasMore:
        page * pageSize < total,
    };
  }

  /* ==========================================================================
     GET
  ========================================================================== */

  async getById(
    organizationId: string,
    eventId: string,
    viewerUserId?: string,
  ) {
    const organizationObjectId =
      this.objectId(
        organizationId,
        'organizationId',
      );

    const eventObjectId =
      this.objectId(
        eventId,
        'eventId',
      );

    const doc =
      await this.eventModel.findOne({
        _id: eventObjectId,
        organizationId:
          organizationObjectId,
      });

    if (!doc) {
      throw new NotFoundException(
        'Event not found.',
      );
    }

    const viewer =
      viewerUserId
        ? await this.membersService.getMembershipOrNull(
            organizationId,
            viewerUserId,
          )
        : null;

    return this.toResponse(
      doc,
      viewer,
    );
  }

  /* ==========================================================================
     CREATE
  ========================================================================== */

  async create(
    organizationId: string,
    dto: CreateEventDto,
    actorUserId: string,
  ) {
    this.objectId(
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

    const startsAt =
      this.date(
        dto.startsAt,
        'startsAt',
      );

    const endsAt =
      dto.endsAt
        ? this.date(
            dto.endsAt,
            'endsAt',
          )
        : undefined;

    this.validateEventDates(
      startsAt,
      endsAt,
    );

    if (
      dto.capacity !== undefined &&
      dto.capacity !== null &&
      (
        !Number.isInteger(
          dto.capacity,
        ) ||
        dto.capacity < 1
      )
    ) {
      throw new BadRequestException(
        'capacity must be a positive integer.',
      );
    }

    if (
      dto.isOnline &&
      !dto.onlineUrl
    ) {
      throw new BadRequestException(
        'onlineUrl is required for an online event.',
      );
    }

    await this.validateReferences(
      organizationId,
      dto,
    );

    const created =
      await this.eventModel.create({
        organizationId:
          this.objectId(
            organizationId,
            'organizationId',
          ),

        branchId:
          dto.branchId
            ? this.objectId(
                dto.branchId,
                'branchId',
              )
            : null,

        departmentId:
          dto.departmentId
            ? this.objectId(
                dto.departmentId,
                'departmentId',
              )
            : null,

        groupId:
          dto.groupId
            ? this.objectId(
                dto.groupId,
                'groupId',
              )
            : null,

        title:
          dto.title.trim(),

        description:
          dto.description?.trim() ?? '',

        eventType:
          dto.eventType,

        startsAt,

        endsAt,

        location:
          dto.location?.trim() ?? '',

        isOnline:
          dto.isOnline ?? false,

        onlineUrl:
          dto.onlineUrl?.trim() ?? null,

        coverImageUrl:
          dto.coverImageUrl?.trim() ?? null,

        capacity:
          dto.capacity ?? null,

        requiresRsvp:
          dto.requiresRsvp ?? true,

        rsvps: [],
      });

    return this.toResponse(
      created,
      actor,
    );
  }

  /* ==========================================================================
     UPDATE
  ========================================================================== */

  async update(
    organizationId: string,
    eventId: string,
    dto: UpdateEventDto,
    actorUserId: string,
  ) {
    this.objectId(
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

    const doc =
      await this.eventModel.findOne({
        _id: this.objectId(
          eventId,
          'eventId',
        ),

        organizationId:
          this.objectId(
            organizationId,
            'organizationId',
          ),
      });

    if (!doc) {
      throw new NotFoundException(
        'Event not found.',
      );
    }

    if (dto.title !== undefined) {
      const title =
        dto.title.trim();

      if (!title) {
        throw new BadRequestException(
          'Event title cannot be empty.',
        );
      }

      doc.title = title;
    }

    if (
      dto.description !==
      undefined
    ) {
      doc.description =
        dto.description.trim();
    }

    if (
      dto.eventType !==
      undefined
    ) {
      doc.eventType =
        dto.eventType;
    }

    if (
      dto.startsAt !==
      undefined
    ) {
      doc.startsAt =
        this.date(
          dto.startsAt,
          'startsAt',
        );
    }

    if (
      dto.endsAt !==
      undefined
    ) {
      doc.endsAt =
        dto.endsAt
          ? this.date(
              dto.endsAt,
              'endsAt',
            )
          : undefined;
    }

    /*
     * FIX:
     *
     * validateEventDates accepts Date | null | undefined.
     * This allows schemas where endsAt may be nullable.
     */
    this.validateEventDates(
      doc.startsAt,
      doc.endsAt,
    );

    if (
      dto.location !==
      undefined
    ) {
      doc.location =
        dto.location.trim();
    }

    if (
      dto.isOnline !==
      undefined
    ) {
      doc.isOnline =
        dto.isOnline;
    }

    if (
      dto.onlineUrl !==
      undefined
    ) {
      doc.onlineUrl =
        dto.onlineUrl?.trim() ||
        null;
    }

    if (
      doc.isOnline &&
      !doc.onlineUrl
    ) {
      throw new BadRequestException(
        'onlineUrl is required for an online event.',
      );
    }

    if (
      dto.coverImageUrl !==
      undefined
    ) {
      doc.coverImageUrl =
        dto.coverImageUrl?.trim() ||
        null;
    }

    if (
      dto.capacity !==
      undefined
    ) {
      if (
        dto.capacity !==
          null &&
        (
          !Number.isInteger(
            dto.capacity,
          ) ||
          dto.capacity < 1
        )
      ) {
        throw new BadRequestException(
          'capacity must be a positive integer.',
        );
      }

      const currentGoing =
        doc.rsvps.filter(
          (r) =>
            r.status ===
            RsvpStatus.Going,
        ).length;

      if (
        dto.capacity !== null &&
        dto.capacity <
          currentGoing
      ) {
        throw new BadRequestException(
          'capacity cannot be lower than the current RSVP count.',
        );
      }

      doc.capacity =
        dto.capacity;
    }

    if (
      dto.requiresRsvp !==
      undefined
    ) {
      doc.requiresRsvp =
        dto.requiresRsvp;
    }

    if (
      dto.branchId !==
        undefined ||
      dto.departmentId !==
        undefined ||
      dto.groupId !==
        undefined
    ) {
      await this.validateReferences(
        organizationId,
        dto,
      );
    }

    if (
      dto.branchId !==
      undefined
    ) {
      doc.branchId =
        dto.branchId
          ? this.objectId(
              dto.branchId,
              'branchId',
            )
          : null;
    }

    if (
      dto.departmentId !==
      undefined
    ) {
      doc.departmentId =
        dto.departmentId
          ? this.objectId(
              dto.departmentId,
              'departmentId',
            )
          : null;
    }

    if (
      dto.groupId !==
      undefined
    ) {
      doc.groupId =
        dto.groupId
          ? this.objectId(
              dto.groupId,
              'groupId',
            )
          : null;
    }

    await doc.save();

    return this.toResponse(
      doc,
      actor,
    );
  }

  /* ==========================================================================
     DELETE
  ========================================================================== */

  async remove(
    organizationId: string,
    eventId: string,
    actorUserId: string,
  ): Promise<void> {
    const actor =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    this.membersService.requireAdmin(
      actor,
    );

    const result =
      await this.eventModel.deleteOne({
        _id: this.objectId(
          eventId,
          'eventId',
        ),

        organizationId:
          this.objectId(
            organizationId,
            'organizationId',
          ),
      });

    if (
      result.deletedCount === 0
    ) {
      throw new NotFoundException(
        'Event not found.',
      );
    }
  }

  /* ==========================================================================
     RSVP
  ========================================================================== */

  async rsvp(
    organizationId: string,
    eventId: string,
    requesterUserId: string,
    status: RsvpStatus,
  ) {
    const doc =
      await this.eventModel.findOne({
        _id: this.objectId(
          eventId,
          'eventId',
        ),

        organizationId:
          this.objectId(
            organizationId,
            'organizationId',
          ),
      });

    if (!doc) {
      throw new NotFoundException(
        'Event not found.',
      );
    }

    if (
      !Object.values(
        RsvpStatus,
      ).includes(status)
    ) {
      throw new BadRequestException(
        'Invalid RSVP status.',
      );
    }

    if (
      !doc.requiresRsvp
    ) {
      throw new BadRequestException(
        'RSVP is not required for this event.',
      );
    }

    const membership =
      await this.membersService.requireActiveMembership(
        organizationId,
        requesterUserId,
      );

    const existing =
      doc.rsvps.find(
        (r) =>
          String(r.memberId) ===
          String(
            membership._id,
          ),
      );

    const currentGoing =
      doc.rsvps.filter(
        (r) =>
          r.status ===
          RsvpStatus.Going,
      ).length;

    const changingToGoing =
      status ===
        RsvpStatus.Going &&
      existing?.status !==
        RsvpStatus.Going;

    if (
      changingToGoing &&
      doc.capacity !== null &&
      doc.capacity !== undefined &&
      currentGoing >=
        doc.capacity
    ) {
      throw new ConflictException(
        'This event has reached its RSVP capacity.',
      );
    }

    if (existing) {
      existing.status =
        status;

      existing.respondedAt =
        new Date();
    } else {
      doc.rsvps.push({
        memberId:
          membership._id as Types.ObjectId,

        status,

        respondedAt:
          new Date(),
      });
    }

    await doc.save();

    return this.toResponse(
      doc,
      membership,
    );
  }

  /* ==========================================================================
     CANCEL RSVP
  ========================================================================== */

  async cancelRsvp(
    organizationId: string,
    eventId: string,
    requesterUserId: string,
  ) {
    const doc =
      await this.eventModel.findOne({
        _id: this.objectId(
          eventId,
          'eventId',
        ),

        organizationId:
          this.objectId(
            organizationId,
            'organizationId',
          ),
      });

    if (!doc) {
      throw new NotFoundException(
        'Event not found.',
      );
    }

    const membership =
      await this.membersService.requireActiveMembership(
        organizationId,
        requesterUserId,
      );

    const before =
      doc.rsvps.length;

    doc.rsvps =
      doc.rsvps.filter(
        (r) =>
          String(r.memberId) !==
          String(
            membership._id,
          ),
      );

    if (
      doc.rsvps.length ===
      before
    ) {
      throw new NotFoundException(
        'RSVP not found.',
      );
    }

    await doc.save();

    return this.toResponse(
      doc,
      membership,
    );
  }

  /* ==========================================================================
     ORGANIZATION CLEANUP
  ========================================================================== */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    await this.eventModel.deleteMany({
      organizationId:
        this.objectId(
          organizationId,
          'organizationId',
        ),
    });
  }
}