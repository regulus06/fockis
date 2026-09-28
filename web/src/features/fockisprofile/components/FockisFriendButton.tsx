/*
 * ============================================================================
 * FOCKIS FRIEND BUTTON
 * ============================================================================
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  UserPlus,
  UserCheck,
  Clock,
  Check,
  X,
  Loader2,
  ShieldOff,
} from "lucide-react";

import {
  fockisFriendsApi,
  extractFriendRequestId,
  normalizeFriendDirection,
  normalizeFriendStatus,
  type FockisFriendRequestResponse,
} from "../service/fockisFriendsApi";

import {
  type FockisFriendStatus,
} from "./fockisFriendStatus";

export interface FockisFriendButtonProps {
  userId: string;

  className?: string;

  onStatusChange?: (
    status: FockisFriendStatus,
  ) => void;
}

/* ============================================================================
   LOCAL STATUS NORMALIZATION

   The backend may already return:

     request_sent
     request_received
     friends
     rejected
     blocked
     none

   We trust those explicit values first.

   We also use direction + requestId as a fallback because some API response
   versions return request metadata correctly while the older helper
   normalizes the status incorrectly.
============================================================================ */

function resolveFriendStatus(
  response:
    | FockisFriendRequestResponse
    | null
    | undefined,
): FockisFriendStatus {
  const rawStatus =
    normalizeFriendStatus(
      response,
    );

  const requestId =
    extractFriendRequestId(
      response,
    );

  const direction =
    normalizeFriendDirection(
      response,
    );

  /*
   * ================================================================
   * EXPLICIT BACKEND STATES
   * ================================================================
   */

  if (
    rawStatus === "friends"
  ) {
    return "friends";
  }

  if (
    rawStatus === "blocked"
  ) {
    return "blocked";
  }

  if (
    rawStatus === "self"
  ) {
    return "self";
  }

  if (
    rawStatus === "request_received"
  ) {
    return "request_received";
  }

  if (
    rawStatus === "request_sent"
  ) {
    return "request_sent";
  }

  if (
    rawStatus === "rejected"
  ) {
    return "rejected";
  }

  /*
   * ================================================================
   * FALLBACK
   *
   * Some response/helper combinations can produce:
   *
   *   status = none
   *   direction = outgoing
   *   requestId = <real Mongo ID>
   *
   * That is still an outgoing request.
   * ================================================================
   */

  if (
    requestId &&
    direction === "outgoing"
  ) {
    return "request_sent";
  }

  if (
    requestId &&
    direction === "incoming"
  ) {
    return "request_received";
  }

  return "none";
}

/* ============================================================================
   UNBLOCK API FALLBACK

   The backend endpoint is:
     DELETE /friends/:userId/block

   This is kept local so the button works even if the API service file does
   not yet expose an unblockUser() helper.
============================================================================ */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

