/* ============================================================================
   EVENT REGISTRATIONS — API CLIENT
   Mirrors apps/api/src/events/registrations. Uses the Events client's request
   helper (same JWT, error messages and no-store caching).
============================================================================ */

import { EVENTS_URL, EventsApiError, getToken, request } from "../services/eventsApi";
import type { AttendanceOption, RegistrationAccess, RegistrationMode, RegistrationQuestion, TicketTypeInput } from "../types/event.types";

export type RegistrationStatus = "pending_payment" | "pending_approval" | "confirmed" | "waitlisted" | "cancelled" | "rejected" | "expired";
export type RegistrationPaymentStatus = "not_required" | "pending" | "paid" | "failed" | "refunded";
export type AttendanceStatus = "not_checked_in" | "partially_checked_in" | "checked_in";
export type AvailabilityState = "open" | "waitlist" | "full" | "not_open" | "closed" | "ended" | "cancelled" | "not_required";

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

export interface PublicTicketType extends TicketTypeInput {
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
    questions: RegistrationQuestion[];
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
  availability: { state: AvailabilityState; message: string; capacity: number | null; spotsLeft: number | null };
  viewer: {
    signedIn: boolean;
    hasAccess: boolean;
    name: string;
    email: string;
    registration: { id: string; registrationNumber: string; status: RegistrationStatus } | null;
  };
}

export interface StoredAnswer {
  questionId: string;
  label: string;
  type: string;
  value: string | string[] | boolean | null;
}

export interface Registration {
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
  ticketCode: string | null;
  event: RegistrationEventSummary | null;
  userId?: string | null;
}

