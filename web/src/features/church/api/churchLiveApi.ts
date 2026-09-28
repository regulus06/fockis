/**
 * churchLiveApi.ts
 * -----------------------------------------------------------------------------
 * Church Live API functions connected directly to the NestJS backend.
 * -----------------------------------------------------------------------------
 */

import {
  churchDelete,
  churchGet,
  churchPatch,
  churchPost,
} from "./churchApi";

import {
  LiveEventState,
  LiveEventVisibility,
  type LiveEvent,
  type PageQuery,
  type PaginatedResult,
} from "../types/church.types";

/* ========================================================================== */
/* Types                                                                      */
/* ========================================================================== */

export interface ScheduleLiveEventInput {
  organizationId: string;
  branchId?: string;
  title: string;
  description?: string;
  visibility: LiveEventVisibility;
  scheduledStart: string;
  invitedGuestEmails?: string[];
}

/* ========================================================================== */
/* Live events                                                                */
/* ========================================================================== */

/**
 * List all live events for an organization.
 */
export async function getLiveEvents(
  organizationId: string,
  query: PageQuery = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<LiveEvent>> {
  return churchGet<PaginatedResult<LiveEvent>>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/live`,
    {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
    },
    signal,
  );
}

/**
 * Get the currently live service.
 */
export async function getCurrentLiveService(
  organizationId: string,
  signal?: AbortSignal,
): Promise<LiveEvent | null> {
  return churchGet<LiveEvent | null>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/live/current`,
    undefined,
    signal,
  );
}

/**
 * Get upcoming live events.
 */
export async function getUpcomingLiveEvents(
  organizationId: string,
  query: PageQuery = {},
  signal?: AbortSignal,
): Promise<PaginatedResult<LiveEvent>> {
  return churchGet<PaginatedResult<LiveEvent>>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/live/upcoming`,
    {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search,
    },
    signal,
  );
}

/**
 * Join a live service.
 */
export async function joinLiveService(
  organizationId: string,
  liveEventId: string,
  options: {
    guestEmail?: string;
  } = {},
): Promise<{
  playbackUrl: string;
  state: LiveEvent["state"];
}> {
  return churchPost<{
    playbackUrl: string;
    state: LiveEvent["state"];
  }>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/live/${encodeURIComponent(
      liveEventId,
    )}/join`,
    options,
  );
}

/* ========================================================================== */
/* Admin / management                                                         */
/* ========================================================================== */

/**
 * Schedule a live event.
 */
export async function scheduleLiveEvent(
  input: ScheduleLiveEventInput,
): Promise<LiveEvent> {
  return churchPost<LiveEvent>(
    `/organizations/${encodeURIComponent(
      input.organizationId,
    )}/live`,
    {
      branchId: input.branchId,
      title: input.title,
      description: input.description,
      visibility: input.visibility,
      scheduledStart: input.scheduledStart,
      invitedGuestEmails:
        input.invitedGuestEmails,
    },
  );
}

/**
 * Update a live event.
 */
export async function updateLiveEvent(
  organizationId: string,
  liveEventId: string,
  input: Partial<
    Omit<
      ScheduleLiveEventInput,
      "organizationId"
    >
  >,
): Promise<LiveEvent> {
  return churchPatch<LiveEvent>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/live/${encodeURIComponent(
      liveEventId,
    )}`,
    input,
  );
}

/**
 * Start a scheduled live event.
 */
export async function startLiveEvent(
  organizationId: string,
  liveEventId: string,
): Promise<LiveEvent> {
  return churchPatch<LiveEvent>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/live/${encodeURIComponent(
      liveEventId,
    )}/state`,
    {
      state: LiveEventState.Live,
    },
  );
}

/**
 * End a live event.
 */
export async function endLiveEvent(
  organizationId: string,
  liveEventId: string,
): Promise<LiveEvent> {
  return churchPatch<LiveEvent>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/live/${encodeURIComponent(
      liveEventId,
    )}/state`,
    {
      state: LiveEventState.Ended,
    },
  );
}

/**
 * Delete/cancel a scheduled live event.
 */
export async function deleteLiveEvent(
  organizationId: string,
  liveEventId: string,
): Promise<void> {
  await churchDelete<void>(
    `/organizations/${encodeURIComponent(
      organizationId,
    )}/live/${encodeURIComponent(
      liveEventId,
    )}`,
  );
}