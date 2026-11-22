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

import { createHmac, timingSafeEqual } from "crypto";
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
