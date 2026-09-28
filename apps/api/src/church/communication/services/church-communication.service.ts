/**
 * church-communication.service.ts
 * -----------------------------------------------------------------------------
 * Business logic for the Communication area:
 *
 * - Announcements
 * - Messages
 * - Department Messages
 * - Notifications
 *
 * Author/sender identities are resolved through the Membership collection.
 * -----------------------------------------------------------------------------
 */

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Announcement,
  AnnouncementDocument,
  ChurchMessage,
  ChurchMessageDocument,
  ChurchNotification,
  ChurchNotificationDocument,
} from '../schemas/announcement.schema';

import { CreateAnnouncementDto } from '../dto/create-announcement.dto';

import {
  Membership,
  MembershipDocument,
} from '../../members/schemas/membership.schema';

import { MembersService } from '../../members/services/members.service';

import { ADMIN_MEMBER_ROLES } from '../../enums/member-role.enum';

/* ============================================================================
   PAGINATION
   ========================================================================== */

export interface PageQuery {
  page?: number;
  pageSize?: number;
}

/* ============================================================================
   SERVICE
   ========================================================================== */

@Injectable()
export class ChurchCommunicationService {
  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,

    @InjectModel(ChurchMessage.name)
    private readonly messageModel: Model<ChurchMessageDocument>,

    @InjectModel(ChurchNotification.name)
    private readonly notificationModel: Model<ChurchNotificationDocument>,

    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,