export interface RegistrationDetail extends Registration {
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

export interface RegisterInput {
  attendeeName: string;
  attendeeEmail: string;
  phone?: string;
  attendeeCount: number;
  ticketTypeId?: string;
  attendanceMode?: AttendanceOption;
  answers?: Record<string, string | string[] | boolean>;
  accessibilityNeeds?: string;
  specialRequests?: string;
  agreeToTerms: boolean;
  guestNames?: string[];
  country?: string;
}

export interface RegisterResult {
  registration: RegistrationDetail;
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

export interface OrganizerList {
  event: RegistrationEventSummary;
  items: Registration[];
  total: number;
  page: number;
  limit: number;
  stats: RegistrationStats;
  ticketTypes: { id: string; name: string }[];
  questions: RegistrationQuestion[];
  settings: { individualCheckIn: boolean; qrCheckIn: boolean; requireApproval: boolean; waitlistEnabled: boolean };
  isOwner: boolean;
}

export interface OrganizerQuery {
  q?: string;
  status?: string;
  payment?: string;
  attendance?: string;
  ticket?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CheckInResult {
  result: "checked_in" | "already_checked_in" | "undone" | "preview";
  message: string;
  registration: Registration;
}

const e = encodeURIComponent;
const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const registrationApi = {
  settings: (eventId: string, signal?: AbortSignal) => request<RegistrationSettingsView>(`${EVENTS_URL}/${e(eventId)}/registration-settings`, { signal }),

  register: (eventId: string, input: RegisterInput) => request<RegisterResult>(`${EVENTS_URL}/${e(eventId)}/register`, json(input)),

  get: (registrationId: string, key?: string | null, signal?: AbortSignal) =>
    request<RegistrationDetail>(`${EVENTS_URL}/registrations/${e(registrationId)}${qs({ key })}`, { signal }),

  mine: (signal?: AbortSignal) => request<{ items: Registration[] }>(`${EVENTS_URL}/registrations/my`, { signal }),

  cancel: (registrationId: string, reason?: string, key?: string | null) =>
    request<RegistrationDetail>(`${EVENTS_URL}/registrations/${e(registrationId)}/cancel${qs({ key })}`, json({ reason })),

  resumePayment: (registrationId: string, country?: string) => request<PaymentStart>(`${EVENTS_URL}/registrations/${e(registrationId)}/payment`, json({ country })),

  confirmPayment: (registrationId: string, paymentIntentId: string) =>
    request<RegistrationDetail>(`${EVENTS_URL}/registrations/${e(registrationId)}/confirm-payment`, json({ paymentIntentId })),

  join: (eventId: string) => request<{ url: string; opensAt: string; closesAt: string }>(`${EVENTS_URL}/${e(eventId)}/join`),

  list: (eventId: string, query: OrganizerQuery, signal?: AbortSignal) => request<OrganizerList>(`${EVENTS_URL}/${e(eventId)}/registrations${qs({ ...query })}`, { signal }),

  setStatus: (registrationId: string, action: "approve" | "reject" | "cancel" | "promote", reason?: string) =>
    request<Registration>(`${EVENTS_URL}/registrations/${e(registrationId)}/status`, { method: "PATCH", body: JSON.stringify({ action, reason }) }),

  checkIn: (eventId: string, body: { code?: string; registrationId?: string; attendeeIndex?: number; undo?: boolean; preview?: boolean }) =>
    request<CheckInResult>(`${EVENTS_URL}/${e(eventId)}/check-in`, json(body)),

  /** Downloads CSV / Excel through the authenticated API and saves it. */
  async exportFile(eventId: string, format: "csv" | "xlsx", query: OrganizerQuery): Promise<void> {
    const token = getToken();
    const res = await fetch(`${EVENTS_URL}/${e(eventId)}/registrations/export${qs({ ...query, page: undefined, limit: undefined, format })}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let message = `Export failed (${res.status})`;
      try {
        const body = await res.json();
        message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message || message;
      } catch {
        /* keep generic */
      }
      throw new EventsApiError(message, res.status);
    }
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `registrations.${format}`;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

/* ------------------------------------------------------------------ helpers */

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function computeTotals(price: number, quantity: number, taxRatePercent: number, serviceFee: number) {
  const r = (n: number) => Math.round(n * 100) / 100;
  const subtotal = r(price * quantity);
  const fees = subtotal > 0 ? r(serviceFee * quantity) : 0;
  const tax = subtotal > 0 ? r((subtotal * taxRatePercent) / 100) : 0;
  return { subtotal, fees, tax, total: r(subtotal + fees + tax) };
}

export const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending_payment: "Awaiting payment",
  pending_approval: "Awaiting approval",
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  rejected: "Not approved",
  expired: "Expired",
};

export const PAYMENT_LABEL: Record<RegistrationPaymentStatus, string> = {
  not_required: "Free",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  not_checked_in: "Not checked in",
  partially_checked_in: "Partly checked in",
  checked_in: "Checked in",
};

/** "Sat, Nov 21, 2026" and "9:00 AM – 4:00 PM (EST)" in the organizer's zone. */
export function eventWhen(ev: { startDate: string; endDate: string; timeZone?: string }) {
  const tz = ev.timeZone || undefined;
  const opts = (o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(undefined, { ...o, timeZone: tz });
    } catch {
      return new Intl.DateTimeFormat(undefined, o);
    }
  };
  const start = new Date(ev.startDate);
  const end = new Date(ev.endDate);
  const day = opts({ weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(start);
  const t = opts({ hour: "numeric", minute: "2-digit" });
  const zone = opts({ timeZoneName: "short" }).formatToParts(start).find((p) => p.type === "timeZoneName")?.value ?? "";
  const sameDay = opts({ year: "numeric", month: "numeric", day: "numeric" }).format(start) === opts({ year: "numeric", month: "numeric", day: "numeric" }).format(end);
  const endDay = sameDay ? "" : `${opts({ weekday: "short", month: "short", day: "numeric" }).format(end)}, `;
  return { day, time: `${t.format(start)} – ${endDay}${t.format(end)}${zone ? ` (${zone})` : ""}`, zone };
}

export function googleCalendarUrl(ev: RegistrationEventSummary, details: string): string {
  const f = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const where = ev.isOnline ? "Online (Fockis Meeting)" : [ev.locationName, ev.address].filter(Boolean).join(", ");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${e(ev.title)}&dates=${f(ev.startDate)}/${f(ev.endDate)}&details=${e(details)}&location=${e(where)}`;
}
