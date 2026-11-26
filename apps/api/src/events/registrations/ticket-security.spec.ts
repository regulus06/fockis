/**
 * Live admission codes, check-in grants and ticket security settings.
 */
import {
  ADMISSION_GRACE_MS,
  checkAdmission,
  checkCheckInGrant,
  isAdmissionCode,
  issueAdmissionCode,
  issueCheckInGrant,
  parseAdmission,
  parseCode,
} from "./registration-qr";
import { defaultSettings, normalizeSettings, settingsOf } from "./registration-settings";

process.env.EVENT_TICKET_SECRET = process.env.EVENT_TICKET_SECRET || "test-secret-for-unit-tests-only";

const reg = { id: "65f0000000000000000000aa", eventId: "65f0000000000000000000bb", registrationNumber: "FKE-7XK2-9QPM", qrVersion: 3 };
const NOW = Date.parse("2026-11-26T12:00:00Z");

describe("live admission codes", () => {
  it("are valid right away and carry no personal data", () => {
    const code = issueAdmissionCode(reg, 30, -1, NOW);
    expect(isAdmissionCode(code.token)).toBe(true);
    expect(code.token).not.toMatch(/@|65f0/); // no email, no database ids
    expect(code.expiresAt.getTime() - code.issuedAt.getTime()).toBe(30_000);
    const parsed = parseAdmission(code.token)!;
    expect(parsed.registrationNumber).toBe(reg.registrationNumber);
    expect(checkAdmission(parsed, reg, NOW + 1_000)).toBe("valid");
  });

  it("expire after their lifetime (plus a small scan grace)", () => {
    for (const ttl of [15, 30, 60]) {
      const parsed = parseAdmission(issueAdmissionCode(reg, ttl, -1, NOW).token)!;
      const end = Math.floor(NOW / 1000) * 1000 + ttl * 1000;
      expect(checkAdmission(parsed, reg, end + ADMISSION_GRACE_MS)).toBe("valid");
      expect(checkAdmission(parsed, reg, end + ADMISSION_GRACE_MS + 1)).toBe("expired");
    }
  });

  it("stop working when the ticket version changes (refund, cancel, dispute)", () => {
    const parsed = parseAdmission(issueAdmissionCode(reg, 30, -1, NOW).token)!;
    expect(checkAdmission(parsed, { ...reg, qrVersion: 4 }, NOW)).toBe("invalid");
  });

  it("only work for their own event and registration", () => {
    const parsed = parseAdmission(issueAdmissionCode(reg, 30, -1, NOW).token)!;
    expect(checkAdmission(parsed, { ...reg, eventId: "65f0000000000000000000cc" }, NOW)).toBe("invalid");
    expect(checkAdmission(parsed, { ...reg, id: "65f0000000000000000000dd" }, NOW)).toBe("invalid");
  });

  it("reject any edited field (time, lifetime, nonce, signature)", () => {
    const token = issueAdmissionCode(reg, 15, -1, NOW).token;
    const parts = token.split(".");
    const later = [...parts];
    later[3] = (parseInt(parts[3], 36) + 600).toString(36); // pretend it was issued 10 minutes later
    expect(checkAdmission(parseAdmission(later.join("."))!, reg, NOW + 600_000)).toBe("invalid");
    const longer = [...parts];
    longer[4] = "60";
    expect(checkAdmission(parseAdmission(longer.join("."))!, reg, NOW + 40_000)).toBe("invalid");
    const otherNonce = [...parts];
    otherNonce[5] = "AAAAAAAA";
    expect(checkAdmission(parseAdmission(otherNonce.join("."))!, reg, NOW)).toBe("invalid");
    const forged = [...parts];
    forged[6] = "x".repeat(27);
    expect(checkAdmission(parseAdmission(forged.join("."))!, reg, NOW)).toBe("invalid");
  });

  it("are never reported as merely expired when forged", () => {
    const parts = issueAdmissionCode(reg, 15, -1, NOW).token.split(".");
    parts[6] = "y".repeat(27);
    expect(checkAdmission(parseAdmission(parts.join("."))!, reg, NOW + 3_600_000)).toBe("invalid");
  });

  it("reject codes dated in the future", () => {
    const parsed = parseAdmission(issueAdmissionCode(reg, 30, -1, NOW + 120_000).token)!;
    expect(checkAdmission(parsed, reg, NOW)).toBe("invalid");
  });

  it("differ every time they are issued", () => {
    const a = issueAdmissionCode(reg, 30, -1, NOW).token;
    const b = issueAdmissionCode(reg, 30, -1, NOW).token;
    expect(a).not.toBe(b);
  });

  it("parse strictly", () => {
    expect(parseAdmission("FKA1.FKE-7XK2-9QPM.-1.abc.45.AAAAAAAA." + "a".repeat(27))).toBeNull(); // ttl not allowed
    expect(parseAdmission("FKA1.nope")).toBeNull();
    expect(parseAdmission("https://evil.example")).toBeNull();
    expect(isAdmissionCode("FKREG1.FKE-7XK2-9QPM.abc")).toBe(false);
    // Typed registration numbers still parse for manual lookup.
    expect(parseCode("FKE-7XK2-9QPM")?.signature).toBeNull();
  });
});

