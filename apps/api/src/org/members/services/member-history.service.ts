/**
 * member-history.service.ts
 * -----------------------------------------------------------------------------
 * "My history" in the member portal: one call that gathers, for the signed-in
 * member of one organization,
 *
 *   - membership: status, role, requested / joined dates, status & role changes
 *   - groups and departments they belong to
 *   - attendance (check-ins and absence reports), newest first
 *   - visit requests they sent to this organization
 *
 * Read-only. It only reads data other services already write.
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Membership } from '../schemas/membership.schema';
import { ChurchGroup } from '../../groups/schemas/church-group.schema';
import { Department } from '../../departments/schemas/department.schema';
import { AttendanceEntry } from '../../attendance/schemas/attendance.schema';
import { ChurchEvent } from '../../events/schemas/church-event.schema';
import { Organization } from '../../organizations/schemas/organization.schema';
import { OrganizationVisitsService } from '../../visits/services/organization-visits.service';

type Named = { _id: Types.ObjectId; name?: string; title?: string };

@Injectable()
export class MemberHistoryService {
  constructor(
    @InjectModel(Membership.name) private readonly membershipModel: Model<any>,
    @InjectModel(ChurchGroup.name) private readonly groupModel: Model<any>,
    @InjectModel(Department.name) private readonly departmentModel: Model<any>,
    @InjectModel(AttendanceEntry.name) private readonly attendanceModel: Model<any>,
    @InjectModel(ChurchEvent.name) private readonly eventModel: Model<any>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<any>,
    private readonly visits: OrganizationVisitsService,
  ) {}

  private oid(id: string, what: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(id);
  }

  async forMe(organizationId: string, userId: string) {
    const orgId = this.oid(organizationId, 'organization ID');
    const uid = this.oid(userId, 'user ID');

    const [organization, membership] = await Promise.all([
      this.organizationModel.findById(orgId).select('name organizationType logoUrl').lean<any>().exec(),
      this.membershipModel.findOne({ organizationId: orgId, userId: uid }).lean<any>().exec(),
    ]);
    if (!organization) throw new NotFoundException('Organization not found.');

    const visits = await this.visits.mine(userId, organizationId);

    if (!membership) {
      return {
        organization: { id: String(organization._id), name: organization.name, organizationType: organization.organizationType ?? null },
        membership: null,
        groups: [],
        departments: [],
        attendance: [],
        attendanceSummary: { checkIns: 0, absences: 0, lastCheckIn: null },
        visits,
      };
    }

    const groupIds: Types.ObjectId[] = membership.groupIds ?? [];
    const departmentIds: Types.ObjectId[] = membership.departmentIds ?? [];

    const [groups, departments, attendance, checkIns, absences] = await Promise.all([
      groupIds.length
        ? this.groupModel.find({ _id: { $in: groupIds } }).select('name').lean<Named[]>().exec()
        : Promise.resolve([] as Named[]),
      departmentIds.length
        ? this.departmentModel.find({ _id: { $in: departmentIds } }).select('name').lean<Named[]>().exec()
        : Promise.resolve([] as Named[]),
      this.attendanceModel
        .find({ organizationId: orgId, memberId: membership._id })
        .sort({ occurredAt: -1 })
        .limit(100)
        .lean<any[]>()
        .exec(),
      this.attendanceModel.countDocuments({ organizationId: orgId, memberId: membership._id, kind: 'check_in' }),
      this.attendanceModel.countDocuments({ organizationId: orgId, memberId: membership._id, kind: 'absence_report' }),
    ]);

    const eventIds = [...new Set(attendance.map((a) => String(a.eventId)).filter(Boolean))];
    const events = eventIds.length
      ? await this.eventModel
          .find({ _id: { $in: eventIds.map((id) => new Types.ObjectId(id)) } })
          .select('title startsAt')
          .lean<(Named & { startsAt?: Date })[]>()
          .exec()
      : [];
    const eventById = new Map(events.map((e) => [String(e._id), e]));
    const lastCheckIn = attendance.find((a) => a.kind === 'check_in')?.occurredAt ?? null;

    return {
      organization: { id: String(organization._id), name: organization.name, organizationType: organization.organizationType ?? null },
      membership: {
        id: String(membership._id),
        status: membership.status,
        role: membership.role,
        requestedAt: membership.joinRequest?.submittedAt ?? membership.createdAt ?? null,
        joinedAt: membership.status === 'pending' ? null : membership.joinedAt ?? null,
        domain: membership.domain ?? null,
        history: (membership.history ?? []).map((h: any) => ({
          at: h.at,
          status: h.status ?? null,
          role: h.role ?? null,
          note: h.note ?? null,
        })),
      },
      groups: groups.map((g) => ({ id: String(g._id), name: g.name ?? '' })),
      departments: departments.map((d) => ({ id: String(d._id), name: d.name ?? '' })),
      attendance: attendance.map((a) => {
        const ev = eventById.get(String(a.eventId));
        return {
          id: String(a._id),
          kind: a.kind,
          attendanceType: a.attendanceType ?? null,
          reasonCategory: a.reasonCategory ?? null,
          note: a.note ?? '',
          occurredAt: a.occurredAt,
          eventId: a.eventId ? String(a.eventId) : null,
          eventTitle: ev?.title ?? '',
          eventStartsAt: ev?.startsAt ?? null,
        };
      }),
      attendanceSummary: { checkIns, absences, lastCheckIn },
      visits,
    };
  }
}
