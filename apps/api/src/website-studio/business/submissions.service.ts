import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { SiteContent } from '../content/content.types';
import { RequestUser, oid } from '../common/request-user';
import { WS_MODEL, WebsiteReportDocument, WebsiteSubmissionDocument } from '../schemas/website-studio.schemas';
import { WebsitesService } from '../websites/websites.service';

const TYPES = new Set(['contact', 'catering', 'newsletter', 'booking', 'reservation', 'review', 'lead']);
const STATUSES = new Set(['new', 'confirmed', 'completed', 'cancelled', 'archived']);
const RESERVATIONS_PER_SLOT = Number(process.env.WEBSITE_STUDIO_RESERVATIONS_PER_SLOT || 6);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(n: number) {
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}

/** Contact forms, leads, newsletter sign-ups, bookings and reservations. */
@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(WS_MODEL.submission) private readonly submissions: Model<WebsiteSubmissionDocument>,
    @InjectModel(WS_MODEL.report) private readonly reports: Model<WebsiteReportDocument>,
    private readonly sites: WebsitesService,
  ) {}

  /* ---------------- availability ---------------- */
  async availability(websiteId: string, q: { type: string; date: string; serviceId?: string; staffId?: string }) {
    const w = await this.sites.publishedById(websiteId);
    const content = w.publishedContent as SiteContent;
    return { date: q.date, slots: await this.computeSlots(w._id, content, q) };
  }

  private async computeSlots(websiteId: Types.ObjectId, content: SiteContent, q: { type: string; date: string; serviceId?: string; staffId?: string }): Promise<string[]> {
    if (!DATE_RE.test(q.date)) throw new BadRequestException('Invalid date.');
    const b = content.settings.booking;
    const day = new Date(`${q.date}T12:00:00Z`).getUTCDay();
    if (!b.daysOpen.includes(day)) return [];
    const today = new Date().toISOString().slice(0, 10);
    if (q.date < today) return [];
    const open = toMinutes(b.openTime || '09:00');
    const close = toMinutes(b.closeTime || '17:00');
    const step = Math.max(10, Number(b.slotMinutes) || 30);

    if (q.type === 'reservation') {
      if (!content.settings.features.reservations) throw new BadRequestException('Reservations are not enabled on this website.');
      const existing = await this.submissions.find({ websiteId, type: 'reservation', date: q.date, status: { $in: ['new', 'confirmed'] } }).select('data.time').lean();
      const counts = new Map<string, number>();
      existing.forEach((e: any) => counts.set(e.data?.time, (counts.get(e.data?.time) ?? 0) + 1));
      const out: string[] = [];
      for (let m = open; m <= close - 60; m += step) {
        const t = fromMinutes(m);
        if ((counts.get(t) ?? 0) < RESERVATIONS_PER_SLOT) out.push(t);
      }
      return this.dropPast(q.date, out);
    }

    if (!content.settings.features.booking) throw new BadRequestException('Online booking is not enabled on this website.');
    const service = content.catalog.services.find((s) => s.id === q.serviceId);
    if (!service) throw new BadRequestException('Choose a service.');
    const duration = service.durationMinutes;
    const eligibleStaff = content.catalog.staff.filter((m) => !m.serviceIds?.length || m.serviceIds.includes(service.id));
    const staffPool = q.staffId ? eligibleStaff.filter((m) => m.id === q.staffId) : eligibleStaff;
    if (q.staffId && !staffPool.length) throw new BadRequestException('This professional does not offer the selected service.');
    const capacity = Math.max(1, staffPool.length || 1);

    const existing = await this.submissions.find({ websiteId, type: 'booking', date: q.date, status: { $in: ['new', 'confirmed'] } }).select('data').lean();
    const busy = existing.map((e: any) => ({
      start: toMinutes(String(e.data?.time ?? '00:00')),
      end: toMinutes(String(e.data?.time ?? '00:00')) + Number(e.data?.durationMinutes ?? 30),
      staffId: String(e.data?.staffId ?? ''),
    }));
    const out: string[] = [];
    for (let m = open; m + duration <= close; m += step) {
      const overlapping = busy.filter((x) => x.start < m + duration && m < x.end);
      if (staffPool.length) {
        const freeStaff = staffPool.filter((s) => !overlapping.some((o) => o.staffId === s.id));
        const unassigned = overlapping.filter((o) => !o.staffId).length;
        if (freeStaff.length - unassigned > 0) out.push(fromMinutes(m));
      } else if (overlapping.length < capacity) {
        out.push(fromMinutes(m));
      }
    }
    return this.dropPast(q.date, out);
  }

  private dropPast(date: string, slots: string[]) {
    const now = new Date();
    if (date !== now.toISOString().slice(0, 10)) return slots;
    const mins = now.getUTCHours() * 60 + now.getUTCMinutes() + 30;
    return slots.filter((t) => toMinutes(t) >= mins);
  }

  /* ---------------- public submission ---------------- */
  async submit(websiteId: string, user: RequestUser | null, type: string, data: Record<string, any>) {
    if (!TYPES.has(type)) throw new BadRequestException('Unsupported form.');
    const w = await this.sites.publishedById(websiteId);
    const content = w.publishedContent as SiteContent;
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data ?? {}).slice(0, 30)) {
      if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) continue;
      if (typeof v === 'string') clean[k] = v.slice(0, 4000);
      else if (typeof v === 'number' && Number.isFinite(v)) clean[k] = v;
      else if (typeof v === 'boolean') clean[k] = v;
    }
    const email = String(clean.email ?? '');
    if (type !== 'review' && !/^\S+@\S+\.\S+$/.test(email)) throw new BadRequestException('A valid email address is required.');

    let date: string | null = null;
    if (type === 'booking' || type === 'reservation') {
      if (!DATE_RE.test(String(clean.date)) || !TIME_RE.test(String(clean.time))) throw new BadRequestException('Choose a date and time.');
      if (!String(clean.name ?? '').trim()) throw new BadRequestException('Your name is required.');
      date = clean.date;
      if (type === 'booking') {
        const service = content.catalog.services.find((s) => s.id === clean.serviceId);
        if (!service) throw new BadRequestException('Choose a service.');
        clean.serviceName = service.name;
        clean.durationMinutes = service.durationMinutes;
        clean.price = service.price;
        if (clean.staffId) {
          const st = content.catalog.staff.find((m) => m.id === clean.staffId);
          if (!st) throw new BadRequestException('Unknown professional.');
          clean.staffName = st.name;
        }
      } else {
        const party = Math.floor(Number(clean.partySize));
        if (!party || party < 1 || party > (content.settings.booking.maxPartySize || 20)) throw new BadRequestException('Invalid party size.');
        clean.partySize = party;
      }
      const slots = await this.computeSlots(w._id, content, { type, date: clean.date, serviceId: clean.serviceId, staffId: clean.staffId || undefined });
      if (!slots.includes(clean.time)) throw new ConflictException('That time was just booked. Please choose another time.');
    }

    const s = await this.submissions.create({
      websiteId: w._id,
      type,
      data: clean,
      status: 'new',
      confirmationCode: randomBytes(4).toString('hex').toUpperCase().slice(0, 6),
      userId: user ? oid(user.id) : null,
      date,
    });
    return { id: String(s._id), confirmationCode: s.confirmationCode, status: s.status };
  }

  /* ---------------- owner inbox ---------------- */
  view(s: any) {
    return { id: String(s._id), type: s.type, data: s.data, status: s.status, confirmationCode: s.confirmationCode, createdAt: s.createdAt };
  }

  async list(user: RequestUser, websiteId: string, type?: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'view');
    const filter: any = { websiteId: website._id };
    if (type && TYPES.has(type)) filter.type = type;
    const list = await this.submissions.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    return list.map((s) => this.view(s));
  }

  async updateStatus(user: RequestUser, websiteId: string, id: string, status: string) {
    const { website } = await this.sites.getAccessible(user, websiteId, 'edit');
    if (!STATUSES.has(status)) throw new BadRequestException('Invalid status.');
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Not found.');
    const s = await this.submissions.findOneAndUpdate({ _id: id, websiteId: website._id }, { $set: { status } }, { new: true }).lean();
    if (!s) throw new NotFoundException('Not found.');
    return this.view(s);
  }

  async mine(websiteId: string, user: RequestUser) {
    if (!Types.ObjectId.isValid(websiteId)) return [];
    const list = await this.submissions.find({ websiteId: oid(websiteId), userId: oid(user.id), type: { $in: ['booking', 'reservation'] } }).sort({ createdAt: -1 }).limit(100).lean();
    return list.map((s) => this.view(s));
  }

  /* ---------------- abuse reports ---------------- */
  async report(websiteId: string, user: RequestUser | null, reason: string) {
    const w = await this.sites.publishedById(websiteId);
    const text = String(reason ?? '').trim().slice(0, 2000);
    if (text.length < 5) throw new BadRequestException('Please describe the problem.');
    await this.reports.create({ websiteId: w._id, reason: text, reporterUserId: user ? oid(user.id) : null });
    return { received: true };
  }

  async adminReports() {
    const list = await this.reports.find({ status: 'open' }).sort({ createdAt: -1 }).limit(300).lean();
    const sites = await this.sites.adminList();
    const names = new Map(sites.map((s) => [s.id, s.name]));
    return list.map((r: any) => ({ id: String(r._id), websiteId: String(r.websiteId), websiteName: names.get(String(r.websiteId)) ?? 'Website', reason: r.reason, status: r.status, createdAt: r.createdAt }));
  }

  async resolveReport(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Report not found.');
    await this.reports.updateOne({ _id: id }, { $set: { status: 'resolved' } });
    return { ok: true };
  }
}
