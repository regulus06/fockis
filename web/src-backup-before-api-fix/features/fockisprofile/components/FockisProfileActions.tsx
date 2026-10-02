/*
 * ============================================================================
 * FOCKIS PROFILE ACTIONS
 * ============================================================================
 *
 * Handles:
 *
 * - Follow / Unfollow
 * - Add Friend
 * - Cancel Friend Request
 * - Accept Friend Request
 * - Reject Friend Request
 * - Remove Friend
 * - Block User
 *
 * FRIEND STATUS:
 *
 * Backend:
 *
 * pending + outgoing -> request_sent
 * pending + incoming -> request_received
 * accepted/friends   -> friends
 *
 * IMPORTANT:
 *
 * The profile user ID is the TARGET user.
 * The authenticated JWT user is the CURRENT user.
 *
 * GET:
 *   /friends/:profileUserId/status
 *
 * POST:
 *   /friends/requests/:profileUserId
 *
 * DELETE:
 *   /friends/requests/:requestId
 *
 * ============================================================================
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  UserPlus,
  UserCheck,
  UserX,
  Ban,
  Clock,
  Check,
  X,
  Loader2,
} from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

export type FockisFriendStatus =
  | "none"
  | "request_sent"
  | "request_received"
  | "friends"
  | "blocked"
  | "pending"
  | "rejected"
  | string;

export interface FockisProfileActionsProfile {
  user?: {
    id?: string;
    _id?: string;
  } | null;
}

export interface FockisProfileActionsProps {
  profile: FockisProfileActionsProfile;

  canEdit?: boolean;

  onUpdateProfile?: (
    data: unknown,
  ) => void | Promise<void>;

  onEditProfile?: () => void | Promise<void>;

  /*
   * These callbacks are retained for compatibility with Profile.tsx.
   *
   * IMPORTANT:
   * Friend status is still verified directly against the backend.
   */
  onAddFriend?: () => void | Promise<void>;

  onCancelFriendRequest?: () => void | Promise<void>;

  onFollow?: () => void | Promise<void>;

  onAcceptFriendRequest?: () => void | Promise<void>;

  onRejectFriendRequest?: () => void | Promise<void>;

  onBlockUser?: () => void | Promise<void>;

  friendStatus?: FockisFriendStatus;

  friendRequestLoading?: boolean;

  friendRequestId?: string;
}

/* ============================================================================
   API
============================================================================ */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

const FRIEND_API = {
  status: "/friends",
  sendRequest: "/friends/requests",
  accept: "/friends/requests",
  reject: "/friends/requests",
  cancel: "/friends/requests",
  remove: "/friends",
};

const FOLLOW_API = {
  status: "/follows",
  follow: "/follows",
};

/* ============================================================================
   NORMALIZE FRIEND STATUS
============================================================================ */

