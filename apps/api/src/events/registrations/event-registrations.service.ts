/**
 * event-registrations.service.ts
 * -----------------------------------------------------------------------------
 * Event registration: free and paid registration, waitlist, approval,
 * cancellation, organizer management, QR check-in and online-meeting access.
 *
 * Capacity is enforced atomically on the event document: `registeredSeats`
 * (and `ticketSeats.<ticketId>` for limited ticket types) is only increased by
 * a conditional update that fails when the event (or ticket) would go over its
 * limit. Places are held while a registration is confirmed, awaiting approval
 * or awaiting payment (unpaid holds expire after HOLD_MINUTES).
 *
 * Paid registrations reuse the Fockis payment service (purpose "event",
 * referenceId = registration id). A registration is confirmed only after the
 * payment is verified as paid on the server — through /confirm-payment or the
 * Stripe webhook ("payments.succeeded").
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { OnEvent } from "@nestjs/event-emitter";
import { Connection, Model, Types } from "mongoose";
import { createHash, randomBytes } from "crypto";

import { Event, EventDocument } from "../schemas/event.schema";
import { EventsService, type EventLean } from "../services/events.service";
import { getEventStatus } from "../utils/event-lifecycle";
import { UniversalPaymentService } from "../../payments/services/payment.service";
import { PaymentPurpose } from "../../payments/constants/payment-purpose.constants";
import { NotificationsService } from "../../notifications/notifications.service";
import { isOrgEventManager } from "../utils/org-manager";

import {
  ACTIVE_STATUSES,
  AttendanceStatus,
  EventRegistration,
  EventRegistrationDocument,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "./event-registration.schema";
import type {
  CancelRegistrationDto,
  CheckInDto,
  RegisterForEventDto,
  RegistrationStatusDto,
} from "./event-registration.dto";
import {
  cleanText,
  computeTotals,
  newRegistrationNumber,
  RegistrationAccess,
  RegistrationMode,
  settingsOf,
  validateAnswers,
  type AttendanceOption,
  type EventRegistrationSettings,
  type PriceBreakdown,
  type StoredAnswer,
  type TicketType,
} from "./registration-settings";
import {
  checkAdmission,
  checkCheckInGrant,
  isAdmissionCode,
  issueAdmissionCode,
  issueCheckInGrant,
  parseAdmission,
  parseCode,
} from "./registration-qr";
import { layout, RegistrationMailer, type MailEvent } from "./registration-mailer";
import { buildCsv, buildXlsx, type Cell } from "./xlsx-lite";

/* ============================================================================
   TYPES
============================================================================ */

const HOLD_MINUTES = 30;
const PROMOTED_HOLD_HOURS = 48;
const REMINDER_WINDOW_MS = 24 * 3_600_000;
const SWEEP_EVERY_MS = 10 * 60_000;

export type AvailabilityState =
  | "open"
  | "waitlist"
  | "full"
  | "not_open"
  | "closed"
  | "ended"
  | "cancelled"
  | "postponed"
  | "not_required";

export interface Availability {
  state: AvailabilityState;
  message: string;
  capacity: number | null;
  spotsLeft: number | null;
}

export interface RegistrationEventSummary {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  coverVideoUrl: string;
  coverMediaType: string;
  organizerName: string;
  startDate: string;
  endDate: string;
  timeZone: string;
  isOnline: boolean;
  locationName: string;
  address: string;
  visibility: string;
  isCancelled: boolean;
  status: string;
}

export interface PublicTicketType extends TicketType {
  remaining: number | null;
  soldOut: boolean;
}

export interface RegistrationSettingsView {
  event: RegistrationEventSummary;
  isOwner: boolean;
  mode: RegistrationMode;
  settings: {
    isFree: boolean;
    currency: string;
    ticketTypes: PublicTicketType[];
    taxRatePercent: number;
    serviceFee: number;
    maxTicketsPerUser: number;
    questions: EventRegistrationSettings["questions"];
    askAccessibility: boolean;
    askSpecialRequests: boolean;
    attendanceOptions: AttendanceOption[];
    termsText: string;
    termsUrl: string;
    cancellationPolicy: string;
    allowCancellation: boolean;
    qrCheckIn: boolean;
    confirmationEmail: boolean;
    waitlistEnabled: boolean;
    requireApproval: boolean;
    allowGuests: boolean;
    access: RegistrationAccess;
    opensAt: string | null;
    closesAt: string | null;
  };
  availability: Availability;
  viewer: {
    signedIn: boolean;
    hasAccess: boolean;
    name: string;
    email: string;
    registration: { id: string; registrationNumber: string; status: RegistrationStatus } | null;
  };
}

export interface RegistrationView {
  id: string;
  registrationNumber: string;
  status: RegistrationStatus;
  paymentStatus: RegistrationPaymentStatus;
  attendanceStatus: AttendanceStatus;
  attendeeName: string;
  attendeeEmail: string;
  phone: string;
  attendeeCount: number;
  attendees: { name: string; checkedInAt: string | null }[];
  attendanceMode: AttendanceOption;
  answers: StoredAnswer[];
  accessibilityNeeds: string;
  specialRequests: string;
  ticketTypeId: string;
  ticketName: string;
  unitPrice: number;
  subtotal: number;
  fees: number;
  tax: number;
  totalAmount: number;
  currency: string;
  registeredAt: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  checkedInAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string;
  holdExpiresAt: string | null;
  needsAttention: boolean;
  isGuest: boolean;
  canCancel: boolean;
  canPay: boolean;
  /**
   * Always null now: fixed QR codes are no longer issued (they could be
   * screenshotted and shared). Kept so older clients don't break.
   */
  ticketCode: string | null;
  /** The holder can open a live, auto-refreshing admission QR (GET .../admission). */
  liveTicket: { securityMode: "standard" | "enhanced"; ttlSeconds: number } | null;
  /** Admission is blocked for now (e.g. "dispute"). */
  admissionHold: string | null;
  event: RegistrationEventSummary | null;
}

export interface RegistrationDetail extends RegistrationView {
  qrImage: string | null;
  cancellationPolicy: string;
  isOrganizerView: boolean;
}

export interface PaymentStart {
  clientSecret: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
}

export interface RegisterResult {
  registration: RegistrationDetail;
  /** Guests only: keep it to open the ticket later (also in the email link). */
  accessKey: string | null;
  payment: PaymentStart | null;
}

export interface RegistrationStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  waitlisted: number;
  paid: number;
  free: number;
  checkedInPeople: number;
  confirmedPeople: number;
  capacity: number | null;
  revenue: number;
  currency: string;
}

export interface OrganizerListResult {
  event: RegistrationEventSummary;
  items: (RegistrationView & { userId: string | null })[];
  total: number;
  page: number;
  limit: number;
  stats: RegistrationStats;
  ticketTypes: { id: string; name: string }[];
  questions: EventRegistrationSettings["questions"];
  settings: {
    individualCheckIn: boolean;
    qrCheckIn: boolean;
    requireApproval: boolean;
    waitlistEnabled: boolean;
    ticketSecurity: "standard" | "enhanced";
    allowReentry: boolean;
  };
  isOwner: boolean;
}

export interface CheckInHolder {
  name: string;
  /** Profile photo of the account holder, when the organizer asked for photo checks. */
  photoUrl: string | null;
  ticketName: string;
  registrationNumber: string;
  attendeeCount: number;
  isGuest: boolean;
}

export interface CheckInResult {
  /**
   * verify  = valid ticket; staff must confirm the person's identity (send `grant` back).
   * reentry = already checked in and the organizer allows re-entry.
   */
  result: "checked_in" | "already_checked_in" | "undone" | "preview" | "verify" | "reentry";
  message: string;
  registration: RegistrationView;
  holder?: CheckInHolder;
  /** Short-lived permission to complete this check-in (verify / preview). */
  grant?: string;
  securityMode?: "standard" | "enhanced";
}

export interface AdmissionTicket {
  token: string;
  issuedAt: string;
  expiresAt: string;
  ttlSeconds: number;
  serverTime: string;
  securityMode: "standard" | "enhanced";
  attendanceStatus: AttendanceStatus;
  checkedInAt: string | null;
  holder: { name: string; photoUrl: string | null };
}

export interface JoinResult {
  url: string;
  opensAt: string;
  closesAt: string;
}

