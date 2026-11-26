/**
 * registration-qr.ts
 * -----------------------------------------------------------------------------
 * QR ticket contents: "FKREG1.<registrationNumber>.<signature>".
 *
 * The signature is an HMAC of the registration id, its event and its
 * qrVersion with a server secret, so a code cannot be guessed or made up from
 * a registration number, and bumping qrVersion (e.g. on cancellation)
 * invalidates every code issued before. Reuse at the door is stopped by the
 * check-in itself (a person can be checked in once).
 * -----------------------------------------------------------------------------
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import * as QRCode from "qrcode";

import { REGISTRATION_NUMBER } from "./registration-settings";

const PREFIX = "FKREG1";

function secret(): string {
  const s = process.env.EVENT_TICKET_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("EVENT_TICKET_SECRET (or JWT_SECRET) must be set to issue event tickets.");
  return s;
}

function signature(registrationId: string, eventId: string, version: number): string {
  return createHmac("sha256", secret())
    .update(`${registrationId}|${eventId}|${version}`)
    .digest("base64url")
    .slice(0, 22);
}

export function ticketCode(r: { id: string; eventId: string; registrationNumber: string; qrVersion: number }): string {
  return `${PREFIX}.${r.registrationNumber}.${signature(r.id, r.eventId, r.qrVersion)}`;
}

export interface ParsedCode {
  registrationNumber: string;
  signature: string | null;
}

/** Accepts a scanned code or a typed registration number. */
export function parseCode(input: string): ParsedCode | null {
  const text = String(input ?? "").trim();
  const upper = text.toUpperCase();
  if (REGISTRATION_NUMBER.test(upper)) return { registrationNumber: upper, signature: null };
  const parts = text.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const number = parts[1].toUpperCase();
  if (!REGISTRATION_NUMBER.test(number) || !/^[A-Za-z0-9_-]{22}$/.test(parts[2])) return null;
  return { registrationNumber: number, signature: parts[2] };
}

export function signatureMatches(sig: string, r: { id: string; eventId: string; qrVersion: number }): boolean {
  const expected = Buffer.from(signature(r.id, r.eventId, r.qrVersion));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** PNG data URL of the ticket QR code. */
export function qrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(code, { errorCorrectionLevel: "M", margin: 1, width: 320 });
}

/* ============================================================================
   LIVE ADMISSION CODES
   "FKA1.<registrationNumber>.<attendee>.<issuedAt>.<ttl>.<nonce>.<signature>"

   Issued only to the ticket holder, valid for a few seconds (15/30/60), and
   signed (HMAC-SHA256) over the purpose, registration, event, attendee,
   ticket version, issue time, lifetime and a random nonce. A screenshot or a
   copied code stops working when it expires; bumping qrVersion (refund,
   cancellation, dispute, transfer) invalidates every code already issued.
   The code holds no name, email or payment data. The key never leaves the
   server.
============================================================================ */

const ADMISSION_PREFIX = "FKA1";
/** Accept a code a little after it expires (scan + network delay). */
export const ADMISSION_GRACE_MS = 5_000;
/** Reject codes "issued" in the future (tampered clocks). */
const FUTURE_SKEW_MS = 30_000;

function admissionSignature(f: {
  registrationId: string;
  eventId: string;
  attendee: number;
  version: number;
  issuedAt: number;
  ttl: number;
  nonce: string;
}): string {
  return createHmac("sha256", secret())
    .update(`admission|${f.registrationId}|${f.eventId}|${f.attendee}|${f.version}|${f.issuedAt}|${f.ttl}|${f.nonce}`)
    .digest("base64url")
    .slice(0, 27);
}

export interface AdmissionCode {
  token: string;
  issuedAt: Date;
  expiresAt: Date;
}

export function issueAdmissionCode(
  r: { id: string; eventId: string; registrationNumber: string; qrVersion: number },
  ttlSeconds: number,
  attendee = -1,
  now = Date.now(),
): AdmissionCode {
  const issuedAt = Math.floor(now / 1000);
  const nonce = randomBytes(6).toString("base64url");
  const sig = admissionSignature({ registrationId: r.id, eventId: r.eventId, attendee, version: r.qrVersion, issuedAt, ttl: ttlSeconds, nonce });
  return {
    token: [ADMISSION_PREFIX, r.registrationNumber, String(attendee), issuedAt.toString(36), String(ttlSeconds), nonce, sig].join("."),
    issuedAt: new Date(issuedAt * 1000),
    expiresAt: new Date((issuedAt + ttlSeconds) * 1000),
  };
}

