/**
 * Business rules for ministry attendance (run: npm test -- ministry-attendance).
 * Lateness is computed from the session's scheduled start in its own time zone,
 * at whole-minute precision; every meeting date is a separate session.
 */
import { occurrenceKey, occurrencesBetween, occursOn } from "./attendance-recurrence";
import { localHhmm, localYmd, officialArrival, zonedLocalToUtc } from "./attendance-time";

const tz = "America/New_York";
const start = zonedLocalToUtc("2026-11-15", "13:00", tz);
const at = (hhmm: string, seconds = 0) => new Date(zonedLocalToUtc("2026-11-15", hhmm, tz).getTime() + seconds * 1000);

describe("late arrival (meeting starts 1:00 PM)", () => {
  it.each([
    ["12:45", "present", 0],
    ["12:55", "present", 0], // manual entry / forgot to check in, corrected to 12:55
    ["12:59", "present", 0],
    ["13:00", "present", 0],
    ["13:01", "late", 1],
    ["13:02", "late", 2],
    ["13:05", "late", 5],
    ["13:07", "late", 7],
    ["13:10", "late", 10],
    ["13:15", "late", 15],
    ["13:20", "late", 20],
    ["13:30", "late", 30],
  ])("arrival %s → %s, %i min", (hhmm, status, minutes) => {
    expect(officialArrival(at(hhmm), start)).toEqual({ status, lateMinutes: minutes });
  });

  it("1:00:59 is still the 1:00 minute → present", () => {
    expect(officialArrival(at("13:00", 59), start)).toEqual({ status: "present", lateMinutes: 0 });
  });
});

describe("time zones", () => {
  it("1:00 PM New York in November is 18:00 UTC", () => expect(start.toISOString()).toBe("2026-11-15T18:00:00.000Z"));
  it("1:00 PM New York in July is 17:00 UTC (DST)", () => expect(zonedLocalToUtc("2026-07-12", "13:00", tz).toISOString()).toBe("2026-07-12T17:00:00.000Z"));
  it("DST start day", () => expect(zonedLocalToUtc("2026-03-08", "03:30", tz).toISOString()).toBe("2026-03-08T07:30:00.000Z"));
  it("DST end day", () => expect(zonedLocalToUtc("2026-11-01", "13:00", tz).toISOString()).toBe("2026-11-01T18:00:00.000Z"));
  it("1:01 PM local is 1 minute late in any zone", () => {
    for (const zone of ["Asia/Tokyo", "Europe/London", "America/Port-au-Prince", "America/Los_Angeles"]) {
      expect(officialArrival(zonedLocalToUtc("2026-11-15", "13:01", zone), zonedLocalToUtc("2026-11-15", "13:00", zone))).toEqual({ status: "late", lateMinutes: 1 });
    }
  });
  it("round-trips local date and time", () => {
    expect(localYmd(start, tz)).toBe("2026-11-15");
    expect(localHhmm(start, tz)).toBe("13:00");
  });
});

describe("one session per meeting date", () => {
  const bible = { key: "bs1", name: "Bible Study", frequency: "weekly" as const, weekdays: [0], anchorDate: "2026-11-01", startClock: "13:00", timeZone: tz, attendance: true };

  it("four Sundays → four separate occurrence keys", () => {
    const dates = occurrencesBetween(bible, "2026-11-01", "2026-11-28");
    expect(dates).toEqual(["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22"]);
    expect(new Set(dates.map((d) => occurrenceKey("bs1", d))).size).toBe(4);
  });
  it("biweekly", () => expect(occurrencesBetween({ ...bible, frequency: "biweekly" }, "2026-11-01", "2026-11-30")).toEqual(["2026-11-01", "2026-11-15", "2026-11-29"]));
  it("monthly", () => expect(occurrencesBetween({ ...bible, frequency: "monthly", anchorDate: "2026-10-15" }, "2026-10-01", "2026-12-31")).toEqual(["2026-10-15", "2026-11-15", "2026-12-15"]));
  it("one time", () => expect(occurrencesBetween({ ...bible, frequency: "once", anchorDate: "2026-11-20" }, "2026-11-01", "2026-11-30")).toEqual(["2026-11-20"]));
  it("selected weekdays", () => expect(occurrencesBetween({ ...bible, weekdays: [3, 5] }, "2026-11-01", "2026-11-14")).toEqual(["2026-11-04", "2026-11-06", "2026-11-11", "2026-11-13"]));
  it("attendance turned off → no sessions", () => expect(occursOn({ ...bible, attendance: false }, "2026-11-08")).toBe(false));
});
