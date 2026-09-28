/**
 * church-live.service.ts
 * -----------------------------------------------------------------------------
 * Live streaming: the Mongoose schema, its enums, and all business logic for
 * scheduling/starting/ending live services and gating viewer access.
 *
 * NOTE: this file defines the LiveEvent Mongoose schema directly in-line.
 * -----------------------------------------------------------------------------
 */

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prop,
  Schema,
  SchemaFactory,
  InjectModel,
} from '@nestjs/mongoose';

import {
  Document,
  Model,
  Types,
} from 'mongoose';

import { CreateLiveEventDto } from '../dto/create-live-event.dto';

import { MembersService } from '../../members/services/members.service';

import { MembershipDocument } from '../../members/schemas/membership.schema';

import { MembershipStatus } from '../../enums/membership-status.enum';

import { MemberRole } from '../../enums/member-role.enum';

/* ============================================================================
 * ENUMS
 * ========================================================================== */

export enum LiveEventVisibility {
  Public = 'public',
  Members = 'members',
  Private = 'private',
}

export enum LiveEventState {
  Scheduled = 'scheduled',
  Live = 'live',
  Ended = 'ended',
}

/* ============================================================================
 * DOCUMENT TYPE
 * ========================================================================== */

export type LiveEventDocument = LiveEvent & Document;

/* ============================================================================
 * LIVE EVENT SCHEMA
 * ========================================================================== */

@Schema({
  timestamps: true,
  collection: 'church_live_events',
})
export class LiveEvent {
  /* --------------------------------------------------------------------------
   * ORGANIZATION
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /* --------------------------------------------------------------------------
   * BRANCH
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Types.ObjectId,
    ref: 'Branch',
    default: null,
  })
  branchId?: Types.ObjectId | null;

  /* --------------------------------------------------------------------------
   * BASIC INFORMATION
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    type: String,
  })
  description?: string;

  /* --------------------------------------------------------------------------
   * VISIBILITY
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    enum: LiveEventVisibility,
    default: LiveEventVisibility.Members,
    index: true,
  })
  visibility!: LiveEventVisibility;

  /* --------------------------------------------------------------------------
   * STATE
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    enum: LiveEventState,
    default: LiveEventState.Scheduled,
    index: true,
  })
  state!: LiveEventState;

  /* --------------------------------------------------------------------------
   * SCHEDULE
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  scheduledStart!: Date;

  @Prop({
    type: Date,
    default: null,
  })
  actualStart?: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  endedAt?: Date | null;

  /* --------------------------------------------------------------------------
   * STREAM URL
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
  })
  streamUrl?: string | null;

  /* --------------------------------------------------------------------------
   * PLAYBACK URL
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
  })
  playbackUrl?: string | null;

  /* --------------------------------------------------------------------------
   * POSTER
   * ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    default: null,
  })
  posterUrl?: string | null;

  /* --------------------------------------------------------------------------
   * VIEWERS
   * ------------------------------------------------------------------------ */

  @Prop({
    type: Number,
    default: 0,
  })
  viewerCount!: number;

  /* --------------------------------------------------------------------------
   * INVITED GUESTS
   * ------------------------------------------------------------------------ */

  @Prop({
    type: [String],
    default: [],
  })
  invitedGuestEmails!: string[];

  /* --------------------------------------------------------------------------
   * TIMESTAMPS
   * ------------------------------------------------------------------------ */

  createdAt?: Date;
  updatedAt?: Date;
}

/* ============================================================================
 * MONGOOSE SCHEMA
 * ========================================================================== */

export const LiveEventSchema =
  SchemaFactory.createForClass(LiveEvent);

/* ============================================================================
 * SERVICE
 * ========================================================================== */

export interface ListLiveEventsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * Live scheduling/management is open to:
 *
 * - Administrators
 * - Pastors/Directors
 * - Leaders
 */
const LIVE_MANAGER_ROLES: MemberRole[] = [
  MemberRole.Administrator,
  MemberRole.PastorDirector,
  MemberRole.Leader,
];