describe("check-in grants", () => {
  const staff = "65f0000000000000000000ee";
  it("work for the same staff member and registration, within 3 minutes", () => {
    const grant = issueCheckInGrant(reg.id, staff, "qr", NOW);
    expect(checkCheckInGrant(grant, reg.id, staff, NOW + 60_000)).toBe("qr");
    expect(checkCheckInGrant(grant, reg.id, staff, NOW + 181_000)).toBeNull();
  });
  it("can't be reused by another staff member or for another registration", () => {
    const grant = issueCheckInGrant(reg.id, staff, "manual", NOW);
    expect(checkCheckInGrant(grant, reg.id, "65f0000000000000000000ff", NOW)).toBeNull();
    expect(checkCheckInGrant(grant, "65f0000000000000000000dd", staff, NOW)).toBeNull();
  });
  it("can't be upgraded from a manual lookup to a QR scan", () => {
    const parts = issueCheckInGrant(reg.id, staff, "manual", NOW).split(".");
    parts[2] = "qr";
    expect(checkCheckInGrant(parts.join("."), reg.id, staff, NOW)).toBeNull();
  });
});

describe("ticket security settings", () => {
  it("default to Standard with a 30-second QR", () => {
    const s = defaultSettings();
    expect(s.ticketSecurity).toBe("standard");
    expect(s.qrTtlSeconds).toBe(30);
    expect(s.allowReentry).toBe(false);
  });
  it("only accept 15, 30 or 60 seconds", () => {
    expect(normalizeSettings({ qrTtlSeconds: 15 }, { isOnline: false }).qrTtlSeconds).toBe(15);
    expect(normalizeSettings({ qrTtlSeconds: 60 }, { isOnline: false }).qrTtlSeconds).toBe(60);
    expect(normalizeSettings({ qrTtlSeconds: 3600 }, { isOnline: false }).qrTtlSeconds).toBe(30);
  });
  it("Enhanced requires accounts (no guests) and shows staff the holder photo", () => {
    const s = normalizeSettings({ ticketSecurity: "enhanced", allowGuests: true }, { isOnline: false });
    expect(s.ticketSecurity).toBe("enhanced");
    expect(s.allowGuests).toBe(false);
    expect(s.showHolderPhoto).toBe(true);
  });
  it("older events without these settings get the defaults", () => {
    const s = settingsOf({ registration: { mode: "rsvp" } });
    expect(s.ticketSecurity).toBe("standard");
    expect(s.qrTtlSeconds).toBe(30);
  });
});
