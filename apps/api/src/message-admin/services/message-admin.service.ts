import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { InjectConnection } from '@nestjs/mongoose';

import {
  Connection,
  Types,
} from 'mongoose';

@Injectable()
export class MessageAdminService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  // ==========================================================================
  // DATABASE
  // ==========================================================================

  private getDb() {
    const db = this.connection.db;

    if (!db) {
      throw new Error(
        'MongoDB database connection is not available.',
      );
    }

    return db;
  }

  private getCollection(
    name: string,
  ) {
    return this.getDb().collection(name);
  }

  // ==========================================================================
  // DASHBOARD STATISTICS
  // ==========================================================================

  async getStats() {
    const usersCollection =
      this.getCollection('users');

    const messagesCollection =
      this.getCollection('messages');

    const conversationsCollection =
      this.getCollection(
        'conversations',
      );

    const reportsCollection =
      this.getCollection(
        'message_reports',
      );

    const callsCollection =
      this.getCollection('calls');

    const startOfToday =
      new Date();

    startOfToday.setHours(
      0,
      0,
      0,
      0,
    );

    const [
      totalUsers,
      usersWithFockisId,
      totalMessages,
      activeConversations,
      reportedMessages,
      activeCalls,
      messagesToday,
    ] = await Promise.all([
      // ----------------------------------------------------------------------
      // TOTAL USERS
      // ----------------------------------------------------------------------

      usersCollection.countDocuments(),

      // ----------------------------------------------------------------------
      // USERS WITH FOCKIS ID
      // ----------------------------------------------------------------------

      usersCollection.countDocuments({
        fockisId: {
          $exists: true,
          $nin: [
            null,
            '',
          ],
        },
      }),

      // ----------------------------------------------------------------------
      // TOTAL MESSAGES
      // ----------------------------------------------------------------------

      messagesCollection.countDocuments(),

      // ----------------------------------------------------------------------
      // ACTIVE CONVERSATIONS
      // ----------------------------------------------------------------------

      conversationsCollection.countDocuments({
        isActive: {
          $ne: false,
        },
      }),

      // ----------------------------------------------------------------------
      // PENDING REPORTS
      // ----------------------------------------------------------------------

      reportsCollection.countDocuments({
        status: 'pending',
      }),

      // ----------------------------------------------------------------------
      // ACTIVE CALLS
      // ----------------------------------------------------------------------

      callsCollection.countDocuments({
        status: {
          $in: [
            'ringing',
            'connecting',
            'active',
          ],
        },
      }),

      // ----------------------------------------------------------------------
      // MESSAGES TODAY
      // ----------------------------------------------------------------------

      messagesCollection.countDocuments({
        createdAt: {
          $gte: startOfToday,
        },
      }),
    ]);

    return {
      totalUsers,
      usersWithFockisId,
      activeConversations,
      totalMessages,
      messagesToday,
      activeCalls,
      reportedMessages,
    };
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  async getUsers(options?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(
      Number(
        options?.page ?? 1,
      ),
      1,
    );

    const limit = Math.min(
      Math.max(
        Number(
          options?.limit ?? 50,
        ),
        1,
      ),
      200,
    );

    const skip =
      (page - 1) * limit;

    const usersCollection =
      this.getCollection('users');

    const filter: Record<
      string,
      unknown
    > = {};

    // ------------------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------------------

    if (
      options?.search &&
      options.search.trim()
    ) {
      const search =
        options.search.trim();

      filter.$or = [
        {
          username: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          userName: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          displayName: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          email: {
            $regex: search,
            $options: 'i',
          },
        },
        {
          fockisId: {
            $regex: search,
            $options: 'i',
          },
        },
      ];
    }

    const [
      users,
      total,
    ] = await Promise.all([
      usersCollection
        .find(filter)
        .project({
          password: 0,
          passwordHash: 0,
          refreshToken: 0,
          refreshTokens: 0,
        })
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .toArray(),

      usersCollection.countDocuments(
        filter,
      ),
    ]);

    return {
      users: users.map(
        (user) => ({
          id: String(
            user._id,
          ),

          username:
            user.username ??
            user.userName ??
            null,

          displayName:
            user.displayName ??
            user.name ??
            null,

          email:
            user.email ??
            null,

          fockisId:
            user.fockisId ??
            null,

          isActive:
            user.isActive !== false,

          isBlocked:
            user.isBlocked === true,

          lastSeenAt:
            user.lastSeenAt ??
            user.updatedAt ??
            null,

          createdAt:
            user.createdAt ??
            null,
        }),
      ),

      pagination: {
        page,
        limit,
        total,
        pages:
          Math.ceil(
            total / limit,
          ),
      },
    };
  }

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  async getReports(options?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = Math.max(
      Number(
        options?.page ?? 1,
      ),
      1,
    );

    const limit = Math.min(
      Math.max(
        Number(
          options?.limit ?? 50,
        ),
        1,
      ),
      200,
    );

    const skip =
      (page - 1) * limit;

    const reportsCollection =
      this.getCollection(
        'message_reports',
      );

    const filter: Record<
      string,
      unknown
    > = {};

    if (
      options?.status &&
      options.status.trim()
    ) {
      filter.status =
        options.status.trim();
    }

    const [
      reports,
      total,
    ] = await Promise.all([
      reportsCollection
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .toArray(),

      reportsCollection.countDocuments(
        filter,
      ),
    ]);

    return {
      reports: reports.map(
        (report) => ({
          id: String(
            report._id,
          ),

          reporterId:
            report.reporterId
              ? String(
                  report.reporterId,
                )
              : null,

          reportedUserId:
            report.reportedUserId
              ? String(
                  report.reportedUserId,
                )
              : null,

          messageId:
            report.messageId
              ? String(
                  report.messageId,
                )
              : null,

          conversationId:
            report.conversationId ??
            null,

          reason:
            report.reason ??
            'other',

          description:
            report.description ??
            null,

          messageSnapshot:
            report.messageSnapshot ??
            null,

          status:
            report.status ??
            'pending',

          adminNote:
            report.adminNote ??
            null,

          createdAt:
            report.createdAt ??
            null,

          reviewedAt:
            report.reviewedAt ??
            null,
        }),
      ),

      pagination: {
        page,
        limit,
        total,
        pages:
          Math.ceil(
            total / limit,
          ),
      },
    };
  }

  // ==========================================================================
  // UPDATE REPORT
  // ==========================================================================

  async updateReport(
    reportId: string,
    data: {
      status?: string;
      adminNote?: string;
      reviewedBy?: string;
    },
  ) {
    // ------------------------------------------------------------------------
    // VALIDATE REPORT ID
    // ------------------------------------------------------------------------

    if (
      !Types.ObjectId.isValid(
        reportId,
      )
    ) {
      throw new BadRequestException(
        'Invalid message report ID.',
      );
    }

    const reportsCollection =
      this.getCollection(
        'message_reports',
      );

    const update: Record<
      string,
      unknown
    > = {
      updatedAt:
        new Date(),
    };

    // ------------------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------------------

    if (
      data.status !== undefined
    ) {
      update.status =
        data.status;
    }

    // ------------------------------------------------------------------------
    // ADMIN NOTE
    // ------------------------------------------------------------------------

    if (
      data.adminNote !== undefined
    ) {
      update.adminNote =
        data.adminNote;
    }

    // ------------------------------------------------------------------------
    // REVIEWER
    // ------------------------------------------------------------------------

    if (
      data.reviewedBy !== undefined
    ) {
      if (
        !Types.ObjectId.isValid(
          data.reviewedBy,
        )
      ) {
        throw new BadRequestException(
          'Invalid reviewer ID.',
        );
      }

      update.reviewedBy =
        new Types.ObjectId(
          data.reviewedBy,
        );

      update.reviewedAt =
        new Date();
    }

    // ------------------------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------------------------

    const result =
      await reportsCollection.findOneAndUpdate(
        {
          _id:
            new Types.ObjectId(
              reportId,
            ),
        },
        {
          $set: update,
        },
        {
          returnDocument:
            'after',
        },
      );

    if (!result) {
      return null;
    }

    // ------------------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------------------

    return {
      id: String(
        result._id,
      ),

      reporterId:
        result.reporterId
          ? String(
              result.reporterId,
            )
          : null,

      reportedUserId:
        result.reportedUserId
          ? String(
              result.reportedUserId,
            )
          : null,

      messageId:
        result.messageId
          ? String(
              result.messageId,
            )
          : null,

      conversationId:
        result.conversationId ??
        null,

      reason:
        result.reason ??
        'other',

      description:
        result.description ??
        null,

      messageSnapshot:
        result.messageSnapshot ??
        null,

      status:
        result.status ??
        'pending',

      adminNote:
        result.adminNote ??
        null,

      createdAt:
        result.createdAt ??
        null,

      reviewedAt:
        result.reviewedAt ??
        null,
    };
  }
}
