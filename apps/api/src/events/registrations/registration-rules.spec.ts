/**
 * Unit tests for the database-free registration rules:
 * settings validation, totals, answers, registration numbers, QR tickets,
 * CSV / Excel export.
 */
import { BadRequestException } from "@nestjs/common";

import {
  computeTotals,
  defaultSettings,
  newRegistrationNumber,
  normalizeSettings,
  QuestionType,
  REGISTRATION_NUMBER,
  RegistrationAccess,
  RegistrationMode,
  settingsOf,
  validateAnswers,
} from "./registration-settings";
import { parseCode, signatureMatches, ticketCode } from "./registration-qr";
import { buildCsv, buildXlsx } from "./xlsx-lite";

process.env.EVENT_TICKET_SECRET = "test-secret";

describe("normalizeSettings", () => {
  it("defaults to the original optional RSVP", () => {
    expect(normalizeSettings(null, { isOnline: false }).mode).toBe(RegistrationMode.RSVP);
    expect(settingsOf({}).mode).toBe(RegistrationMode.RSVP);
  });

  it("a free event gets a free general-admission ticket", () => {
    const s = normalizeSettings({ mode: "required" }, { isOnline: false });
    expect(s.isFree).toBe(true);
    expect(s.ticketTypes).toEqual([{ id: "general", name: "General admission", description: "", price: 0, quantity: null }]);
    expect(s.taxRatePercent).toBe(0);
    expect(s.serviceFee).toBe(0);
  });

  it("paid tickets make the event paid and keep ids", () => {
    const s = normalizeSettings(
      { mode: "required", ticketTypes: [{ id: "vip", name: "VIP", price: 49.999, quantity: 20 }, { name: "Standard", price: 10 }], taxRatePercent: 8.25, serviceFee: 1.5, allowGuests: true },
      { isOnline: false },
    );
    expect(s.isFree).toBe(false);
    expect(s.ticketTypes[0]).toMatchObject({ id: "vip", price: 50, quantity: 20 });
    expect(s.ticketTypes[1].id).toMatch(/^t_[a-f0-9]{12}$/);
    expect(s.taxRatePercent).toBe(8.25);
    // Guests can't pay, so guest registration is switched off for paid events.
    expect(s.allowGuests).toBe(false);
  });

  it("rejects bad input", () => {
    expect(() => normalizeSettings({ ticketTypes: [{ name: "", price: 1 }] }, { isOnline: false })).toThrow(BadRequestException);
    expect(() => normalizeSettings({ ticketTypes: [{ name: "A", price: -1 }] }, { isOnline: false })).toThrow(/zero or more/);
    expect(() => normalizeSettings({ questions: [{ type: "dropdown", label: "Size", options: ["S"] }] }, { isOnline: false })).toThrow(/two options/);
    expect(() => normalizeSettings({ opensAt: "2026-12-02", closesAt: "2026-12-01" }, { isOnline: false })).toThrow(/after registration opens/);
    expect(() => normalizeSettings({ closesAt: "2026-12-10" }, { isOnline: false, endDate: new Date("2026-12-05") })).toThrow(/before the event ends/);
    expect(() => normalizeSettings({ access: "members" }, { isOnline: false })).toThrow(/organization/);
    expect(() => normalizeSettings({ termsUrl: "javascript:alert(1)" }, { isOnline: false })).toThrow(/https/);
    expect(() => normalizeSettings({ currency: "dollars" }, { isOnline: false })).toThrow(/currency/);
  });

  it("online events offer only online attendance; hybrid needs both", () => {
    expect(normalizeSettings({ attendanceOptions: ["in_person", "online"] }, { isOnline: true }).attendanceOptions).toEqual(["online"]);
    expect(normalizeSettings({ attendanceOptions: ["in_person", "online", "x"] }, { isOnline: false }).attendanceOptions).toEqual(["in_person", "online"]);
  });

  it("members-only access with an organization; guests off when not public", () => {
    const s = normalizeSettings({ access: "members", organizationId: "65f000000000000000000001", allowGuests: true }, { isOnline: true });
    expect(s.access).toBe(RegistrationAccess.MEMBERS);
    expect(s.allowGuests).toBe(false);
  });

  it("clamps numbers", () => {
    const s = normalizeSettings({ maxTicketsPerUser: 99, earlyJoinMinutes: -5, cancellationDeadlineHours: "48" }, { isOnline: false });
    expect(s.maxTicketsPerUser).toBe(20);
    expect(s.earlyJoinMinutes).toBe(0);
    expect(s.cancellationDeadlineHours).toBe(48);
  });
});