    private readonly membersService: MembersService,
  ) {}

  /* ==========================================================================
     RESPONSE MAPPING
     ========================================================================== */

  private async toAnnouncementResponse(
    doc: AnnouncementDocument,
  ) {
    const author =
      await this.membershipModel
        .findById(
          doc.authorId,
          {
            profile: 1,
            userId: 1,
          },
        )
        .lean();

    return {
      id: String(doc._id),

      organizationId: String(
        doc.organizationId,
      ),

      title: doc.title,

      body: doc.body,

      audience: doc.audience,

      departmentId:
        doc.departmentId
          ? String(doc.departmentId)
          : null,

      groupId:
        doc.groupId
          ? String(doc.groupId)
          : null,

      author: author
        ? {
            id: String(
              (author as any).userId,
            ),

            displayName:
              (author as any)
                .profile
                ?.displayName,

            avatarUrl:
              (author as any)
                .profile
                ?.avatarUrl ??
              null,
          }
        : undefined,

      pinned:
        doc.pinned ?? false,

      publishedAt:
        doc.publishedAt,
    };
  }

  private async toMessageResponse(
    doc: ChurchMessageDocument,
  ) {
    const sender =
      await this.membershipModel
        .findById(
          doc.senderId,
          {
            profile: 1,
            userId: 1,
          },
        )
        .lean();

    return {
      id: String(doc._id),

      organizationId: String(
        doc.organizationId,
      ),

      threadId: doc.threadId,

      sender: sender
        ? {
            id: String(
              (sender as any).userId,
            ),

            displayName:
              (sender as any)
                .profile
                ?.displayName,

            avatarUrl:
              (sender as any)
                .profile
                ?.avatarUrl ??
              null,
          }
        : {
            id: String(doc.senderId),
            displayName: 'Unknown',
          },

      body: doc.body,

      sentAt: doc.sentAt,

      readAt:
        doc.readAt ?? null,

      departmentId:
        doc.departmentId
          ? String(doc.departmentId)
          : undefined,
    };
  }

  private toNotificationResponse(
    doc: ChurchNotificationDocument,
  ) {
    return {
      id: String(doc._id),

      organizationId:
        doc.organizationId
          ? String(doc.organizationId)
          : undefined,

      title: doc.title,

      body: doc.body,

      category: doc.category,

      linkPath: doc.linkPath,

      isRead: doc.isRead,

      createdAt: doc.createdAt,
    };
  }

  /* ==========================================================================
     ANNOUNCEMENTS
     ========================================================================== */

  async listAnnouncements(
    organizationId: string,
    query: PageQuery,
  ) {
    const page =
      query.page &&
      query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize &&
      query.pageSize > 0
        ? Math.min(
            query.pageSize,
            100,
          )
        : 20;

    const filter = {
      organizationId:
        new Types.ObjectId(
          organizationId,
        ),
    };

    const [
      docs,
      total,
    ] = await Promise.all([
      this.announcementModel
        .find(filter)
        .sort({
          pinned: -1,
          publishedAt: -1,
        })
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(pageSize)
        .exec(),

      this.announcementModel
        .countDocuments(filter),
    ]);

    const items =
      await Promise.all(
        docs.map(
          (doc) =>
            this.toAnnouncementResponse(
              doc,
            ),
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

  async createAnnouncement(
    organizationId: string,
    dto: CreateAnnouncementDto,
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
      await this.announcementModel.create(
        {
          organizationId:
            new Types.ObjectId(
              organizationId,
            ),

          title: dto.title,

          body: dto.body,

          audience: dto.audience,

          departmentId:
            dto.departmentId
              ? new Types.ObjectId(
                  dto.departmentId,
                )
              : null,

          groupId:
            dto.groupId
              ? new Types.ObjectId(
                  dto.groupId,
                )
              : null,

          authorId: actor!._id,

          pinned:
            dto.pinned ?? false,
        },
      );

    return this.toAnnouncementResponse(
      created,
    );
  }

  async deleteAnnouncement(
    organizationId: string,
    announcementId: string,
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
      await this.announcementModel.deleteOne(
        {
          _id:
            new Types.ObjectId(
              announcementId,
            ),

          organizationId:
            new Types.ObjectId(
              organizationId,
            ),
        },
      );

    if (
      result.deletedCount === 0
    ) {
      throw new NotFoundException(
        'Announcement not found.',
      );
    }
  }

  /* ==========================================================================
     MESSAGES
     ========================================================================== */

  /**
   * The current user's own direct-message thread.
   */
  async listMessages(
    organizationId: string,
    viewerUserId: string,
    query: PageQuery,
  ) {
    const page =
      query.page &&
      query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize &&
      query.pageSize > 0
        ? Math.min(
            query.pageSize,
            100,
          )
        : 20;

    const membership =
      await this.membersService
        .requireActiveMembership(
          organizationId,
          viewerUserId,
        );

    const filter = {
      organizationId:
        new Types.ObjectId(
          organizationId,
        ),

      departmentId: null,

      threadId:
        String(membership._id),
    };

    const [
      docs,
      total,
    ] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({
          sentAt: -1,
        })
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(pageSize)
        .exec(),

      this.messageModel
        .countDocuments(filter),
    ]);

    const items =
      await Promise.all(
        docs.map(
          (doc) =>
            this.toMessageResponse(
              doc,
            ),
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
     DEPARTMENT MESSAGES
     ========================================================================== */

  /**
   * Messages scoped to departments the current user belongs to.
   *
   * Administrators can see messages from all departments.
   */
  async listDepartmentMessages(
    organizationId: string,
    viewerUserId: string,
    query: PageQuery,
  ) {
    const page =
      query.page &&
      query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize &&
      query.pageSize > 0
        ? Math.min(
            query.pageSize,
            100,
          )
        : 20;

    const membership =
      await this.membersService
        .requireActiveMembership(
          organizationId,
          viewerUserId,
        );

    const isAdmin =
      ADMIN_MEMBER_ROLES.includes(
        membership.role,
      );

    const filter: {
      organizationId: Types.ObjectId;
      departmentId:
        | { $ne: null }
        | {
            $in: Types.ObjectId[];
          };
    } = {
      organizationId:
        new Types.ObjectId(
          organizationId,
        ),

      departmentId: {
        $ne: null,
      },
    };

    if (!isAdmin) {
      filter.departmentId = {
        $in:
          membership.departmentIds ??
          [],
      };
    }

    const [
      docs,
      total,
    ] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({
          sentAt: -1,
        })
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(pageSize)
        .exec(),

      this.messageModel
        .countDocuments(filter),
    ]);

    const items =
      await Promise.all(
        docs.map(
          (doc) =>
            this.toMessageResponse(
              doc,
            ),
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
     NOTIFICATIONS
     ========================================================================== */

  async listNotifications(
    organizationId: string,
    viewerUserId: string,
    query: PageQuery,
  ) {
    const page =
      query.page &&
      query.page > 0
        ? query.page
        : 1;

    const pageSize =
      query.pageSize &&
      query.pageSize > 0
        ? Math.min(
            query.pageSize,
            100,
          )
        : 20;

    const membership =
      await this.membersService
        .requireActiveMembership(
          organizationId,
          viewerUserId,
        );

    const filter = {
      recipientId:
        membership._id,
    };

    const [
      docs,
      total,
    ] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(pageSize)
        .exec(),

      this.notificationModel
        .countDocuments(filter),
    ]);

    const items =
      docs.map(
        (doc) =>
          this.toNotificationResponse(
            doc,
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
     MARK NOTIFICATION READ
     ========================================================================== */

  async markNotificationRead(
    organizationId: string,
    notificationId: string,
    viewerUserId: string,
  ): Promise<void> {
    const membership =
      await this.membersService
        .requireActiveMembership(
          organizationId,
          viewerUserId,
        );

    const doc =
      await this.notificationModel.findOne(
        {
          _id:
            new Types.ObjectId(
              notificationId,
            ),

          recipientId:
            membership._id,
        },
      );

    if (!doc) {
      throw new NotFoundException(
        'Notification not found.',
      );
    }

    doc.isRead = true;

    await doc.save();
  }

  /* ==========================================================================
     DELETE ALL ORGANIZATION COMMUNICATION DATA
     ========================================================================== */

  /**
   * Used by OrganizationsService when an organization is deleted.
   */
  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    const orgId =
      new Types.ObjectId(
        organizationId,
      );

    await Promise.all([
      this.announcementModel.deleteMany(
        {
          organizationId: orgId,
        },
      ),

      this.messageModel.deleteMany(
        {
          organizationId: orgId,
        },
      ),

      this.notificationModel.deleteMany(
        {
          organizationId: orgId,
        },
      ),
    ]);
  }
}