/* ============================================================================
 * ROLE HELPER
 * ========================================================================== */

function isLiveManager(
  membership: MembershipDocument | null,
): boolean {
  return (
    !!membership &&
    LIVE_MANAGER_ROLES.includes(membership.role)
  );
}

/* ============================================================================
 * SERVICE
 * ========================================================================== */

@Injectable()
export class ChurchLiveService {
  constructor(
    @InjectModel(LiveEvent.name)
    private readonly liveEventModel: Model<LiveEventDocument>,

    private readonly membersService: MembersService,
  ) {}

  /* --------------------------------------------------------------------------
   * ACCESS CONTROL
   * ------------------------------------------------------------------------ */

  private hasAccess(
    doc: LiveEventDocument,
    viewer: MembershipDocument | null,
    viewerEmail?: string,
  ): boolean {
    /* PUBLIC */

    if (
      doc.visibility ===
      LiveEventVisibility.Public
    ) {
      return true;
    }

    /* MEMBERS */

    if (
      doc.visibility ===
      LiveEventVisibility.Members
    ) {
      return (
        !!viewer &&
        viewer.status === MembershipStatus.Active
      );
    }

    /* PRIVATE */

    if (isLiveManager(viewer)) {
      return true;
    }

    if (
      viewerEmail &&
      doc.invitedGuestEmails.includes(viewerEmail)
    ) {
      return true;
    }

    return false;
  }

  /* --------------------------------------------------------------------------
   * RESPONSE MAPPING
   * ------------------------------------------------------------------------ */

  private toResponse(
    doc: LiveEventDocument,
    viewer: MembershipDocument | null,
    viewerEmail?: string,
  ) {
    const manager =
      isLiveManager(viewer);

    const currentUserHasAccess =
      this.hasAccess(
        doc,
        viewer,
        viewerEmail,
      );

    return {
      id: String(doc._id),

      organizationId:
        String(doc.organizationId),

      branchId:
        doc.branchId
          ? String(doc.branchId)
          : null,

      title:
        doc.title,

      description:
        doc.description,

      visibility:
        doc.visibility,

      state:
        doc.state,

      scheduledStart:
        doc.scheduledStart,

      actualStart:
        doc.actualStart ?? null,

      endedAt:
        doc.endedAt ?? null,

      streamUrl:
        manager
          ? doc.streamUrl ?? null
          : undefined,

      playbackUrl:
        currentUserHasAccess
          ? doc.playbackUrl ?? null
          : null,

      posterUrl:
        doc.posterUrl ?? null,

      viewerCount:
        doc.viewerCount,

      currentUserHasAccess,

      invitedGuestEmails:
        manager
          ? doc.invitedGuestEmails
          : undefined,
    };
  }

  /* ==========================================================================
   * QUERIES
   * ======================================================================== */

