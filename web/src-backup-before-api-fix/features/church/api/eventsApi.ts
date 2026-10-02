/**
 * eventsApi.ts
 * -----------------------------------------------------------------------------
 * Event API functions connected directly to the NestJS backend.
 * -----------------------------------------------------------------------------
 */

import {
  churchDelete,
  churchGet,
  churchPatch,
  churchPost,
} from "./churchApi";

import type {
  ChurchEvent,
  CreateEventInput,
  EventType,
  PageQuery,
  PaginatedResult,
  RsvpStatus,
  UpdateEventInput,
} from "../types/church.types";

export interface ListEventsQuery extends PageQuery {
  eventType?: EventType;
  departmentId?: string;
  groupId?: string;
  branchId?: string;
  from?: string;
  to?: string;
  mineOnly?: boolean;
}

function requireOrganizationId(
  organizationId: string,
): string {
  const value = organizationId?.trim();

  if (
    !value ||
    value === "YOUR_ORG_ID" ||
    value === "undefined" ||
    value === "null"
  ) {
    throw new Error(
      "A valid Church organization ID is required.",
    );
  }

  return value;
}

/**
 * List events.
 */
export async function listEvents(
  organizationId: string,
  query: ListEventsQuery = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<ChurchEvent>> {
  const id =
    requireOrganizationId(organizationId);

  return churchGet<PaginatedResult<ChurchEvent>>(
    `/organizations/${encodeURIComponent(id)}/events`,
    {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
      eventType: query.eventType,
      departmentId: query.departmentId,
      groupId: query.groupId,
      branchId: query.branchId,
      from: query.from,
      to: query.to,
      mineOnly: query.mineOnly,
    },
    signal,
  );
}

/**
 * Get event.
 */
export async function getEvent(
  organizationId: string,
  eventId: string,
  signal?: AbortSignal,
): Promise<ChurchEvent> {
  const id =
    requireOrganizationId(organizationId);

  return churchGet<ChurchEvent>(
    `/organizations/${encodeURIComponent(id)}/events/${encodeURIComponent(eventId)}`,
    undefined,
    signal,
  );
}

/**
 * Create event.
 */
export async function createEvent(
  input: CreateEventInput,
): Promise<ChurchEvent> {
  const organizationId =
    requireOrganizationId(
      input.organizationId,
    );

  return churchPost<ChurchEvent>(
    `/organizations/${encodeURIComponent(organizationId)}/events`,
    input,
  );
}

/**
 * Update event.
 */
export async function updateEvent(
  organizationId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<ChurchEvent> {
  const id =
    requireOrganizationId(organizationId);

  return churchPatch<ChurchEvent>(
    `/organizations/${encodeURIComponent(id)}/events/${encodeURIComponent(eventId)}`,
    input,
  );
}

/**
 * Delete/cancel event.
 */
export async function deleteEvent(
  organizationId: string,
  eventId: string,
): Promise<void> {
  const id =
    requireOrganizationId(organizationId);

  await churchDelete<void>(
    `/organizations/${encodeURIComponent(id)}/events/${encodeURIComponent(eventId)}`,
  );
}

/**
 * RSVP to event.
 */
export async function rsvpToEvent(
  organizationId: string,
  eventId: string,
  status: RsvpStatus,
): Promise<ChurchEvent> {
  const id =
    requireOrganizationId(organizationId);

  return churchPost<ChurchEvent>(
    `/organizations/${encodeURIComponent(id)}/events/${encodeURIComponent(eventId)}/rsvp`,
    {
      status,
    },
  );
}

/**
 * Cancel RSVP.
 */
export async function cancelRsvp(
  organizationId: string,
  eventId: string,
): Promise<ChurchEvent> {
  const id =
    requireOrganizationId(organizationId);

  return churchDelete<ChurchEvent>(
    `/organizations/${encodeURIComponent(id)}/events/${encodeURIComponent(eventId)}/rsvp`,
  );
}