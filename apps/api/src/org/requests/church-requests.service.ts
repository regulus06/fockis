/**
 * church-requests.service.ts
 * -----------------------------------------------------------------------------
 * Requests & Inquiries for church organizations.
 *
 * Who sees what (checked on every call):
 *   owner, administrator, pastor/director   every request
 *   members with "manage communication"     every request except prayer,
 *                                           counseling and pastoral support,
 *                                           plus anything assigned to them
 *   leaders                                 requests assigned to them or to a
 *                                           ministry they lead
 *   requester (signed in)                   their own requests and replies
 *   anyone                                  can submit (public form)
 *
 * Internal notes never leave the staff views; "pastoral" notes are limited to
 * the owner, administrators, pastors and the note's author.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';

import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { Membership, MembershipDocument } from '../members/schemas/membership.schema';
import { Department } from '../departments/schemas/department.schema';
import { ChurchNotification } from '../communication/schemas/announcement.schema';
import { MembersService } from '../members/services/members.service';
import { ChurchPermission } from '../enums/permission.enum';
import { MembershipStatus } from '../enums/membership-status.enum';
import { NotificationsService } from '../../notifications/notifications.service';
import { ConversationsService } from '../../messages/conversations.service';
import { MessagesService } from '../../messages/messages.service';
import { RegistrationMailer, escapeHtml } from '../../events/registrations/registration-mailer';
import {
  ChurchRequest,
  ChurchRequestDocument,
  PUBLIC_REQUEST_TYPES,
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  SENSITIVE_REQUEST_TYPES,
  type RequestPriority,
  type RequestStatus,
  type RequestType,
} from './church-request.schema';

/* ------------------------------------------------------------------ helpers */

const FULL_ADMIN_ROLES = new Set(['administrator', 'pastor_director']);
const LEADER_ROLES = new Set(['leader', 'department_manager', 'group_leader']);
const STAFF_ROLES = ['administrator', 'pastor_director', 'leader', 'department_manager', 'group_leader'];
const OPEN_STATUSES: RequestStatus[] = ['new', 'in_progress', 'waiting'];
const PRIORITY_RANK: Record<RequestPriority, number> = { normal: 0, high: 1, urgent: 2 };
/** Response target when no due date is given. */
const SLA_DAYS: Record<RequestPriority, number> = { normal: 7, high: 3, urgent: 1 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  prayer: 'Prayer Request',
  visit: 'Visit Request',
  counseling: 'Counseling',
  general: 'General Inquiry',
  volunteer: 'Volunteer Request',
  membership: 'Membership Inquiry',
  baptism: 'Baptism Request',
  marriage: 'Marriage Request',
  event: 'Event Inquiry',
  ministry: 'Ministry Inquiry',
  pastoral_support: 'Pastoral Support',
  assistance: 'Assistance Request',
  meeting: 'Meeting Request',
  other: 'Other',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  waiting: 'Waiting for Response',
  resolved: 'Resolved',
  archived: 'Archived',
};

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');
const oneLine = (v: unknown, max: number) => clean(v, max).replace(/\s+/g, ' ');
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rid = () => randomBytes(8).toString('hex');