async function unblockUserDirectly(
  userId: string,
): Promise<unknown> {
  const token =
    localStorage.getItem("token");

  const response = await fetch(
    `${API_BASE_URL}/friends/${encodeURIComponent(userId)}/block`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    },
  );

  const contentType =
    response.headers.get("content-type") || "";

  let data: unknown = null;

  if (
    contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    data = await response.json();
  } else {
    const body = await response.text();
    data = body || null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? (data as { message?: unknown }).message
        : null;

    throw new Error(
      Array.isArray(message)
        ? message.join(", ")
        : typeof message === "string"
          ? message
          : `Unable to unblock user (${response.status}).`,
    );
  }

  return data;
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function FockisFriendButton({
  userId,
  className = "",
  onStatusChange,
}: FockisFriendButtonProps) {
  const [
    friendStatus,
    setFriendStatus,
  ] = useState<FockisFriendStatus>(
    "none",
  );

  const [
    requestId,
    setRequestId,
  ] = useState<string | null>(
    null,
  );

  const [
    direction,
    setDirection,
  ] = useState<
    "incoming" | "outgoing" | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingStatus,
    setLoadingStatus,
  ] = useState(true);

  /*
   * Every status load receives a sequence number.
   */
  const statusSequence =
    useRef(0);

  /*
   * Prevent stale GET requests from restoring cancelled state.
   */
  const cancellationGeneration =
    useRef(0);

  const locallyCancelled =
    useRef(false);

  /* ==========================================================================
     APPLY FRIENDSHIP RESPONSE
  ========================================================================== */

  const applyFriendshipResponse =
    useCallback(
      (
        response:
          | FockisFriendRequestResponse
          | null
          | undefined,
        options?: {
          sequence?: number;
          allowAfterCancel?: boolean;
        },
      ) => {
        /*
         * Ignore stale response after cancellation.
         */
        if (
          !options?.allowAfterCancel &&
          locallyCancelled.current
        ) {
          console.log(
            "[FOCKIS FRIEND BUTTON] IGNORING STALE STATUS AFTER CANCEL",
            {
              userId,
              response,
            },
          );

          return;
        }

        /*
         * Ignore old status request.
         */
        if (
          options?.sequence !==
            undefined &&
          options.sequence !==
            statusSequence.current
        ) {
          console.log(
            "[FOCKIS FRIEND BUTTON] IGNORING STALE STATUS REQUEST",
            {
              userId,
              sequence:
                options.sequence,
              currentSequence:
                statusSequence.current,
            },
          );

          return;
        }

        const rawStatus =
          normalizeFriendStatus(
            response,
          );

        const normalizedRequestId =
          extractFriendRequestId(
            response,
          );

        const normalizedDirection =
          normalizeFriendDirection(
            response,
          );

        /*
         * IMPORTANT:
         *
         * Do NOT use getFockisFriendStatus()
         * here because that helper is currently
         * converting request_sent -> none.
         */
        const resolvedStatus =
          resolveFriendStatus(
            response,
          );

        console.log(
          "[FOCKIS FRIEND BUTTON] APPLY STATUS",
          {
            userId,
            rawStatus,
            normalizedStatus:
              resolvedStatus,
            direction:
              normalizedDirection,
            requestId:
              normalizedRequestId,
          },
        );

        setFriendStatus(
          resolvedStatus,
        );

        setRequestId(
          normalizedRequestId,
        );

        setDirection(
          normalizedDirection,
        );

        onStatusChange?.(
          resolvedStatus,
        );
      },
      [
        userId,
        onStatusChange,
      ],
    );

  /* ==========================================================================
     LOAD STATUS
  ========================================================================== */

  const loadFriendshipStatus =
    useCallback(
      async () => {
        if (!userId) {
          setFriendStatus(
            "none",
          );

          setRequestId(
            null,
          );

          setDirection(
            null,
          );

          setLoadingStatus(
            false,
          );

          return;
        }

        const sequence =
          ++statusSequence.current;

        const generation =
          cancellationGeneration.current;

        console.log(
          "[FOCKIS FRIEND BUTTON] LOAD STATUS",
          {
            userId,
            sequence,
            generation,
          },
        );

        setLoadingStatus(
          true,
        );

        try {
          const response =
            await fockisFriendsApi.getStatus(
              userId,
            );

          /*
           * Ignore older requests.
           */
          if (
            sequence !==
            statusSequence.current
          ) {
            console.log(
              "[FOCKIS FRIEND BUTTON] STATUS IGNORED - OLD SEQUENCE",
              {
                userId,
                sequence,
                current:
                  statusSequence.current,
              },
            );

            return;
          }

          /*
           * Ignore stale response after cancellation.
           */
          if (
            generation !==
              cancellationGeneration.current ||
            locallyCancelled.current
          ) {
            console.log(
              "[FOCKIS FRIEND BUTTON] STATUS IGNORED - CANCELLATION WON",
              {
                userId,
                generation,
                currentGeneration:
                  cancellationGeneration.current,
              },
            );

            return;
          }

          applyFriendshipResponse(
            response,
            {
              sequence,
            },
          );
        } catch (error) {
          console.error(
            "[FOCKIS FRIEND BUTTON] STATUS LOAD FAILED",
            error,
          );
        } finally {
          if (
            sequence ===
            statusSequence.current
          ) {
            setLoadingStatus(
              false,
            );
          }
        }
      },
      [
        userId,
        applyFriendshipResponse,
      ],
    );

  /* ==========================================================================
     USER CHANGE
  ========================================================================== */

  useEffect(() => {
    locallyCancelled.current =
      false;

    cancellationGeneration.current +=
      1;

    statusSequence.current +=
      1;

    setFriendStatus(
      "none",
    );

    setRequestId(
      null,
    );

    setDirection(
      null,
    );

    void loadFriendshipStatus();
  }, [
    userId,
    loadFriendshipStatus,
  ]);

  /* ==========================================================================
     ADD FRIEND
  ========================================================================== */

  const handleAddFriend =
    useCallback(
      async () => {
        if (
          !userId ||
          loading ||
          locallyCancelled.current
        ) {
          return;
        }

        console.log(
          "[FOCKIS FRIEND BUTTON] ADD FRIEND",
          {
            userId,
          },
        );

        setLoading(
          true,
        );

        try {
          const response =
            await fockisFriendsApi.sendRequest(
              userId,
            );

          console.log(
            "[FOCKIS FRIEND BUTTON] ADD FRIEND RESPONSE",
            response,
          );

          locallyCancelled.current =
            false;

          ++statusSequence.current;

          /*
           * Apply backend response.
           */
          applyFriendshipResponse(
            response,
            {
              allowAfterCancel: true,
            },
          );

          /*
           * Get the real MongoDB friendship ID.
           */
          const returnedRequestId =
            extractFriendRequestId(
              response,
            );

          /*
           * The POST succeeded, therefore
           * this is definitely an outgoing
           * pending request.
           */
          setFriendStatus(
            "request_sent",
          );

          setRequestId(
            returnedRequestId,
          );

          setDirection(
            "outgoing",
          );

          onStatusChange?.(
            "request_sent",
          );

          console.log(
            "[FOCKIS FRIEND BUTTON] REQUEST SENT STATE APPLIED",
            {
              userId,
              requestId:
                returnedRequestId,
              status:
                "request_sent",
              direction:
                "outgoing",
            },
          );
        } catch (error) {
          console.error(
            "[FOCKIS FRIEND BUTTON] ADD FRIEND FAILED",
            error,
          );

          await loadFriendshipStatus();
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        userId,
        loading,
        applyFriendshipResponse,
        onStatusChange,
        loadFriendshipStatus,
      ],
    );

  /* ==========================================================================
     CANCEL REQUEST
  ========================================================================== */

  const handleCancelRequest =
    useCallback(
      async () => {
        if (
          !requestId ||
          loading
        ) {
          return;
        }

        const requestIdBeingCancelled =
          requestId;

        console.log(
          "[FOCKIS FRIEND BUTTON] CANCEL REQUEST",
          {
            userId,
            requestId:
              requestIdBeingCancelled,
          },
        );

        /*
         * Invalidate all currently-running
         * status requests before DELETE.
         */
        ++statusSequence.current;

        ++cancellationGeneration.current;

        locallyCancelled.current =
          true;

        /*
         * Immediately update UI.
         */
        setFriendStatus(
          "none",
        );

        setRequestId(
          null,
        );

        setDirection(
          null,
        );

        onStatusChange?.(
          "none",
        );

        setLoading(
          true,
        );

        try {
          const response =
            await fockisFriendsApi.cancelRequest(
              requestIdBeingCancelled,
            );

          console.log(
            "[FOCKIS FRIEND BUTTON] CANCEL RESPONSE",
            response,
          );

          /*
           * Cancellation is authoritative.
           */
          setFriendStatus(
            "none",
          );

          setRequestId(
            null,
          );

          setDirection(
            null,
          );

          onStatusChange?.(
            "none",
          );

          console.log(
            "[FOCKIS FRIEND BUTTON] CANCEL COMPLETE",
            {
              userId,
              requestId:
                requestIdBeingCancelled,
              status:
                "none",
            },
          );
        } catch (error) {
          console.error(
            "[FOCKIS FRIEND BUTTON] CANCEL FAILED",
            error,
          );

          locallyCancelled.current =
            false;

          await loadFriendshipStatus();
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        userId,
        requestId,
        loading,
        onStatusChange,
        loadFriendshipStatus,
      ],
    );

  /* ==========================================================================
     ACCEPT REQUEST
  ========================================================================== */

  const handleAcceptRequest =
    useCallback(
      async () => {
        if (
          !requestId ||
          loading
        ) {
          return;
        }

        setLoading(
          true,
        );

        try {
          const response =
            await fockisFriendsApi.acceptRequest(
              requestId,
            );

          locallyCancelled.current =
            false;

          ++statusSequence.current;

          applyFriendshipResponse(
            response,
            {
              allowAfterCancel: true,
            },
          );

          await loadFriendshipStatus();
        } catch (error) {
          console.error(
            "[FOCKIS FRIEND BUTTON] ACCEPT FAILED",
            error,
          );

          await loadFriendshipStatus();
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        requestId,
        loading,
        applyFriendshipResponse,
        loadFriendshipStatus,
      ],
    );

  /* ==========================================================================
     REJECT REQUEST
  ========================================================================== */

  const handleRejectRequest =
    useCallback(
      async () => {
        if (
          !requestId ||
          loading
        ) {
          return;
        }

        setLoading(
          true,
        );

        try {
          await fockisFriendsApi.rejectRequest(
            requestId,
          );

          ++statusSequence.current;

          ++cancellationGeneration.current;

          locallyCancelled.current =
            true;

          setFriendStatus(
            "none",
          );

          setRequestId(
            null,
          );

          setDirection(
            null,
          );

          onStatusChange?.(
            "none",
          );
        } catch (error) {
          console.error(
            "[FOCKIS FRIEND BUTTON] REJECT FAILED",
            error,
          );

          locallyCancelled.current =
            false;

          await loadFriendshipStatus();
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        requestId,
        loading,
        onStatusChange,
        loadFriendshipStatus,
      ],
    );

  /* ==========================================================================
     REMOVE FRIEND
  ========================================================================== */

  const handleRemoveFriend =
    useCallback(
      async () => {
        if (
          !userId ||
          loading
        ) {
          return;
        }

        setLoading(
          true,
        );

        try {
          await fockisFriendsApi.removeFriend(
            userId,
          );

          ++statusSequence.current;

          ++cancellationGeneration.current;

          locallyCancelled.current =
            true;

          setFriendStatus(
            "none",
          );

          setRequestId(
            null,
          );

          setDirection(
            null,
          );

          onStatusChange?.(
            "none",
          );
        } catch (error) {
          console.error(
            "[FOCKIS FRIEND BUTTON] REMOVE FAILED",
            error,
          );

          locallyCancelled.current =
            false;

          await loadFriendshipStatus();
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        userId,
        loading,
        onStatusChange,
        loadFriendshipStatus,
      ],
    );

  /* ==========================================================================
     UNBLOCK USER
  ========================================================================== */

  const handleUnblockUser =
    useCallback(
      async () => {
        if (
          !userId ||
          loading
        ) {
          return;
        }

        console.log(
          "[FOCKIS FRIEND BUTTON] UNBLOCK USER",
          { userId },
        );

        setLoading(true);

        /*
         * Invalidate status requests before the DELETE so an older GET
         * cannot restore "blocked" after the unblock succeeds.
         */
        ++statusSequence.current;
        ++cancellationGeneration.current;
        locallyCancelled.current = true;

        setFriendStatus("none");
        setRequestId(null);
        setDirection(null);
        onStatusChange?.("none");

        try {
          await unblockUserDirectly(userId);

          console.log(
            "[FOCKIS FRIEND BUTTON] UNBLOCK SUCCESS",
            { userId },
          );

          /*
           * The successful DELETE is authoritative.
           * Leave the button in Add Friend state.
           */
          setFriendStatus("none");
          setRequestId(null);
          setDirection(null);
          onStatusChange?.("none");
        } catch (error) {
          console.error(
            "[FOCKIS FRIEND BUTTON] UNBLOCK FAILED",
            error,
          );

          /*
           * Restore the real backend state if the DELETE failed.
           */
          locallyCancelled.current = false;
          await loadFriendshipStatus();
        } finally {
          setLoading(false);
        }
      },
      [
        userId,
        loading,
        onStatusChange,
        loadFriendshipStatus,
      ],
    );

  /* ==========================================================================
     BUTTON CONTENT
  ========================================================================== */

  const buttonContent =
    useMemo(() => {
      if (
        loadingStatus
      ) {
        return (
          <>
            <Loader2
              size={16}
              className="animate-spin"
            />

            <span>
              Loading...
            </span>
          </>
        );
      }

      if (
        friendStatus ===
        "request_sent"
      ) {
        return (
          <>
            <Clock
              size={16}
            />

            <span>
              Requested
            </span>
          </>
        );
      }

      if (
        friendStatus ===
        "request_received"
      ) {
        return (
          <>
            <UserCheck
              size={16}
            />

            <span>
              Respond
            </span>
          </>
        );
      }

      if (
        friendStatus ===
        "friends"
      ) {
        return (
          <>
            <UserCheck
              size={16}
            />

            <span>
              Friends
            </span>
          </>
        );
      }

      if (
        friendStatus ===
        "blocked"
      ) {
        return (
          <>
            <ShieldOff
              size={16}
            />

            <span>
              Unblock
            </span>
          </>
        );
      }

      return (
        <>
          <UserPlus
            size={16}
          />

          <span>
            Add Friend
          </span>
        </>
      );
    }, [
      friendStatus,
      loadingStatus,
    ]);

  /* ==========================================================================
     BUTTON CLICK
  ========================================================================== */

  const handleClick =
    useCallback(() => {
      if (
        loading ||
        loadingStatus
      ) {
        return;
      }

      /*
       * Never use stale request state after
       * successful cancellation.
       */
      if (
        locallyCancelled.current &&
        friendStatus !==
          "none"
      ) {
        return;
      }

      switch (
        friendStatus
      ) {
        case "none":
        case "rejected":
          void handleAddFriend();
          return;

        case "request_sent":
          void handleCancelRequest();
          return;

        case "friends":
          void handleRemoveFriend();
          return;

        case "request_received":
          void handleAcceptRequest();
          return;

        case "blocked":
          void handleUnblockUser();
          return;

        case "self":
          return;

        default:
          void handleAddFriend();
      }
    }, [
      loading,
      loadingStatus,
      friendStatus,
      handleAddFriend,
      handleCancelRequest,
      handleRemoveFriend,
      handleAcceptRequest,
      handleUnblockUser,
    ]);

  /* ==========================================================================
     INCOMING REQUEST UI
  ========================================================================== */

  if (
    friendStatus ===
    "request_received"
  ) {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
      >
        <button
          type="button"
          disabled={
            loading ||
            loadingStatus
          }
          onClick={() =>
            void handleAcceptRequest()
          }
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-lg
            px-4
            py-2
            text-sm
            font-semibold
            bg-blue-600
            text-white
            hover:bg-blue-700
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {loading ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Check
              size={16}
            />
          )}

          Accept
        </button>

        <button
          type="button"
          disabled={
            loading ||
            loadingStatus
          }
          onClick={() =>
            void handleRejectRequest()
          }
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-lg
            px-4
            py-2
            text-sm
            font-semibold
            border
            border-gray-300
            bg-white
            text-gray-700
            hover:bg-gray-50
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {loading ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <X
              size={16}
            />
          )}

          Decline
        </button>
      </div>
    );
  }

  /* ==========================================================================
     STANDARD BUTTON
  ========================================================================== */

  return (
    <button
      type="button"
      disabled={
        loading ||
        loadingStatus ||
        friendStatus ===
          "self"
      }
      onClick={handleClick}
      title={
        friendStatus ===
        "blocked"
          ? "Unblock user"
          : friendStatus ===
              "request_sent"
            ? "Cancel friend request"
            : friendStatus ===
                "friends"
              ? "Remove friend"
              : undefined
      }
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        rounded-lg
        px-4
        py-2
        text-sm
        font-semibold
        transition
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${
          friendStatus ===
          "friends"
            ? "bg-green-600 text-white hover:bg-green-700"
            : friendStatus ===
                "request_sent"
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : friendStatus ===
                  "blocked"
                ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                : "bg-blue-600 text-white hover:bg-blue-700"
        }
        ${className}
      `}
    >
      {loading ? (
        <>
          <Loader2
            size={16}
            className="animate-spin"
          />

          <span>
            Processing...
          </span>
        </>
      ) : (
        buttonContent
      )}
    </button>
  );
}