/**
 * registration-settings.ts
 * -----------------------------------------------------------------------------
 * Event registration rules that do not touch the database, so they can be
 * unit-tested: the organizer's settings (validated and normalized), price
 * totals, and validation of a registrant's answers.
 *
 * Settings live on the event document (`event.registration`). Events created
 * before registration existed have no settings and behave exactly as before
 * (optional RSVP with Going / Interested).
 * -----------------------------------------------------------------------------
 */

import { BadRequestException } from "@nestjs/common";
import { randomBytes } from "crypto";

export enum RegistrationMode {
  /** Information only: no registration, an Attend / Join action. */
  NONE = "none",
  /** Optional RSVP (Going / Interested) — the original behaviour. */
  RSVP = "rsvp",
  /** People must register (free or paid) before attending. */
  REQUIRED = "required",
}

export enum RegistrationAccess {
  /** Anyone who can see the event. */
  PUBLIC = "public",
  /** Active members of the linked organization. */
  MEMBERS = "members",
  /** Invited people and members of the selected groups. */
  SELECTED = "selected",
}

export enum QuestionType {
  SHORT_TEXT = "short_text",
  LONG_TEXT = "long_text",
  DROPDOWN = "dropdown",
  SINGLE_CHOICE = "single_choice",
  MULTIPLE_CHOICE = "multiple_choice",
  YES_NO = "yes_no",
}

export type AttendanceOption = "in_person" | "online";

export interface RegistrationQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[];
}

export interface TicketType {
  id: string;
  name: string;
  description: string;
  /** Price per ticket in `currency` (0 = free ticket). */
  price: number;
  /** Tickets available of this type; null = limited only by event capacity. */
  quantity: number | null;
}

export interface EventRegistrationSettings {
  mode: RegistrationMode;
  opensAt: Date | null;
  /** Registration deadline. */
  closesAt: Date | null;
  waitlistEnabled: boolean;
  requireApproval: boolean;
  /** Free public events only: people without a Fockis account may register. */
  allowGuests: boolean;
  maxTicketsPerUser: number;
  isFree: boolean;
  currency: string;
  ticketTypes: TicketType[];
  taxRatePercent: number;
  /** Fixed fee per ticket (paid events only). */
  serviceFee: number;
  questions: RegistrationQuestion[];
  askAccessibility: boolean;
  askSpecialRequests: boolean;
  /** Both = hybrid event. */
  attendanceOptions: AttendanceOption[];
  termsText: string;
  termsUrl: string;
  cancellationPolicy: string;
  allowCancellation: boolean;
  /** Registrants may cancel until this many hours before the start. */
  cancellationDeadlineHours: number;
  qrCheckIn: boolean;
  /** Check each attendee of a group registration in separately. */
  individualCheckIn: boolean;
  confirmationEmail: boolean;
  reminders: boolean;
  access: RegistrationAccess;
  /** Organization whose active members may register (access = members). */
  organizationId: string | null;
  /** Groups whose members may register (access = selected). */
  selectedGroupIds: string[];
  /** Minutes before the start when the Join Meeting button opens. */
  earlyJoinMinutes: number;
  /** People (besides the organizer) who may check attendees in. */
  checkInStaffIds: string[];
}

export const MAX_QUESTIONS = 20;
export const MAX_TICKET_TYPES = 10;
export const MAX_OPTIONS = 20;

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const CURRENCY = /^[A-Z]{3}$/;
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;

function bool(v: unknown, fallback: boolean): boolean {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return fallback;
}

function int(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function money(v: unknown, label: string, max = 100_000): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${label} must be zero or more.`);
  if (n > max) throw new BadRequestException(`${label} is too large.`);
  return Math.round(n * 100) / 100;
}

/** Strip control characters and trim. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
}

function date(v: unknown, label: string): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${label} is not a valid date.`);
  return d;
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function ids(v: unknown, max = 200): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.map((x) => String(x).trim()).filter((x) => OBJECT_ID.test(x)))).slice(0, max);
}