export interface ListQuery {
  q?: string;
  status?: string;
  payment?: string;
  attendance?: string;
  ticket?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

type LeanReg = EventRegistration & { _id: Types.ObjectId };

interface PaymentRecord {
  id: string;
  userId: Types.ObjectId;
  purpose: string;
  referenceId: string;
  status: string;
  chargedAmount: number;
  chargedCurrency: string;
  stripePaymentIntentId: string | null;
}

/* ============================================================================
   HELPERS
============================================================================ */

const iso = (d?: Date | string | null) => (d ? new Date(d).toISOString() : null);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function oid(id: string | Types.ObjectId | null | undefined, label = "ID"): Types.ObjectId {
  const s = String(id ?? "");
  if (!Types.ObjectId.isValid(s)) throw new BadRequestException(`Invalid ${label}.`);
  return new Types.ObjectId(s);
}

function webUrl(path: string): string {
  const base = String(process.env.WEB_APP_URL || process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${base}${path}`;
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function whenText(ev: { startDate: Date | string; endDate: Date | string; timeZone?: string }): string {
  const tz = ev.timeZone || "UTC";
  try {
    const day = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: tz }).format(new Date(ev.startDate));
    const t = (d: Date | string) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(d));
    const zone = new Intl.DateTimeFormat("en-US", { timeZoneName: "short", timeZone: tz }).formatToParts(new Date(ev.startDate)).find((p) => p.type === "timeZoneName")?.value ?? tz;
    return `${day}, ${t(ev.startDate)} – ${t(ev.endDate)} (${zone})`;
  } catch {
    return new Date(ev.startDate).toUTCString();
  }
}

function isDuplicateKey(error: unknown, field?: string): boolean {
  const e = error as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
  if (e?.code !== 11000) return false;
  if (!field) return true;
  return Boolean(e.keyPattern?.[field]) || String(e.message ?? "").includes(field);
}

/* ============================================================================
   SERVICE
============================================================================ */

@Injectable()
export class EventRegistrationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventRegistrationsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(EventRegistration.name)
    private readonly regModel: Model<EventRegistrationDocument>,
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly eventsService: EventsService,
    private readonly payments: UniversalPaymentService,
    private readonly mailer: RegistrationMailer,
    @Optional()
    private readonly notifications?: NotificationsService,
  ) {}

  /* ==========================================================================
     BACKGROUND: expire unpaid holds, send reminders
  ========================================================================== */

  onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => {
      void this.sweep().catch((e) => this.logger.warn(`Registration sweep failed: ${String(e)}`));
    }, SWEEP_EVERY_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(): Promise<void> {
    await this.expireHolds();
    await this.sendDueReminders();
  }

  /* ==========================================================================
     SMALL HELPERS
  ========================================================================== */

  private summary(event: EventLean, organizerName = ""): RegistrationEventSummary {
    return {
      id: String(event._id),
      title: event.title,
      description: event.description ?? "",
      coverImageUrl: event.coverImageUrl ?? "",
      coverVideoUrl: event.coverVideoUrl ?? "",
      coverMediaType: String(event.coverMediaType ?? "image"),
      organizerName,
      startDate: new Date(event.startDate).toISOString(),
      endDate: new Date(event.endDate).toISOString(),
      timeZone: event.timeZone ?? "",
      isOnline: Boolean(event.isOnline),
      locationName: event.locationName ?? "",
      address: event.address ?? "",
      visibility: String(event.visibility ?? "public"),
      isCancelled: Boolean(event.isCancelled),
      status: String(getEventStatus(event)),
    };
  }

  private mailEvent(event: EventLean): MailEvent {
    const settings = settingsOf(event);
    const online = event.isOnline || settings.attendanceOptions.includes("online");
    const place = [event.locationName, event.address].filter(Boolean).join(", ");
    return {
      title: event.title,
      when: whenText(event),
      where: event.isOnline ? "Online event (Fockis Meeting)" : `${place || "Location to be announced"}${online ? " · also online" : ""}`,
      url: webUrl(`/events/${String(event._id)}`),
    };
  }

  private async userNames(ids: Types.ObjectId[]): Promise<Map<string, { name: string; email: string }>> {
    const out = new Map<string, { name: string; email: string }>();
    const userModel = this.connection.models["User"];
    if (!userModel || !ids.length) return out;
    try {
      const users = (await userModel.find({ _id: { $in: ids } }).select("firstName lastName username email").lean().exec()) as unknown as {
        _id: Types.ObjectId;
        firstName?: string;
        lastName?: string;
        username?: string;
        email?: string;
      }[];
      for (const u of users) {
        const name = [u.firstName, u.lastName].map((x) => String(x ?? "").trim()).filter(Boolean).join(" ") || String(u.username ?? "");
        out.set(String(u._id), { name, email: String(u.email ?? "") });
      }
    } catch (e) {
      this.logger.warn(`User lookup failed: ${String(e)}`);
    }
    return out;
  }

  private async organizerName(event: EventLean): Promise<string> {
    return (await this.userNames([event.creatorId as Types.ObjectId])).get(String(event.creatorId))?.name ?? "";
  }

  private async loadEvent(eventId: string | Types.ObjectId): Promise<EventLean> {
    const event = (await this.eventModel.findById(oid(eventId, "event ID")).lean().exec()) as unknown as EventLean | null;
    if (!event) throw new NotFoundException("Event not found.");
    return event;
  }

  private isOrganizer(event: EventLean, userId?: string): boolean {
    return Boolean(userId && String(event.creatorId) === userId);
  }

  /** Organizer, or an event manager of the event's organization. */
  private async manages(event: EventLean, userId?: string): Promise<boolean> {
    if (this.isOrganizer(event, userId)) return true;
    const orgId = (event as { organizationId?: unknown }).organizationId;
    return Boolean(orgId && userId) && isOrgEventManager(this.connection, orgId, userId);
  }

  private isStaff(event: EventLean, userId?: string): boolean {
    if (!userId) return false;
    return this.isOrganizer(event, userId) || settingsOf(event).checkInStaffIds.includes(userId);
  }

  /** Members-only / selected-people access (the organizer always has access). */
  async hasAccess(event: EventLean, userId?: string): Promise<boolean> {
    const s = settingsOf(event);
    if (this.isOrganizer(event, userId)) return true;
    if (s.access === RegistrationAccess.PUBLIC) return true;
    if (!userId || !Types.ObjectId.isValid(userId)) return false;
    const user = new Types.ObjectId(userId);
    if (s.access === RegistrationAccess.MEMBERS) {
      if (!s.organizationId) return false;
      const member = await this.connection
        .collection("church_members")
        .findOne({ organizationId: new Types.ObjectId(s.organizationId), userId: user, status: "active" }, { projection: { _id: 1 } });
      return Boolean(member);
    }
    // SELECTED: invited people, or members of a selected group.
    if ((event.invitedIds ?? []).some((id) => String(id) === userId)) return true;
    if (!s.selectedGroupIds.length) return false;
    const group = await this.connection
      .collection("groups")
      .findOne({ _id: { $in: s.selectedGroupIds.map((g) => new Types.ObjectId(g)) }, members: user }, { projection: { _id: 1 } });
    return Boolean(group);
  }

  availability(event: EventLean, now = new Date()): Availability {
    const s = settingsOf(event);
    const capacity = typeof event.capacity === "number" && event.capacity > 0 ? event.capacity : null;
    const taken = Number((event as { registeredSeats?: number }).registeredSeats ?? 0);
    const spotsLeft = capacity === null ? null : Math.max(0, capacity - taken);
    const base = { capacity, spotsLeft };
    if (event.isCancelled) return { ...base, state: "cancelled", message: "This event was cancelled." };
    if (now.getTime() >= new Date(event.endDate).getTime()) return { ...base, state: "ended", message: "This event has ended." };
    if ((event as { isPostponed?: boolean }).isPostponed) return { ...base, state: "postponed", message: "This event has been postponed. Registration reopens once it has a new date." };
    if (s.mode !== RegistrationMode.REQUIRED) return { ...base, state: "not_required", message: "This event doesn't require registration." };
    if (s.opensAt && now < s.opensAt) return { ...base, state: "not_open", message: `Registration opens ${whenText({ startDate: s.opensAt, endDate: s.opensAt, timeZone: event.timeZone }).split(" – ")[0]}.` };
    if (s.closesAt && now >= s.closesAt) return { ...base, state: "closed", message: "Registration for this event has closed." };
    if (spotsLeft === 0) {
      return s.waitlistEnabled
        ? { ...base, state: "waitlist", message: "This event is full. You can join the waitlist." }
        : { ...base, state: "full", message: "This event is full." };
    }
    return { ...base, state: "open", message: "Registration is open." };
  }

  private ticketRemaining(event: EventLean, t: TicketType): number | null {
    if (t.quantity === null) return null;
    const sold = Number(((event as { ticketSeats?: Record<string, number> }).ticketSeats ?? {})[t.id] ?? 0);
    return Math.max(0, t.quantity - sold);
  }

  /* ==========================================================================
     SEATS (atomic)
  ========================================================================== */

  private async acquireSeats(eventId: Types.ObjectId, ticket: TicketType, n: number): Promise<boolean> {
    const conds: unknown[] = [
      {
        $or: [
          { $not: [{ $gt: [{ $ifNull: ["$capacity", 0] }, 0] }] },
          { $lte: [{ $add: [{ $ifNull: ["$registeredSeats", 0] }, n] }, "$capacity"] },
        ],
      },
    ];
    if (ticket.quantity !== null) {
      conds.push({
        $lte: [{ $add: [{ $ifNull: [{ $getField: { field: ticket.id, input: { $ifNull: ["$ticketSeats", {}] } } }, 0] }, n] }, ticket.quantity],
      });
    }
    const res = await this.eventModel
      .updateOne({ _id: eventId, isCancelled: false, isPostponed: { $ne: true }, endDate: { $gt: new Date() }, $expr: { $and: conds } } as Record<string, unknown>, {
        $inc: { registeredSeats: n, [`ticketSeats.${ticket.id}`]: n },
      })
      .exec();
    return res.modifiedCount === 1;
  }

  private async releaseSeats(eventId: Types.ObjectId, ticketId: string, n: number): Promise<void> {
    await this.eventModel.updateOne({ _id: eventId }, { $inc: { registeredSeats: -n, [`ticketSeats.${ticketId}`]: -n } }).exec();
    // Never leave a negative count behind (e.g. after manual database edits).
    await this.eventModel.updateOne({ _id: eventId, registeredSeats: { $lt: 0 } }, { $set: { registeredSeats: 0 } }).exec();
    await this.eventModel
      .updateOne({ _id: eventId, [`ticketSeats.${ticketId}`]: { $lt: 0 } } as Record<string, unknown>, { $set: { [`ticketSeats.${ticketId}`]: 0 } })
      .exec();
  }

  /* ==========================================================================
     VIEWS
  ========================================================================== */

  private canCancel(reg: LeanReg, event: EventLean | null): boolean {
    if (!event || !ACTIVE_STATUSES.includes(reg.status)) return false;
    const s = settingsOf(event);
    if (!s.allowCancellation || event.isCancelled) return false;
    const deadline = new Date(event.startDate).getTime() - s.cancellationDeadlineHours * 3_600_000;
    return Date.now() < deadline;
  }

  private view(reg: LeanReg, event: EventLean | null, eventSummary: RegistrationEventSummary | null, withCode: boolean): RegistrationView {
    const s = event ? settingsOf(event) : null;
    const live =
      withCode &&
      s?.qrCheckIn &&
      reg.status === RegistrationStatus.CONFIRMED &&
      !reg.admissionHold &&
      event &&
      !event.isCancelled &&
      new Date(event.endDate).getTime() > Date.now()
        ? { securityMode: s.ticketSecurity, ttlSeconds: s.qrTtlSeconds }
        : null;
    return {
      id: String(reg._id),
      registrationNumber: reg.registrationNumber,
      status: reg.status,
      paymentStatus: reg.paymentStatus,
      attendanceStatus: reg.attendanceStatus ?? AttendanceStatus.NOT_CHECKED_IN,
      attendeeName: reg.attendeeName,
      attendeeEmail: reg.attendeeEmail,
      phone: reg.phone ?? "",
      attendeeCount: reg.attendeeCount,
      attendees: (reg.attendees ?? []).map((a) => ({ name: a.name, checkedInAt: iso(a.checkedInAt) })),
      attendanceMode: reg.attendanceMode,
      answers: reg.customAnswers ?? [],
      accessibilityNeeds: reg.accessibilityNeeds ?? "",
      specialRequests: reg.specialRequests ?? "",
      ticketTypeId: reg.ticketTypeId,
      ticketName: reg.ticketName,
      unitPrice: reg.unitPrice,
      subtotal: reg.subtotal,
      fees: reg.fees ?? 0,
      tax: reg.tax ?? 0,
      totalAmount: reg.totalAmount,
      currency: reg.currency,
      registeredAt: iso(reg.registeredAt),
      confirmedAt: iso(reg.confirmedAt),
      paidAt: iso(reg.paidAt),
      checkedInAt: iso(reg.checkedInAt),
      cancelledAt: iso(reg.cancelledAt),
      cancellationReason: reg.cancellationReason ?? "",
      holdExpiresAt: iso(reg.holdExpiresAt),
      needsAttention: Boolean(reg.needsAttention),
      isGuest: !reg.userId,
      canCancel: this.canCancel(reg, event),
      canPay: reg.status === RegistrationStatus.PENDING_PAYMENT && Boolean(reg.userId),
      ticketCode: null,
      liveTicket: live,
      admissionHold: reg.admissionHold ?? null,
      event: eventSummary,
    };
  }

  private async detail(reg: LeanReg, event: EventLean, opts: { organizerView: boolean; withCode: boolean }): Promise<RegistrationDetail> {
    const summary = this.summary(event, await this.organizerName(event));
    const v = this.view(reg, event, summary, opts.withCode);
    return {
      ...v,
      // Fixed QR images are no longer issued; the ticket page shows a live code.
      qrImage: null,
      cancellationPolicy: settingsOf(event).cancellationPolicy,
      isOrganizerView: opts.organizerView,
    };
  }

  /* ==========================================================================
     SETTINGS (what the registration page needs)
  ========================================================================== */

  async getSettings(eventId: string, viewerId?: string): Promise<RegistrationSettingsView> {
    const event = await this.eventsService.getViewable(eventId, viewerId);
    await this.expireHolds(event._id);
    const fresh = await this.loadEvent(event._id);
    const s = settingsOf(fresh);
    const [organizerName, access] = await Promise.all([this.organizerName(fresh), this.hasAccess(fresh, viewerId)]);

    let name = "";
    let email = "";
    let existing: RegistrationSettingsView["viewer"]["registration"] = null;
    if (viewerId) {
      const me = (await this.userNames([oid(viewerId, "user ID")])).get(viewerId);
      name = me?.name ?? "";
      email = me?.email ?? "";
      const reg = (await this.regModel
        .findOne({ eventId: fresh._id, userId: oid(viewerId), status: { $in: ACTIVE_STATUSES } })
        .select({ registrationNumber: 1, status: 1 })
        .lean()
        .exec()) as unknown as LeanReg | null;
      if (reg) existing = { id: String(reg._id), registrationNumber: reg.registrationNumber, status: reg.status };
    }

    return {
      event: this.summary(fresh, organizerName),
      isOwner: await this.manages(fresh, viewerId),
      mode: s.mode,
      settings: {
        isFree: s.isFree,
        currency: s.currency,
        ticketTypes: s.ticketTypes.map((t) => {
          const remaining = this.ticketRemaining(fresh, t);
          return { ...t, remaining, soldOut: remaining === 0 };
        }),
        taxRatePercent: s.taxRatePercent,
        serviceFee: s.serviceFee,
        maxTicketsPerUser: s.maxTicketsPerUser,
        questions: s.questions,
        askAccessibility: s.askAccessibility,
        askSpecialRequests: s.askSpecialRequests,
        attendanceOptions: s.attendanceOptions,
        termsText: s.termsText,
        termsUrl: s.termsUrl,
        cancellationPolicy: s.cancellationPolicy,
        allowCancellation: s.allowCancellation,
        qrCheckIn: s.qrCheckIn,
        confirmationEmail: s.confirmationEmail,
        waitlistEnabled: s.waitlistEnabled,
        requireApproval: s.requireApproval,
        allowGuests: s.allowGuests && String(fresh.visibility ?? "public") === "public",
        access: s.access,
        opensAt: iso(s.opensAt),
        closesAt: iso(s.closesAt),
      },
      availability: this.availability(fresh),
      viewer: { signedIn: Boolean(viewerId), hasAccess: access, name, email, registration: existing },
    };
  }

  /* ==========================================================================
     REGISTER
  ========================================================================== */

  async register(eventId: string, viewerId: string | undefined, dto: RegisterForEventDto): Promise<RegisterResult> {
    const visible = await this.eventsService.getViewable(eventId, viewerId);
    await this.expireHolds(visible._id);
    const event = await this.loadEvent(visible._id);
    const s = settingsOf(event);

    if (s.mode !== RegistrationMode.REQUIRED) {
      throw new BadRequestException(s.mode === RegistrationMode.RSVP ? "This event uses RSVP instead of registration." : "This event doesn't take registrations.");
    }
    if (this.isOrganizer(event, viewerId)) throw new BadRequestException("You're the organizer of this event.");

    const availability = this.availability(event);
    if (availability.state !== "open" && availability.state !== "waitlist" && availability.state !== "full") {
      throw new BadRequestException(availability.message);
    }

    // Who may register
    if (!viewerId) {
      if (!s.allowGuests || String(event.visibility ?? "public") !== "public") throw new UnauthorizedException("Please sign in to register for this event.");
    }
    if (!(await this.hasAccess(event, viewerId))) {
      throw new ForbiddenException(
        s.access === RegistrationAccess.MEMBERS ? "Registration is for members of the organization only." : "Registration is limited to invited people and selected groups.",
      );
    }

    // What they register for
    const ticket = s.ticketTypes.find((t) => t.id === (dto.ticketTypeId ?? s.ticketTypes[0]?.id)) ?? null;
    if (!ticket) throw new BadRequestException("Choose a ticket type.");
    const count = dto.attendeeCount;
    if (count > s.maxTicketsPerUser) throw new BadRequestException(`You can register at most ${s.maxTicketsPerUser} ${s.maxTicketsPerUser === 1 ? "person" : "people"}.`);
    const mode: AttendanceOption = dto.attendanceMode && s.attendanceOptions.includes(dto.attendanceMode) ? dto.attendanceMode : s.attendanceOptions[0];
    if (dto.attendanceMode && !s.attendanceOptions.includes(dto.attendanceMode)) throw new BadRequestException("Choose an attendance option this event offers.");
    const answers = validateAnswers(s.questions, dto.answers);
    const totals: PriceBreakdown = computeTotals(s, ticket.price, count);
    const paid = totals.total > 0;
    if (paid && !viewerId) throw new UnauthorizedException("Please sign in to buy tickets.");

    const name = cleanText(dto.attendeeName, 120);
    const email = cleanText(dto.attendeeEmail, 254).toLowerCase();
    if (!name) throw new BadRequestException("Enter your full name.");
    const guestNames = (dto.guestNames ?? []).map((n) => cleanText(n, 120));
    const attendees = Array.from({ length: count }, (_, i) => ({
      name: i === 0 ? name : guestNames[i - 1] || `${name} — guest ${i}`,
      checkedInAt: null,
      checkedInBy: null,
    }));

    // Places
    const held = await this.acquireSeats(event._id, ticket, count);
    let status: RegistrationStatus;
    if (held) {
      status = s.requireApproval ? RegistrationStatus.PENDING_APPROVAL : paid ? RegistrationStatus.PENDING_PAYMENT : RegistrationStatus.CONFIRMED;
    } else if (s.waitlistEnabled) {
      status = RegistrationStatus.WAITLISTED;
    } else {
      const remaining = this.ticketRemaining(event, ticket);
      throw new ConflictException(remaining === 0 ? `"${ticket.name}" is sold out.` : "Sorry — there aren't enough places left for this registration.");
    }

    const accessKey = viewerId ? null : randomBytes(24).toString("base64url");
    const now = new Date();
    const base = {
      eventId: event._id,
      organizerId: event.creatorId,
      userId: viewerId ? oid(viewerId, "user ID") : null,
      activeKey: viewerId ? `${String(event._id)}:u:${viewerId}` : `${String(event._id)}:e:${email}`,
      attendeeName: name,
      attendeeEmail: email,
      phone: cleanText(dto.phone, 40),
      attendeeCount: count,
      attendees,
      attendanceMode: mode,
      customAnswers: answers,
      accessibilityNeeds: s.askAccessibility ? cleanText(dto.accessibilityNeeds, 500) : "",
      specialRequests: s.askSpecialRequests ? cleanText(dto.specialRequests, 500) : "",
      agreedToTermsAt: now,
      ticketTypeId: ticket.id,
      ticketName: ticket.name,
      unitPrice: totals.unitPrice,
      subtotal: totals.subtotal,
      fees: totals.fees,
      tax: totals.tax,
      totalAmount: totals.total,
      currency: totals.currency,
      paymentStatus: paid ? RegistrationPaymentStatus.PENDING : RegistrationPaymentStatus.NOT_REQUIRED,
      status,
      holdsSeats: held,
      holdExpiresAt: status === RegistrationStatus.PENDING_PAYMENT ? new Date(now.getTime() + HOLD_MINUTES * 60_000) : null,
      registeredAt: now,
      confirmedAt: status === RegistrationStatus.CONFIRMED ? now : null,
      accessKeyHash: accessKey ? sha256(accessKey) : null,
      eventStartDate: event.startDate,
      eventEndDate: event.endDate,
    };

    let created: EventRegistrationDocument | null = null;
    for (let attempt = 0; attempt < 4 && !created; attempt++) {
      try {
        created = await this.regModel.create({ ...base, registrationNumber: newRegistrationNumber() });
      } catch (error) {
        if (isDuplicateKey(error, "registrationNumber")) continue;
        if (held) await this.releaseSeats(event._id, ticket.id, count);
        if (isDuplicateKey(error, "activeKey") || isDuplicateKey(error)) {
          throw new ConflictException(viewerId ? "You're already registered for this event." : "This email address is already registered for this event.");
        }
        throw error;
      }
    }
    if (!created) {
      if (held) await this.releaseSeats(event._id, ticket.id, count);
      throw new ConflictException("Please try again.");
    }
    const reg = created.toObject() as unknown as LeanReg;

    let payment: PaymentStart | null = null;
    if (status === RegistrationStatus.PENDING_PAYMENT) {
      try {
        payment = await this.startPayment(reg, viewerId as string, dto.country);
      } catch (error) {
        await this.release(reg, RegistrationStatus.EXPIRED, null, "Payment could not be started.");
        throw error;
      }
    }

    if (status === RegistrationStatus.CONFIRMED) await this.afterConfirmed(reg, event, false);
    else if (status === RegistrationStatus.WAITLISTED) await this.tellWaitlisted(reg, event);
    else if (status === RegistrationStatus.PENDING_APPROVAL) await this.tellPendingApproval(reg, event);

    const fresh = (await this.regModel.findById(reg._id).lean().exec()) as unknown as LeanReg;
    return {
      registration: await this.detail(fresh, event, { organizerView: false, withCode: true }),
      accessKey,
      payment,
    };
  }

  /* ==========================================================================
     PAYMENT
  ========================================================================== */

  private async startPayment(reg: LeanReg, userId: string, country?: string): Promise<PaymentStart> {
    const res = await this.payments.createPayment(userId, {
      purpose: PaymentPurpose.EVENT,
      referenceId: String(reg._id),
      baseAmount: reg.totalAmount,
      baseCurrency: reg.currency,
      country: /^[A-Za-z]{2}$/.test(String(country ?? "")) ? String(country).toUpperCase() : "US",
      idempotencyKey: `event-registration-${String(reg._id)}`,
      metadata: { eventId: String(reg.eventId), registrationNumber: reg.registrationNumber },
    });
    if (!res.clientSecret) throw new BadRequestException("The payment could not be started. Please try again.");
    await this.regModel.updateOne({ _id: reg._id }, { $set: { paymentId: res.paymentId, paymentIntentId: res.stripePaymentIntentId ?? null } }).exec();
    return { clientSecret: res.clientSecret, paymentIntentId: res.stripePaymentIntentId ?? null, amount: res.chargedAmount, currency: res.chargedCurrency };
  }

  /** Continue paying a registration that is waiting for payment. */
  async resumePayment(registrationId: string, userId: string, country?: string): Promise<PaymentStart> {
    const reg = await this.ownRegistration(registrationId, userId);
    if (reg.status !== RegistrationStatus.PENDING_PAYMENT) throw new BadRequestException("This registration doesn't need a payment.");
    if (reg.holdExpiresAt && reg.holdExpiresAt.getTime() < Date.now()) {
      await this.expireHolds(reg.eventId);
      throw new BadRequestException("Your reservation expired. Please register again.");
    }
    return this.startPayment(reg, userId, country);
  }

  /** Called by the registrant after Stripe confirms the card payment. */
  async confirmPayment(registrationId: string, userId: string, paymentIntentId: string): Promise<RegistrationDetail> {
    const reg = await this.ownRegistration(registrationId, userId);
    // Verifies the intent with Stripe and records it (the payment service owns that).
    await this.payments.confirmPayment(userId, paymentIntentId);
    const record = await this.paymentRecord({ stripePaymentIntentId: paymentIntentId });
    if (!record || record.referenceId !== String(reg._id)) throw new BadRequestException("This payment doesn't belong to this registration.");
    await this.fulfill(record);
    const fresh = (await this.regModel.findById(reg._id).lean().exec()) as unknown as LeanReg;
    const event = await this.loadEvent(fresh.eventId);
    if (fresh.status === RegistrationStatus.PENDING_PAYMENT) throw new BadRequestException("The payment hasn't completed yet. If you were charged, your registration will update automatically.");
    return this.detail(fresh, event, { organizerView: false, withCode: true });
  }

  /** Stripe webhook path (and /payments/confirm): emitted by the payment service. */
  @OnEvent("payments.succeeded")
  async onPaymentSucceeded(payload: { paymentId?: string; purpose?: string; referenceId?: string }): Promise<void> {
    if (payload?.purpose !== PaymentPurpose.EVENT || !payload.paymentId) return;
    try {
      const record = await this.paymentRecord({ id: payload.paymentId });
      if (record) await this.fulfill(record);
    } catch (e) {
      this.logger.error(`Event registration payment ${payload.paymentId} could not be applied: ${String(e)}`);
    }
  }

  private async paymentRecord(filter: Record<string, unknown>): Promise<PaymentRecord | null> {
    return (await this.connection.collection("payments").findOne(filter)) as unknown as PaymentRecord | null;
  }

  /** Idempotent: confirms the registration once the verified payment covers it. */
  private async fulfill(record: PaymentRecord): Promise<void> {
    if (record.purpose !== PaymentPurpose.EVENT || record.status !== "paid") return;
    if (!Types.ObjectId.isValid(record.referenceId)) return;
    const reg = (await this.regModel.findById(record.referenceId).lean().exec()) as unknown as LeanReg | null;
    if (!reg) return;
    if (reg.paymentStatus === RegistrationPaymentStatus.PAID) return;
    if (!reg.userId || String(reg.userId) !== String(record.userId)) {
      this.logger.error(`Payment ${record.id} user does not match registration ${record.referenceId}.`);
      return;
    }
    if (String(record.chargedCurrency).toUpperCase() !== reg.currency || Math.abs(Number(record.chargedAmount) - reg.totalAmount) > 0.005) {
      this.logger.error(`Payment ${record.id} amount does not match registration ${record.referenceId}.`);
      return;
    }
    const event = await this.loadEvent(reg.eventId);
    const now = new Date();
    const paidFields = {
      paymentStatus: RegistrationPaymentStatus.PAID,
      paymentId: record.id,
      paymentIntentId: record.stripePaymentIntentId,
      paidAt: now,
      holdExpiresAt: null,
    };

    // Normal case: the places are still held.
    const confirmed = (await this.regModel
      .findOneAndUpdate(
        { _id: reg._id, status: RegistrationStatus.PENDING_PAYMENT },
        { $set: { ...paidFields, status: RegistrationStatus.CONFIRMED, confirmedAt: now } },
        { new: true },
      )
      .lean()
      .exec()) as unknown as LeanReg | null;
    if (confirmed) {
      await this.afterConfirmed(confirmed, event, true);
      return;
    }

    // Paid after the hold lapsed (or after cancelling): take places again if any.
    if (reg.status === RegistrationStatus.EXPIRED || reg.status === RegistrationStatus.CANCELLED) {
      const ticket = settingsOf(event).ticketTypes.find((t) => t.id === reg.ticketTypeId) ?? { id: reg.ticketTypeId, name: reg.ticketName, description: "", price: reg.unitPrice, quantity: null };
      const got = await this.acquireSeats(event._id, ticket, reg.attendeeCount);
      const key = reg.userId ? `${String(reg.eventId)}:u:${String(reg.userId)}` : null;
      try {
        const updated = (await this.regModel
          .findOneAndUpdate(
            { _id: reg._id, status: reg.status },
            {
              $set: {
                ...paidFields,
                status: got ? RegistrationStatus.CONFIRMED : RegistrationStatus.WAITLISTED,
                confirmedAt: got ? now : null,
                holdsSeats: got,
                needsAttention: !got,
                activeKey: key,
                cancelledAt: null,
              },
            },
            { new: true },
          )
          .lean()
          .exec()) as unknown as LeanReg | null;
        if (!updated) {
          if (got) await this.releaseSeats(event._id, ticket.id, reg.attendeeCount);
          return;
        }
        if (got) await this.afterConfirmed(updated, event, true);
        else await this.tellPaidButFull(updated, event);
      } catch (error) {
        // The person registered again meanwhile: keep the payment on record for the organizer.
        if (got) await this.releaseSeats(event._id, ticket.id, reg.attendeeCount);
        await this.regModel.updateOne({ _id: reg._id }, { $set: { ...paidFields, needsAttention: true } }).exec();
        await this.tellPaidButFull({ ...reg, ...paidFields, needsAttention: true } as LeanReg, event);
        if (!isDuplicateKey(error)) throw error;
      }
    }
  }

  /* ==========================================================================
     AFTER CONFIRMATION / MESSAGES
  ========================================================================== */

  private async notify(userId: Types.ObjectId | null, title: string, message: string, link: string, entityId: string): Promise<void> {
    if (!userId || !this.notifications) return;
    try {
      await this.notifications.create({ recipientId: String(userId), type: "SYSTEM", title, message, entityId, entityType: "event_registration", link });
    } catch (e) {
      this.logger.warn(`Notification failed: ${String(e)}`);
    }
  }

  private ticketLink(reg: LeanReg, accessKey?: string): string {
    return webUrl(`/events/registrations/${String(reg._id)}${accessKey ? `?key=${encodeURIComponent(accessKey)}` : ""}`);
  }

  private async afterConfirmed(reg: LeanReg, event: EventLean, paid: boolean): Promise<void> {
    const s = settingsOf(event);
    if (reg.userId) {
      // Show the event as "Going" everywhere the existing Events UI looks.
      await this.eventModel.updateOne({ _id: event._id }, { $addToSet: { attendeeIds: reg.userId }, $pull: { interestedIds: reg.userId } }).exec();
    }
    const people = reg.attendeeCount === 1 ? "1 person" : `${reg.attendeeCount} people`;
    const link = reg.userId ? this.ticketLink(reg) : webUrl(`/events/${String(event._id)}`);
    await this.notify(reg.userId, "You're registered!", `${event.title} · ${reg.registrationNumber}`, `/events/registrations/${String(reg._id)}`, String(reg._id));

    if (s.confirmationEmail && !reg.confirmationSentAt) {
      const lines = [
        `Hi ${reg.attendeeName.split(" ")[0]}, you're registered for <strong>${event.title.replace(/</g, "&lt;")}</strong> (${people}).`,
        `Registration ID: <strong>${reg.registrationNumber}</strong> · Ticket: ${reg.ticketName.replace(/</g, "&lt;")}`,
        paid
          ? `Payment received: <strong>${money(reg.totalAmount, reg.currency)}</strong>. Thank you!`
          : `This event is free. <strong>No payment was required.</strong>`,
        s.qrCheckIn ? "At the entrance, open your ticket in Fockis and show the live QR code (it changes every few seconds, so screenshots and printouts won't work)." : "",
        event.isOnline || reg.attendanceMode === "online" ? "The Join Meeting button appears on your ticket shortly before the event starts." : "",
      ].filter(Boolean);
      const { html, text } = layout(paid ? "Payment confirmed — you're registered" : "You're registered!", lines, this.mailEvent(event), {
        label: "View your ticket",
        url: link,
      });
      const sent = await this.mailer.send({ to: reg.attendeeEmail, subject: `${paid ? "Payment confirmed" : "Registration confirmed"}: ${event.title}`, html, text });
      if (sent) await this.regModel.updateOne({ _id: reg._id }, { $set: { confirmationSentAt: new Date() } }).exec();
    }
  }

  private async tellWaitlisted(reg: LeanReg, event: EventLean) {
    await this.notify(reg.userId, "You're on the waitlist", `${event.title} — we'll let you know if a place opens.`, `/events/registrations/${String(reg._id)}`, String(reg._id));
    const { html, text } = layout("You're on the waitlist", [
      `The event is full right now, so you've been added to the waitlist for <strong>${event.title.replace(/</g, "&lt;")}</strong>.`,
      `Registration ID: <strong>${reg.registrationNumber}</strong>. We'll email you as soon as a place opens.`,
    ], this.mailEvent(event));
    await this.mailer.send({ to: reg.attendeeEmail, subject: `Waitlist: ${event.title}`, html, text });
  }

  private async tellPendingApproval(reg: LeanReg, event: EventLean) {
    await this.notify(reg.userId, "Registration received", `${event.title} — the organizer will review it.`, `/events/registrations/${String(reg._id)}`, String(reg._id));
    await this.notify(event.creatorId as Types.ObjectId, "New registration to review", `${reg.attendeeName} registered for ${event.title}.`, `/events/${String(event._id)}/registrations?status=pending_approval`, String(event._id));
    const { html, text } = layout("Registration received", [
      `Thanks for registering for <strong>${event.title.replace(/</g, "&lt;")}</strong>. The organizer reviews every registration; we'll email you when it's approved.`,
      `Registration ID: <strong>${reg.registrationNumber}</strong>`,
    ], this.mailEvent(event));
    await this.mailer.send({ to: reg.attendeeEmail, subject: `Registration received: ${event.title}`, html, text });
  }

  private async tellPaidButFull(reg: LeanReg, event: EventLean) {
    await this.notify(event.creatorId as Types.ObjectId, "Paid registration needs attention", `${reg.attendeeName} paid after their reservation expired and the event is full.`, `/events/${String(event._id)}/registrations`, String(event._id));
    await this.notify(reg.userId, "Payment received — waiting for a place", `${event.title}: the organizer will confirm your place or refund you.`, `/events/registrations/${String(reg._id)}`, String(reg._id));
  }

  /* ==========================================================================
     RELEASE / CANCEL / WAITLIST
  ========================================================================== */

  /** Move an active registration to an inactive status and give its places back. */
  private async release(reg: LeanReg, to: RegistrationStatus, actorId: string | null, reason: string): Promise<LeanReg | null> {
    const updated = (await this.regModel
      .findOneAndUpdate(
        { _id: reg._id, status: { $in: ACTIVE_STATUSES } },
        {
          $set: {
            status: to,
            activeKey: null,
            holdsSeats: false,
            holdExpiresAt: null,
            cancelledAt: new Date(),
            cancelledBy: actorId && Types.ObjectId.isValid(actorId) ? new Types.ObjectId(actorId) : null,
            cancellationReason: cleanText(reason, 500),
            ...(to === RegistrationStatus.REJECTED ? { decidedAt: new Date() } : {}),
          },
          $inc: { qrVersion: 1 },
        },
        { new: true },
      )
      .lean()
      .exec()) as unknown as LeanReg | null;
    if (!updated) return null;
    if (reg.holdsSeats) await this.releaseSeats(reg.eventId, reg.ticketTypeId, reg.attendeeCount);
    if (reg.userId && reg.status === RegistrationStatus.CONFIRMED) {
      await this.eventModel.updateOne({ _id: reg.eventId, creatorId: { $ne: reg.userId } }, { $pull: { attendeeIds: reg.userId } }).exec();
    }
    return updated;
  }

  /** Release unpaid holds whose time ran out, then offer the places to the waitlist. */
  async expireHolds(eventId?: Types.ObjectId): Promise<number> {
    const filter: Record<string, unknown> = { status: RegistrationStatus.PENDING_PAYMENT, holdExpiresAt: { $lt: new Date() } };
    if (eventId) filter.eventId = eventId;
    const stale = (await this.regModel.find(filter).limit(200).lean().exec()) as unknown as LeanReg[];
    const touched = new Set<string>();
    for (const reg of stale) {
      const done = await this.release(reg, RegistrationStatus.EXPIRED, null, "Payment was not completed in time.");
      if (done) touched.add(String(reg.eventId));
    }
    for (const id of touched) await this.promoteWaitlist(new Types.ObjectId(id));
    return stale.length;
  }

  /** Give freed places to the oldest waitlisted registrations that fit. */
  private async promoteWaitlist(eventId: Types.ObjectId): Promise<void> {
    const event = await this.loadEvent(eventId).catch(() => null);
    if (!event || event.isCancelled) return;
    const s = settingsOf(event);
    if (!s.waitlistEnabled) return;
    const waiting = (await this.regModel
      .find({ eventId, status: RegistrationStatus.WAITLISTED })
      .sort({ registeredAt: 1 })
      .limit(50)
      .lean()
      .exec()) as unknown as LeanReg[];
    for (const reg of waiting) {
      const ok = await this.promote(reg, event, null);
      if (!ok) break;
    }
  }

  private async promote(reg: LeanReg, event: EventLean, actorId: string | null): Promise<boolean> {
    const s = settingsOf(event);
    const ticket = s.ticketTypes.find((t) => t.id === reg.ticketTypeId) ?? { id: reg.ticketTypeId, name: reg.ticketName, description: "", price: reg.unitPrice, quantity: null };
    if (!(await this.acquireSeats(event._id, ticket, reg.attendeeCount))) return false;
    const alreadyPaid = reg.paymentStatus === RegistrationPaymentStatus.PAID;
    const next =
      s.requireApproval && !actorId
        ? RegistrationStatus.PENDING_APPROVAL
        : reg.totalAmount > 0 && !alreadyPaid
          ? RegistrationStatus.PENDING_PAYMENT
          : RegistrationStatus.CONFIRMED;
    const now = new Date();
    const updated = (await this.regModel
      .findOneAndUpdate(
        { _id: reg._id, status: RegistrationStatus.WAITLISTED },
        {
          $set: {
            status: next,
            holdsSeats: true,
            needsAttention: false,
            holdExpiresAt: next === RegistrationStatus.PENDING_PAYMENT ? new Date(now.getTime() + PROMOTED_HOLD_HOURS * 3_600_000) : null,
            confirmedAt: next === RegistrationStatus.CONFIRMED ? now : null,
            decidedAt: actorId ? now : null,
          },
        },
        { new: true },
      )
      .lean()
      .exec()) as unknown as LeanReg | null;
    if (!updated) {
      await this.releaseSeats(event._id, ticket.id, reg.attendeeCount);
      return true; // someone else handled it; keep going
    }
    const link = reg.userId ? this.ticketLink(updated) : webUrl(`/events/${String(event._id)}`);
    if (next === RegistrationStatus.CONFIRMED) {
      await this.notify(updated.userId, "A place opened up!", `You're now registered for ${event.title}.`, `/events/registrations/${String(updated._id)}`, String(updated._id));
      const { html, text } = layout("Good news — a place opened up", [`You've been moved from the waitlist and are now registered for <strong>${event.title.replace(/</g, "&lt;")}</strong>.`], this.mailEvent(event), { label: "View your ticket", url: link });
      await this.mailer.send({ to: updated.attendeeEmail, subject: `You're in: ${event.title}`, html, text });
      await this.afterConfirmed({ ...updated, confirmationSentAt: new Date() } as LeanReg, event, alreadyPaid);
    } else if (next === RegistrationStatus.PENDING_PAYMENT) {
      await this.notify(updated.userId, "A place opened up — complete payment", `${event.title}: pay within ${PROMOTED_HOLD_HOURS} hours to keep your place.`, `/events/registrations/${String(updated._id)}`, String(updated._id));
      const { html, text } = layout("A place opened up", [`A place opened up for <strong>${event.title.replace(/</g, "&lt;")}</strong>. Complete your payment within ${PROMOTED_HOLD_HOURS} hours to keep it.`], this.mailEvent(event), { label: "Complete payment", url: link });
      await this.mailer.send({ to: updated.attendeeEmail, subject: `Complete your registration: ${event.title}`, html, text });
    } else {
      await this.tellPendingApproval(updated, event);
    }
    return true;
  }

  async cancelOwn(registrationId: string, viewerId: string | undefined, accessKey: string | undefined, dto: CancelRegistrationDto): Promise<RegistrationDetail> {
    const reg = await this.readableRegistration(registrationId, viewerId, accessKey, false);
    const event = await this.loadEvent(reg.eventId);
    if (!this.canCancel(reg, event)) {
      throw new BadRequestException(settingsOf(event).allowCancellation ? "The cancellation deadline for this event has passed." : "This event doesn't allow cancelling online. Please contact the organizer.");
    }
    const updated = await this.release(reg, RegistrationStatus.CANCELLED, viewerId ?? null, dto.reason ?? "Cancelled by attendee");
    if (!updated) throw new ConflictException("This registration is no longer active.");
    await this.afterCancelled(updated, event, false);
    if (reg.holdsSeats) await this.promoteWaitlist(event._id);
    return this.detail(updated, event, { organizerView: false, withCode: false });
  }

  private async afterCancelled(reg: LeanReg, event: EventLean, byOrganizer: boolean) {
    const paidNote =
      reg.paymentStatus === RegistrationPaymentStatus.PAID
        ? ` Refunds follow the organizer's cancellation policy${settingsOf(event).cancellationPolicy ? `: ${settingsOf(event).cancellationPolicy}` : "."}`
        : "";
    await this.notify(reg.userId, "Registration cancelled", `${event.title} · ${reg.registrationNumber}`, `/events/registrations/${String(reg._id)}`, String(reg._id));
    if (!byOrganizer) {
      await this.notify(event.creatorId as Types.ObjectId, "Registration cancelled", `${reg.attendeeName} cancelled their registration for ${event.title}.`, `/events/${String(event._id)}/registrations`, String(event._id));
    }
    const { html, text } = layout("Registration cancelled", [
      byOrganizer
        ? `The organizer cancelled your registration <strong>${reg.registrationNumber}</strong> for <strong>${event.title.replace(/</g, "&lt;")}</strong>.${reg.cancellationReason ? ` Reason: ${reg.cancellationReason.replace(/</g, "&lt;")}` : ""}`
        : `Your registration <strong>${reg.registrationNumber}</strong> for <strong>${event.title.replace(/</g, "&lt;")}</strong> has been cancelled.`,
      paidNote.replace(/</g, "&lt;"),
    ].filter(Boolean), this.mailEvent(event));
    await this.mailer.send({ to: reg.attendeeEmail, subject: `Registration cancelled: ${event.title}`, html, text });
  }

  /* ==========================================================================
     READ (registrant)
  ========================================================================== */

  private async ownRegistration(registrationId: string, userId: string): Promise<LeanReg> {
    const reg = (await this.regModel.findById(oid(registrationId, "registration ID")).lean().exec()) as unknown as LeanReg | null;
    if (!reg || !reg.userId || String(reg.userId) !== userId) throw new NotFoundException("Registration not found.");
    return reg;
  }

  /** The registrant (account or guest access key), or the organizer / check-in staff. */
  private async readableRegistration(registrationId: string, viewerId: string | undefined, accessKey: string | undefined, allowStaff: boolean): Promise<LeanReg & { _viaStaff?: boolean }> {
    const reg = (await this.regModel.findById(oid(registrationId, "registration ID")).lean().exec()) as unknown as LeanReg | null;
    if (!reg) throw new NotFoundException("Registration not found.");
    if (viewerId && reg.userId && String(reg.userId) === viewerId) return reg;
    if (accessKey && reg.accessKeyHash && sha256(accessKey) === reg.accessKeyHash) return reg;
    if (allowStaff && viewerId) {
      const event = await this.loadEvent(reg.eventId);
      if (this.isStaff(event, viewerId) || (await this.manages(event, viewerId))) return { ...reg, _viaStaff: true };
    }
    throw new NotFoundException("Registration not found.");
  }

  async getOne(registrationId: string, viewerId: string | undefined, accessKey: string | undefined): Promise<RegistrationDetail> {
    const reg = await this.readableRegistration(registrationId, viewerId, accessKey, true);
    const event = await this.loadEvent(reg.eventId);
    const organizerView = Boolean(reg._viaStaff);
    return this.detail(reg, event, { organizerView, withCode: !organizerView });
  }

  /**
   * Live admission QR for the ticket holder only. Account tickets need the
   * holder signed in (a shared link shows nothing); guest tickets (free public
   * events, Standard security) use their private access key. Organizers and
   * staff never receive admission codes.
   */
  async admission(registrationId: string, viewerId: string | undefined, accessKey: string | undefined): Promise<AdmissionTicket> {
    const reg = (await this.regModel.findById(oid(registrationId, "registration ID")).lean().exec()) as unknown as LeanReg | null;
    if (!reg) throw new NotFoundException("Ticket not found.");
    const event = await this.loadEvent(reg.eventId);
    const s = settingsOf(event);

    if (reg.userId) {
      if (!viewerId || String(reg.userId) !== viewerId) {
        throw new NotFoundException("This ticket belongs to another Fockis account. Sign in with the account that registered.");
      }
    } else {
      const keyOk = Boolean(accessKey && reg.accessKeyHash && sha256(accessKey) === reg.accessKeyHash);
      if (!keyOk) throw new NotFoundException("Ticket not found.");
      if (s.ticketSecurity === "enhanced") {
        throw new ForbiddenException("This event requires a Fockis account for entry. Contact the organizer.");
      }
    }

    if (reg.status !== RegistrationStatus.CONFIRMED) throw new ConflictException("This registration isn't confirmed, so it has no entry code.");
    if (reg.admissionHold) throw new ForbiddenException("Entry for this ticket is on hold. Contact the organizer.");
    if (!s.qrCheckIn) throw new BadRequestException("This event doesn't use QR check-in.");
    if (event.isCancelled) throw new ConflictException("This event was cancelled.");
    if (new Date(event.endDate).getTime() <= Date.now()) throw new ConflictException("This event has ended.");

    const code = issueAdmissionCode(
      { id: String(reg._id), eventId: String(reg.eventId), registrationNumber: reg.registrationNumber, qrVersion: reg.qrVersion ?? 1 },
      s.qrTtlSeconds,
    );
    const photo = reg.userId ? await this.profilePhoto(reg.userId) : null;
    return {
      token: code.token,
      issuedAt: code.issuedAt.toISOString(),
      expiresAt: code.expiresAt.toISOString(),
      ttlSeconds: s.qrTtlSeconds,
      serverTime: new Date().toISOString(),
      securityMode: s.ticketSecurity,
      attendanceStatus: reg.attendanceStatus ?? AttendanceStatus.NOT_CHECKED_IN,
      checkedInAt: iso(reg.checkedInAt),
      holder: { name: reg.attendeeName, photoUrl: photo },
    };
  }

  private async profilePhoto(userId: Types.ObjectId): Promise<string | null> {
    const userModel = this.connection.models["User"];
    if (!userModel) return null;
    try {
      const u = (await userModel.findById(userId).select("profilePicture").lean().exec()) as { profilePicture?: string } | null;
      const url = String(u?.profilePicture ?? "").trim();
      return url || null;
    } catch {
      return null;
    }
  }

  async mine(userId: string): Promise<{ items: RegistrationView[] }> {
    const regs = (await this.regModel
      .find({ userId: oid(userId, "user ID"), status: { $ne: RegistrationStatus.EXPIRED } })
      .sort({ eventStartDate: -1 })
      .limit(300)
      .lean()
      .exec()) as unknown as LeanReg[];
    const events = (await this.eventModel
      .find({ _id: { $in: Array.from(new Set(regs.map((r) => String(r.eventId)))).map((id) => new Types.ObjectId(id)) } })
      .lean()
      .exec()) as unknown as EventLean[];
    const byId = new Map(events.map((e) => [String(e._id), e]));
    const names = await this.userNames(Array.from(new Set(events.map((e) => String(e.creatorId)))).map((id) => new Types.ObjectId(id)));
    return {
      items: regs
        .filter((r) => byId.has(String(r.eventId)))
        .map((r) => {
          const ev = byId.get(String(r.eventId)) as EventLean;
          return this.view(r, ev, this.summary(ev, names.get(String(ev.creatorId))?.name ?? ""), true);
        }),
    };
  }

  /* ==========================================================================
     ONLINE MEETING ACCESS
  ========================================================================== */

  async join(eventId: string, viewerId: string): Promise<JoinResult> {
    const event = await this.eventsService.getViewable(eventId, viewerId);
    const s = settingsOf(event);
    const online = event.isOnline || s.attendanceOptions.includes("online");
    if (!online || !event.onlineUrl) throw new NotFoundException("This event has no online meeting.");
    if (event.isCancelled) throw new ForbiddenException("This event was cancelled.");
    const opens = new Date(new Date(event.startDate).getTime() - s.earlyJoinMinutes * 60_000);
    const closes = new Date(event.endDate);
    const result = { url: event.onlineUrl, opensAt: opens.toISOString(), closesAt: closes.toISOString() };
    if (await this.manages(event, viewerId)) return result;

    if (!(await this.hasAccess(event, viewerId))) throw new ForbiddenException("This meeting is limited to invited people or members.");
    if (s.mode === RegistrationMode.REQUIRED) {
      const reg = await this.regModel.exists({ eventId: event._id, userId: oid(viewerId), status: RegistrationStatus.CONFIRMED }).exec();
      if (!reg) throw new ForbiddenException("Register for this event to join the meeting.");
    } else if (s.mode === RegistrationMode.RSVP && s.access === RegistrationAccess.PUBLIC) {
      const on = [...(event.attendeeIds ?? []), ...(event.interestedIds ?? [])].some((id) => String(id) === viewerId);
      if (!on) throw new ForbiddenException("Tap Going or Interested to get the meeting link.");
    }
    const now = Date.now();
    if (now < opens.getTime()) throw new ForbiddenException(`The meeting opens ${s.earlyJoinMinutes} minutes before the event starts.`);
    if (now > closes.getTime()) throw new ForbiddenException("This event has ended.");
    return result;
  }

  /* ==========================================================================
     ORGANIZER
  ========================================================================== */

  private async staffEvent(eventId: string, userId: string, ownerOnly: boolean): Promise<EventLean> {
    const event = await this.loadEvent(eventId);
    const ok = ownerOnly ? await this.manages(event, userId) : this.isStaff(event, userId) || (await this.manages(event, userId));
    if (!ok) throw new ForbiddenException(ownerOnly ? "Only the organizer can do this." : "Only the organizer and check-in staff can see registrations.");
    return event;
  }

  private filter(eventId: Types.ObjectId, q: ListQuery): Record<string, unknown> {
    const f: Record<string, unknown> = { eventId };
    const statuses = String(q.status ?? "").split(",").filter((x) => (Object.values(RegistrationStatus) as string[]).includes(x));
    if (statuses.length) f.status = { $in: statuses };
    else f.status = { $ne: RegistrationStatus.EXPIRED };
    if ((Object.values(RegistrationPaymentStatus) as string[]).includes(String(q.payment))) f.paymentStatus = q.payment;
    if ((Object.values(AttendanceStatus) as string[]).includes(String(q.attendance))) f.attendanceStatus = q.attendance;
    if (q.ticket) f.ticketTypeId = String(q.ticket).slice(0, 40);
    const text = cleanText(q.q, 100);
    if (text) {
      const rx = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      f.$or = [{ attendeeName: rx }, { attendeeEmail: rx }, { registrationNumber: rx }, { phone: rx }];
    }
    return f;
  }

  private sortOf(sort?: string): Record<string, 1 | -1> {
    switch (sort) {
      case "registeredAt":
        return { registeredAt: 1 };
      case "name":
        return { attendeeName: 1, registeredAt: 1 };
      case "-name":
        return { attendeeName: -1, registeredAt: 1 };
      case "status":
        return { status: 1, registeredAt: -1 };
      case "amount":
        return { totalAmount: -1, registeredAt: -1 };
      default:
        return { registeredAt: -1 };
    }
  }

  async stats(event: EventLean): Promise<RegistrationStats> {
    const rows = (await this.regModel
      .aggregate([
        { $match: { eventId: event._id, status: { $ne: RegistrationStatus.EXPIRED } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            confirmed: { $sum: { $cond: [{ $eq: ["$status", RegistrationStatus.CONFIRMED] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $in: ["$status", [RegistrationStatus.PENDING_PAYMENT, RegistrationStatus.PENDING_APPROVAL]] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $in: ["$status", [RegistrationStatus.CANCELLED, RegistrationStatus.REJECTED]] }, 1, 0] } },
            waitlisted: { $sum: { $cond: [{ $eq: ["$status", RegistrationStatus.WAITLISTED] }, 1, 0] } },
            paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", RegistrationPaymentStatus.PAID] }, 1, 0] } },
            free: {
              $sum: { $cond: [{ $and: [{ $eq: ["$paymentStatus", RegistrationPaymentStatus.NOT_REQUIRED] }, { $eq: ["$status", RegistrationStatus.CONFIRMED] }] }, 1, 0] },
            },
            confirmedPeople: { $sum: { $cond: [{ $eq: ["$status", RegistrationStatus.CONFIRMED] }, "$attendeeCount", 0] } },
            revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", RegistrationPaymentStatus.PAID] }, "$totalAmount", 0] } },
            checkedInPeople: {
              $sum: {
                $size: {
                  $filter: { input: { $ifNull: ["$attendees", []] }, as: "a", cond: { $ne: [{ $ifNull: ["$$a.checkedInAt", null] }, null] } },
                },
              },
            },
          },
        },
      ])
      .exec()) as Partial<RegistrationStats>[];
    const r = rows[0] ?? {};
    return {
      total: r.total ?? 0,
      confirmed: r.confirmed ?? 0,
      pending: r.pending ?? 0,
      cancelled: r.cancelled ?? 0,
      waitlisted: r.waitlisted ?? 0,
      paid: r.paid ?? 0,
      free: r.free ?? 0,
      checkedInPeople: r.checkedInPeople ?? 0,
      confirmedPeople: r.confirmedPeople ?? 0,
      capacity: typeof event.capacity === "number" && event.capacity > 0 ? event.capacity : null,
      revenue: Math.round((r.revenue ?? 0) * 100) / 100,
      currency: settingsOf(event).currency,
    };
  }

  async organizerList(eventId: string, userId: string, q: ListQuery): Promise<OrganizerListResult> {
    const event = await this.staffEvent(eventId, userId, false);
    await this.expireHolds(event._id);
    const s = settingsOf(event);
    const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
    const page = Math.max(1, Number(q.page) || 1);
    const filter = this.filter(event._id, q);
    const [regs, total, stats, organizerName] = await Promise.all([
      this.regModel.find(filter).sort(this.sortOf(q.sort)).skip((page - 1) * limit).limit(limit).lean().exec() as unknown as Promise<LeanReg[]>,
      this.regModel.countDocuments(filter).exec(),
      this.stats(event),
      this.organizerName(event),
    ]);
    return {
      event: this.summary(event, organizerName),
      items: regs.map((r) => ({ ...this.view(r, event, null, false), userId: r.userId ? String(r.userId) : null })),
      total,
      page,
      limit,
      stats,
      ticketTypes: s.ticketTypes.map((t) => ({ id: t.id, name: t.name })),
      questions: s.questions,
      settings: {
        individualCheckIn: s.individualCheckIn,
        qrCheckIn: s.qrCheckIn,
        requireApproval: s.requireApproval,
        waitlistEnabled: s.waitlistEnabled,
        ticketSecurity: s.ticketSecurity,
        allowReentry: s.allowReentry,
      },
      isOwner: await this.manages(event, userId),
    };
  }

  async export(eventId: string, userId: string, format: "csv" | "xlsx", q: ListQuery): Promise<{ filename: string; contentType: string; body: Buffer | string }> {
    const event = await this.staffEvent(eventId, userId, false);
    const s = settingsOf(event);
    const regs = (await this.regModel.find(this.filter(event._id, q)).sort(this.sortOf(q.sort)).limit(20_000).lean().exec()) as unknown as LeanReg[];
    const header = [
      "Registration ID",
      "Name",
      "Email",
      "Phone",
      "Attendees",
      "Ticket",
      "Total",
      "Currency",
      "Payment",
      "Status",
      "Attendance",
      "Checked in",
      "Attending",
      "Registered",
      "Accessibility",
      "Special requests",
      ...s.questions.map((x) => x.label),
    ];
    const rows: Cell[][] = regs.map((r) => {
      const answers = new Map((r.customAnswers ?? []).map((a) => [a.questionId, a.value]));
      return [
        r.registrationNumber,
        r.attendeeName,
        r.attendeeEmail,
        r.phone ?? "",
        r.attendeeCount,
        r.ticketName,
        r.totalAmount,
        r.currency,
        r.paymentStatus,
        r.status,
        r.attendanceStatus,
        (r.attendees ?? []).filter((a) => a.checkedInAt).length,
        r.attendanceMode === "online" ? "Online" : "In person",
        iso(r.registeredAt) ?? "",
        r.accessibilityNeeds ?? "",
        r.specialRequests ?? "",
        ...s.questions.map((x) => {
          const v = answers.get(x.id);
          return Array.isArray(v) ? v.join("; ") : v === true ? "Yes" : v === false ? "No" : (v ?? "");
        }),
      ];
    });
    const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
    if (format === "xlsx") {
      return {
        filename: `${slug}-registrations.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: buildXlsx("Registrations", header, rows),
      };
    }
    return { filename: `${slug}-registrations.csv`, contentType: "text/csv; charset=utf-8", body: buildCsv(header, rows) };
  }

  async setStatus(registrationId: string, userId: string, dto: RegistrationStatusDto): Promise<RegistrationView> {
    const reg = (await this.regModel.findById(oid(registrationId, "registration ID")).lean().exec()) as unknown as LeanReg | null;
    if (!reg) throw new NotFoundException("Registration not found.");
    const event = await this.staffEvent(String(reg.eventId), userId, true);
    const reason = cleanText(dto.reason, 500);
    let result: LeanReg | null = null;

    switch (dto.action) {
      case "approve": {
        if (reg.status !== RegistrationStatus.PENDING_APPROVAL) throw new BadRequestException("Only registrations waiting for approval can be approved.");
        const paid = reg.totalAmount > 0 && reg.paymentStatus !== RegistrationPaymentStatus.PAID;
        const now = new Date();
        result = (await this.regModel
          .findOneAndUpdate(
            { _id: reg._id, status: RegistrationStatus.PENDING_APPROVAL },
            {
              $set: {
                status: paid ? RegistrationStatus.PENDING_PAYMENT : RegistrationStatus.CONFIRMED,
                decidedAt: now,
                confirmedAt: paid ? null : now,
                holdExpiresAt: paid ? new Date(now.getTime() + PROMOTED_HOLD_HOURS * 3_600_000) : null,
              },
            },
            { new: true },
          )
          .lean()
          .exec()) as unknown as LeanReg | null;
        if (!result) throw new ConflictException("This registration was changed meanwhile. Refresh and try again.");
        if (paid) {
          await this.notify(result.userId, "Registration approved — complete payment", `${event.title}: pay within ${PROMOTED_HOLD_HOURS} hours to keep your place.`, `/events/registrations/${String(result._id)}`, String(result._id));
          const { html, text } = layout("Your registration was approved", [`Complete your payment within ${PROMOTED_HOLD_HOURS} hours to keep your place at <strong>${event.title.replace(/</g, "&lt;")}</strong>.`], this.mailEvent(event), { label: "Complete payment", url: this.ticketLink(result) });
          await this.mailer.send({ to: result.attendeeEmail, subject: `Approved: ${event.title}`, html, text });
        } else {
          await this.notify(result.userId, "Registration approved", event.title, `/events/registrations/${String(result._id)}`, String(result._id));
          await this.afterConfirmed(result, event, false);
        }
        break;
      }
      case "reject": {
        if (reg.status !== RegistrationStatus.PENDING_APPROVAL && reg.status !== RegistrationStatus.WAITLISTED) {
          throw new BadRequestException("Only registrations waiting for approval or on the waitlist can be rejected.");
        }
        result = await this.release(reg, RegistrationStatus.REJECTED, userId, reason || "Not approved by the organizer");
        if (!result) throw new ConflictException("This registration was changed meanwhile.");
        await this.notify(result.userId, "Registration not approved", event.title, `/events/registrations/${String(result._id)}`, String(result._id));
        const { html, text } = layout("Registration not approved", [`Unfortunately your registration for <strong>${event.title.replace(/</g, "&lt;")}</strong> was not approved.${reason ? ` ${reason.replace(/</g, "&lt;")}` : ""}`], this.mailEvent(event));
        await this.mailer.send({ to: result.attendeeEmail, subject: `Registration update: ${event.title}`, html, text });
        if (reg.holdsSeats) await this.promoteWaitlist(event._id);
        break;
      }
      case "cancel": {
        if (!ACTIVE_STATUSES.includes(reg.status)) throw new BadRequestException("This registration is not active.");
        result = await this.release(reg, RegistrationStatus.CANCELLED, userId, reason || "Cancelled by the organizer");
        if (!result) throw new ConflictException("This registration was changed meanwhile.");
        await this.afterCancelled(result, event, true);
        if (reg.holdsSeats) await this.promoteWaitlist(event._id);
        break;
      }
      case "promote": {
        if (reg.status !== RegistrationStatus.WAITLISTED) throw new BadRequestException("Only waitlisted registrations can be moved in.");
        if (!(await this.promote(reg, event, userId))) throw new ConflictException("There aren't enough free places for this registration.");
        result = (await this.regModel.findById(reg._id).lean().exec()) as unknown as LeanReg;
        break;
      }
    }
    return this.view(result as LeanReg, event, null, false);
  }

  /* ==========================================================================
     CHECK-IN
  ========================================================================== */

  async checkIn(eventId: string, staffId: string, dto: CheckInDto): Promise<CheckInResult> {
    const event = await this.staffEvent(eventId, staffId, false);
    const s = settingsOf(event);
    const enhanced = s.ticketSecurity === "enhanced";
    let reg: LeanReg | null = null;
    /** How this ticket was identified: a live QR, or staff looking it up. */
    let method: "qr" | "manual" = "manual";
    /** Staff already looked at the person (grant from a verify / preview step). */
    let granted = false;

    if (dto.code) {
      const text = dto.code.trim();
      if (isAdmissionCode(text)) {
        const parsed = parseAdmission(text);
        if (!parsed) throw new BadRequestException("This isn't a valid Fockis ticket code.");
        reg = (await this.regModel.findOne({ registrationNumber: parsed.registrationNumber }).lean().exec()) as unknown as LeanReg | null;
        if (!reg) throw new NotFoundException("No registration with this ticket.");
        if (!s.qrCheckIn) throw new BadRequestException("QR check-in is turned off for this event.");
        const verdict = checkAdmission(parsed, { id: String(reg._id), eventId: String(reg.eventId), qrVersion: reg.qrVersion ?? 1 });
        if (verdict !== "valid") {
          await this.logCheckIn(reg._id, staffId, "qr", verdict === "expired" ? "expired_code" : "invalid_code", false);
          throw new ForbiddenException(
            verdict === "expired"
              ? "This QR code has expired. Ask the attendee to open their live ticket in Fockis — the code refreshes automatically."
              : "This QR code isn't valid (it was copied, replaced or the ticket changed).",
          );
        }
        method = "qr";
      } else {
        const parsed = parseCode(text);
        if (!parsed) throw new BadRequestException("This isn't a Fockis event ticket.");
        if (parsed.signature) {
          // Old fixed codes (FKREG1) could be screenshotted and shared; they no longer admit anyone.
          throw new ForbiddenException("This is an old fixed QR code and is no longer accepted. Ask the attendee to open their live ticket in Fockis.");
        }
        reg = (await this.regModel.findOne({ registrationNumber: parsed.registrationNumber }).lean().exec()) as unknown as LeanReg | null;
        if (!reg) throw new NotFoundException("No registration with this ID.");
      }
    } else if (dto.registrationId) {
      reg = (await this.regModel.findById(oid(dto.registrationId, "registration ID")).lean().exec()) as unknown as LeanReg | null;
      if (reg && !dto.undo) {
        const grantMethod = dto.grant ? checkCheckInGrant(dto.grant, String(reg._id), staffId) : null;
        if (grantMethod) {
          method = grantMethod;
          granted = true;
        }
      }
    } else {
      throw new BadRequestException("Scan a ticket or enter a registration ID.");
    }
    if (!reg) throw new NotFoundException("Registration not found.");
    if (String(reg.eventId) !== String(event._id)) throw new BadRequestException("This ticket is for a different event.");
    if (reg.status !== RegistrationStatus.CONFIRMED) {
      const label: Record<string, string> = {
        pending_payment: "waiting for payment",
        pending_approval: "waiting for approval",
        waitlisted: "on the waitlist",
        cancelled: "cancelled",
        rejected: "not approved",
        expired: "expired",
      };
      await this.logCheckIn(reg._id, staffId, method, `denied_${reg.status}`, false);
      throw new ConflictException(`This registration is ${label[reg.status] ?? reg.status} and can't be checked in.`);
    }
    if (reg.admissionHold && !dto.undo) {
      await this.logCheckIn(reg._id, staffId, method, "denied_hold", false);
      throw new ForbiddenException("Entry for this ticket is on hold (payment under review). Ask the attendee to contact the organizer.");
    }

    const holder = async (): Promise<CheckInHolder> => ({
      name: reg!.attendeeName,
      photoUrl: s.showHolderPhoto && reg!.userId ? await this.profilePhoto(reg!.userId) : null,
      ticketName: reg!.ticketName,
      registrationNumber: reg!.registrationNumber,
      attendeeCount: reg!.attendeeCount,
      isGuest: !reg!.userId,
    });

    // Group tickets: show who is on it first (staff then check people in one by one).
    if (dto.preview) {
      return {
        result: "preview",
        message: `${reg.attendeeName} · ${reg.attendeeCount} ${reg.attendeeCount === 1 ? "person" : "people"}`,
        registration: this.view(reg, event, null, false),
        holder: await holder(),
        grant: issueCheckInGrant(String(reg._id), staffId, method),
        securityMode: s.ticketSecurity,
      };
    }

    // Staff must look at the person when: security is Enhanced, or the ticket was
    // looked up by number instead of scanned (a number alone proves nothing).
    const needsIdentity = !dto.undo && (enhanced || method === "manual");
    if (needsIdentity && !(granted && dto.identityConfirmed === true)) {
      if (granted && dto.identityConfirmed === false) {
        await this.logCheckIn(reg._id, staffId, method, "denied_identity", false);
        return {
          result: "verify",
          message: "Identity not confirmed — the person was not checked in.",
          registration: this.view(reg, event, null, false),
          holder: await holder(),
          securityMode: s.ticketSecurity,
        };
      }
      return {
        result: "verify",
        message: enhanced
          ? "Valid ticket. Check that the person matches the ticket holder, then confirm."
          : "Ticket found by number. Check that the person matches the ticket holder, then confirm.",
        registration: this.view(reg, event, null, false),
        holder: await holder(),
        grant: issueCheckInGrant(String(reg._id), staffId, method),
        securityMode: s.ticketSecurity,
      };
    }
    const identityConfirmed = needsIdentity && dto.identityConfirmed === true;

    const staff = new Types.ObjectId(staffId);
    const now = new Date();
    const index = s.individualCheckIn && typeof dto.attendeeIndex === "number" ? dto.attendeeIndex : null;
    if (index !== null && index >= reg.attendeeCount) throw new BadRequestException("That attendee isn't on this registration.");

    let outcome: CheckInResult["result"] = "checked_in";
    if (dto.undo) {
      if (index !== null) {
        await this.regModel.updateOne({ _id: reg._id }, { $set: { [`attendees.${index}.checkedInAt`]: null, [`attendees.${index}.checkedInBy`]: null } }).exec();
      } else {
        await this.regModel.updateOne({ _id: reg._id }, { $set: { "attendees.$[].checkedInAt": null, "attendees.$[].checkedInBy": null, checkedInAt: null, checkedInBy: null } }).exec();
      }
      outcome = "undone";
    } else if (index !== null) {
      // Atomic: only one scanner can set this attendee's check-in time.
      const res = await this.regModel
        .updateOne(
          { _id: reg._id, status: RegistrationStatus.CONFIRMED, admissionHold: null, [`attendees.${index}.checkedInAt`]: null } as Record<string, unknown>,
          { $set: { [`attendees.${index}.checkedInAt`]: now, [`attendees.${index}.checkedInBy`]: staff } },
        )
        .exec();
      if (res.modifiedCount === 0) outcome = "already_checked_in";
    } else {
      const res = await this.regModel
        .updateOne(
          { _id: reg._id, status: RegistrationStatus.CONFIRMED, admissionHold: null, checkedInAt: null },
          { $set: { checkedInAt: now, checkedInBy: staff, "attendees.$[a].checkedInAt": now, "attendees.$[a].checkedInBy": staff } },
          { arrayFilters: [{ "a.checkedInAt": null }] },
        )
        .exec();
      if (res.modifiedCount === 0) outcome = "already_checked_in";
    }

    // Re-entry (organizer setting): an already-used ticket may come back in; count it.
    if (outcome === "already_checked_in" && s.allowReentry) {
      await this.regModel.updateOne({ _id: reg._id, status: RegistrationStatus.CONFIRMED }, { $inc: { entryCount: 1 }, $set: { lastEntryAt: now } }).exec();
      outcome = "reentry";
    }

    // Recompute the attendance status from the attendees.
    const after = (await this.regModel.findById(reg._id).lean().exec()) as unknown as LeanReg;
    const inCount = (after.attendees ?? []).filter((a) => a.checkedInAt).length;
    const attendance = inCount === 0 ? AttendanceStatus.NOT_CHECKED_IN : inCount >= after.attendeeCount ? AttendanceStatus.CHECKED_IN : AttendanceStatus.PARTIALLY_CHECKED_IN;
    const firstIn = (after.attendees ?? []).map((a) => a.checkedInAt).filter(Boolean).sort()[0] ?? null;
    await this.regModel.updateOne({ _id: reg._id }, { $set: { attendanceStatus: attendance, checkedInAt: inCount ? (after.checkedInAt ?? firstIn) : null } }).exec();
    await this.logCheckIn(reg._id, staffId, method, outcome, identityConfirmed);
    const final = (await this.regModel.findById(reg._id).lean().exec()) as unknown as LeanReg;

    const who = index !== null ? (final.attendees?.[index]?.name ?? final.attendeeName) : final.attendeeName;
    const at = index !== null ? final.attendees?.[index]?.checkedInAt : final.checkedInAt;
    const message =
      outcome === "undone"
        ? `Check-in undone for ${who}.`
        : outcome === "already_checked_in"
          ? `${who} was already checked in${at ? ` at ${new Date(at).toISOString()}` : ""}. This ticket can't be used again.`
          : outcome === "reentry"
            ? `Re-entry for ${who} (first checked in${at ? ` at ${new Date(at).toISOString()}` : ""}).`
            : `${who} is checked in.`;
    return { result: outcome, message, registration: this.view(final, event, null, false), holder: await holder(), securityMode: s.ticketSecurity };
  }

  /** Check-in audit trail on the registration (last 50). Never stores codes or IDs documents. */
  private async logCheckIn(regId: Types.ObjectId, staffId: string, method: "qr" | "manual", result: string, identityConfirmed: boolean): Promise<void> {
    try {
      await this.regModel
        .updateOne(
          { _id: regId },
          {
            $push: {
              checkInLog: {
                $each: [{ at: new Date(), by: Types.ObjectId.isValid(staffId) ? new Types.ObjectId(staffId) : null, method, result: result.slice(0, 40), identityConfirmed }],
                $slice: -50,
              },
            },
          },
        )
        .exec();
    } catch (e) {
      this.logger.warn(`Check-in log failed: ${String(e)}`);
    }
  }

  /* ==========================================================================
     PAYMENT REVERSALS (refunds and disputes revoke admission)
  ========================================================================== */

  /** A full refund (also from the Stripe dashboard) cancels the ticket; old QR codes stop working. */
  @OnEvent("payments.refunded")
  async onPaymentRefunded(payload: { paymentId?: string; purpose?: string; referenceId?: string; refundedAmount?: number; chargedAmount?: number }): Promise<void> {
    if (payload?.purpose !== PaymentPurpose.EVENT || !payload.referenceId || !Types.ObjectId.isValid(payload.referenceId)) return;
    const full = Number(payload.refundedAmount ?? 0) >= Number(payload.chargedAmount ?? Number.POSITIVE_INFINITY) - 0.005;
    if (!full) return; // partial refunds keep the ticket (organizer decides)
    try {
      const reg = (await this.regModel.findById(payload.referenceId).lean().exec()) as unknown as LeanReg | null;
      if (!reg || (payload.paymentId && reg.paymentId && String(reg.paymentId) !== String(payload.paymentId))) return;
      await this.regModel.updateOne({ _id: reg._id }, { $set: { paymentStatus: RegistrationPaymentStatus.REFUNDED }, $inc: { qrVersion: 1 } }).exec();
      const released = await this.release(reg, RegistrationStatus.CANCELLED, null, "Payment refunded");
      if (released) {
        await this.notify(reg.userId, "Ticket cancelled after refund", "Your payment was refunded, so this ticket no longer gives entry.", `/events/registrations/${String(reg._id)}`, String(reg._id));
      }
    } catch (e) {
      this.logger.error(`Refund for registration ${payload.referenceId} could not be applied: ${String(e)}`);
    }
  }

  /** While a card payment is disputed the ticket can't be used; a lost dispute cancels it. */
  @OnEvent("payments.disputed")
  async onPaymentDisputed(payload: { paymentId?: string; purpose?: string; referenceId?: string; status?: string; closed?: boolean }): Promise<void> {
    if (payload?.purpose !== PaymentPurpose.EVENT || !payload.referenceId || !Types.ObjectId.isValid(payload.referenceId)) return;
    try {
      const reg = (await this.regModel.findById(payload.referenceId).lean().exec()) as unknown as LeanReg | null;
      if (!reg) return;
      if (!payload.closed) {
        await this.regModel.updateOne({ _id: reg._id }, { $set: { admissionHold: "dispute" }, $inc: { qrVersion: 1 } }).exec();
        return;
      }
      if (payload.status === "won") {
        await this.regModel.updateOne({ _id: reg._id, admissionHold: "dispute" }, { $set: { admissionHold: null } }).exec();
        return;
      }
      if (payload.status === "lost") {
        await this.regModel.updateOne({ _id: reg._id }, { $set: { admissionHold: null }, $inc: { qrVersion: 1 } }).exec();
        await this.release(reg, RegistrationStatus.CANCELLED, null, "Payment reversed");
      }
    } catch (e) {
      this.logger.error(`Dispute for registration ${payload.referenceId} could not be applied: ${String(e)}`);
    }
  }

  /* ==========================================================================
     REMINDERS AND EVENT CHANGES
  ========================================================================== */

  async sendDueReminders(): Promise<number> {
    const now = new Date();
    const due = (await this.regModel
      .find({ status: RegistrationStatus.CONFIRMED, reminderSentAt: null, eventStartDate: { $gt: now, $lte: new Date(now.getTime() + REMINDER_WINDOW_MS) } })
      .limit(300)
      .lean()
      .exec()) as unknown as LeanReg[];
    const cache = new Map<string, EventLean | null>();
    let sent = 0;
    for (const reg of due) {
      const key = String(reg.eventId);
      if (!cache.has(key)) cache.set(key, await this.loadEvent(reg.eventId).catch(() => null));
      const event = cache.get(key);
      // Claim first so two servers never send the same reminder.
      const claimed = await this.regModel.updateOne({ _id: reg._id, reminderSentAt: null }, { $set: { reminderSentAt: now } }).exec();
      if (!claimed.modifiedCount || !event || event.isCancelled || !settingsOf(event).reminders) continue;
      await this.notify(reg.userId, "Event reminder", `${event.title} starts ${whenText(event)}.`, `/events/registrations/${String(reg._id)}`, String(reg._id));
      const { html, text } = layout("See you soon!", [`This is a reminder that <strong>${event.title.replace(/</g, "&lt;")}</strong> is coming up.`, `Registration ID: <strong>${reg.registrationNumber}</strong>`], this.mailEvent(event), {
        label: "View your ticket",
        url: reg.userId ? this.ticketLink(reg) : webUrl(`/events/${key}`),
      });
      await this.mailer.send({ to: reg.attendeeEmail, subject: `Reminder: ${event.title}`, html, text });
      sent++;
    }
    return sent;
  }

  /** Emitted by EventsService.update when the time or place changes. */
  @OnEvent("events.updated")
  async onEventUpdated(payload: { eventId: string; timeChanged?: boolean; locationChanged?: boolean }): Promise<void> {
    try {
      const event = await this.loadEvent(payload.eventId);
      await this.regModel
        .updateMany(
          { eventId: event._id },
          { $set: { eventStartDate: event.startDate, eventEndDate: event.endDate, ...(payload.timeChanged ? { reminderSentAt: null } : {}) } },
        )
        .exec();
      if (!payload.timeChanged && !payload.locationChanged) return;
      const what = payload.timeChanged && payload.locationChanged ? "time and location" : payload.timeChanged ? "time" : "location";
      await this.tellAll(event, `Event ${what} changed`, [`The ${what} of <strong>${event.title.replace(/</g, "&lt;")}</strong> changed. Here are the new details:`]);
    } catch (e) {
      this.logger.warn(`Could not notify registrants of event ${payload?.eventId}: ${String(e)}`);
    }
  }

  @OnEvent("events.cancelled")
  async onEventCancelled(payload: { eventId: string; reason?: string }): Promise<void> {
    try {
      const event = await this.loadEvent(payload.eventId);
      await this.tellAll(event, "Event cancelled", [
        `The organizer cancelled <strong>${event.title.replace(/</g, "&lt;")}</strong>.${payload.reason ? ` ${payload.reason.replace(/</g, "&lt;")}` : ""}`,
        "If you paid for tickets, the organizer will contact you about a refund.",
      ]);
    } catch (e) {
      this.logger.warn(`Could not notify registrants of cancelled event ${payload?.eventId}: ${String(e)}`);
    }
  }

  private async tellAll(event: EventLean, heading: string, lines: string[]) {
    const regs = (await this.regModel
      .find({ eventId: event._id, status: { $in: ACTIVE_STATUSES } })
      .select({ userId: 1, attendeeEmail: 1, registrationNumber: 1 })
      .limit(20_000)
      .lean()
      .exec()) as unknown as LeanReg[];
    for (const reg of regs) {
      await this.notify(reg.userId, heading, event.title, `/events/${String(event._id)}`, String(event._id));
      const { html, text } = layout(heading, lines, this.mailEvent(event), { label: "View event", url: webUrl(`/events/${String(event._id)}`) });
      await this.mailer.send({ to: reg.attendeeEmail, subject: `${heading}: ${event.title}`, html, text });
    }
  }
}
