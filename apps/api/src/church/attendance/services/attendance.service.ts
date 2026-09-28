/**
 * attendance.service.ts
 * -----------------------------------------------------------------------------
 * Business logic for Church Attendance.
 *
 * Handles:
 *   - Attendance check-ins
 *   - Absence reports
 *   - Attendance history
 *   - Attendance summaries
 *   - Organization cleanup
 *
 * Authorization model:
 *   - Personal attendance:
 *       Active non-Guest membership.
 *
 *   - Organization-wide attendance viewing:
 *       ChurchPermission.ViewAttendance
 *
 *   - Recording attendance:
 *       ChurchPermission.ManageAttendance
 *
 * Attendance records are scoped to an organization and reference:
 *   - ChurchEvent
 *   - Membership
 *
 * Check-ins and absence reports are stored as AttendanceEntry documents.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  AttendanceEntry,
  AttendanceEntryDocument,
  AttendanceEntryKind,
  AbsenceReasonCategory,
} from "../schemas/attendance.schema";

import {
  RecordAttendanceDto,
} from "../dto/record-attendance.dto";

import {
  AttendanceType,
} from "../../enums/attendance-type.enum";

import {
  MembershipStatus,
} from "../../enums/membership-status.enum";

import {
  ChurchPermission,
} from "../../enums/permission.enum";

import {
  ChurchEvent,
  ChurchEventDocument,
} from "../../events/schemas/church-event.schema";

import {
  Membership,
  MembershipDocument,
} from "../../members/schemas/membership.schema";

import {
  MembersService,
} from "../../members/services/members.service";

/* ============================================================================
   QUERY TYPES
============================================================================ */

export interface ListAttendanceQuery {
  page?: number;
  pageSize?: number;
  eventId?: string;
  memberId?: string;
  attendanceType?: AttendanceType;
  from?: string;
  to?: string;
}

