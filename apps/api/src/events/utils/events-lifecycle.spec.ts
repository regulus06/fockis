import { Types } from "mongoose";
import { EventStatus, EventVisibility } from "../schemas/event.schema";
import { activeEventFilter, getEventStatus, isEventActive, isScheduled, msUntilNextTransition } from "./event-lifecycle";
import { buildEventVisibilityFilter, canViewEvent } from "./event-visibility";

jest.mock("../../notifications/notifications.service", () => ({ NotificationsService: class {} }), { virtual: true });

const H = 3_600_000;
const now = new Date("2026-11-26T15:00:00Z");
const at = (h: number) => new Date(now.getTime() + h * H);
const rel = { friendIds: [], blockedIds: [], memberOrganizationIds: [], managedOrganizationIds: [] } as never;

describe("event lifecycle", () => {
  it("time rules: upcoming → happening now → ended (end instant itself is ended)", () => {
    expect(getEventStatus({ startDate: at(1), endDate: at(2) }, now)).toBe(EventStatus.UPCOMING);
    expect(getEventStatus({ startDate: at(-1), endDate: at(1) }, now)).toBe(EventStatus.LIVE);
    expect(getEventStatus({ startDate: at(-2), endDate: now }, now)).toBe(EventStatus.ENDED);
  });

  it("cancelled beats everything; ended beats postponed/scheduled; postponed beats scheduled and the clock", () => {
    expect(getEventStatus({ startDate: at(-2), endDate: at(-1), isCancelled: true, isPostponed: true }, now)).toBe(EventStatus.CANCELLED);
    expect(getEventStatus({ startDate: at(-2), endDate: at(-1), isPostponed: true }, now)).toBe(EventStatus.ENDED);
    expect(getEventStatus({ startDate: at(-1), endDate: at(1), isPostponed: true, publishAt: at(1) }, now)).toBe(EventStatus.POSTPONED);
    expect(getEventStatus({ startDate: at(5), endDate: at(6), publishAt: at(1) }, now)).toBe(EventStatus.SCHEDULED);
    expect(getEventStatus({ startDate: at(5), endDate: at(6), publishAt: at(-1) }, now)).toBe(EventStatus.UPCOMING);
  });

  it("only upcoming / happening now events are active (RSVP, discovery)", () => {
    expect(isEventActive({ startDate: at(1), endDate: at(2) }, now)).toBe(true);
    expect(isEventActive({ startDate: at(-1), endDate: at(1) }, now)).toBe(true);
    expect(isEventActive({ startDate: at(1), endDate: at(2), isPostponed: true }, now)).toBe(false);
    expect(isEventActive({ startDate: at(1), endDate: at(2), publishAt: at(0.5) }, now)).toBe(false);
    expect(isEventActive({ startDate: at(-2), endDate: at(-1) }, now)).toBe(false);
  });

  it("active filter excludes cancelled, postponed and ended", () => {
    expect(activeEventFilter(now)).toEqual({ isCancelled: { $ne: true }, isPostponed: { $ne: true }, endDate: { $gt: now } });
  });

  it("next transition: publication, start, end; none when postponed", () => {
    expect(msUntilNextTransition({ startDate: at(5), endDate: at(6), publishAt: at(1) }, now)).toBe(H);
    expect(msUntilNextTransition({ startDate: at(5), endDate: at(6) }, now)).toBe(5 * H);
    expect(msUntilNextTransition({ startDate: at(5), endDate: at(6), isPostponed: true }, now)).toBeNull();
    expect(isScheduled({ publishAt: null }, now)).toBe(false);
  });
});

describe("scheduled publication is private until its time", () => {
  const creator = new Types.ObjectId();
  const other = new Types.ObjectId();
  const later = { creatorId: creator, visibility: EventVisibility.PUBLIC, publishAt: new Date(Date.now() + H) };

  it("only the creator (or an org event manager) can open it", () => {
    expect(canViewEvent(later, String(creator), rel)).toBe(true);
    expect(canViewEvent(later, String(other), rel)).toBe(false);
    expect(canViewEvent(later, undefined, rel)).toBe(false);
    const orgEvent = { ...later, organizationId: new Types.ObjectId() };
    expect(canViewEvent(orgEvent, String(other), { ...(rel as object), managedOrganizationIds: [String(orgEvent.organizationId)] } as never)).toBe(true);
    expect(canViewEvent({ ...later, publishAt: new Date(Date.now() - H) }, undefined, rel)).toBe(true);
  });

  it("list filter: published, or created by the viewer", () => {
    const anon = buildEventVisibilityFilter(undefined, rel) as { $and: { $or: unknown[] }[] };
    expect(anon.$and[0].$or).toHaveLength(2);
    const mine = buildEventVisibilityFilter(String(creator), rel) as { $and: { $or: Record<string, unknown>[] }[] };
    expect(mine.$and[0].$or).toContainEqual({ creatorId: creator });
  });
});