export function defaultSettings(isOnline = false): EventRegistrationSettings {
  return {
    mode: RegistrationMode.RSVP,
    opensAt: null,
    closesAt: null,
    waitlistEnabled: false,
    requireApproval: false,
    allowGuests: false,
    maxTicketsPerUser: 1,
    isFree: true,
    currency: "USD",
    ticketTypes: [],
    taxRatePercent: 0,
    serviceFee: 0,
    questions: [],
    askAccessibility: true,
    askSpecialRequests: true,
    attendanceOptions: [isOnline ? "online" : "in_person"],
    termsText: "",
    termsUrl: "",
    cancellationPolicy: "",
    allowCancellation: true,
    cancellationDeadlineHours: 0,
    qrCheckIn: true,
    individualCheckIn: false,
    confirmationEmail: true,
    reminders: true,
    access: RegistrationAccess.PUBLIC,
    organizationId: null,
    selectedGroupIds: [],
    earlyJoinMinutes: 15,
    checkInStaffIds: [],
  };
}

/**
 * Validate and normalize settings sent by the organizer. Unknown fields are
 * dropped; ids of existing questions / tickets are kept so answers and sales
 * stay linked when the organizer edits them.
 */
export function normalizeSettings(
  raw: unknown,
  ctx: { isOnline: boolean; endDate?: Date },
): EventRegistrationSettings {
  if (raw === null || raw === undefined) return defaultSettings(ctx.isOnline);
  if (typeof raw !== "object" || Array.isArray(raw)) throw new BadRequestException("Registration settings are invalid.");
  const r = raw as Record<string, unknown>;
  const s = defaultSettings(ctx.isOnline);

  s.mode = Object.values(RegistrationMode).includes(r.mode as RegistrationMode) ? (r.mode as RegistrationMode) : RegistrationMode.RSVP;
  s.opensAt = date(r.opensAt, "Registration opening date");
  s.closesAt = date(r.closesAt, "Registration deadline");
  if (s.opensAt && s.closesAt && s.closesAt.getTime() <= s.opensAt.getTime()) {
    throw new BadRequestException("The registration deadline must be after registration opens.");
  }
  if (s.closesAt && ctx.endDate && s.closesAt.getTime() > ctx.endDate.getTime()) {
    throw new BadRequestException("The registration deadline must be before the event ends.");
  }

  s.waitlistEnabled = bool(r.waitlistEnabled, false);
  s.requireApproval = bool(r.requireApproval, false);
  s.maxTicketsPerUser = int(r.maxTicketsPerUser, 1, 20, 1);

  const currency = String(r.currency ?? "USD").trim().toUpperCase();
  if (!CURRENCY.test(currency)) throw new BadRequestException("Choose a valid currency.");
  s.currency = currency;

  // Tickets
  const rawTickets = Array.isArray(r.ticketTypes) ? r.ticketTypes : [];
  if (rawTickets.length > MAX_TICKET_TYPES) throw new BadRequestException(`At most ${MAX_TICKET_TYPES} ticket types.`);
  s.ticketTypes = rawTickets.map((t, i) => {
    const o = (t ?? {}) as Record<string, unknown>;
    const name = cleanText(o.name, 80);
    if (!name) throw new BadRequestException(`Ticket ${i + 1} needs a name.`);
    const q = o.quantity === null || o.quantity === undefined || o.quantity === "" ? null : int(o.quantity, 1, 1_000_000, 1);
    return {
      id: SAFE_ID.test(String(o.id ?? "")) ? String(o.id) : newId("t"),
      name,
      description: cleanText(o.description, 300),
      price: money(o.price ?? 0, `The price of "${name}"`),
      quantity: q,
    };
  });
  const paid = s.ticketTypes.some((t) => t.price > 0);
  s.isFree = !paid;
  if (s.ticketTypes.length === 0) {
    s.ticketTypes = [{ id: "general", name: "General admission", description: "", price: 0, quantity: null }];
  }
  s.taxRatePercent = paid ? Math.min(30, Math.max(0, Math.round(Number(r.taxRatePercent ?? 0) * 100) / 100 || 0)) : 0;
  s.serviceFee = paid ? money(r.serviceFee ?? 0, "The service fee", 1_000) : 0;

  // Guests: free, public events only (payments need a Fockis account).
  s.allowGuests = bool(r.allowGuests, false) && !paid;

  // Questions
  const rawQs = Array.isArray(r.questions) ? r.questions : [];
  if (rawQs.length > MAX_QUESTIONS) throw new BadRequestException(`At most ${MAX_QUESTIONS} questions.`);
  s.questions = rawQs.map((q, i) => {
    const o = (q ?? {}) as Record<string, unknown>;
    const type = Object.values(QuestionType).includes(o.type as QuestionType) ? (o.type as QuestionType) : QuestionType.SHORT_TEXT;
    const label = cleanText(o.label, 200);
    if (!label) throw new BadRequestException(`Question ${i + 1} needs text.`);
    const needsOptions = type === QuestionType.DROPDOWN || type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE;
    const options = needsOptions
      ? Array.from(new Set((Array.isArray(o.options) ? o.options : []).map((x) => cleanText(x, 100)).filter(Boolean))).slice(0, MAX_OPTIONS)
      : [];
    if (needsOptions && options.length < 2) throw new BadRequestException(`"${label}" needs at least two options.`);
    return { id: SAFE_ID.test(String(o.id ?? "")) ? String(o.id) : newId("q"), type, label, required: bool(o.required, false), options };
  });
  s.askAccessibility = bool(r.askAccessibility, true);
  s.askSpecialRequests = bool(r.askSpecialRequests, true);

  // Attendance format
  const opts = (Array.isArray(r.attendanceOptions) ? r.attendanceOptions : []).filter(
    (x): x is AttendanceOption => x === "in_person" || x === "online",
  );
  s.attendanceOptions = opts.length ? Array.from(new Set(opts)) : [ctx.isOnline ? "online" : "in_person"];
  if (ctx.isOnline) s.attendanceOptions = ["online"];

  s.termsText = cleanText(r.termsText, 5000);
  const termsUrl = cleanText(r.termsUrl, 2000);
  if (termsUrl && !/^https:\/\/\S+$/i.test(termsUrl)) throw new BadRequestException("The terms link must start with https://");
  s.termsUrl = termsUrl;
  s.cancellationPolicy = cleanText(r.cancellationPolicy, 2000);
  s.allowCancellation = bool(r.allowCancellation, true);
  s.cancellationDeadlineHours = int(r.cancellationDeadlineHours, 0, 24 * 60, 0);

  s.qrCheckIn = bool(r.qrCheckIn, true);
  s.individualCheckIn = bool(r.individualCheckIn, false);
  s.confirmationEmail = bool(r.confirmationEmail, true);
  s.reminders = bool(r.reminders, true);

  s.access = Object.values(RegistrationAccess).includes(r.access as RegistrationAccess) ? (r.access as RegistrationAccess) : RegistrationAccess.PUBLIC;
  const org = String(r.organizationId ?? "").trim();
  s.organizationId = OBJECT_ID.test(org) ? org : null;
  if (s.access === RegistrationAccess.MEMBERS && !s.organizationId) {
    throw new BadRequestException("Choose the organization whose members may attend.");
  }
  s.selectedGroupIds = ids(r.selectedGroupIds, 50);
  s.checkInStaffIds = ids(r.checkInStaffIds, 50);
  s.earlyJoinMinutes = int(r.earlyJoinMinutes, 0, 120, 15);

  if (s.access !== RegistrationAccess.PUBLIC) s.allowGuests = false;
  return s;
}