export interface ListSummariesQuery {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceEntry.name)
    private readonly attendanceModel: Model<AttendanceEntryDocument>,

    @InjectModel(ChurchEvent.name)
    private readonly eventModel: Model<ChurchEventDocument>,

    @InjectModel(Membership.name)
    private readonly membershipModel: Model<MembershipDocument>,

    private readonly membersService: MembersService,
  ) {}

  /* ==========================================================================
     VALIDATION HELPERS
  ========================================================================== */

  private toObjectId(
    value: string,
    fieldName: string,
  ): Types.ObjectId {
    if (!value || !Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `Invalid ${fieldName}.`,
      );
    }

    return new Types.ObjectId(value);
  }

  private parseDate(
    value: string,
    fieldName: string,
  ): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `Invalid ${fieldName}.`,
      );
    }

    return date;
  }

  private buildDateRange(
    from?: string,
    to?: string,
  ): Record<string, Date> | undefined {
    if (!from && !to) {
      return undefined;
    }

    const range: Record<string, Date> = {};

    if (from) {
      range.$gte = this.parseDate(
        from,
        "from date",
      );
    }

    if (to) {
      range.$lte = this.parseDate(
        to,
        "to date",
      );
    }

    if (
      range.$gte &&
      range.$lte &&
      range.$gte.getTime() > range.$lte.getTime()
    ) {
      throw new BadRequestException(
        "The from date cannot be later than the to date.",
      );
    }

    return range;
  }

  /* ==========================================================================
     RESPONSE MAPPING
  ========================================================================== */

  private async toRecordResponse(
    doc: AttendanceEntryDocument,
  ) {
    const [event, recordedBy] =
      await Promise.all([
        this.eventModel
          .findById(
            doc.eventId,
            {
              title: 1,
            },
          )
          .lean(),

        doc.recordedById
          ? this.membershipModel
              .findById(
                doc.recordedById,
                {
                  profile: 1,
                  userId: 1,
                },
              )
              .lean()
          : null,
      ]);

    const recordedByData =
      recordedBy as
        | {
            userId?: unknown;
            profile?: {
              displayName?: string;
              avatarUrl?: string | null;
            };
          }
        | null;

    const eventData =
      event as
        | {
            title?: string;
          }
        | null;

    return {
      id: String(doc._id),

      organizationId:
        String(doc.organizationId),

      eventId:
        String(doc.eventId),

      eventTitle:
        eventData?.title ?? "",

      memberId:
        String(doc.memberId),

      attendanceType:
        doc.attendanceType as AttendanceType,

      checkedInAt:
        doc.occurredAt,

      recordedBy: recordedByData
        ? {
            id: String(
              recordedByData.userId,
            ),

            displayName:
              recordedByData.profile
                ?.displayName ?? "",

            avatarUrl:
              recordedByData.profile
                ?.avatarUrl ?? null,
          }
        : undefined,
    };
  }

  /* ==========================================================================
     ABSENCE RESPONSE
  ========================================================================== */

  private toAbsenceReportResponse(
    doc: AttendanceEntryDocument,
  ) {
    return {
      id: String(doc._id),

      organizationId:
        String(doc.organizationId),

      eventId:
        String(doc.eventId),

      memberId:
        String(doc.memberId),

      reasonCategory:
        doc.reasonCategory as AbsenceReasonCategory,

      note:
        doc.note ?? null,

      submittedAt:
        doc.occurredAt,
    };
  }

  /* ==========================================================================
     LIST ATTENDANCE
  ========================================================================== */

  async listAttendance(
    organizationId: string,
    query: ListAttendanceQuery = {},
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        "organization ID",
      );

    const page =
      query.page && query.page > 0
        ? Math.floor(query.page)
        : 1;

    const pageSize =
      query.pageSize &&
      query.pageSize > 0
        ? Math.min(
            Math.floor(query.pageSize),
            100,
          )
        : 20;

    const filter: Record<
      string,
      unknown
    > = {
      organizationId:
        organizationObjectId,

      kind:
        AttendanceEntryKind.CheckIn,
    };

    if (query.eventId) {
      filter.eventId =
        this.toObjectId(
          query.eventId,
          "event ID",
        );
    }

    if (query.memberId) {
      filter.memberId =
        this.toObjectId(
          query.memberId,
          "member ID",
        );
    }

    if (query.attendanceType) {
      filter.attendanceType =
        query.attendanceType;
    }

    const dateRange =
      this.buildDateRange(
        query.from,
        query.to,
      );

    if (dateRange) {
      filter.occurredAt =
        dateRange;
    }

    const [docs, total] =
      await Promise.all([
        this.attendanceModel
          .find(filter)
          .sort({
            occurredAt: -1,
          })
          .skip(
            (page - 1) *
              pageSize,
          )
          .limit(pageSize)
          .exec(),

        this.attendanceModel
          .countDocuments(filter),
      ]);

    const items =
      await Promise.all(
        docs.map((doc) =>
          this.toRecordResponse(
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
        page * pageSize <
        total,
    };
  }

  /* ==========================================================================
     MY ATTENDANCE HISTORY
  ========================================================================== */

  async getMyAttendanceHistory(
    organizationId: string,
    userId: string,
    query: ListAttendanceQuery = {},
  ) {
    const membership =
      await this.membersService
        .requireAttendanceAccess(
          organizationId,
          userId,
        );

    const page =
      query.page && query.page > 0
        ? Math.floor(query.page)
        : 1;

    const pageSize =
      query.pageSize &&
      query.pageSize > 0
        ? Math.min(
            Math.floor(query.pageSize),
            100,
          )
        : 20;

    return this.listAttendance(
      organizationId,
      {
        ...query,
        memberId:
          String(
            membership._id,
          ),
      },
    );
  }

  /* ==========================================================================
     ATTENDANCE SUMMARIES
  ========================================================================== */

  async getSummaries(
    organizationId: string,
    query: ListSummariesQuery = {},
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        "organization ID",
      );

    const page =
      query.page && query.page > 0
        ? Math.floor(query.page)
        : 1;

    const pageSize =
      query.pageSize &&
      query.pageSize > 0
        ? Math.min(
            Math.floor(query.pageSize),
            100,
          )
        : 20;

    const eventFilter: Record<
      string,
      unknown
    > = {
      organizationId:
        organizationObjectId,
    };

    const dateRange =
      this.buildDateRange(
        query.from,
        query.to,
      );

    if (dateRange) {
      eventFilter.startsAt =
        dateRange;
    }

    const [
      events,
      total,
      totalExpected,
    ] = await Promise.all([
      this.eventModel
        .find(eventFilter)
        .sort({
          startsAt: -1,
        })
        .skip(
          (page - 1) *
            pageSize,
        )
        .limit(pageSize)
        .exec(),

      this.eventModel
        .countDocuments(
          eventFilter,
        ),

      this.membershipModel
        .countDocuments({
          organizationId:
            organizationObjectId,

          status:
            MembershipStatus.Active,
        }),
    ]);

    const items =
      await Promise.all(
        events.map(
          async (event) => {
            const [
              inPersonCount,
              onlineCount,
              absenceCount,
            ] =
              await Promise.all([
                this.attendanceModel
                  .countDocuments({
                    organizationId:
                      organizationObjectId,

                    eventId:
                      event._id,

                    kind:
                      AttendanceEntryKind.CheckIn,

                    attendanceType:
                      AttendanceType.InPerson,
                  }),

                this.attendanceModel
                  .countDocuments({
                    organizationId:
                      organizationObjectId,

                    eventId:
                      event._id,

                    kind:
                      AttendanceEntryKind.CheckIn,

                    attendanceType:
                      AttendanceType.Online,
                  }),

                this.attendanceModel
                  .countDocuments({
                    organizationId:
                      organizationObjectId,

                    eventId:
                      event._id,

                    kind:
                      AttendanceEntryKind.AbsenceReport,
                  }),
              ]);

            return {
              eventId:
                String(
                  event._id,
                ),

              eventTitle:
                event.title,

              startsAt:
                event.startsAt,

              inPersonCount,

              onlineCount,

              absenceCount,

              totalExpected,
            };
          },
        ),
      );

    return {
      items,
      total,
      page,
      pageSize,
      hasMore:
        page * pageSize <
        total,
    };
  }

  /* ==========================================================================
     RECORD ATTENDANCE
  ========================================================================== */

  async recordAttendance(
    organizationId: string,
    dto: RecordAttendanceDto,
    actorUserId: string,
  ) {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        "organization ID",
      );

    const eventObjectId =
      this.toObjectId(
        dto.eventId,
        "event ID",
      );

    const memberObjectId =
      this.toObjectId(
        dto.memberId,
        "member ID",
      );

    /*
     * Attendance recording is a management operation.
     *
     * The MembersService handles:
     *   - organization ownership
     *   - active membership
     *   - permission checks
     *   - owner bypass
     */
    const actor =
      await this.membersService
        .requirePermission(
          organizationId,
          actorUserId,
          ChurchPermission.ManageAttendance,
        );

    const target =
      await this.membersService
        .getMembershipByIdOrNull(
          organizationId,
          dto.memberId,
        );

    if (!target) {
      throw new NotFoundException(
        "Member not found.",
      );
    }

    if (
      target.status !==
      MembershipStatus.Active
    ) {
      throw new BadRequestException(
        "Attendance can only be recorded for an active member.",
      );
    }

    const event =
      await this.eventModel.findOne({
        _id: eventObjectId,

        organizationId:
          organizationObjectId,
      });

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    const doc =
      await this.attendanceModel
        .findOneAndUpdate(
          {
            organizationId:
              organizationObjectId,

            eventId:
              eventObjectId,

            memberId:
              memberObjectId,

            kind:
              AttendanceEntryKind.CheckIn,
          },

          {
            $set: {
              attendanceType:
                dto.attendanceType,

              recordedById:
                actor._id,

              occurredAt:
                new Date(),
            },
          },

          {
            new: true,
            upsert: true,
          },
        )
        .exec();

    if (!doc) {
      throw new NotFoundException(
        "Attendance record could not be created.",
      );
    }

    return this.toRecordResponse(
      doc,
    );
  }

  /* ==========================================================================
     SUBMIT ABSENCE REPORT
  ========================================================================== */

  async submitAbsenceReport(
    organizationId: string,
    eventId: string,
    reasonCategory: AbsenceReasonCategory,
    note: string | undefined,
    requesterUserId: string,
  ) {
    const membership =
      await this.membersService
        .requireAttendanceAccess(
          organizationId,
          requesterUserId,
        );

    const organizationObjectId =
      this.toObjectId(
        organizationId,
        "organization ID",
      );

    const eventObjectId =
      this.toObjectId(
        eventId,
        "event ID",
      );

    const event =
      await this.eventModel.findOne({
        _id: eventObjectId,

        organizationId:
          organizationObjectId,
      });

    if (!event) {
      throw new NotFoundException(
        "Event not found.",
      );
    }

    const doc =
      await this.attendanceModel
        .findOneAndUpdate(
          {
            organizationId:
              organizationObjectId,

            eventId:
              eventObjectId,

            memberId:
              membership._id,

            kind:
              AttendanceEntryKind.AbsenceReport,
          },

          {
            $set: {
              reasonCategory,

              note,

              occurredAt:
                new Date(),
            },
          },

          {
            new: true,
            upsert: true,
          },
        )
        .exec();

    if (!doc) {
      throw new NotFoundException(
        "Absence report could not be created.",
      );
    }

    return this.toAbsenceReportResponse(
      doc,
    );
  }

  /* ==========================================================================
     DELETE ORGANIZATION ATTENDANCE
  ========================================================================== */

  async deleteAllForOrganization(
    organizationId: string,
  ): Promise<void> {
    const organizationObjectId =
      this.toObjectId(
        organizationId,
        "organization ID",
      );

    await this.attendanceModel.deleteMany({
      organizationId:
        organizationObjectId,
    });
  }
}