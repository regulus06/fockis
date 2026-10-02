/*
 * ============================================================================
 * FOCKIS FRIEND STATUS
 * ============================================================================
 *
 * Converts the backend friendship response into a stable frontend state.
 *
 * IMPORTANT:
 *
 * Backend returns:
 *
 * {
 *   status: "pending",
 *   direction: "outgoing",
 *   id: "...",
 *   requestId: "..."
 * }
 *
 * Therefore:
 *
 * pending + outgoing  = request_sent
 * pending + incoming  = request_received
 * accepted            = friends
 * blocked             = blocked
 * everything else     = none
 *
 * This file is intentionally responsible ONLY for normalizing friendship
 * status. It does not make API requests.
 * ============================================================================
 */

import {
  FockisFriendRequestResponse,
  extractFriendRequestId,
  normalizeFriendDirection,
  normalizeFriendStatus,
} from "../service/fockisFriendsApi";

/*
 * ============================================================================
 * TYPES
 * ============================================================================
 */

export type FockisFriendStatus =
  | "none"
  | "request_sent"
  | "request_received"
  | "friends"
  | "blocked"
  | "rejected"
  | "self";

/*
 * ============================================================================
 * NORMALIZE STATUS
 * ============================================================================
 */

export function getFockisFriendStatus(
  response:
    | FockisFriendRequestResponse
    | null
    | undefined,
): FockisFriendStatus {
  if (!response) {
    return "none";
  }

  const status =
    normalizeFriendStatus(response);

  const direction =
    normalizeFriendDirection(response);

  /*
   * --------------------------------------------------------------------------
   * SELF
   * --------------------------------------------------------------------------
   */

  if (status === "self") {
    return "self";
  }

  /*
   * --------------------------------------------------------------------------
   * ACCEPTED
   * --------------------------------------------------------------------------
   */

  if (status === "accepted") {
    return "friends";
  }

  /*
   * --------------------------------------------------------------------------
   * BLOCKED
   * --------------------------------------------------------------------------
   */

  if (status === "blocked") {
    return "blocked";
  }

  /*
   * --------------------------------------------------------------------------
   * REJECTED
   * --------------------------------------------------------------------------
   */

  if (status === "rejected") {
    return "rejected";
  }

  /*
   * --------------------------------------------------------------------------
   * PENDING
   *
   * THIS IS THE IMPORTANT PART.
   *
   * The backend tells us who created the request through `direction`.
   *
   * outgoing = current user sent request
   * incoming = current user received request
   * --------------------------------------------------------------------------
   */

  if (status === "pending") {
    if (direction === "outgoing") {
      return "request_sent";
    }

    if (direction === "incoming") {
      return "request_received";
    }

    /*
     * If backend says pending but does not provide direction,
     * do NOT incorrectly mark it as "none".
     *
     * Returning request_sent is safer for the profile button because
     * an existing pending relationship should never become "Add Friend"
     * simply because direction was omitted.
     */
    return "request_sent";
  }

  /*
   * --------------------------------------------------------------------------
   * NONE
   * --------------------------------------------------------------------------
   */

  return "none";
}

/*
 * ============================================================================
 * REQUEST ID
 * ============================================================================
 */

export function getFockisFriendRequestId(
  response:
    | FockisFriendRequestResponse
    | null
    | undefined,
): string | null {
  return extractFriendRequestId(
    response,
  );
}

/*
 * ============================================================================
 * NORMALIZE COMPLETE FRIENDSHIP STATE
 * ============================================================================
 *
 * This is useful when loading the profile from the backend.
 * ============================================================================
 */

export interface FockisNormalizedFriendship {
  status: FockisFriendStatus;
  requestId: string | null;
  direction:
    | "incoming"
    | "outgoing"
    | null;
}

export function normalizeFockisFriendship(
  response:
    | FockisFriendRequestResponse
    | null
    | undefined,
): FockisNormalizedFriendship {
  return {
    status:
      getFockisFriendStatus(response),

    requestId:
      getFockisFriendRequestId(response),

    direction:
      normalizeFriendDirection(
        response,
      ),
  };
}