function webBase(): string {
  return String(process.env.WEB_APP_URL || process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function emailHtml(orgName: string, heading: string, paragraphs: string[], quote?: string, footer?: string): { html: string; text: string } {
  const p = paragraphs.map((x) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1e293b">${escapeHtml(x)}</p>`).join('');
  const q = quote
    ? `<div style="margin:6px 0 18px;padding:14px 16px;background:#f1f5fb;border-left:4px solid #1d6cf2;border-radius:8px;font-size:15px;line-height:1.55;color:#0f1b3d;white-space:pre-wrap">${escapeHtml(quote)}</div>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#eef3fb;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border-collapse:separate">
<tr><td style="background:linear-gradient(135deg,#0b1f4d,#1d6cf2);border-radius:16px 16px 0 0;padding:18px 24px;color:#fff;font-size:19px;font-weight:800">${escapeHtml(orgName)}</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 14px;font-size:21px;color:#0f1b3d">${escapeHtml(heading)}</h1>${p}${q}
<p style="margin:18px 0 0;font-size:12px;color:#64748b">${escapeHtml(footer ?? 'Sent through Fockis on behalf of ' + orgName + '.')}</p></td></tr></table></body></html>`;
  const text = [heading, '', ...paragraphs, ...(quote ? ['', quote] : []), '', footer ?? `Sent through Fockis on behalf of ${orgName}.`].join('\n');
  return { html, text };
}

/* ------------------------------------------------------------------ types */

interface Viewer {
  userId: string;
  name: string;
  membershipId: Types.ObjectId | null;
  isOwner: boolean;
  isFullAdmin: boolean;
  canManage: boolean;
  canDelete: boolean;
  isStaff: boolean;
  ledDepartmentIds: Types.ObjectId[];
}

export interface RequestAccess {
  canAssign: boolean;
  canDelete: boolean;
  canReport: boolean;
  canCreate: boolean;
  canPastoralNotes: boolean;
}

export interface RequestSummary {
  id: string;
  requestNumber: string;
  requesterType: 'member' | 'public';
  requesterName: string;
  avatarUrl: string | null;
  email: string;
  requestType: RequestType;
  subject: string;
  preview: string;
  status: RequestStatus;
  priority: RequestPriority;
  assignedToName: string;
  assignedDepartmentName: string;
  dueAt: Date | null;
  overdue: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface RequestDetail extends RequestSummary {
  phone: string;
  message: string;
  requesterUserId: string | null;
  requesterMembershipId: string | null;
  assignedToMembershipId: string | null;
  assignedDepartmentId: string | null;
  source: string;
  resolvedAt: Date | null;
  archivedAt: Date | null;
  canFockisMessage: boolean;
  replies: { id: string; channel: string; body: string; to: string; sentByName: string; sentAt: Date; delivery: string; error: string }[];
  notes: { id: string; body: string; visibility: string; authorName: string; createdAt: Date; mine: boolean }[];
  history: { at: Date; action: string; actorName: string; from: string; to: string; note: string }[];
}

export interface RequestListResult {
  items: RequestSummary[];
  total: number;
  page: number;
  pageSize: number;
  stats: { total: number; new: number; inProgress: number; resolved: number; overdue: number };
  tabCounts: { all: number; member: number; public: number; mine: number; archived: number };
  access: RequestAccess;
}

export interface RequestReports {
  total: number;
  open: number;
  overdue: number;
  byType: { type: RequestType; label: string; count: number }[];
  byStatus: { status: RequestStatus; label: string; count: number }[];
  byAssignee: { name: string; total: number; resolved: number }[];
  avgResponseHours: number | null;
  avgResolutionHours: number | null;
  monthly: { month: string; received: number; resolved: number }[];
}

@Injectable()
export class ChurchRequestsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChurchRequestsService.name);
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(ChurchRequest.name) private readonly requestModel: Model<ChurchRequestDocument>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<OrganizationDocument>,
    @InjectModel(Membership.name) private readonly membershipModel: Model<MembershipDocument>,
    @InjectModel(Department.name) private readonly departmentModel: Model<any>,
    @InjectModel(ChurchNotification.name) private readonly churchNotificationModel: Model<any>,
    private readonly members: MembersService,
    private readonly notifications: NotificationsService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly mailer: RegistrationMailer,
  ) {}

  /* ================================================================ overdue */

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.sweepTimer = setInterval(() => void this.sweepOverdue().catch((e) => this.logger.warn(`Overdue check failed: ${e?.message ?? e}`)), 15 * 60 * 1000);
    this.sweepTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  /** Tells the assignee (or the administrators) once when a request goes past its due date. */
  async sweepOverdue(): Promise<number> {
    let count = 0;
    for (let i = 0; i < 200; i++) {
      const req = await this.requestModel
        .findOneAndUpdate(
          { dueAt: { $lt: new Date() }, status: { $in: OPEN_STATUSES }, overdueNotifiedAt: null },
          {
            $set: { overdueNotifiedAt: new Date() },
            $push: { history: { at: new Date(), action: 'overdue', actorUserId: null, actorName: 'Fockis', from: '', to: '', note: 'Past its due date' } },
          },
          { new: true },
        )
        .exec();
      if (!req) break;
      count++;
      const title = `Overdue: ${REQUEST_TYPE_LABEL[req.requestType]}`;
      const body = `"${req.subject}" from ${req.requesterName} is past its due date.`;
      if (req.assignedToMembershipId) await this.notifyMembership(req, req.assignedToMembershipId, title, body);
      else await this.notifyStaff(req, title, body, null);
    }
    return count;
  }

  /* ================================================================ access */

  private oid(id: unknown, what: string): Types.ObjectId {
    if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(id);
  }

  private async organization(organizationId: string): Promise<OrganizationDocument> {
    const org = await this.organizationModel.findById(this.oid(organizationId, 'organization ID')).exec();
    if (!org) throw new NotFoundException('Organization not found.');
    return org;
  }

  private async viewer(organizationId: string, userId: string): Promise<Viewer> {
    const [isOwner, membership] = await Promise.all([
      this.members.isOrganizationOwner(organizationId, userId).catch(() => false),
      this.members.getMembershipOrNull(organizationId, userId).catch(() => null),
    ]);
    const active = membership && membership.status === MembershipStatus.Active ? membership : null;
    const role = String(active?.role ?? '');
    const isFullAdmin = isOwner || FULL_ADMIN_ROLES.has(role);
    const canManage =
      isFullAdmin || (active ? await this.members.hasPermission(organizationId, userId, ChurchPermission.ManageCommunication).catch(() => false) : false);
    const led = active
      ? await this.departmentModel
          .find({ organizationId: active.organizationId, leaderIds: active._id, isArchived: { $ne: true } })
          .select('_id')
          .lean<{ _id: Types.ObjectId }[]>()
          .exec()
      : [];
    return {
      userId,
      name: active?.profile?.displayName || (isOwner ? 'Organization owner' : 'Staff'),
      membershipId: active?._id ?? null,
      isOwner,
      isFullAdmin,
      canManage,
      canDelete: isOwner || role === 'administrator',
      isStaff: isFullAdmin || canManage || LEADER_ROLES.has(role) || led.length > 0,
      ledDepartmentIds: led.map((d) => d._id),
    };
  }

  private async requireStaff(organizationId: string, userId: string): Promise<Viewer> {
    const v = await this.viewer(organizationId, userId);
    if (!v.isStaff) throw new ForbiddenException('Only church staff can open Requests & Inquiries.');
    return v;
  }

  /** The part of the requests this viewer may see. */
  private scope(v: Viewer): Record<string, unknown> {
    if (v.isFullAdmin) return {};
    const own: Record<string, unknown>[] = [];
    if (v.membershipId) own.push({ assignedToMembershipId: v.membershipId });
    if (v.ledDepartmentIds.length) own.push({ assignedDepartmentId: { $in: v.ledDepartmentIds } });
    if (v.canManage) return { $or: [{ requestType: { $nin: SENSITIVE_REQUEST_TYPES } }, ...own] };
    return own.length ? { $or: own } : { _id: null };
  }

  private access(v: Viewer): RequestAccess {
    return {
      canAssign: v.canManage,
      canDelete: v.canDelete,
      canReport: v.isFullAdmin,
      canCreate: v.canManage,
      canPastoralNotes: v.isFullAdmin,
    };
  }

  private async findVisible(organizationId: string, requestId: string, v: Viewer): Promise<ChurchRequestDocument> {
    const req = await this.requestModel
      .findOne({ _id: this.oid(requestId, 'request ID'), organizationId: this.oid(organizationId, 'organization ID'), ...this.scope(v) })
      .exec();
    if (!req) throw new NotFoundException('Request not found.');
    return req;
  }

  /* ================================================================ serialize */

  private isOverdue(r: { dueAt?: Date | null; status: RequestStatus }): boolean {
    return Boolean(r.dueAt && new Date(r.dueAt).getTime() < Date.now() && OPEN_STATUSES.includes(r.status));
  }

  private summary(r: ChurchRequestDocument | any): RequestSummary {
    return {
      id: String(r._id),
      requestNumber: r.requestNumber,
      requesterType: r.requesterType,
      requesterName: r.requesterName,
      avatarUrl: r.avatarUrl ?? null,
      email: r.email ?? '',
      requestType: r.requestType,
      subject: r.subject,
      preview: String(r.message ?? '').replace(/\s+/g, ' ').slice(0, 140),
      status: r.status,
      priority: r.priority ?? 'normal',
      assignedToName: r.assignedToName ?? '',
      assignedDepartmentName: r.assignedDepartmentName ?? '',
      dueAt: r.dueAt ?? null,
      overdue: this.isOverdue(r),
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null,
    };
  }

  private detail(r: ChurchRequestDocument, v: Viewer): RequestDetail {
    return {
      ...this.summary(r),
      phone: r.phone ?? '',
      message: r.message,
      requesterUserId: r.requesterUserId ? String(r.requesterUserId) : null,
      requesterMembershipId: r.requesterMembershipId ? String(r.requesterMembershipId) : null,
      assignedToMembershipId: r.assignedToMembershipId ? String(r.assignedToMembershipId) : null,
      assignedDepartmentId: r.assignedDepartmentId ? String(r.assignedDepartmentId) : null,
      source: r.source,
      resolvedAt: r.resolvedAt ?? null,
      archivedAt: r.archivedAt ?? null,
      canFockisMessage: Boolean(r.requesterUserId),
      replies: (r.replies ?? []).map((x) => ({
        id: x.id,
        channel: x.channel,
        body: x.body,
        to: x.to,
        sentByName: x.sentByName,
        sentAt: x.sentAt,
        delivery: x.delivery,
        error: x.error ?? '',
      })),
      notes: (r.notes ?? [])
        .filter((n) => n.visibility !== 'pastoral' || v.isFullAdmin || String(n.authorUserId) === v.userId)
        .map((n) => ({ id: n.id, body: n.body, visibility: n.visibility, authorName: n.authorName, createdAt: n.createdAt, mine: String(n.authorUserId) === v.userId })),
      history: [...(r.history ?? [])]
        .reverse()
        .map((h) => ({ at: h.at, action: h.action, actorName: h.actorName, from: h.from ?? '', to: h.to ?? '', note: h.note ?? '' })),
    };
  }

  private log(r: ChurchRequestDocument, action: string, actor: { userId: string | null; name: string }, from = '', to = '', note = '') {
    r.history.push({
      at: new Date(),
      action,
      actorUserId: actor.userId && Types.ObjectId.isValid(actor.userId) ? new Types.ObjectId(actor.userId) : null,
      actorName: actor.name,
      from,
      to,
      note: note.slice(0, 300),
    } as any);
  }

  private async newNumber(): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 6; i++) {
      const bytes = randomBytes(6);
      const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
      const number = `REQ-${new Date().getFullYear()}-${code}`;
      if (!(await this.requestModel.exists({ requestNumber: number }))) return number;
    }
    throw new Error('Could not create a request number.');
  }

  private defaultDue(priority: RequestPriority, from = new Date()): Date {
    return new Date(from.getTime() + SLA_DAYS[priority] * 24 * 60 * 60 * 1000);
  }

  /* ================================================================ list */

  async list(organizationId: string, userId: string, q: Record<string, unknown>): Promise<RequestListResult> {
    const v = await this.requireStaff(organizationId, userId);
    const orgId = this.oid(organizationId, 'organization ID');
    const base = { organizationId: orgId, ...this.scope(v) };
    const notArchived: Record<string, unknown> = { status: { $ne: 'archived' } };
    // Mongoose's strict filter types reject composed filters; same model, looser typing.
    const loose = this.requestModel as unknown as Model<any>;
    const mineFilter = v.membershipId ? { assignedToMembershipId: v.membershipId } : { _id: null };

    const tab = String(q.tab ?? 'all');
    const tabFilter: Record<string, unknown> =
      tab === 'member'
        ? { ...notArchived, requesterType: 'member' }
        : tab === 'public'
          ? { ...notArchived, requesterType: 'public' }
          : tab === 'mine'
            ? { ...notArchived, ...mineFilter }
            : tab === 'archived'
              ? { status: 'archived' }
              : notArchived;

    const filter: Record<string, unknown>[] = [base, tabFilter];
    const type = String(q.type ?? '');
    if ((REQUEST_TYPES as readonly string[]).includes(type)) filter.push({ requestType: type });
    const status = String(q.status ?? '');
    if ((REQUEST_STATUSES as readonly string[]).includes(status)) filter.push({ status });
    if (q.overdue === 'true') filter.push({ dueAt: { $lt: new Date() }, status: { $in: OPEN_STATUSES } });
    const search = oneLine(q.q, 80);
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.push({ $or: [{ requesterName: re }, { email: re }, { subject: re }, { message: re }, { requestNumber: re }] });
    }
    const where = { $and: filter };

    const sortKey = String(q.sort ?? 'newest');
    const sort: Record<string, 1 | -1> =
      sortKey === 'oldest'
        ? { createdAt: 1 }
        : sortKey === 'priority'
          ? { priorityRank: -1, createdAt: -1 }
          : sortKey === 'updated'
            ? { updatedAt: -1 }
            : { createdAt: -1 };

    const pageSize = Math.min(50, Math.max(1, Math.floor(Number(q.pageSize) || 5)));
    const page = Math.max(1, Math.floor(Number(q.page) || 1));
    const now = new Date();

    const [items, total, sTotal, sNew, sProg, sRes, sOver, tAll, tMember, tPublic, tMine, tArch] = await Promise.all([
      this.requestModel
        .find(where)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select('-notes -replies -history')
        .lean()
        .exec(),
      this.requestModel.countDocuments(where),
      this.requestModel.countDocuments(base),
      this.requestModel.countDocuments({ ...base, status: 'new' }),
      this.requestModel.countDocuments({ ...base, status: 'in_progress' }),
      this.requestModel.countDocuments({ ...base, status: 'resolved' }),
      loose.countDocuments({ $and: [base, { dueAt: { $lt: now }, status: { $in: OPEN_STATUSES } }] }),
      loose.countDocuments({ $and: [base, notArchived] }),
      loose.countDocuments({ $and: [base, notArchived, { requesterType: 'member' }] }),
      loose.countDocuments({ $and: [base, notArchived, { requesterType: 'public' }] }),
      loose.countDocuments({ $and: [base, notArchived, mineFilter] }),
      loose.countDocuments({ $and: [base, { status: 'archived' }] }),
    ]);

    return {
      items: items.map((r) => this.summary(r)),
      total,
      page,
      pageSize,
      stats: { total: sTotal, new: sNew, inProgress: sProg, resolved: sRes, overdue: sOver },
      tabCounts: { all: tAll, member: tMember, public: tPublic, mine: tMine, archived: tArch },
      access: this.access(v),
    };
  }

  async get(organizationId: string, userId: string, requestId: string): Promise<RequestDetail> {
    const v = await this.requireStaff(organizationId, userId);
    return this.detail(await this.findVisible(organizationId, requestId, v), v);
  }

  /** People and ministries a request can be assigned to. */
  async staff(organizationId: string, userId: string) {
    const v = await this.requireStaff(organizationId, userId);
    const orgId = this.oid(organizationId, 'organization ID');
    const [people, departments] = await Promise.all([
      (this.membershipModel as unknown as Model<any>)
        .find({ organizationId: orgId, status: MembershipStatus.Active, role: { $in: STAFF_ROLES } })
        .select('profile.displayName profile.avatarUrl role')
        .sort({ 'profile.displayName': 1 })
        .limit(300)
        .lean<any[]>()
        .exec(),
      this.departmentModel.find({ organizationId: orgId, isArchived: { $ne: true } }).select('name').sort({ name: 1 }).lean<any[]>().exec(),
    ]);
    return {
      people: people.map((p) => ({ id: String(p._id), name: p.profile?.displayName || 'Member', avatarUrl: p.profile?.avatarUrl ?? null, role: p.role })),
      departments: departments.map((d) => ({ id: String(d._id), name: d.name })),
      access: this.access(v),
      me: v.membershipId ? String(v.membershipId) : null,
    };
  }

  /** Active members to link a new request to. */
  async searchMembers(organizationId: string, userId: string, term: string) {
    const v = await this.requireStaff(organizationId, userId);
    if (!v.canManage) throw new ForbiddenException('You can’t create requests.');
    const q = oneLine(term, 60);
    const filter: Record<string, unknown> = { organizationId: this.oid(organizationId, 'organization ID'), status: MembershipStatus.Active };
    if (q) filter['profile.displayName'] = new RegExp(escapeRegex(q), 'i');
    const rows = await this.membershipModel.find(filter).select('profile.displayName profile.avatarUrl').sort({ 'profile.displayName': 1 }).limit(20).lean<any[]>().exec();
    return rows.map((m) => ({ id: String(m._id), name: m.profile?.displayName || 'Member', avatarUrl: m.profile?.avatarUrl ?? null }));
  }

  /* ================================================================ create (staff) */

  async create(organizationId: string, userId: string, body: Record<string, unknown>): Promise<RequestDetail> {
    const v = await this.requireStaff(organizationId, userId);
    if (!v.canManage) throw new ForbiddenException('Only administrators can create requests.');
    const org = await this.organization(organizationId);

    const requestType = String(body.requestType ?? '') as RequestType;
    if (!(REQUEST_TYPES as readonly string[]).includes(requestType)) throw new BadRequestException('Choose a request type.');
    const priority = ((REQUEST_PRIORITIES as readonly string[]).includes(String(body.priority)) ? body.priority : 'normal') as RequestPriority;
    const subject = oneLine(body.subject, 150);
    const message = clean(body.message, 5000);
    if (subject.length < 3) throw new BadRequestException('Enter a subject.');
    if (message.length < 3) throw new BadRequestException('Enter the message.');

    let requesterName = oneLine(body.requesterName, 120);
    let email = oneLine(body.email, 160).toLowerCase();
    const phone = oneLine(body.phone, 40);
    let requesterType: 'member' | 'public' = 'public';
    let requesterUserId: Types.ObjectId | null = null;
    let requesterMembershipId: Types.ObjectId | null = null;
    let avatarUrl: string | null = null;

    if (body.memberId) {
      const m = await this.membershipModel
        .findOne({ _id: this.oid(String(body.memberId), 'member'), organizationId: org._id })
        .select('userId profile privateProfile status')
        .lean<any>()
        .exec();
      if (!m) throw new BadRequestException('That member was not found in this church.');
      requesterType = 'member';
      requesterUserId = m.userId ?? null;
      requesterMembershipId = m._id;
      avatarUrl = m.profile?.avatarUrl ?? null;
      requesterName = requesterName || m.profile?.displayName || 'Member';
      email = email || String(m.privateProfile?.email ?? '').toLowerCase();
    }
    if (requesterName.length < 2) throw new BadRequestException('Enter the requester’s name.');
    if (email && !EMAIL.test(email)) throw new BadRequestException('Enter a valid email address.');

    let dueAt = this.defaultDue(priority);
    if (body.dueDate) {
      const d = String(body.dueDate);
      if (!DATE_ONLY.test(d)) throw new BadRequestException('Due date must look like 2026-12-31.');
      dueAt = new Date(`${d}T23:59:59.000Z`);
    }

    const req = new this.requestModel({
      organizationId: org._id,
      requestNumber: await this.newNumber(),
      requesterType,
      requesterUserId,
      requesterMembershipId,
      requesterName,
      email,
      phone,
      avatarUrl,
      requestType,
      subject,
      message,
      status: 'new',
      priority,
      priorityRank: PRIORITY_RANK[priority],
      dueAt,
      source: 'staff',
      history: [],
      notes: [],
      replies: [],
    });
    const actor = { userId: v.userId, name: v.name };
    this.log(req, 'created', actor, '', '', `Entered by ${v.name}`);

    const note = clean(body.internalNote, 3000);
    if (note) {
      req.notes.push({ id: rid(), body: note, visibility: 'staff', authorUserId: new Types.ObjectId(v.userId), authorName: v.name, createdAt: new Date() } as any);
      this.log(req, 'note_added', actor);
    }
    if (body.assignedToMembershipId) await this.applyAssignee(req, String(body.assignedToMembershipId), actor, v);
    await req.save();

    if (priority === 'urgent') await this.notifyStaff(req, 'Urgent request', `${REQUEST_TYPE_LABEL[requestType]} from ${requesterName}: ${subject}`, v.userId);
    return this.detail(req, v);
  }

  /* ================================================================ public / member submit */

  async submit(organizationId: string, body: Record<string, unknown>, userId: string | null) {
    // Spam traps: a hidden field people never fill, and a form sent faster
    // than a person can type. Both get a normal-looking answer, nothing saved.
    const started = Number(body.startedAt);
    if (clean(body.website, 200) || (Number.isFinite(started) && started > 0 && Date.now() - started < 2500)) {
      return { requestNumber: `REQ-${new Date().getFullYear()}-RECEIVED`, status: 'new' as const };
    }

    const org = await this.organization(organizationId);
    if (String((org as any).status ?? 'active') !== 'active') throw new BadRequestException('This organization is not taking requests right now.');
    if (body.consent !== true) throw new BadRequestException('Please agree to the privacy notice.');

    const requestType = String(body.requestType ?? '') as RequestType;
    if (!PUBLIC_REQUEST_TYPES.includes(requestType)) throw new BadRequestException('Choose what your message is about.');
    let requesterName = oneLine(body.name, 120);
    let email = oneLine(body.email, 160).toLowerCase();
    const phone = oneLine(body.phone, 40);
    const subject = oneLine(body.subject, 150);
    const message = clean(body.message, 5000);

    let requesterType: 'member' | 'public' = 'public';
    let membershipId: Types.ObjectId | null = null;
    let avatarUrl: string | null = null;
    if (userId) {
      const m = await this.members.getMembershipOrNull(organizationId, userId).catch(() => null);
      if (m && m.status === MembershipStatus.Active) {
        requesterType = 'member';
        membershipId = m._id;
        avatarUrl = m.profile?.avatarUrl ?? null;
        requesterName = requesterName || m.profile?.displayName || '';
        email = email || String((m as any).privateProfile?.email ?? '').toLowerCase();
      }
    }

    if (requesterName.length < 2) throw new BadRequestException('Enter your full name.');
    if (!email || !EMAIL.test(email)) throw new BadRequestException('Enter a valid email address so we can reply.');
    if (phone && !/^[+()\d\s.-]{6,40}$/.test(phone)) throw new BadRequestException('Enter a valid phone number, or leave it empty.');
    if (subject.length < 3) throw new BadRequestException('Enter a subject.');
    if (message.length < 10) throw new BadRequestException('Your message is too short.');
    if ((message.match(/https?:\/\//gi) ?? []).length > 3) throw new BadRequestException('Please remove some of the links from your message.');

    // Same message sent twice in a short time: keep the first.
    const tenMinutes = new Date(Date.now() - 10 * 60 * 1000);
    const duplicate = await this.requestModel
      .findOne({ organizationId: org._id, email, subject, createdAt: { $gte: tenMinutes } })
      .select('requestNumber status')
      .lean<any>()
      .exec();
    if (duplicate) return { requestNumber: duplicate.requestNumber as string, status: duplicate.status as RequestStatus };

    const lastHour = await this.requestModel.countDocuments({ email, createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } });
    if (lastHour >= 5) throw new BadRequestException('You have sent several requests already. Please wait a little before sending another.');

    const req = new this.requestModel({
      organizationId: org._id,
      requestNumber: await this.newNumber(),
      requesterType,
      requesterUserId: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null,
      requesterMembershipId: membershipId,
      requesterName,
      email,
      phone,
      avatarUrl,
      requestType,
      subject,
      message,
      status: 'new',
      priority: 'normal',
      priorityRank: 0,
      dueAt: this.defaultDue('normal'),
      source: requesterType === 'member' ? 'member_form' : 'public_form',
      consentAt: new Date(),
      history: [],
      notes: [],
      replies: [],
    });
    this.log(req, 'submitted', { userId, name: requesterName }, '', '', requesterType === 'member' ? 'Member request' : 'Public website');
    await req.save();

    const label = REQUEST_TYPE_LABEL[requestType];
    await this.notifyStaff(
      req,
      requesterType === 'member' ? `New ${label.toLowerCase()} from a member` : `New ${label.toLowerCase()} from your website`,
      `${requesterName}: ${subject}`,
      null,
    );

    // Confirmation to the person who wrote.
    const mail = emailHtml(org.name, 'We received your request', [
      `Hello ${requesterName},`,
      `Thank you for contacting ${org.name}. Your ${label.toLowerCase()} has been received and someone from ${org.name} will get back to you.`,
      `Your reference number is ${req.requestNumber}.`,
    ], `${subject}\n\n${message}`);
    await this.mailer.send({ to: email, subject: `${org.name}: we received your request (${req.requestNumber})`, ...mail });
    if (req.requesterUserId) await this.notifyRequester(req, 'Request received', `${org.name} received your ${label.toLowerCase()} (${req.requestNumber}).`);

    return { requestNumber: req.requestNumber, status: req.status };
  }

  /** A signed-in person's own requests to this church, with the replies they were sent. */
  async mine(organizationId: string, userId: string) {
    const rows = await this.requestModel
      .find({ organizationId: this.oid(organizationId, 'organization ID'), requesterUserId: this.oid(userId, 'user') })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('requestNumber requestType subject message status createdAt updatedAt resolvedAt replies')
      .lean<any[]>()
      .exec();
    return rows.map((r) => ({
      id: String(r._id),
      requestNumber: r.requestNumber,
      requestType: r.requestType,
      subject: r.subject,
      message: r.message,
      status: r.status === 'archived' ? 'resolved' : r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt ?? null,
      replies: (r.replies ?? [])
        .filter((x: any) => x.delivery === 'sent')
        .map((x: any) => ({ id: x.id, body: x.body, sentByName: x.sentByName, sentAt: x.sentAt, channel: x.channel })),
    }));
  }

  /* ================================================================ update */

  private async applyAssignee(req: ChurchRequestDocument, membershipId: string | null, actor: { userId: string; name: string }, v: Viewer) {
    const before = req.assignedToName || '';
    if (!membershipId) {
      if (!req.assignedToMembershipId) return;
      req.assignedToMembershipId = null;
      req.assignedToUserId = null;
      req.assignedToName = '';
      this.log(req, 'unassigned', actor, before, '');
      return;
    }
    const m = await this.membershipModel
      .findOne({ _id: this.oid(membershipId, 'staff member'), organizationId: req.organizationId, status: MembershipStatus.Active })
      .select('userId profile role')
      .lean<any>()
      .exec();
    if (!m) throw new BadRequestException('Choose someone from your church staff.');
    if (!STAFF_ROLES.includes(String(m.role)) && !(await this.members.isOrganizationOwner(String(req.organizationId), String(m.userId)).catch(() => false))) {
      throw new BadRequestException('Requests can be assigned to administrators, pastors and ministry leaders.');
    }
    if (SENSITIVE_REQUEST_TYPES.includes(req.requestType) && !v.isFullAdmin) {
      throw new ForbiddenException('Only administrators and pastors can assign prayer, counseling and pastoral requests.');
    }
    if (String(req.assignedToMembershipId) === String(m._id)) return;
    const name = m.profile?.displayName || 'Staff member';
    const wasAssigned = Boolean(req.assignedToMembershipId);
    req.assignedToMembershipId = m._id;
    req.assignedToUserId = m.userId ?? null;
    req.assignedToName = name;
    req.assignedByUserId = new Types.ObjectId(actor.userId);
    req.assignedAt = new Date();
    this.log(req, wasAssigned ? 'reassigned' : 'assigned', actor, before, name);
    if (String(m.userId) !== actor.userId) {
      await this.notifyMembership(req, m._id, 'Request assigned to you', `${REQUEST_TYPE_LABEL[req.requestType]} from ${req.requesterName}: ${req.subject}`);
    }
  }

  private async setStatus(req: ChurchRequestDocument, status: RequestStatus, actor: { userId: string; name: string }, orgName: string) {
    if (req.status === status) return;
    const from = req.status;
    req.status = status;
    if (from === 'new' && !req.firstResponseAt) req.firstResponseAt = new Date();
    if (status === 'resolved') req.resolvedAt = new Date();
    if (status !== 'resolved' && from === 'resolved') req.resolvedAt = null;
    this.log(req, status === 'resolved' ? 'resolved' : 'status_changed', actor, STATUS_LABEL[from], STATUS_LABEL[status]);

    if (status === 'in_progress' && req.requesterUserId) {
      await this.notifyRequester(req, 'Your request is being handled', `${orgName} is working on your request "${req.subject}" (${req.requestNumber}).`);
    }
    if (status === 'resolved') {
      if (req.requesterUserId) await this.notifyRequester(req, 'Your request was resolved', `${orgName} marked "${req.subject}" (${req.requestNumber}) as resolved.`);
      if (req.email) {
        const mail = emailHtml(orgName, 'Your request was resolved', [
          `Hello ${req.requesterName},`,
          `${orgName} has marked your request "${req.subject}" as resolved. If you still need help, simply reply to the church or send a new request.`,
          `Reference: ${req.requestNumber}`,
        ]);
        await this.mailer.send({ to: req.email, subject: `${orgName}: your request was resolved (${req.requestNumber})`, ...mail });
      }
    }
  }

  async update(organizationId: string, userId: string, requestId: string, body: Record<string, unknown>): Promise<RequestDetail> {
    const v = await this.requireStaff(organizationId, userId);
    const req = await this.findVisible(organizationId, requestId, v);
    const org = await this.organization(organizationId);
    const actor = { userId: v.userId, name: v.name };

    if (body.status !== undefined) {
      const status = String(body.status) as RequestStatus;
      if (!(['new', 'in_progress', 'waiting', 'resolved'] as string[]).includes(status)) throw new BadRequestException('Choose a valid status.');
      if (req.status === 'archived') throw new BadRequestException('Restore the request before changing its status.');
      await this.setStatus(req, status, actor, org.name);
    }
    if (body.priority !== undefined) {
      if (!v.canManage) throw new ForbiddenException('You can’t change the priority.');
      const priority = String(body.priority) as RequestPriority;
      if (!(REQUEST_PRIORITIES as readonly string[]).includes(priority)) throw new BadRequestException('Choose a valid priority.');
      if (priority !== req.priority) {
        this.log(req, 'priority_changed', actor, req.priority, priority);
        req.priority = priority;
        req.priorityRank = PRIORITY_RANK[priority];
        if (priority === 'urgent') await this.notifyStaff(req, 'Request marked urgent', `${req.requesterName}: ${req.subject}`, v.userId);
      }
    }
    if (body.assignedToMembershipId !== undefined) {
      if (!v.canManage) throw new ForbiddenException('You can’t assign requests.');
      await this.applyAssignee(req, body.assignedToMembershipId ? String(body.assignedToMembershipId) : null, actor, v);
    }
    if (body.assignedDepartmentId !== undefined) {
      if (!v.canManage) throw new ForbiddenException('You can’t assign requests.');
      if (!body.assignedDepartmentId) {
        if (req.assignedDepartmentId) this.log(req, 'ministry_unassigned', actor, req.assignedDepartmentName, '');
        req.assignedDepartmentId = null;
        req.assignedDepartmentName = '';
      } else {
        const d = await this.departmentModel
          .findOne({ _id: this.oid(String(body.assignedDepartmentId), 'ministry'), organizationId: req.organizationId, isArchived: { $ne: true } })
          .select('name leaderIds')
          .lean<any>()
          .exec();
        if (!d) throw new BadRequestException('Choose a ministry of this church.');
        if (SENSITIVE_REQUEST_TYPES.includes(req.requestType) && !v.isFullAdmin) {
          throw new ForbiddenException('Only administrators and pastors can share prayer, counseling and pastoral requests with a ministry.');
        }
        if (String(req.assignedDepartmentId) !== String(d._id)) {
          this.log(req, 'ministry_assigned', actor, req.assignedDepartmentName, d.name);
          req.assignedDepartmentId = d._id;
          req.assignedDepartmentName = d.name;
          for (const leaderId of (d.leaderIds ?? []).slice(0, 10)) {
            await this.notifyMembership(req, leaderId, `Request for ${d.name}`, `${REQUEST_TYPE_LABEL[req.requestType]} from ${req.requesterName}: ${req.subject}`);
          }
        }
      }
    }
    if (body.dueDate !== undefined) {
      if (!v.canManage) throw new ForbiddenException('You can’t change the due date.');
      const d = body.dueDate ? String(body.dueDate) : '';
      if (d && !DATE_ONLY.test(d)) throw new BadRequestException('Due date must look like 2026-12-31.');
      const next = d ? new Date(`${d}T23:59:59.000Z`) : null;
      this.log(req, 'due_changed', actor, req.dueAt ? req.dueAt.toISOString().slice(0, 10) : '', d);
      req.dueAt = next;
      req.overdueNotifiedAt = null;
    }

    await req.save();
    return this.detail(req, v);
  }

  /* ================================================================ replies & notes */

  async reply(organizationId: string, userId: string, requestId: string, body: Record<string, unknown>) {
    const v = await this.requireStaff(organizationId, userId);
    const req = await this.findVisible(organizationId, requestId, v);
    const org = await this.organization(organizationId);
    const text = clean(body.body, 5000);
    if (text.length < 2) throw new BadRequestException('Write your reply first.');
    const channel = body.channel === 'fockis' ? 'fockis' : 'email';

    let delivery: 'sent' | 'failed' = 'failed';
    let error = '';
    let to = '';
    if (channel === 'email') {
      if (!req.email) throw new BadRequestException('This request has no email address.');
      to = req.email;
      const mail = emailHtml(org.name, `Reply to your request`, [`Hello ${req.requesterName},`], text, `Reference ${req.requestNumber}. Sent by ${v.name} through Fockis on behalf of ${org.name}.`);
      const ok = await this.mailer.send({ to, subject: `Re: ${req.subject} (${req.requestNumber})`, ...mail });
      delivery = ok ? 'sent' : 'failed';
      if (!ok) error = 'The email service could not send this message. Check the email settings and try again.';
    } else {
      if (!req.requesterUserId) throw new BadRequestException('This person has no Fockis account to message.');
      to = req.requesterName;
      try {
        if (String(req.requesterUserId) === v.userId) throw new Error('You can’t message yourself.');
        const conversation = await this.conversations.createWithParticipant(v.userId, String(req.requesterUserId));
        await this.messages.create(v.userId, {
          conversationId: String((conversation as any).id ?? (conversation as any)._id),
          type: 'text',
          text: `${org.name} · ${req.requestNumber}\nRe: ${req.subject}\n\n${text}`,
        } as any);
        delivery = 'sent';
        await this.notifyRequester(req, `${org.name} replied`, `New reply about "${req.subject}" (${req.requestNumber}).`);
      } catch (e) {
        error = e instanceof Error && e.message ? e.message : 'The Fockis message could not be sent.';
      }
    }

    req.replies.push({ id: rid(), channel, body: text, to, sentByUserId: new Types.ObjectId(v.userId), sentByName: v.name, sentAt: new Date(), delivery, error } as any);
    if (delivery === 'sent') {
      if (!req.firstResponseAt) req.firstResponseAt = new Date();
      this.log(req, 'replied', { userId: v.userId, name: v.name }, '', channel === 'email' ? `Email to ${to}` : 'Fockis message');
      if (req.status === 'new') await this.setStatus(req, 'in_progress', { userId: v.userId, name: v.name }, org.name);
    } else {
      this.log(req, 'reply_failed', { userId: v.userId, name: v.name }, '', channel, error);
    }
    await req.save();
    return { delivered: delivery === 'sent', error, request: this.detail(req, v) };
  }

  async addNote(organizationId: string, userId: string, requestId: string, body: Record<string, unknown>) {
    const v = await this.requireStaff(organizationId, userId);
    const req = await this.findVisible(organizationId, requestId, v);
    const text = clean(body.body, 3000);
    if (text.length < 2) throw new BadRequestException('Write the note first.');
    const visibility = body.visibility === 'pastoral' ? 'pastoral' : 'staff';
    if (visibility === 'pastoral' && !v.isFullAdmin) throw new ForbiddenException('Only pastors and administrators can add pastoral notes.');
    req.notes.push({ id: rid(), body: text, visibility, authorUserId: new Types.ObjectId(v.userId), authorName: v.name, createdAt: new Date() } as any);
    this.log(req, 'note_added', { userId: v.userId, name: v.name }, '', visibility === 'pastoral' ? 'Pastoral note' : 'Internal note');
    await req.save();
    return this.detail(req, v);
  }

  /* ================================================================ archive / delete */

  async archive(organizationId: string, userId: string, requestId: string, restore = false) {
    const v = await this.requireStaff(organizationId, userId);
    if (!v.canManage) throw new ForbiddenException('You can’t archive requests.');
    const req = await this.findVisible(organizationId, requestId, v);
    const actor = { userId: v.userId, name: v.name };
    if (!restore) {
      if (req.status === 'archived') return this.detail(req, v);
      req.statusBeforeArchive = req.status;
      req.status = 'archived';
      req.archivedAt = new Date();
      this.log(req, 'archived', actor, STATUS_LABEL[req.statusBeforeArchive], 'Archived');
    } else {
      if (req.status !== 'archived') return this.detail(req, v);
      req.status = req.statusBeforeArchive ?? 'new';
      req.statusBeforeArchive = null;
      req.archivedAt = null;
      this.log(req, 'restored', actor, 'Archived', STATUS_LABEL[req.status]);
    }
    await req.save();
    return this.detail(req, v);
  }

  async remove(organizationId: string, userId: string, requestId: string) {
    const v = await this.requireStaff(organizationId, userId);
    if (!v.canDelete) throw new ForbiddenException('Only the owner or an administrator can delete requests.');
    const req = await this.findVisible(organizationId, requestId, v);
    await this.requestModel.deleteOne({ _id: req._id }).exec();
    this.logger.log(`Request ${req.requestNumber} deleted by ${v.userId}`);
    return { deleted: true, id: String(req._id) };
  }

  /* ================================================================ reports */

  async reports(organizationId: string, userId: string): Promise<RequestReports> {
    const v = await this.requireStaff(organizationId, userId);
    if (!v.isFullAdmin) throw new ForbiddenException('Only the owner, administrators and pastors can see request reports.');
    const orgId = this.oid(organizationId, 'organization ID');
    const match = { organizationId: orgId };
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 11, 1);
    since.setUTCHours(0, 0, 0, 0);

    const [total, open, overdue, byType, byStatus, byAssignee, times, received, resolved] = await Promise.all([
      this.requestModel.countDocuments(match),
      this.requestModel.countDocuments({ ...match, status: { $in: OPEN_STATUSES } }),
      this.requestModel.countDocuments({ ...match, status: { $in: OPEN_STATUSES }, dueAt: { $lt: new Date() } }),
      this.requestModel.aggregate([{ $match: match }, { $group: { _id: '$requestType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      this.requestModel.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      this.requestModel.aggregate([
        { $match: { ...match, assignedToMembershipId: { $ne: null } } },
        { $group: { _id: '$assignedToName', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'archived']] }, 1, 0] } } } },
        { $sort: { total: -1 } },
        { $limit: 20 },
      ]),
      this.requestModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            response: { $avg: { $cond: [{ $ne: ['$firstResponseAt', null] }, { $subtract: ['$firstResponseAt', '$createdAt'] }, null] } },
            resolution: { $avg: { $cond: [{ $ne: ['$resolvedAt', null] }, { $subtract: ['$resolvedAt', '$createdAt'] }, null] } },
          },
        },
      ]),
      this.requestModel.aggregate([
        { $match: { ...match, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, n: { $sum: 1 } } },
      ]),
      this.requestModel.aggregate([
        { $match: { ...match, resolvedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$resolvedAt' } }, n: { $sum: 1 } } },
      ]),
    ]);

    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(since);
      d.setUTCMonth(since.getUTCMonth() + i);
      months.push(d.toISOString().slice(0, 7));
    }
    const rec = new Map(received.map((r: any) => [r._id, r.n]));
    const res = new Map(resolved.map((r: any) => [r._id, r.n]));
    const hours = (ms: unknown) => (typeof ms === 'number' && Number.isFinite(ms) ? Math.round((ms / 3_600_000) * 10) / 10 : null);

    return {
      total,
      open,
      overdue,
      byType: byType.map((t: any) => ({ type: t._id, label: REQUEST_TYPE_LABEL[t._id as RequestType] ?? t._id, count: t.count })),
      byStatus: byStatus.map((s: any) => ({ status: s._id, label: STATUS_LABEL[s._id as RequestStatus] ?? s._id, count: s.count })),
      byAssignee: byAssignee.map((a: any) => ({ name: a._id || 'Unknown', total: a.total, resolved: a.resolved })),
      avgResponseHours: hours(times[0]?.response),
      avgResolutionHours: hours(times[0]?.resolution),
      monthly: months.map((m) => ({ month: m, received: Number(rec.get(m) ?? 0), resolved: Number(res.get(m) ?? 0) })),
    };
  }

  /* ================================================================ notifications */

  private link(req: ChurchRequestDocument): string {
    return `/organizations/${String(req.organizationId)}/admin/requests?request=${String(req._id)}`;
  }

  private async bell(userId: unknown, title: string, message: string, link: string, entityId: string) {
    if (!userId || !Types.ObjectId.isValid(String(userId))) return;
    await this.notifications
      .create({ recipientId: String(userId), type: 'SYSTEM', title, message: message.slice(0, 300), entityId, entityType: 'church_request', link } as any)
      .catch((e) => this.logger.warn(`Notification not sent: ${e?.message ?? e}`));
  }

  private async churchNote(organizationId: unknown, membershipId: unknown, title: string, body: string, linkPath: string) {
    if (!membershipId) return;
    await this.churchNotificationModel
      .create({ organizationId, recipientId: membershipId, title, body: body.slice(0, 300), category: 'message', linkPath, isRead: false })
      .catch((e: any) => this.logger.warn(`Church notification not saved: ${e?.message ?? e}`));
  }

  /** Owner and administrators/pastors (and communication managers for non-sensitive types). */
  private async notifyStaff(req: ChurchRequestDocument, title: string, body: string, exceptUserId: string | null) {
    const orgId = req.organizationId;
    const sensitive = SENSITIVE_REQUEST_TYPES.includes(req.requestType);
    const roleFilter: Record<string, unknown>[] = [{ role: { $in: Array.from(FULL_ADMIN_ROLES) } }];
    if (!sensitive) roleFilter.push({ permissions: ChurchPermission.ManageCommunication });
    const [org, staff] = await Promise.all([
      this.organizationModel.findById(orgId).select('createdByUserId').lean<any>().exec(),
      this.membershipModel
        .find({ organizationId: orgId, status: MembershipStatus.Active, $or: roleFilter })
        .select('_id userId')
        .limit(50)
        .lean<any[]>()
        .exec(),
    ]);
    const link = this.link(req);
    const seen = new Set<string>();
    for (const m of staff) {
      const uid = String(m.userId);
      if (uid === exceptUserId || seen.has(uid)) continue;
      seen.add(uid);
      await this.churchNote(orgId, m._id, title, body, link);
      await this.bell(uid, title, body, link, String(req._id));
    }
    const owner = org?.createdByUserId ? String(org.createdByUserId) : null;
    if (owner && owner !== exceptUserId && !seen.has(owner)) await this.bell(owner, title, body, link, String(req._id));
  }

  private async notifyMembership(req: ChurchRequestDocument, membershipId: Types.ObjectId | unknown, title: string, body: string) {
    const m = await this.membershipModel.findById(membershipId).select('userId').lean<any>().exec();
    if (!m) return;
    const link = this.link(req);
    await this.churchNote(req.organizationId, m._id, title, body, link);
    await this.bell(m.userId, title, body, link, String(req._id));
  }

  /** The person who sent the request (signed-in requesters only; others get emails). */
  private async notifyRequester(req: ChurchRequestDocument, title: string, body: string) {
    const link = `/organizations/${String(req.organizationId)}#contact`;
    if (req.requesterMembershipId) await this.churchNote(req.organizationId, req.requesterMembershipId, title, body, link);
    await this.bell(req.requesterUserId, title, body, link, String(req._id));
  }
}