/** Settings of an event, with defaults for events created before registration existed. */
export function settingsOf(event: { registration?: unknown; isOnline?: boolean }): EventRegistrationSettings {
  const raw = event.registration as Partial<EventRegistrationSettings> | null | undefined;
  const base = defaultSettings(Boolean(event.isOnline));
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    opensAt: raw.opensAt ? new Date(raw.opensAt) : null,
    closesAt: raw.closesAt ? new Date(raw.closesAt) : null,
    ticketTypes: Array.isArray(raw.ticketTypes) && raw.ticketTypes.length ? raw.ticketTypes : base.ticketTypes,
    questions: Array.isArray(raw.questions) ? raw.questions : [],
    attendanceOptions: Array.isArray(raw.attendanceOptions) && raw.attendanceOptions.length ? raw.attendanceOptions : base.attendanceOptions,
    selectedGroupIds: Array.isArray(raw.selectedGroupIds) ? raw.selectedGroupIds : [],
    checkInStaffIds: Array.isArray(raw.checkInStaffIds) ? raw.checkInStaffIds : [],
  };
}

/* ------------------------------------------------------------------ totals */

export interface PriceBreakdown {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  fees: number;
  tax: number;
  total: number;
  currency: string;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** Tax applies to the ticket subtotal; the service fee is per ticket. */
export function computeTotals(settings: Pick<EventRegistrationSettings, "taxRatePercent" | "serviceFee" | "currency">, unitPrice: number, quantity: number): PriceBreakdown {
  const subtotal = cents(unitPrice * quantity);
  const fees = subtotal > 0 ? cents(settings.serviceFee * quantity) : 0;
  const tax = subtotal > 0 ? cents((subtotal * settings.taxRatePercent) / 100) : 0;
  return { unitPrice: cents(unitPrice), quantity, subtotal, fees, tax, total: cents(subtotal + fees + tax), currency: settings.currency };
}

/* ----------------------------------------------------------------- answers */

export interface StoredAnswer {
  questionId: string;
  label: string;
  type: QuestionType;
  value: string | string[] | boolean | null;
}

/** Check answers against the organizer's questions; returns what is stored. */
export function validateAnswers(questions: RegistrationQuestion[], raw: unknown): StoredAnswer[] {
  const given = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return questions.map((q) => {
    const v = given[q.id];
    let value: StoredAnswer["value"] = null;
    switch (q.type) {
      case QuestionType.SHORT_TEXT:
      case QuestionType.LONG_TEXT: {
        const t = cleanText(v, q.type === QuestionType.SHORT_TEXT ? 300 : 3000);
        value = t || null;
        break;
      }
      case QuestionType.DROPDOWN:
      case QuestionType.SINGLE_CHOICE: {
        const t = cleanText(v, 100);
        if (t && !q.options.includes(t)) throw new BadRequestException(`Choose one of the listed answers for "${q.label}".`);
        value = t || null;
        break;
      }
      case QuestionType.MULTIPLE_CHOICE: {
        const list = Array.isArray(v) ? v.map((x) => cleanText(x, 100)).filter(Boolean) : [];
        if (list.some((x) => !q.options.includes(x))) throw new BadRequestException(`Choose from the listed answers for "${q.label}".`);
        value = list.length ? Array.from(new Set(list)) : null;
        break;
      }
      case QuestionType.YES_NO: {
        value = v === true || v === "yes" || v === "true" ? true : v === false || v === "no" || v === "false" ? false : null;
        break;
      }
    }
    if (q.required && (value === null || (Array.isArray(value) && value.length === 0))) {
      throw new BadRequestException(`Please answer "${q.label}".`);
    }
    return { questionId: q.id, label: q.label, type: q.type, value };
  });
}

/* ------------------------------------------------------------ registration numbers */

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** FKE-7XK2-9QPM — no 0/O/1/I, easy to read out at the door. */
export function newRegistrationNumber(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `FKE-${out.slice(0, 4)}-${out.slice(4)}`;
}

export const REGISTRATION_NUMBER = /^FKE-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;