export interface ParsedAdmission {
  registrationNumber: string;
  attendee: number;
  issuedAt: number;
  ttl: number;
  nonce: string;
  signature: string;
}

export function isAdmissionCode(input: string): boolean {
  return String(input ?? "").trim().startsWith(`${ADMISSION_PREFIX}.`);
}

export function parseAdmission(input: string): ParsedAdmission | null {
  const parts = String(input ?? "").trim().split(".");
  if (parts.length !== 7 || parts[0] !== ADMISSION_PREFIX) return null;
  const [, number, attendeeText, issuedText, ttlText, nonce, signature] = parts;
  const attendee = Number(attendeeText);
  const issuedAt = parseInt(issuedText, 36);
  const ttl = Number(ttlText);
  if (!REGISTRATION_NUMBER.test(number.toUpperCase())) return null;
  if (!Number.isInteger(attendee) || attendee < -1 || attendee > 100) return null;
  if (!Number.isSafeInteger(issuedAt) || issuedAt <= 0) return null;
  if (![15, 30, 60].includes(ttl)) return null;
  if (!/^[A-Za-z0-9_-]{8}$/.test(nonce) || !/^[A-Za-z0-9_-]{27}$/.test(signature)) return null;
  return { registrationNumber: number.toUpperCase(), attendee, issuedAt, ttl, nonce, signature };
}

export type AdmissionCheck = "valid" | "expired" | "invalid";

/** Signature first (so a forged code is "invalid", never "expired"), then time. */
export function checkAdmission(
  code: ParsedAdmission,
  r: { id: string; eventId: string; qrVersion: number },
  now = Date.now(),
): AdmissionCheck {
  const expected = Buffer.from(
    admissionSignature({
      registrationId: r.id,
      eventId: r.eventId,
      attendee: code.attendee,
      version: r.qrVersion,
      issuedAt: code.issuedAt,
      ttl: code.ttl,
      nonce: code.nonce,
    }),
  );
  const given = Buffer.from(code.signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const issuedMs = code.issuedAt * 1000;
  if (issuedMs - now > FUTURE_SKEW_MS) return "invalid";
  if (now > issuedMs + code.ttl * 1000 + ADMISSION_GRACE_MS) return "expired";
  return "valid";
}

/* ============================================================================
   CHECK-IN GRANTS
   After a scan (or a manual lookup) that needs the staff member to confirm
   the person's identity, the server hands that staff member a short grant.
   Confirming check-in requires it, so a registration ID alone can't admit
   anyone and the live QR may expire while staff look at the person.
============================================================================ */

const GRANT_TTL_SECONDS = 180;

function grantSignature(registrationId: string, staffId: string, expires: number, method: string): string {
  return createHmac("sha256", secret())
    .update(`checkin-grant|${registrationId}|${staffId}|${expires}|${method}`)
    .digest("base64url")
    .slice(0, 27);
}

export function issueCheckInGrant(registrationId: string, staffId: string, method: "qr" | "manual", now = Date.now()): string {
  const expires = Math.floor(now / 1000) + GRANT_TTL_SECONDS;
  return ["G1", expires.toString(36), method, grantSignature(registrationId, staffId, expires, method)].join(".");
}

/** The method the grant was issued for, or null if it is forged, for someone else, or expired. */
export function checkCheckInGrant(grant: string, registrationId: string, staffId: string, now = Date.now()): "qr" | "manual" | null {
  const parts = String(grant ?? "").split(".");
  if (parts.length !== 4 || parts[0] !== "G1") return null;
  const expires = parseInt(parts[1], 36);
  const method = parts[2];
  if (!Number.isSafeInteger(expires) || (method !== "qr" && method !== "manual")) return null;
  const expected = Buffer.from(grantSignature(registrationId, staffId, expires, method));
  const given = Buffer.from(parts[3]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (now > expires * 1000) return null;
  return method;
}