  /**
   * List all live events belonging to an organization.
   */
  async listByOrganization(
    organizationId: string,
    query: ListLiveEventsQuery,
    viewerUserId?: string,
  ) {
    const page =
      query.page && query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize && query.pageSize > 0
        ? Math.min(query.pageSize, 100)
        : 20;

    const filter: Record<string, unknown> = {
      organizationId:
        new Types.ObjectId(
          organizationId,
        ),
    };

    if (query.search) {
      Object.assign(filter, {
        title: {
          $regex: query.search,
          $options: 'i',
        },
      });
    }

    const viewer =
      viewerUserId
        ? await this.membersService.getMembershipOrNull(
            organizationId,
            viewerUserId,
          )
        : null;

    const [docs, total] =
      await Promise.all([
        this.liveEventModel
          .find(filter)
          .sort({
            scheduledStart: -1,
          })
          .skip(
            (page - 1) * pageSize,
          )
          .limit(pageSize)
          .exec(),

        this.liveEventModel.countDocuments(
          filter,
        ),
      ]);

    const items = docs.map(
      (doc) =>
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

  /**
   * List upcoming scheduled live events.
   */
  async getUpcoming(
    organizationId: string,
    query: ListLiveEventsQuery,
    viewerUserId?: string,
  ) {
    const page =
      query.page && query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize && query.pageSize > 0
        ? Math.min(query.pageSize, 100)
        : 20;

    const filter: Record<string, unknown> = {
      organizationId:
        new Types.ObjectId(
          organizationId,
        ),

      state:
        LiveEventState.Scheduled,

      scheduledStart: {
        $gte: new Date(),
      },
    };

    if (query.search) {
      Object.assign(filter, {
        title: {
          $regex: query.search,
          $options: 'i',
        },
      });
    }

    const viewer =
      viewerUserId
        ? await this.membersService.getMembershipOrNull(
            organizationId,
            viewerUserId,
          )
        : null;

    const [docs, total] =
      await Promise.all([
        this.liveEventModel
          .find(filter)
          .sort({
            scheduledStart: 1,
          })
          .skip(
            (page - 1) * pageSize,
          )
          .limit(pageSize)
          .exec(),

        this.liveEventModel.countDocuments(
          filter,
        ),
      ]);

    const items = docs.map(
      (doc) =>
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

  /**
   * Get the currently live event for an organization.
   */
  async getCurrent(
    organizationId: string,
    viewerUserId?: string,
  ) {
    const doc =
      await this.liveEventModel
        .findOne({
          organizationId:
            new Types.ObjectId(
              organizationId,
            ),

          state:
            LiveEventState.Live,
        })
        .sort({
          actualStart: -1,
        })
        .exec();

    if (!doc) {
      return null;
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
   * MUTATIONS
   * ======================================================================== */

  /**
   * Create/schedule a live event.
   */
  async create(
    organizationId: string,
    dto: CreateLiveEventDto,
    actorUserId: string,
  ) {
    const actor =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    if (!isLiveManager(actor)) {
      throw new ForbiddenException(
        'You do not have permission to schedule live events.',
      );
    }

    const created =
      await this.liveEventModel.create({
        organizationId:
          new Types.ObjectId(
            organizationId,
          ),

        branchId:
          dto.branchId
            ? new Types.ObjectId(
                dto.branchId,
              )
            : null,

        title:
          dto.title,

        description:
          dto.description,

        visibility:
          dto.visibility,

        state:
          LiveEventState.Scheduled,

        scheduledStart:
          new Date(
            dto.scheduledStart,
          ),

        invitedGuestEmails:
          dto.invitedGuestEmails ?? [],
      });

    return this.toResponse(
      created,
      actor,
    );
  }

  /**
   * Update a scheduled/live event.
   */
  async update(
    organizationId: string,
    liveEventId: string,
    dto: Partial<CreateLiveEventDto>,
    actorUserId: string,
  ) {
    const actor =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    if (!isLiveManager(actor)) {
      throw new ForbiddenException(
        'You do not have permission to manage live events.',
      );
    }

    const doc =
      await this.findOrThrow(
        organizationId,
        liveEventId,
      );

    if (
      doc.state ===
      LiveEventState.Ended
    ) {
      throw new ConflictException(
        'This live event has already ended and can no longer be edited.',
      );
    }

    if (
      dto.title !== undefined
    ) {
      doc.title =
        dto.title;
    }

    if (
      dto.description !== undefined
    ) {
      doc.description =
        dto.description;
    }

    if (
      dto.visibility !== undefined
    ) {
      doc.visibility =
        dto.visibility;
    }

    if (
      dto.scheduledStart !== undefined
    ) {
      doc.scheduledStart =
        new Date(
          dto.scheduledStart,
        );
    }

    if (
      dto.branchId !== undefined
    ) {
      doc.branchId =
        dto.branchId
          ? new Types.ObjectId(
              dto.branchId,
            )
          : null;
    }

    if (
      dto.invitedGuestEmails !==
      undefined
    ) {
      doc.invitedGuestEmails =
        dto.invitedGuestEmails;
    }

    await doc.save();

    return this.toResponse(
      doc,
      actor,
    );
  }

  /**
   * Transition an event between scheduled/live/ended states.
   */
  async updateState(
    organizationId: string,
    liveEventId: string,
    state: LiveEventState,
    actorUserId: string,
  ) {
    const actor =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    if (!isLiveManager(actor)) {
      throw new ForbiddenException(
        'You do not have permission to manage live events.',
      );
    }

    const doc =
      await this.findOrThrow(
        organizationId,
        liveEventId,
      );

    /* START */

    if (
      state ===
      LiveEventState.Live
    ) {
      if (
        doc.state !==
        LiveEventState.Scheduled
      ) {
        throw new ConflictException(
          'Only a scheduled live event can be started.',
        );
      }

      doc.state =
        LiveEventState.Live;

      doc.actualStart =
        new Date();
    }

    /* END */

    else if (
      state ===
      LiveEventState.Ended
    ) {
      if (
        doc.state !==
        LiveEventState.Live
      ) {
        throw new ConflictException(
          'Only a live event that is currently broadcasting can be ended.',
        );
      }

      doc.state =
        LiveEventState.Ended;

      doc.endedAt =
        new Date();
    }

    /* OTHER STATE */

    else {
      doc.state =
        state;
    }

    await doc.save();

    return this.toResponse(
      doc,
      actor,
    );
  }

  /**
   * Remove a scheduled event.
   */
  async remove(
    organizationId: string,
    liveEventId: string,
    actorUserId: string,
  ): Promise<void> {
    const actor =
      await this.membersService.getMembershipOrNull(
        organizationId,
        actorUserId,
      );

    if (!isLiveManager(actor)) {
      throw new ForbiddenException(
        'You do not have permission to manage live events.',
      );
    }

    const doc =
      await this.findOrThrow(
        organizationId,
        liveEventId,
      );

    if (
      doc.state !==
      LiveEventState.Scheduled
    ) {
      throw new ConflictException(
        'Only a live event that has not started yet can be deleted.',
      );
    }

    await doc.deleteOne();
  }

  /* ==========================================================================
   * VIEWER
   * ======================================================================== */

  /**
   * Join a live service.
   *
   * Registers the viewer's access and increments viewer count while
   * the broadcast is live.
   */
  async join(
    organizationId: string,
    liveEventId: string,
    requesterUserId: string | undefined,
    options: {
      guestEmail?: string;
    },
  ) {
    const doc =
      await this.findOrThrow(
        organizationId,
        liveEventId,
      );

    if (
      doc.state ===
      LiveEventState.Scheduled
    ) {
      throw new ConflictException(
        'This live event has not started yet.',
      );
    }

    const viewer =
      requesterUserId
        ? await this.membersService.getMembershipOrNull(
            organizationId,
            requesterUserId,
          )
        : null;

    if (
      !this.hasAccess(
        doc,
        viewer,
        options.guestEmail,
      )
    ) {
      throw new ForbiddenException(
        'You do not have access to this live event.',
      );
    }

    if (
      doc.state ===
      LiveEventState.Live
    ) {
      doc.viewerCount =
        (doc.viewerCount ?? 0) + 1;

      await doc.save();
    }

    return {
      playbackUrl:
        doc.playbackUrl ?? '',

      state:
        doc.state,
    };
  }

  /* ==========================================================================
   * HELPERS
   * ======================================================================== */

  /**
   * Find an event belonging to a specific organization.
   */
  private async findOrThrow(
    organizationId: string,
    liveEventId: string,
  ): Promise<LiveEventDocument> {
    const doc =
      await this.liveEventModel.findOne({
        _id:
          new Types.ObjectId(
            liveEventId,
          ),

        organizationId:
          new Types.ObjectId(
            organizationId,
          ),
      });

    if (!doc) {
      throw new NotFoundException(
        'Live event not found.',
      );
    }

    return doc;
  }

  /**
   * Used by OrganizationsService when an organization is deleted.
   */
  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    await this.liveEventModel.deleteMany({
      organizationId:
        new Types.ObjectId(
          organizationId,
        ),
    });
  }
}