function normalizeFriendStatus(
  status?: string,
  direction?: string,
): FockisFriendStatus {
  const normalizedStatus =
    String(status || "")
      .trim()
      .toLowerCase();

  const normalizedDirection =
    String(direction || "")
      .trim()
      .toLowerCase();

  /*
   * FRIENDS
   */
  if (
    normalizedStatus === "friends" ||
    normalizedStatus === "accepted" ||
    normalizedStatus === "friend"
  ) {
    return "friends";
  }

  /*
   * BLOCKED
   */
  if (
    normalizedStatus === "blocked"
  ) {
    return "blocked";
  }

  /*
   * PENDING
   */
  if (
    normalizedStatus === "pending"
  ) {
    if (
      normalizedDirection === "outgoing" ||
      normalizedDirection === "sent"
    ) {
      return "request_sent";
    }

    if (
      normalizedDirection === "incoming" ||
      normalizedDirection === "received"
    ) {
      return "request_received";
    }
  }

  /*
   * ALREADY NORMALIZED
   */
  if (
    normalizedStatus === "request_sent"
  ) {
    return "request_sent";
  }

  if (
    normalizedStatus === "request_received"
  ) {
    return "request_received";
  }

  /*
   * NO RELATIONSHIP
   */
  if (
    normalizedStatus === "none" ||
    normalizedStatus === "rejected" ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled"
  ) {
    return "none";
  }

  return "none";
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function FockisProfileActions({
  profile,
  canEdit = false,

  onUpdateProfile: _onUpdateProfile,

  onEditProfile,

  onAddFriend,
  onCancelFriendRequest,
  onFollow,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onBlockUser,

  friendStatus = "none",
  friendRequestLoading = false,
  friendRequestId: suppliedFriendRequestId,
}: FockisProfileActionsProps) {

  /* ==========================================================================
     TARGET PROFILE USER ID
  ========================================================================== */

  const profileUserId =
    profile?.user?.id ||
    profile?.user?._id ||
    "";

  /* ==========================================================================
     STATE
  ========================================================================== */

  const [
    isFollowing,
    setIsFollowing,
  ] = useState(false);

  const [
    followsMe,
    setFollowsMe,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    | "follow"
    | "friend"
    | "accept"
    | "reject"
    | "cancel"
    | "remove"
    | "block"
    | null
  >(null);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    loadedFriendRequestId,
    setLoadedFriendRequestId,
  ] = useState("");

  /*
   * Backend-derived friend status.
   *
   * This is the status we trust after GET /friends/:id/status.
   */
  const [
    backendFriendStatus,
    setBackendFriendStatus,
  ] = useState<FockisFriendStatus | null>(
    null,
  );

  /*
   * Local optimistic status.
   */
  const [
    localFriendStatus,
    setLocalFriendStatus,
  ] = useState<FockisFriendStatus | null>(
    null,
  );

  /*
   * Prevent stale GET responses from changing the UI.
   */
  const statusRequestSequence =
    useRef(0);

  /*
   * After cancel/reject/remove, invalidate older GET requests.
   */
  const mutationSequence =
    useRef(0);

  /* ==========================================================================
     REQUEST ID
  ========================================================================== */

  const friendRequestId =
    suppliedFriendRequestId ||
    loadedFriendRequestId;

  /* ==========================================================================
     EFFECTIVE STATUS
  ========================================================================== */

  /*
   * Priority:
   *
   * 1. local optimistic mutation
   * 2. backend status loaded from GET
   * 3. parent status
   *
   * This prevents parent "none" from overriding the backend.
   */
  const effectiveFriendStatus =
    localFriendStatus ??
    backendFriendStatus ??
    normalizeFriendStatus(
      friendStatus,
    );

  /* ==========================================================================
     AUTH
  ========================================================================== */

  const getAuthHeaders =
    useCallback((): HeadersInit => {
      const token =
        localStorage.getItem("token");

      return {
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),
      };
    }, []);

  /* ==========================================================================
     JSON
  ========================================================================== */

  const readJson =
    useCallback(
      async <T,>(
        response: Response,
      ): Promise<T> => {

        const contentType =
          response.headers.get(
            "content-type",
          ) || "";

        if (
          !contentType
            .toLowerCase()
            .includes(
              "application/json",
            )
        ) {
          const text =
            await response.text();

          throw new Error(
            `Expected JSON but received ${
              contentType ||
              "unknown content type"
            }. Response: ${text.slice(
              0,
              200,
            )}`,
          );
        }

        return (
          await response.json()
        ) as T;
      },
      [],
    );

  /* ==========================================================================
     API ERROR
  ========================================================================== */

  const getApiError =
    useCallback(
      async (
        response: Response,
        fallback: string,
      ): Promise<Error> => {

        try {
          const data =
            await readJson<{
              message?:
                | string
                | string[];
            }>(response);

          if (data?.message) {
            const message =
              Array.isArray(
                data.message,
              )
                ? data.message.join(
                    ", ",
                  )
                : String(
                    data.message,
                  );

            return new Error(
              message,
            );
          }
        } catch {
          // Ignore.
        }

        return new Error(
          fallback,
        );
      },
      [readJson],
    );

  /* ==========================================================================
     LOAD FRIEND STATUS
  ========================================================================== */

  const loadFriendStatus =
    useCallback(
      async (): Promise<void> => {

        if (
          !profileUserId ||
          canEdit
        ) {
          return;
        }

        const sequence =
          ++statusRequestSequence.current;

        const mutationAtStart =
          mutationSequence.current;

        console.log(
          "[FRIENDS] FRONTEND GET STATUS",
          {
            profileUserId,
            endpoint:
              `${API_BASE_URL}${FRIEND_API.status}/${profileUserId}/status`,
          },
        );

        try {

          const response =
            await fetch(
              `${API_BASE_URL}${FRIEND_API.status}/${encodeURIComponent(
                profileUserId,
              )}/status`,
              {
                method: "GET",
                headers:
                  getAuthHeaders(),
              },
            );

          if (!response.ok) {
            throw await getApiError(
              response,
              "Unable to load friend status.",
            );
          }

          const data =
            await readJson<{
              status?: string;

              id?: string;

              _id?: string;

              requestId?: string;

              friendshipId?: string;

              direction?: string;

              requester?: string;

              receiver?: string;
            }>(response);

          /*
           * Ignore stale response.
           */
          if (
            sequence !==
            statusRequestSequence.current
          ) {
            return;
          }

          /*
           * Ignore GET that started before a mutation.
           */
          if (
            mutationAtStart !==
            mutationSequence.current
          ) {
            return;
          }

          const requestId =
            data.requestId ||
            data.friendshipId ||
            data.id ||
            data._id ||
            "";

          const normalized =
            normalizeFriendStatus(
              data.status,
              data.direction,
            );

          /*
           * Backend is authoritative.
           */
          setBackendFriendStatus(
            normalized,
          );

          /*
           * Only clear local optimistic status
           * when backend confirms it.
           */
          setLocalFriendStatus(
            null,
          );

          setLoadedFriendRequestId(
            normalized === "none" ||
            normalized === "friends" ||
            normalized === "blocked"
              ? ""
              : String(requestId),
          );

          console.log(
            "[FRIENDS] FRONTEND STATUS RESULT",
            {
              profileUserId,
              backendStatus:
                data.status,
              direction:
                data.direction,
              normalizedStatus:
                normalized,
              requestId,
              requester:
                data.requester,
              receiver:
                data.receiver,
            },
          );

        } catch (err) {

          console.error(
            "[FRIENDS] STATUS LOAD FAILED",
            err,
          );
        }
      },
      [
        profileUserId,
        canEdit,
        getAuthHeaders,
        getApiError,
        readJson,
      ],
    );

  /* ==========================================================================
     LOAD STATUS WHEN PROFILE CHANGES
  ========================================================================== */

  useEffect(() => {

    statusRequestSequence.current++;

    mutationSequence.current++;

    setBackendFriendStatus(null);

    setLocalFriendStatus(null);

    setLoadedFriendRequestId("");

    if (
      !profileUserId ||
      canEdit
    ) {
      return;
    }

    void loadFriendStatus();

  }, [
    profileUserId,
    canEdit,
    loadFriendStatus,
  ]);

  /* ==========================================================================
     FOLLOW STATUS
  ========================================================================== */

  const loadFollowStatus =
    useCallback(
      async (): Promise<void> => {

        if (
          !profileUserId ||
          canEdit
        ) {
          return;
        }

        try {

          const response =
            await fetch(
              `${API_BASE_URL}${FOLLOW_API.status}/${encodeURIComponent(
                profileUserId,
              )}/status`,
              {
                method: "GET",
                headers:
                  getAuthHeaders(),
              },
            );

          if (!response.ok) {
            return;
          }

          const data =
            await readJson<{
              following?: boolean;
              isFollowing?: boolean;
              followed?: boolean;
              followsMe?: boolean;
            }>(response);

          setIsFollowing(
            Boolean(
              data.following ??
              data.isFollowing ??
              data.followed ??
              false,
            ),
          );

          setFollowsMe(
            Boolean(
              data.followsMe ??
              false,
            ),
          );

        } catch (err) {

          console.error(
            "Failed to load follow status:",
            err,
          );
        }
      },
      [
        profileUserId,
        canEdit,
        getAuthHeaders,
        readJson,
      ],
    );

  useEffect(() => {
    void loadFollowStatus();
  }, [
    loadFollowStatus,
  ]);

  /* ==========================================================================
     FOLLOW
  ========================================================================== */

  const handleFollow =
    useCallback(
      async (): Promise<void> => {

        if (
          !profileUserId ||
          loading ||
          friendRequestLoading ||
          actionLoading
        ) {
          return;
        }

        setLoading(true);
        setActionLoading("follow");
        setError(null);

        const wasFollowing =
          isFollowing;

        try {

          if (onFollow) {
            await onFollow();
          } else {

            const response =
              await fetch(
                `${API_BASE_URL}${FOLLOW_API.follow}/${encodeURIComponent(
                  profileUserId,
                )}`,
                {
                  method:
                    wasFollowing
                      ? "DELETE"
                      : "POST",
                  headers:
                    getAuthHeaders(),
                },
              );

            if (!response.ok) {
              throw await getApiError(
                response,
                wasFollowing
                  ? "Unable to unfollow this user."
                  : "Unable to follow this user.",
              );
            }
          }

          setIsFollowing(
            !wasFollowing,
          );

        } catch (err) {

          console.error(
            "Follow action failed:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to update follow status.",
          );

        } finally {

          setLoading(false);
          setActionLoading(null);
        }
      },
      [
        profileUserId,
        loading,
        friendRequestLoading,
        actionLoading,
        isFollowing,
        onFollow,
        getAuthHeaders,
        getApiError,
      ],
    );

  /* ==========================================================================
     ADD FRIEND
  ========================================================================== */

  const handleAddFriend =
    useCallback(
      async (): Promise<void> => {

        if (
          !profileUserId ||
          loading ||
          friendRequestLoading ||
          actionLoading
        ) {
          return;
        }

        /*
         * NEVER send another request if status already says
         * request_sent.
         */
        if (
          effectiveFriendStatus ===
          "request_sent"
        ) {
          console.warn(
            "[FRIENDS] ADD BLOCKED - REQUEST ALREADY SENT",
          );
          return;
        }

        if (
          effectiveFriendStatus ===
          "request_received"
        ) {
          console.warn(
            "[FRIENDS] ADD BLOCKED - INCOMING REQUEST EXISTS",
          );
          return;
        }

        if (
          effectiveFriendStatus ===
          "friends"
        ) {
          return;
        }

        if (
          effectiveFriendStatus ===
          "blocked"
        ) {
          return;
        }

        setLoading(true);
        setActionLoading("friend");
        setError(null);

        /*
         * Immediately lock the button.
         */
        setLocalFriendStatus(
          "request_sent",
        );

        try {

          /*
           * IMPORTANT:
           *
           * We intentionally perform the friend request
           * directly here.
           *
           * The profile user ID is the TARGET.
           */
          const response =
            await fetch(
              `${API_BASE_URL}${FRIEND_API.sendRequest}/${encodeURIComponent(
                profileUserId,
              )}`,
              {
                method: "POST",
                headers:
                  getAuthHeaders(),
              },
            );

          if (!response.ok) {

            /*
             * Some backends return "already pending".
             * In that case, do NOT turn the button back
             * into Add Friend.
             */
            const apiError =
              await getApiError(
                response,
                "Unable to send friend request.",
              );

            const message =
              apiError.message.toLowerCase();

            if (
              message.includes(
                "already",
              ) &&
              (
                message.includes(
                  "pending",
                ) ||
                message.includes(
                  "request",
                )
              )
            ) {
              setLocalFriendStatus(
                "request_sent",
              );

              await loadFriendStatus();

              return;
            }

            throw apiError;
          }

          console.log(
            "[FRIENDS] REQUEST SENT",
            {
              profileUserId,
            },
          );

          /*
           * Keep request_sent while retrieving
           * the real request ID.
           */
          setLocalFriendStatus(
            "request_sent",
          );

          /*
           * Force a fresh backend status check.
           */
          statusRequestSequence.current++;

          await loadFriendStatus();

        } catch (err) {

          console.error(
            "[FRIENDS] ADD FRIEND FAILED",
            err,
          );

          /*
           * Only revert if the request genuinely failed.
           */
          setLocalFriendStatus(null);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to send friend request.",
          );

        } finally {

          setLoading(false);
          setActionLoading(null);
        }
      },
      [
        profileUserId,
        loading,
        friendRequestLoading,
        actionLoading,
        effectiveFriendStatus,
        getAuthHeaders,
        getApiError,
        loadFriendStatus,
      ],
    );

  /* ==========================================================================
     CANCEL FRIEND REQUEST
  ========================================================================== */

  const handleCancelFriendRequest =
    useCallback(
      async (): Promise<void> => {

        if (
          !friendRequestId ||
          loading ||
          friendRequestLoading ||
          actionLoading
        ) {
          return;
        }

        const requestId =
          friendRequestId;

        setLoading(true);
        setActionLoading("cancel");
        setError(null);

        /*
         * Invalidate all old GET requests.
         */
        mutationSequence.current++;

        statusRequestSequence.current++;

        /*
         * Optimistic UI.
         */
        setLocalFriendStatus(
          "none",
        );

        setBackendFriendStatus(
          "none",
        );

        setLoadedFriendRequestId("");

        try {

          if (
            onCancelFriendRequest
          ) {
            await onCancelFriendRequest();
          } else {

            const response =
              await fetch(
                `${API_BASE_URL}${FRIEND_API.cancel}/${encodeURIComponent(
                  requestId,
                )}`,
                {
                  method: "DELETE",
                  headers:
                    getAuthHeaders(),
                },
              );

            if (!response.ok) {
              throw await getApiError(
                response,
                "Unable to cancel friend request.",
              );
            }
          }

          console.log(
            "[FRIENDS] REQUEST CANCELLED",
            {
              requestId,
            },
          );

        } catch (err) {

          console.error(
            "[FRIENDS] CANCEL FAILED",
            err,
          );

          setLocalFriendStatus(null);

          setBackendFriendStatus(null);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to cancel friend request.",
          );

          await loadFriendStatus();

        } finally {

          setLoading(false);
          setActionLoading(null);
        }
      },
      [
        friendRequestId,
        loading,
        friendRequestLoading,
        actionLoading,
        onCancelFriendRequest,
        getAuthHeaders,
        getApiError,
        loadFriendStatus,
      ],
    );

  /* ==========================================================================
     ACCEPT
  ========================================================================== */

  const handleAcceptFriendRequest =
    useCallback(
      async (): Promise<void> => {

        if (
          !friendRequestId ||
          loading ||
          friendRequestLoading ||
          actionLoading
        ) {
          return;
        }

        const requestId =
          friendRequestId;

        setLoading(true);
        setActionLoading("accept");
        setError(null);

        try {

          if (
            onAcceptFriendRequest
          ) {
            await onAcceptFriendRequest();
          } else {

            const response =
              await fetch(
                `${API_BASE_URL}${FRIEND_API.accept}/${encodeURIComponent(
                  requestId,
                )}/accept`,
                {
                  method: "POST",
                  headers:
                    getAuthHeaders(),
                },
              );

            if (!response.ok) {
              throw await getApiError(
                response,
                "Unable to accept friend request.",
              );
            }
          }

          mutationSequence.current++;

          setLocalFriendStatus(
            "friends",
          );

          setBackendFriendStatus(
            "friends",
          );

          setLoadedFriendRequestId("");

        } catch (err) {

          console.error(
            "Accept friend request failed:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to accept friend request.",
          );

        } finally {

          setLoading(false);
          setActionLoading(null);
        }
      },
      [
        friendRequestId,
        loading,
        friendRequestLoading,
        actionLoading,
        onAcceptFriendRequest,
        getAuthHeaders,
        getApiError,
      ],
    );

  /* ==========================================================================
     REJECT
  ========================================================================== */

  const handleRejectFriendRequest =
    useCallback(
      async (): Promise<void> => {

        if (
          !friendRequestId ||
          loading ||
          friendRequestLoading ||
          actionLoading
        ) {
          return;
        }

        const requestId =
          friendRequestId;

        setLoading(true);
        setActionLoading("reject");
        setError(null);

        mutationSequence.current++;

        try {

          if (
            onRejectFriendRequest
          ) {
            await onRejectFriendRequest();
          } else {

            const response =
              await fetch(
                `${API_BASE_URL}${FRIEND_API.reject}/${encodeURIComponent(
                  requestId,
                )}/reject`,
                {
                  method: "POST",
                  headers:
                    getAuthHeaders(),
                },
              );

            if (!response.ok) {
              throw await getApiError(
                response,
                "Unable to reject friend request.",
              );
            }
          }

          setLocalFriendStatus(
            "none",
          );

          setBackendFriendStatus(
            "none",
          );

          setLoadedFriendRequestId("");

        } catch (err) {

          console.error(
            "Reject friend request failed:",
            err,
          );

          setLocalFriendStatus(null);

          setBackendFriendStatus(null);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to reject friend request.",
          );

        } finally {

          setLoading(false);
          setActionLoading(null);
        }
      },
      [
        friendRequestId,
        loading,
        friendRequestLoading,
        actionLoading,
        onRejectFriendRequest,
        getAuthHeaders,
        getApiError,
      ],
    );

  /* ==========================================================================
     REMOVE FRIEND
  ========================================================================== */

  const handleRemoveFriend =
    useCallback(
      async (): Promise<void> => {

        if (
          !profileUserId ||
          loading ||
          actionLoading
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            "Remove this user from your friends?",
          );

        if (!confirmed) {
          return;
        }

        setLoading(true);
        setActionLoading("remove");
        setError(null);

        mutationSequence.current++;
        statusRequestSequence.current++;

        try {

          const response =
            await fetch(
              `${API_BASE_URL}${FRIEND_API.remove}/${encodeURIComponent(
                profileUserId,
              )}`,
              {
                method: "DELETE",
                headers:
                  getAuthHeaders(),
              },
            );

          if (!response.ok) {
            throw await getApiError(
              response,
              "Unable to remove friend.",
            );
          }

          setLocalFriendStatus(
            "none",
          );

          setBackendFriendStatus(
            "none",
          );

          setLoadedFriendRequestId("");

        } catch (err) {

          console.error(
            "Remove friend failed:",
            err,
          );

          setLocalFriendStatus(null);

          setBackendFriendStatus(null);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to remove friend.",
          );

        } finally {

          setLoading(false);
          setActionLoading(null);
        }
      },
      [
        profileUserId,
        loading,
        actionLoading,
        getAuthHeaders,
        getApiError,
      ],
    );

  /* ==========================================================================
     BLOCK
  ========================================================================== */

  const handleBlockUser =
    useCallback(
      async (): Promise<void> => {

        if (
          !profileUserId ||
          loading ||
          actionLoading
        ) {
          return;
        }

        if (!onBlockUser) {
          setError(
            "Block API route is not available.",
          );
          return;
        }

        const confirmed =
          window.confirm(
            "Block this user? They will no longer be able to interact with you as a friend.",
          );

        if (!confirmed) {
          return;
        }

        setLoading(true);
        setActionLoading("block");
        setError(null);

        try {

          await onBlockUser();

          mutationSequence.current++;
          statusRequestSequence.current++;

          setLocalFriendStatus(
            "blocked",
          );

          setBackendFriendStatus(
            "blocked",
          );

          setLoadedFriendRequestId("");

        } catch (err) {

          console.error(
            "Block user failed:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to block this user.",
          );

        } finally {

          setLoading(false);
          setActionLoading(null);
        }
      },
      [
        profileUserId,
        loading,
        actionLoading,
        onBlockUser,
      ],
    );

  /* ==========================================================================
     EDIT PROFILE
  ========================================================================== */

  const handleEditProfile =
    useCallback(
      async (): Promise<void> => {

        if (
          loading ||
          !onEditProfile
        ) {
          return;
        }

        setError(null);

        try {
          await onEditProfile();
        } catch (err) {

          console.error(
            "Edit profile action failed:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to open profile settings.",
          );
        }
      },
      [
        loading,
        onEditProfile,
      ],
    );

  /* ==========================================================================
     EDIT MODE
  ========================================================================== */

  if (canEdit) {
    return (
      <div className="fk-profile-actions">

        <button
          type="button"
          className="fk-profile-actions__button fk-profile-actions__button--edit"
          disabled={loading}
          onClick={() =>
            void handleEditProfile()
          }
        >
          Edit Profile
        </button>

        {error && (
          <span
            className="fk-profile-actions__error"
            role="alert"
          >
            {error}
          </span>
        )}

      </div>
    );
  }

  /* ==========================================================================
     DERIVED STATUS
  ========================================================================== */

  const isRequestSent =
    effectiveFriendStatus ===
    "request_sent";

  const isRequestReceived =
    effectiveFriendStatus ===
    "request_received";

  const areFriends =
    effectiveFriendStatus ===
    "friends";

  const isBlocked =
    effectiveFriendStatus ===
    "blocked";

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="fk-profile-actions">

      {/* ================================================================
          FOLLOW
      ================================================================ */}

      {!isBlocked && (
        <button
          type="button"
          className={
            isFollowing
              ? "fk-profile-actions__button fk-profile-actions__button--following"
              : "fk-profile-actions__button fk-profile-actions__button--follow"
          }
          disabled={
            loading ||
            friendRequestLoading ||
            !!actionLoading ||
            !profileUserId
          }
          onClick={() =>
            void handleFollow()
          }
        >
          {actionLoading ===
          "follow" ? (
            <>
              <Loader2
                size={16}
                className="fk-profile-actions__spinner"
              />
              Please wait...
            </>
          ) : isFollowing ? (
            <>
              <UserCheck size={16} />
              Following
            </>
          ) : (
            <>
              <UserPlus size={16} />
              Follow
            </>
          )}
        </button>
      )}

      {/* ================================================================
          BLOCKED
      ================================================================ */}

      {isBlocked && (
        <button
          type="button"
          className="fk-profile-actions__button fk-profile-actions__button--friend"
          disabled
        >
          <Ban size={16} />
          Blocked
        </button>
      )}

      {/* ================================================================
          FRIENDS
      ================================================================ */}

      {areFriends &&
        !isBlocked && (
          <>
            <button
              type="button"
              className="fk-profile-actions__button fk-profile-actions__button--friend"
              disabled
            >
              <UserCheck
                size={16}
              />
              Friends
            </button>

            <button
              type="button"
              className="fk-profile-actions__button fk-profile-actions__button--danger"
              disabled={
                loading ||
                !!actionLoading
              }
              onClick={() =>
                void handleRemoveFriend()
              }
            >
              {actionLoading ===
              "remove" ? (
                <>
                  <Loader2
                    size={16}
                    className="fk-profile-actions__spinner"
                  />
                  Removing...
                </>
              ) : (
                <>
                  <UserX size={16} />
                  Remove Friend
                </>
              )}
            </button>
          </>
        )}

      {/* ================================================================
          REQUEST SENT
      ================================================================ */}

      {isRequestSent &&
        !isBlocked && (
          <button
            type="button"
            className="fk-profile-actions__button fk-profile-actions__button--friend"
            disabled={
              loading ||
              friendRequestLoading ||
              !!actionLoading ||
              !friendRequestId
            }
            onClick={() =>
              void handleCancelFriendRequest()
            }
          >
            {actionLoading ===
              "cancel" ||
            friendRequestLoading ? (
              <>
                <Loader2
                  size={16}
                  className="fk-profile-actions__spinner"
                />
                Cancelling...
              </>
            ) : (
              <>
                <Clock size={16} />
                Cancel Request
              </>
            )}
          </button>
        )}

      {/* ================================================================
          REQUEST RECEIVED
      ================================================================ */}

      {isRequestReceived &&
        !isBlocked && (
          <div className="fk-profile-actions__request-actions">

            <button
              type="button"
              className="fk-profile-actions__button fk-profile-actions__button--accept"
              disabled={
                loading ||
                friendRequestLoading ||
                !!actionLoading ||
                !friendRequestId
              }
              onClick={() =>
                void handleAcceptFriendRequest()
              }
            >
              {actionLoading ===
              "accept" ? (
                <>
                  <Loader2
                    size={16}
                    className="fk-profile-actions__spinner"
                  />
                  Accepting...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Accept
                </>
              )}
            </button>

            <button
              type="button"
              className="fk-profile-actions__button fk-profile-actions__button--reject"
              disabled={
                loading ||
                friendRequestLoading ||
                !!actionLoading ||
                !friendRequestId
              }
              onClick={() =>
                void handleRejectFriendRequest()
              }
            >
              {actionLoading ===
              "reject" ? (
                <>
                  <Loader2
                    size={16}
                    className="fk-profile-actions__spinner"
                  />
                  Rejecting...
                </>
              ) : (
                <>
                  <X size={16} />
                  Reject
                </>
              )}
            </button>

          </div>
        )}

      {/* ================================================================
          ADD FRIEND
      ================================================================ */}

      {!areFriends &&
        !isRequestSent &&
        !isRequestReceived &&
        !isBlocked && (
          <button
            type="button"
            className="fk-profile-actions__button fk-profile-actions__button--friend"
            disabled={
              loading ||
              friendRequestLoading ||
              !!actionLoading ||
              !profileUserId
            }
            onClick={() =>
              void handleAddFriend()
            }
          >
            {actionLoading ===
              "friend" ||
            friendRequestLoading ? (
              <>
                <Loader2
                  size={16}
                  className="fk-profile-actions__spinner"
                />
                Sending...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Add Friend
              </>
            )}
          </button>
        )}

      {/* ================================================================
          FOLLOWS YOU
      ================================================================ */}

      {followsMe &&
        !isFollowing &&
        !isBlocked && (
          <span className="fk-profile-actions__mutual">
            Follows you
          </span>
        )}

      {/* ================================================================
          BLOCK
      ================================================================ */}

      {!isBlocked &&
        onBlockUser && (
          <button
            type="button"
            className="fk-profile-actions__button fk-profile-actions__button--block"
            disabled={
              loading ||
              !!actionLoading
            }
            onClick={() =>
              void handleBlockUser()
            }
          >
            {actionLoading ===
            "block" ? (
              <>
                <Loader2
                  size={16}
                  className="fk-profile-actions__spinner"
                />
                Blocking...
              </>
            ) : (
              <>
                <Ban size={16} />
                Block
              </>
            )}
          </button>
        )}

      {/* ================================================================
          ERROR
      ================================================================ */}

      {error && (
        <span
          className="fk-profile-actions__error"
          role="alert"
        >
          {error}
        </span>
      )}

    </div>
  );
}