describe("computeTotals", () => {
  it("free is $0.00", () => {
    expect(computeTotals(defaultSettings(), 0, 3)).toEqual({ unitPrice: 0, quantity: 3, subtotal: 0, fees: 0, tax: 0, total: 0, currency: "USD" });
  });
  it("adds per-ticket fees and tax on the subtotal, rounded to cents", () => {
    const t = computeTotals({ taxRatePercent: 8.25, serviceFee: 1.5, currency: "USD" }, 19.99, 3);
    expect(t.subtotal).toBe(59.97);
    expect(t.fees).toBe(4.5);
    expect(t.tax).toBe(4.95);
    expect(t.total).toBe(69.42);
  });
});

describe("validateAnswers", () => {
  const qs = [
    { id: "q1", type: QuestionType.SHORT_TEXT, label: "Church", required: true, options: [] },
    { id: "q2", type: QuestionType.DROPDOWN, label: "Size", required: false, options: ["S", "M"] },
    { id: "q3", type: QuestionType.MULTIPLE_CHOICE, label: "Sessions", required: false, options: ["A", "B", "C"] },
    { id: "q4", type: QuestionType.YES_NO, label: "Lunch", required: true, options: [] },
  ];
  it("stores clean answers", () => {
    const a = validateAnswers(qs, { q1: "  Grace\u0007 ", q2: "M", q3: ["A", "C", "A"], q4: "no", extra: "ignored" });
    expect(a.map((x) => x.value)).toEqual(["Grace", "M", ["A", "C"], false]);
  });
  it("requires required answers and listed options", () => {
    expect(() => validateAnswers(qs, { q4: true })).toThrow(/Church/);
    expect(() => validateAnswers(qs, { q1: "x", q4: true, q2: "XL" })).toThrow(/Size/);
    expect(() => validateAnswers(qs, { q1: "x", q4: true, q3: ["D"] })).toThrow(/Sessions/);
    expect(() => validateAnswers(qs, { q1: "x" })).toThrow(/Lunch/);
  });
});

describe("registration numbers and QR tickets", () => {
  it("numbers are readable and unique enough", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const n = newRegistrationNumber();
      expect(n).toMatch(REGISTRATION_NUMBER);
      seen.add(n);
    }
    expect(seen.size).toBe(2000);
  });

  it("signed codes verify, and stop verifying after a version bump", () => {
    const r = { id: "65f0000000000000000000aa", eventId: "65f0000000000000000000bb", registrationNumber: "FKE-7XK2-9QPM", qrVersion: 1 };
    const code = ticketCode(r);
    const parsed = parseCode(code)!;
    expect(parsed.registrationNumber).toBe("FKE-7XK2-9QPM");
    expect(signatureMatches(parsed.signature!, r)).toBe(true);
    expect(signatureMatches(parsed.signature!, { ...r, qrVersion: 2 })).toBe(false);
    expect(signatureMatches(parsed.signature!, { ...r, eventId: "65f0000000000000000000cc" })).toBe(false);
  });

  it("parses typed numbers and rejects junk", () => {
    expect(parseCode(" fke-7xk2-9qpm ")).toEqual({ registrationNumber: "FKE-7XK2-9QPM", signature: null });
    expect(parseCode("https://evil.example")).toBeNull();
    expect(parseCode("FKREG1.FKE-7XK2-9QPM.short")).toBeNull();
  });
});

describe("exports", () => {
  it("CSV escapes quotes and blocks formula injection", () => {
    const csv = buildCsv(["Name", "Note"], [["Ann \"A\"", "=HYPERLINK(1)"], ["Bo", "a,b"]]);
    expect(csv).toContain('"Ann ""A"""');
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain('"a,b"');
  });
  it("XLSX is a ZIP with the workbook parts", () => {
    const buf = buildXlsx("Registrations", ["Name", "Total"], [["Ann & Bo <3", 12.5]]);
    expect(buf.readUInt32LE(0)).toBe(0x04034b50);
    const text = buf.toString("utf8");
    expect(text).toContain("xl/worksheets/sheet1.xml");
    expect(text).toContain("Ann &amp; Bo &lt;3");
    expect(text).toContain("<v>12.5</v>");
  });
});
