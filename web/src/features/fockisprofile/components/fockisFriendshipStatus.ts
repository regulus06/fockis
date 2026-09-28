/*
 * ============================================================================
 * FOCKIS FRIENDSHIP STATUS
 * ============================================================================
 */

import type {
  FockisFriendRequestResponse,
} from "../service/fockisFriendsApi";

export type FockisFriendStatus =
  | "none"
  | "request_sent"
  | "request_received"
  | "friends"
  | "blocked"
  | "self";

export const FRIENDSHIP_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  BLOCKED: "blocked",
} as const;

export function getFockisFriendStatus(
  data:
    | FockisFriendRequestResponse
    | null
    | undefined,
): FockisFriendStatus {
  if (!data) {
    return "none";
  }

  const status =
    String(
      data.status ||
        data.data?.status ||
        data.friendship?.status ||
        data.request?.status ||
        data.data?.friendship?.status ||
        data.data?.request?.status ||
        "none",
    ).toLowerCase();

  const direction =
    String(
      data.direction ||
        data.data?.direction ||
        "",
    ).toLowerCase();

  if (
    status ===
    FRIENDSHIP_STATUS.ACCEPTED
  ) {
    return "friends";
  }

  if (
    status ===
    FRIENDSHIP_STATUS.BLOCKED
  ) {
    return "blocked";
  }

  if (
    status ===
    FRIENDSHIP_STATUS.PENDING
  ) {
    if (
      direction === "incoming"
    ) {
      return "request_received";
    }

    if (
      direction === "outgoing"
    ) {
      return "request_sent";
    }

    return "request_sent";
  }

  if (
    status ===
    FRIENDSHIP_STATUS.REJECTED
  ) {
    return "none";
  }

  if (
    status === "friends"
  ) {
    return "friends";
  }

  if (
    status === "request_sent"
  ) {
    return "request_sent";
  }

  if (
    status === "request_received"
  ) {
    return "request_received";
  }

  if (
    status === "self"
  ) {
    return "self";
  }

  return "none";
}