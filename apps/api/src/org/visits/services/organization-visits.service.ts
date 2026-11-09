/**
 * organization-visits.service.ts
 * -----------------------------------------------------------------------------
 * "Plan a visit" requests for any organization.
 *
 *   submit()      anyone (signed in or not) sends a request
 *   listForAdmin  admins with "view members" see the requests
 *   update()      admins with "update member" change status / add a note
 *   mine()        a signed-in visitor sees their own requests
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Organization, OrganizationDocument } from '../../organizations/schemas/organization.schema';
import { Branch } from '../../branches/schemas/branch.schema';
import { MembersService } from '../../members/services/members.service';
import { ChurchPermission } from '../../enums/permission.enum';
import {
  OrganizationVisit,
  OrganizationVisitDocument,
  VISIT_STATUSES,
  VisitStatus,
} from '../schemas/organization-visit.schema';

export interface SubmitVisitInput {
  branchId?: unknown;
  visitDate?: unknown;
  visitTime?: unknown;
  adults?: unknown;
  children?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  accessibility?: unknown;
  notes?: unknown;
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown, min: number, max: number, dflt: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class OrganizationVisitsService {
  constructor(
    @InjectModel(OrganizationVisit.name) private readonly visitModel: Model<OrganizationVisitDocument>,
    @InjectModel(Organization.name) private readonly organizationModel: Model<OrganizationDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<any>,
    private readonly membersService: MembersService,
  ) {}

  private oid(id: string, what: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(id);
  }

  private async organization(organizationId: string) {
    const org = await this.organizationModel.findById(this.oid(organizationId, 'organization ID')).exec();
    if (!org) throw new NotFoundException('Organization not found.');
    return org;
  }

  private serialize(v: OrganizationVisitDocument, forAdmin: boolean) {
    const base = {
      id: String(v._id),
      organizationId: String(v.organizationId),
      branchId: v.branchId ? String(v.branchId) : null,
      branchName: v.branchName || '',
      visitDate: v.visitDate,
      visitTime: v.visitTime || '',
      adults: v.adults,
      children: v.children,
      firstName: v.firstName,
      lastName: v.lastName || '',
      email: v.email || '',
      phone: v.phone || '',
      accessibility: v.accessibility || '',
      notes: v.notes || '',
      status: v.status,
      createdAt: v.createdAt ?? null,
      updatedAt: v.updatedAt ?? null,
    };
    if (!forAdmin) return base;
    return {
      ...base,
      userId: v.userId ? String(v.userId) : null,
      staffNote: v.staffNote || '',
      history: (v.history ?? []).map((h) => ({
        at: h.at,
        status: h.status ?? null,
        note: h.note || '',
        byName: h.byName || '',
      })),
    };
  }

  /* ------------------------------------------------------------------ submit */

  async submit(organizationId: string, input: SubmitVisitInput, userId?: string) {
    const org = await this.organization(organizationId);
    if (String((org as any).status ?? 'active') !== 'active') {
      throw new BadRequestException('This organization is not taking visit requests right now.');
    }

    const firstName = text(input.firstName, 80);
    const lastName = text(input.lastName, 80);
    const email = text(input.email, 160).toLowerCase();
    const phone = text(input.phone, 40);
    const visitDate = text(input.visitDate, 10);

    if (!firstName) throw new BadRequestException('Enter your first name.');
    if (!email && !phone) throw new BadRequestException('Enter an email or a phone number so they can reach you.');
    if (email && !EMAIL.test(email)) throw new BadRequestException('Enter a valid email address.');
    if (!DATE.test(visitDate)) throw new BadRequestException('Choose the day you want to visit.');
    // One day of slack for time zones.
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (visitDate < yesterday) throw new BadRequestException('Choose a day that is today or later.');

    let branchId: Types.ObjectId | null = null;
    let branchName = '';
    const rawBranch = text(input.branchId, 40);
    if (rawBranch) {
      const branch = await this.branchModel
        .findOne({ _id: this.oid(rawBranch, 'branch'), organizationId: org._id })
        .lean<{ _id: Types.ObjectId; name?: string }>()
        .exec();
      if (!branch) throw new BadRequestException('That location was not found.');
      branchId = branch._id;
      branchName = branch.name ?? '';
    }

    // Keep the inbox clean: at most 3 open requests per person per organization.
    const contact = email ? { email } : { phone };
    const open = await this.visitModel.countDocuments({
      organizationId: org._id,
      ...contact,
      status: { $in: ['new', 'contacted', 'scheduled'] },
    });
    if (open >= 3) {
      throw new BadRequestException('You already have visit requests waiting for this organization. They will contact you soon.');
    }

    const doc = await this.visitModel.create({
      organizationId: org._id,
      userId: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null,
      branchId,
      branchName,
      visitDate,
      visitTime: text(input.visitTime, 40),
      adults: int(input.adults, 1, 50, 1),
      children: int(input.children, 0, 50, 0),
      firstName,
      lastName,
      email,
      phone,
      accessibility: text(input.accessibility, 500),
      notes: text(input.notes, 1000),
      status: 'new',
      history: [{ at: new Date(), status: 'new', note: 'Request sent' }],
    });
    return { ok: true, visit: this.serialize(doc, false) };
  }

  /* ------------------------------------------------------------------- admin */

  async listForAdmin(organizationId: string, actorUserId: string, query: { status?: string; q?: string }) {
    await this.membersService.requirePermission(organizationId, actorUserId, ChurchPermission.ViewMembers);
    const filter: Record<string, unknown> = { organizationId: this.oid(organizationId, 'organization ID') };
    if (query.status && (VISIT_STATUSES as readonly string[]).includes(query.status)) filter.status = query.status;
    const q = text(query.q, 80);
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { phone: re }];
    }
    const [items, counts] = await Promise.all([
      this.visitModel.find(filter).sort({ visitDate: 1, createdAt: -1 }).limit(300).exec(),
      this.visitModel.aggregate<{ _id: string; n: number }>([
        { $match: { organizationId: this.oid(organizationId, 'organization ID') } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
    ]);
    const byStatus: Record<string, number> = Object.fromEntries(VISIT_STATUSES.map((s) => [s, 0]));
    for (const c of counts) byStatus[c._id] = c.n;
    return { items: items.map((v) => this.serialize(v, true)), counts: byStatus };
  }

  async update(
    organizationId: string,
    visitId: string,
    actorUserId: string,
    body: { status?: unknown; staffNote?: unknown; note?: unknown },
    actorName = '',
  ) {
    await this.membersService.requirePermission(organizationId, actorUserId, ChurchPermission.UpdateMember);
    const visit = await this.visitModel
      .findOne({ _id: this.oid(visitId, 'visit'), organizationId: this.oid(organizationId, 'organization ID') })
      .exec();
    if (!visit) throw new NotFoundException('Visit request not found.');

    const status = text(body.status, 20);
    const note = text(body.note, 500);
    let changed = false;
    if (status) {
      if (!(VISIT_STATUSES as readonly string[]).includes(status)) throw new BadRequestException('Unknown status.');
      if (status !== visit.status) {
        visit.status = status as VisitStatus;
        changed = true;
      }
    }
    if (typeof body.staffNote === 'string') visit.staffNote = text(body.staffNote, 2000);
    if (changed || note) {
      visit.history.push({
        at: new Date(),
        status: changed ? status : undefined,
        note,
        byUserId: new Types.ObjectId(actorUserId),
        byName: actorName,
      } as any);
    }
    await visit.save();
    return this.serialize(visit, true);
  }

  /* -------------------------------------------------------------------- mine */

  async mine(userId: string, organizationId?: string) {
    const filter: Record<string, unknown> = { userId: this.oid(userId, 'user ID') };
    if (organizationId) filter.organizationId = this.oid(organizationId, 'organization ID');
    const items = await this.visitModel.find(filter).sort({ createdAt: -1 }).limit(100).exec();
    const orgIds = [...new Set(items.map((v) => String(v.organizationId)))];
    const orgs = await this.organizationModel
      .find({ _id: { $in: orgIds.map((id) => new Types.ObjectId(id)) } })
      .select('name logoUrl')
      .lean<{ _id: Types.ObjectId; name: string; logoUrl?: string | null }[]>()
      .exec();
    const byId = new Map(orgs.map((o) => [String(o._id), o]));
    return items.map((v) => ({
      ...this.serialize(v, false),
      organizationName: byId.get(String(v.organizationId))?.name ?? '',
      organizationLogoUrl: byId.get(String(v.organizationId))?.logoUrl ?? null,
    }));
  }

  /** Visitor cancels their own request. */
  async cancelMine(userId: string, visitId: string) {
    const visit = await this.visitModel.findOne({ _id: this.oid(visitId, 'visit'), userId: this.oid(userId, 'user ID') }).exec();
    if (!visit) throw new NotFoundException('Visit request not found.');
    if (['visited', 'cancelled', 'no_show'].includes(visit.status)) return this.serialize(visit, false);
    visit.status = 'cancelled';
    visit.history.push({ at: new Date(), status: 'cancelled', note: 'Cancelled by the visitor' } as any);
    await visit.save();
    return this.serialize(visit, false);
  }
}
