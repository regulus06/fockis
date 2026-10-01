import { FOCKIS_API_URL } from "../../../config/fockisConfig";

/*
 * ============================================================================
 * FOCKIS PROFILE PAGE
 * ============================================================================
 */

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Settings,
  LogIn,
  UserPlus,
  MessageCircle,
  LogOut,
  X,
  WalletCards,
  BadgeDollarSign,
  ListMusic,
  Coins,
  Crown,
  Radio,
  UserCheck,
  Users,
  Loader2,
  UserRoundCheck,
  UserX,
  Ban,
  ShieldBan,
} from "lucide-react";

import {
  ThemeProvider,
  useFockisTheme,
} from "../../../context/ThemeContext";

import {
  useFockisProfile,
} from "../hooks/useFockisProfile";

import {
  useFockisProfileStore,
} from "../store/fockisprofileStore";

import FockisProfileHeader from "../components/FockisProfileHeader";
import FockisProfileCard from "../components/FockisProfileCard";
import FockisProfileTabs from "../components/FockisProfileTabs";
import FockisProfilePosts from "../components/FockisProfilePosts";
import FockisProfileFriends from "../components/FockisProfileFriends";
import FockisProfileAbout from "../components/FockisProfileAbout";
import FockisProfileSettings from "../components/FockisProfileSettings";

import {
  fockisFriendsApi,
} from "../service/fockisFriendsApi";

import "../../../styles/FockisProfilePage.scss";

/*
 * ============================================================================
 * FOLLOW API TYPES
 * ============================================================================
 */

interface FollowStatusResponse {
  following?: boolean;
  isFollowing?: boolean;
  followed?: boolean;
}

interface FollowCountsResponse {
  followers?: number;
  following?: number;
  followerCount?: number;
  followingCount?: number;
}

/*
 * ============================================================================
 * FRIEND TYPES
 * ============================================================================
 */

type FriendStatus =
  | "none"
  | "pending"
  | "accepted"
  | "rejected"
  | "blocked";

type FriendDirection =
  | "outgoing"
  | "incoming"
  | null;

interface FriendshipUserObject {
  id?: string;
  _id?: string;
  userId?: string;
}

interface FriendshipObject {
  id?: string;
  _id?: string;

  requester?: string | FriendshipUserObject;
  receiver?: string | FriendshipUserObject;

  requesterId?: string | FriendshipUserObject;
  receiverId?: string | FriendshipUserObject;

  status?: string;
}

interface FriendRelationshipPayload {
  id?: string;
  _id?: string;
  status?: string;
  direction?: string | null;

  requester?: string | FriendshipUserObject;
  receiver?: string | FriendshipUserObject;

  requesterId?: string | FriendshipUserObject;
  receiverId?: string | FriendshipUserObject;

  friendship?: FriendshipObject | null;
  request?: FriendRequestObject | null;

  friendshipId?: string;
  requestId?: string;

  data?: any;
}

interface FriendRequestObject {
  id?: string;
  _id?: string;
  status?: string;
}

interface FriendshipStatusResponse {
  status?: FriendStatus | string;

  direction?: FriendDirection | string;

  id?: string;
  _id?: string;

  friendshipId?: string;
  requestId?: string;

  friendship?: FriendshipObject | null;

  request?: FriendRequestObject | null;

  message?: string;
}

interface FriendRequestResponse {
  status?: FriendStatus | string;

  direction?: FriendDirection | string;

  id?: string;
  _id?: string;

  friendshipId?: string;
  requestId?: string;

  friendship?: FriendshipObject | null;

  request?: FriendRequestObject | null;

  message?: string;
}

/*
 * ============================================================================
 * API BASE URL
 * ============================================================================
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

/*
 * ============================================================================
 * INNER PROFILE PAGE
 * ============================================================================
 */

function FockisProfilePageInner() {
  const { theme } = useFockisTheme();

  const navigate = useNavigate();

  /*
   * ==========================================================================
   * ROUTE PARAMETER
   * ==========================================================================
   */

  const { userId } = useParams<{
    userId?: string;
  }>();

  /*
   * ==========================================================================
   * PROFILE
   * ==========================================================================
   */

  const {
    profile,
    loading,
    error,
    profileMissing,
    updateProfile,
    createProfile,
    loadProfile,
  } = useFockisProfile(userId);

  /*
   * ==========================================================================
   * PROFILE STORE
   * ==========================================================================
   */

  const {
    activeTab,
    setActiveTab,
    clearProfile,
  } = useFockisProfileStore();

  /*
   * ==========================================================================
   * LOCAL UI STATE
   * ==========================================================================
   */

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [accountMenuOpen, setAccountMenuOpen] =
    useState(false);

  const [avatarUploading, setAvatarUploading] =
    useState(false);

  /*
   * ==========================================================================
   * FOLLOW STATE
   * ==========================================================================
   */

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [followLoading, setFollowLoading] =
    useState(false);

  const [followDataLoading, setFollowDataLoading] =
    useState(false);

  const [followError, setFollowError] =
    useState<string | null>(null);

  /*
   * ==========================================================================
   * FRIEND STATE
   * ==========================================================================
   */

  const [friendStatus, setFriendStatus] =
    useState<FriendStatus>("none");

  const [friendDirection, setFriendDirection] =
    useState<FriendDirection>(null);

  const [friendRequestId, setFriendRequestId] =
    useState<string | null>(null);

  const [friendLoading, setFriendLoading] =
    useState(false);

  const [friendDataLoading, setFriendDataLoading] =
    useState(false);

  const [friendError, setFriendError] =
    useState<string | null>(null);

  /*
   * ==========================================================================
   * BLOCK STATE
   * ==========================================================================
   */

  const [blockLoading, setBlockLoading] =
    useState(false);

  const [blockError, setBlockError] =
    useState<string | null>(null);

  /*
   * ==========================================================================
   * EDIT PERMISSION
   * ==========================================================================
   */

  const canEdit = !userId;

  /*
   * ==========================================================================
   * PROFILE USER ID
   * ==========================================================================
   */

  const profileUserId =
    profile?.user?.id
      ? String(profile.user.id)
      : userId
        ? String(userId)
        : null;

  /*
   * ==========================================================================
   * MESSAGE USER
   * ==========================================================================
   */

  const handleMessageUser = useCallback((): void => {
    if (
      canEdit ||
      !profileUserId ||
      friendStatus === "blocked"
    ) {
      return;
    }

    navigate(
      `/messages?with=${encodeURIComponent(
        String(profileUserId),
      )}`,
    );
  }, [
    canEdit,
    profileUserId,
    friendStatus,
    navigate,
  ]);

  /*
   * ==========================================================================
   * AUTH HEADERS
   * ==========================================================================
   */

  const getAuthHeaders = useCallback(
    (): HeadersInit => {
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
    },
    [],
  );

  /*
   * ==========================================================================
   * FOLLOW URL
   * ==========================================================================
   */

  const getFollowUrl = useCallback(
    (
      targetUserId: string,
      suffix = "",
    ): string => {
      return (
        `${API_BASE_URL}/follows/` +
        `${encodeURIComponent(targetUserId)}` +
        suffix
      );
    },
    [],
  );

  /*
   * ==========================================================================
   * SAFE JSON RESPONSE
   * ==========================================================================
   */

  const readJsonResponse = useCallback(
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
          .includes("application/json")
      ) {
        const text =
          await response.text();

        throw new Error(
          `Expected JSON but received ${
            contentType ||
            "unknown content type"
          }. Response: ${text.slice(0, 300)}`,
        );
      }

      return (await response.json()) as T;
    },
    [],
  );

  /*
   * ==========================================================================
   * EXTRACT FRIENDSHIP / REQUEST ID
   * ==========================================================================
   */

  const extractFriendRequestId =
    useCallback(
      (
        data:
          | FriendshipStatusResponse
          | FriendRequestResponse
          | null
          | undefined,
      ): string | null => {
        if (!data) {
          return null;
        }

        const id =
          data.friendshipId ||
          data.requestId ||
          data.friendship?.id ||
          data.friendship?._id ||
          data.request?.id ||
          data.request?._id ||
          data.id ||
          data._id;

        return id
          ? String(id)
          : null;
      },
      [],
    );

  /*
   * ==========================================================================
   * NORMALIZE FRIEND STATUS
   * ==========================================================================
   */

  const normalizeFriendStatus =
    useCallback(
      (
        data:
          | FriendshipStatusResponse
          | FriendRequestResponse
          | null
          | undefined,
      ): FriendStatus => {
        if (!data) {
          return "none";
        }

        const rawStatus =
          data.status ||
          data.friendship?.status ||
          data.request?.status ||
          "none";

        const normalized =
          String(rawStatus)
            .trim()
            .toLowerCase();

        if (
          normalized === "accepted" ||
          normalized === "friend" ||
          normalized === "friends"
        ) {
          return "accepted";
        }

        if (
          normalized === "pending" ||
          normalized === "requested" ||
          normalized === "sent"
        ) {
          return "pending";
        }

        if (
          normalized === "rejected" ||
          normalized === "declined"
        ) {
          return "rejected";
        }

        if (
          normalized === "blocked" ||
          normalized === "block"
        ) {
          return "blocked";
        }

        return "none";
      },
      [],
    );

  /*
   * ==========================================================================
   * NORMALIZE FRIEND DIRECTION
   * ==========================================================================
   */

  const normalizeFriendDirection =
    useCallback(
      (
        data:
          | FriendshipStatusResponse
          | FriendRequestResponse
          | FriendRelationshipPayload
          | null
          | undefined,
      ): FriendDirection => {
        if (!data) {
          return null;
        }

        const explicit = String(
          data.direction ??
            (data as any).data?.direction ??
            "",
        )
          .trim()
          .toLowerCase();

        if (
          explicit === "outgoing" ||
          explicit === "incoming"
        ) {
          return explicit;
        }

        const currentUserId =
          localStorage.getItem("userId") ||
          localStorage.getItem("user_id") ||
          localStorage.getItem("currentUserId");

        if (!currentUserId) {
          return null;
        }

        const getId = (
          value: unknown,
        ): string | null => {
          if (!value) {
            return null;
          }

          if (
            typeof value === "string"
          ) {
            return value;
          }

          if (
            typeof value === "object"
          ) {
            const objectValue =
              value as Record<string, unknown>;

            const id =
              objectValue._id ??
              objectValue.id ??
              objectValue.userId;

            return id
              ? String(id)
              : null;
          }

          return null;
        };

        const relationship =
          (data as any).friendship ??
          (data as any).request ??
          data;

        const requesterId =
          getId(
            relationship?.requesterId ??
              relationship?.requester,
          ) ??
          getId(
            (data as any).requesterId,
          ) ??
          getId(
            (data as any).requester,
          );

        const receiverId =
          getId(
            relationship?.receiverId ??
              relationship?.receiver,
          ) ??
          getId(
            (data as any).receiverId,
          ) ??
          getId(
            (data as any).receiver,
          );

        console.log(
          "[PROFILE FRIEND STATUS] DIRECTION IDS",
          {
            currentUserId,
            requesterId,
            receiverId,
          },
        );

        if (
          requesterId &&
          String(requesterId) ===
            String(currentUserId)
        ) {
          return "outgoing";
        }

        if (
          receiverId &&
          String(receiverId) ===
            String(currentUserId)
        ) {
          return "incoming";
        }

        return null;
      },
      [],
    );

  /*
   * ==========================================================================
   * LOAD FOLLOW STATUS
   * ==========================================================================
   */

  const loadFollowStatus =
    useCallback(
      async (
        targetUserId: string,
      ): Promise<void> => {
        const response =
          await fetch(
            getFollowUrl(
              targetUserId,
              "/status",
            ),
            {
              method: "GET",
              headers:
                getAuthHeaders(),
            },
          );

        if (!response.ok) {
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            setIsFollowing(false);
            return;
          }

          let message =
            `Follow status request failed: ${response.status}`;

          try {
            const data =
              await readJsonResponse<{
                message?:
                  | string
                  | string[];
              }>(response);

            if (data?.message) {
              message =
                Array.isArray(
                  data.message,
                )
                  ? data.message.join(
                      ", ",
                    )
                  : String(
                      data.message,
                    );
            }
          } catch {
            // Keep default.
          }

          throw new Error(message);
        }

        const data =
          await readJsonResponse<FollowStatusResponse>(
            response,
          );

        setIsFollowing(
          Boolean(
            data.following ??
              data.isFollowing ??
              data.followed ??
              false,
          ),
        );
      },
      [
        getAuthHeaders,
        getFollowUrl,
        readJsonResponse,
      ],
    );

  /*
   * ==========================================================================
   * LOAD FOLLOW COUNTS
   * ==========================================================================
   */

  const loadFollowCounts =
    useCallback(
      async (
        targetUserId: string,
      ): Promise<void> => {
        const response =
          await fetch(
            getFollowUrl(
              targetUserId,
              "/counts",
            ),
            {
              method: "GET",
              headers:
                getAuthHeaders(),
            },
          );

        if (!response.ok) {
          let message =
            `Follow counts request failed: ${response.status}`;

          try {
            const data =
              await readJsonResponse<{
                message?:
                  | string
                  | string[];
              }>(response);

            if (data?.message) {
              message =
                Array.isArray(
                  data.message,
                )
                  ? data.message.join(
                      ", ",
                    )
                  : String(
                      data.message,
                    );
            }
          } catch {
            // Keep default.
          }

          throw new Error(message);
        }

        const data =
          await readJsonResponse<FollowCountsResponse>(
            response,
          );

        setFollowersCount(
          Number(
            data.followers ??
              data.followerCount ??
              0,
          ),
        );

        setFollowingCount(
          Number(
            data.following ??
              data.followingCount ??
              0,
          ),
        );
      },
      [
        getAuthHeaders,
        getFollowUrl,
        readJsonResponse,
      ],
    );

  /*
   * ==========================================================================
   * LOAD FOLLOW DATA
   * ==========================================================================
   */

  const loadFollowData =
    useCallback(
      async (
        targetUserId: string,
      ): Promise<void> => {
        setFollowDataLoading(true);
        setFollowError(null);

        try {
          await Promise.all([
            loadFollowStatus(
              targetUserId,
            ),
            loadFollowCounts(
              targetUserId,
            ),
          ]);
        } catch (error) {
          console.error(
            "[PROFILE] Failed to load follow information:",
            error,
          );

          setFollowError(
            error instanceof Error
              ? error.message
              : "Unable to load follow information.",
          );
        } finally {
          setFollowDataLoading(false);
        }
      },
      [
        loadFollowStatus,
        loadFollowCounts,
      ],
    );

  /*
   * ==========================================================================
   * LOAD FRIEND STATUS
   * ==========================================================================
   */

  const loadFriendStatus =
    useCallback(
      async (
        targetUserId: string,
      ): Promise<void> => {
        if (!targetUserId) {
          return;
        }

        if (canEdit) {
          setFriendStatus("none");
          setFriendDirection(null);
          setFriendRequestId(null);
          return;
        }

        setFriendDataLoading(true);
        setFriendError(null);

        try {
          console.log(
            "[PROFILE FRIEND STATUS] GET STATUS",
            {
              targetUserId:
                String(targetUserId),
            },
          );

          const rawData =
            await fockisFriendsApi.getStatus(
              String(targetUserId),
            );

          const data =
            (rawData || {}) as
              FriendshipStatusResponse &
              FriendRelationshipPayload;

          console.log(
            "[PROFILE FRIEND STATUS] BACKEND RESPONSE",
            data,
          );

          const status =
            normalizeFriendStatus(data);

          /*
           * IMPORTANT:
           *
           * The backend may return:
           *
           * {
           *   status: "pending",
           *   requester: { _id: "..." },
           *   receiver: { _id: "..." }
           * }
           *
           * Therefore direction must be calculated from the
           * requester/receiver IDs when direction is not explicitly
           * supplied.
           */
          let direction =
            normalizeFriendDirection(
              data,
            );

          const requestId =
            extractFriendRequestId(
              data,
            );

          /*
           * Never guess "outgoing".
           *
           * The old implementation converted every pending
           * relationship without a direction into outgoing.
           *
           * That could make an incoming request appear as
           * "Requested" instead of "Confirm / Delete".
           */
          if (
            status === "pending" &&
            !direction
          ) {
            console.warn(
              "[PROFILE FRIEND STATUS] Pending relationship has no detectable direction",
              {
                targetUserId:
                  String(targetUserId),
                currentUserId:
                  localStorage.getItem(
                    "userId",
                  ) ||
                  localStorage.getItem(
                    "user_id",
                  ) ||
                  localStorage.getItem(
                    "currentUserId",
                  ),
                requester:
                  (data as any).requester ??
                  (data as any).friendship?.requester,
                receiver:
                  (data as any).receiver ??
                  (data as any).friendship?.receiver,
                requesterId:
                  (data as any).requesterId ??
                  (data as any).friendship?.requesterId,
                receiverId:
                  (data as any).receiverId ??
                  (data as any).friendship?.receiverId,
              },
            );
          }

          console.log(
            "[PROFILE FRIEND STATE] NORMALIZED",
            {
              targetUserId:
                String(targetUserId),
              status,
              direction,
              requestId,
            },
          );

          setFriendStatus(status);

          setFriendDirection(
            status === "accepted"
              ? null
              : direction,
          );

          setFriendRequestId(
            requestId,
          );
        } catch (error) {
          console.error(
            "[PROFILE] Failed to load friend status:",
            error,
          );

          setFriendError(
            error instanceof Error
              ? error.message
              : "Unable to load friend status.",
          );

          /*
           * Keep the UI consistent if the status endpoint
           * fails. Do not leave stale "Friends" state visible.
           */
          setFriendStatus("none");
          setFriendDirection(null);
          setFriendRequestId(null);
        } finally {
          setFriendDataLoading(false);
        }
      },
      [
        canEdit,
        extractFriendRequestId,
        normalizeFriendDirection,
        normalizeFriendStatus,
      ],
    );

  /*
   * ==========================================================================
   * OPEN FOLLOWERS
   * ==========================================================================
   */

  const openFollowers =
    useCallback((): void => {
      if (!profileUserId) {
        return;
      }

      navigate(
        `/profile/${encodeURIComponent(
          profileUserId,
        )}/followers`,
      );
    }, [
      navigate,
      profileUserId,
    ]);

  /*
   * ==========================================================================
   * OPEN FOLLOWING
   * ==========================================================================
   */

  const openFollowing =
    useCallback((): void => {
      if (!profileUserId) {
        return;
      }

      navigate(
        `/profile/${encodeURIComponent(
          profileUserId,
        )}/following`,
      );
    }, [
      navigate,
      profileUserId,
    ]);

  /*
   * ==========================================================================
   * FOLLOW / UNFOLLOW
   * ==========================================================================
   */

  const handleFollowToggle =
    useCallback(
      async (): Promise<void> => {
        if (
          canEdit ||
          !profileUserId ||
          followLoading
        ) {
          return;
        }

        const wasFollowing =
          isFollowing;

        try {
          setFollowLoading(true);
          setFollowError(null);

          const response =
            await fetch(
              getFollowUrl(
                profileUserId,
              ),
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
            let message =
              `Unable to ${
                wasFollowing
                  ? "unfollow"
                  : "follow"
              } this user.`;

            try {
              const errorData =
                await readJsonResponse<{
                  message?:
                    | string
                    | string[];
                }>(response);

              if (
                errorData?.message
              ) {
                message =
                  Array.isArray(
                    errorData.message,
                  )
                    ? errorData.message.join(
                        ", ",
                      )
                    : String(
                        errorData.message,
                      );
              }
            } catch {
              // Keep default.
            }

            throw new Error(
              message,
            );
          }

          await Promise.all([
            loadFollowStatus(
              profileUserId,
            ),
            loadFollowCounts(
              profileUserId,
            ),
          ]);
        } catch (error) {
          console.error(
            "[PROFILE] Follow toggle failed:",
            error,
          );

          setFollowError(
            error instanceof Error
              ? error.message
              : "Unable to update follow status.",
          );

          setIsFollowing(
            wasFollowing,
          );
        } finally {
          setFollowLoading(false);
        }
      },
      [
        canEdit,
        profileUserId,
        followLoading,
        isFollowing,
        getFollowUrl,
        getAuthHeaders,
        readJsonResponse,
        loadFollowStatus,
        loadFollowCounts,
      ],
    );

  /*
   * ==========================================================================
   * SEND FRIEND REQUEST
   * ==========================================================================
   */

  const handleAddFriend =
    useCallback(
      async (): Promise<void> => {
        const targetUserId =
          profileUserId;

        if (
          canEdit ||
          !targetUserId ||
          friendLoading ||
          blockLoading
        ) {
          return;
        }

        if (
          friendStatus === "accepted" ||
          friendStatus === "pending" ||
          friendStatus === "blocked"
        ) {
          return;
        }

        try {
          setFriendLoading(true);
          setFriendError(null);
          setBlockError(null);

          console.log(
            "[PROFILE] SEND FRIEND REQUEST",
            {
              targetUserId:
                String(targetUserId),
            },
          );

          const rawData =
            await fockisFriendsApi.sendRequest(
              String(targetUserId),
            );

          const data =
            (rawData || {}) as FriendRequestResponse;

          console.log(
            "[PROFILE] SEND FRIEND RESPONSE",
            data,
          );

          const responseStatus =
            normalizeFriendStatus(
              data,
            );

          const nextStatus =
            responseStatus ===
            "accepted"
              ? "accepted"
              : "pending";

          let direction =
            normalizeFriendDirection(
              data,
            );

          if (
            nextStatus === "pending" &&
            !direction
          ) {
            direction = "outgoing";
          }

          const requestId =
            extractFriendRequestId(
              data,
            );

          setFriendStatus(
            nextStatus,
          );

          setFriendDirection(
            nextStatus ===
              "accepted"
              ? null
              : direction,
          );

          if (requestId) {
            setFriendRequestId(
              requestId,
            );
          }

          await loadFriendStatus(
            String(targetUserId),
          );
        } catch (error) {
          console.error(
            "[PROFILE] Send friend request failed:",
            error,
          );

          setFriendError(
            error instanceof Error
              ? error.message
              : "Unable to send friend request.",
          );
        } finally {
          setFriendLoading(false);
        }
      },
      [
        canEdit,
        profileUserId,
        friendLoading,
        blockLoading,
        friendStatus,
        normalizeFriendStatus,
        normalizeFriendDirection,
        extractFriendRequestId,
        loadFriendStatus,
      ],
    );

  /*
   * ==========================================================================
   * CANCEL FRIEND REQUEST
   * ==========================================================================
   */

  const handleCancelFriendRequest =
    useCallback(
      async (): Promise<void> => {
        if (
          !friendRequestId ||
          friendLoading ||
          blockLoading
        ) {
          return;
        }

        try {
          setFriendLoading(true);
          setFriendError(null);
          setBlockError(null);

          console.log(
            "[PROFILE] CANCEL FRIEND REQUEST",
            {
              requestId:
                friendRequestId,
            },
          );

          await fockisFriendsApi.cancelRequest(
            friendRequestId,
          );

          if (profileUserId) {
            await loadFriendStatus(
              profileUserId,
            );
          } else {
            setFriendStatus("none");
            setFriendDirection(null);
            setFriendRequestId(null);
          }
        } catch (error) {
          console.error(
            "[PROFILE] Cancel friend request failed:",
            error,
          );

          setFriendError(
            error instanceof Error
              ? error.message
              : "Unable to cancel friend request.",
          );
        } finally {
          setFriendLoading(false);
        }
      },
      [
        friendRequestId,
        friendLoading,
        blockLoading,
        profileUserId,
        loadFriendStatus,
      ],
    );

  /*
   * ==========================================================================
   * ACCEPT FRIEND REQUEST
   * ==========================================================================
   */

  const handleAcceptFriendRequest =
    useCallback(
      async (): Promise<void> => {
        if (
          !friendRequestId ||
          friendLoading ||
          blockLoading
        ) {
          return;
        }

        try {
          setFriendLoading(true);
          setFriendError(null);
          setBlockError(null);

          console.log(
            "[PROFILE] ACCEPT FRIEND REQUEST",
            {
              requestId:
                friendRequestId,
            },
          );

          await fockisFriendsApi.acceptRequest(
            friendRequestId,
          );

          if (profileUserId) {
            await loadFriendStatus(
              profileUserId,
            );
          }
        } catch (error) {
          console.error(
            "[PROFILE] Accept friend request failed:",
            error,
          );

          setFriendError(
            error instanceof Error
              ? error.message
              : "Unable to accept friend request.",
          );
        } finally {
          setFriendLoading(false);
        }
      },
      [
        friendRequestId,
        friendLoading,
        blockLoading,
        profileUserId,
        loadFriendStatus,
      ],
    );

  /*
   * ==========================================================================
   * REJECT FRIEND REQUEST
   * ==========================================================================
   */

  const handleRejectFriendRequest =
    useCallback(
      async (): Promise<void> => {
        if (
          !friendRequestId ||
          friendLoading ||
          blockLoading
        ) {
          return;
        }

        try {
          setFriendLoading(true);
          setFriendError(null);
          setBlockError(null);

          console.log(
            "[PROFILE] REJECT FRIEND REQUEST",
            {
              requestId:
                friendRequestId,
            },
          );

          await fockisFriendsApi.rejectRequest(
            friendRequestId,
          );

          if (profileUserId) {
            await loadFriendStatus(
              profileUserId,
            );
          } else {
            setFriendStatus("none");
            setFriendDirection(null);
            setFriendRequestId(null);
          }
        } catch (error) {
          console.error(
            "[PROFILE] Reject friend request failed:",
            error,
          );

          setFriendError(
            error instanceof Error
              ? error.message
              : "Unable to reject friend request.",
          );
        } finally {
          setFriendLoading(false);
        }
      },
      [
        friendRequestId,
        friendLoading,
        blockLoading,
        profileUserId,
        loadFriendStatus,
      ],
    );

  /*
   * ==========================================================================
   * REMOVE FRIEND
   * ==========================================================================
   */

  /*
   * ============================================================================
   * REMOVE FRIEND
   * ============================================================================
   *
   * IMPORTANT:
   * The friendship is deleted by the backend. Do not immediately call
   * loadFriendStatus() after deletion because another status lookup can race
   * with the delete and leave the UI showing a stale relationship/error.
   *
   * Update the local relationship state immediately after a successful
   * DELETE /friends/:id/unfriend.
   * ============================================================================
   */
  const handleRemoveFriend =
    useCallback(
      async (): Promise<void> => {
        const targetUserId =
          profileUserId;

        if (
          canEdit ||
          !targetUserId ||
          friendLoading ||
          blockLoading
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            "Remove this friend?",
          );

        if (!confirmed) {
          return;
        }

        try {
          setFriendLoading(true);
          setFriendError(null);
          setBlockError(null);

          console.log(
            "[PROFILE] REMOVE FRIEND",
            {
              targetUserId:
                String(targetUserId),
            },
          );

          await fockisFriendsApi.removeFriend(
            String(targetUserId),
          );

          /*
           * The backend successfully removed the friendship.
           *
           * Do NOT call loadFriendStatus() here.
           * The relationship no longer exists, so the correct local state
           * is immediately "none".
           */
          setFriendStatus("none");
          setFriendDirection(null);
          setFriendRequestId(null);
          setFriendError(null);

          console.log(
            "[PROFILE] FRIEND REMOVED SUCCESSFULLY",
            {
              targetUserId:
                String(targetUserId),
              status: "none",
            },
          );
        } catch (error) {
          console.error(
            "[PROFILE] Remove friend failed:",
            error,
          );

          setFriendError(
            error instanceof Error
              ? error.message
              : "Unable to remove friend.",
          );
        } finally {
          setFriendLoading(false);
        }
      },
      [
        canEdit,
        profileUserId,
        friendLoading,
        blockLoading,
      ],
    );


  /*
   * ==========================================================================
   * BLOCK USER
   * ==========================================================================
   */

  const handleBlockUser =
    useCallback(
      async (): Promise<void> => {
        const targetUserId =
          profileUserId;

        if (
          canEdit ||
          !targetUserId ||
          blockLoading ||
          friendLoading
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            "Are you sure you want to block this user?",
          );

        if (!confirmed) {
          return;
        }

        try {
          setBlockLoading(true);
          setBlockError(null);
          setFriendError(null);

          console.log(
            "[PROFILE] BLOCK USER",
            {
              targetUserId:
                String(targetUserId),
            },
          );

          await fockisFriendsApi.blockUser(
            String(targetUserId),
          );

          setIsFollowing(false);

          await loadFriendStatus(
            String(targetUserId),
          );
        } catch (error) {
          console.error(
            "[PROFILE] Block user failed:",
            error,
          );

          setBlockError(
            error instanceof Error
              ? error.message
              : "Unable to block this user.",
          );
        } finally {
          setBlockLoading(false);
        }
      },
      [
        canEdit,
        profileUserId,
        blockLoading,
        friendLoading,
        loadFriendStatus,
      ],
    );

  /*
   * ==========================================================================
   * UNBLOCK USER
   *
   * DELETE /friends/:userId/block
   *
   * The profile page owns the friend-action UI, so this handler is required
   * here in addition to the reusable FockisFriendButton.
   * ========================================================================== 
   */

  const handleUnblockUser =
    useCallback(
      async (): Promise<void> => {
        const targetUserId =
          profileUserId;

        if (
          canEdit ||
          !targetUserId ||
          blockLoading ||
          friendLoading
        ) {
          return;
        }

        try {
          setBlockLoading(true);
          setBlockError(null);
          setFriendError(null);

          console.log(
            "[PROFILE] UNBLOCK USER",
            {
              targetUserId:
                String(targetUserId),
            },
          );

          const response =
            await fetch(
              `${API_BASE_URL}/friends/${encodeURIComponent(
                String(targetUserId),
              )}/block`,
              {
                method: "DELETE",
                headers:
                  getAuthHeaders(),
              },
            );

          if (!response.ok) {
            let message =
              `Unable to unblock this user (${response.status}).`;

            try {
              const data =
                await readJsonResponse<{
                  message?:
                    | string
                    | string[];
                }>(response);

              if (data?.message) {
                message =
                  Array.isArray(
                    data.message,
                  )
                    ? data.message.join(
                        ", ",
                      )
                    : String(
                        data.message,
                      );
              }
            } catch {
              // Keep the default message.
            }

            throw new Error(message);
          }

          console.log(
            "[PROFILE] UNBLOCK USER SUCCESS",
            {
              targetUserId:
                String(targetUserId),
            },
          );

          /*
           * Immediately update the UI so the Blocked button disappears.
           */
          setFriendStatus("none");
          setFriendDirection(null);
          setFriendRequestId(null);

          /*
           * Confirm the final backend state.
           */
          await loadFriendStatus(
            String(targetUserId),
          );
        } catch (error) {
          console.error(
            "[PROFILE] Unblock user failed:",
            error,
          );

          setBlockError(
            error instanceof Error
              ? error.message
              : "Unable to unblock this user.",
          );
        } finally {
          setBlockLoading(false);
        }
      },
      [
        canEdit,
        profileUserId,
        blockLoading,
        friendLoading,
        getAuthHeaders,
        readJsonResponse,
        loadFriendStatus,
      ],
    );

  /*
   * ==========================================================================
   * RESET UI WHEN PROFILE CHANGES
   * ==========================================================================
   */

  useEffect(() => {
    setActiveTab("posts");
    setSettingsOpen(false);
    setAccountMenuOpen(false);
  }, [
    userId,
    setActiveTab,
  ]);

  /*
   * ==========================================================================
   * CLEAR OLD RELATIONSHIP DATA
   * ==========================================================================
   */

  useEffect(() => {
    clearProfile();

    setSettingsOpen(false);
    setAccountMenuOpen(false);

    setIsFollowing(false);
    setFollowersCount(0);
    setFollowingCount(0);
    setFollowError(null);

    setFriendStatus("none");
    setFriendDirection(null);
    setFriendRequestId(null);
    setFriendError(null);

    setFriendLoading(false);
    setFriendDataLoading(false);

    setBlockError(null);
    setBlockLoading(false);
  }, [
    userId,
    clearProfile,
  ]);

  /*
   * ==========================================================================
   * LOAD FOLLOW INFORMATION
   * ==========================================================================
   */

  useEffect(() => {
    if (
      !profile ||
      !profileUserId
    ) {
      return;
    }

    void loadFollowData(
      profileUserId,
    );
  }, [
    profile,
    profileUserId,
    loadFollowData,
  ]);

  /*
   * ==========================================================================
   * LOAD FRIEND INFORMATION
   * ==========================================================================
   */

  useEffect(() => {
    if (
      !profile ||
      !profileUserId ||
      canEdit
    ) {
      return;
    }

    void loadFriendStatus(
      profileUserId,
    );
  }, [
    profile,
    profileUserId,
    canEdit,
    loadFriendStatus,
  ]);

  /*
   * ==========================================================================
   * CLOSE SETTINGS IF PROFILE DISAPPEARS
   * ==========================================================================
   */

  useEffect(() => {
    if (!profile) {
      setSettingsOpen(false);
    }
  }, [profile]);

  /*
   * ==========================================================================
   * AVATAR CHANGE
   * ==========================================================================
   */

  async function handleAvatarChange(
    file: File,
  ): Promise<void> {
    if (
      !canEdit ||
      !profile?.user?.id ||
      !file
    ) {
      return;
    }

    try {
      setAvatarUploading(true);

      await updateProfile({
        avatar: file,
      });
    } catch (error) {
      console.error(
        "[PROFILE] Failed to save profile photo:",
        error,
      );

      throw error;
    } finally {
      setAvatarUploading(false);
    }
  }

  /*
   * ==========================================================================
   * LOGOUT
   * ==========================================================================
   */

  function handleLogout(): void {
    localStorage.removeItem(
      "token",
    );

    localStorage.removeItem(
      "user",
    );

    localStorage.removeItem(
      "currentUser",
    );

    localStorage.removeItem(
      "userId",
    );

    setAccountMenuOpen(false);

    navigate("/login", {
      replace: true,
    });
  }

  /*
   * ==========================================================================
   * ACCOUNT MENU
   * ==========================================================================
   */

  function toggleAccountMenu(): void {
    setAccountMenuOpen(
      (current) => !current,
    );
  }

  function openSettings(): void {
    setAccountMenuOpen(false);
    setSettingsOpen(true);
  }

  function closeSettings(): void {
    setSettingsOpen(false);
  }

  function goToLogin(): void {
    setAccountMenuOpen(false);
    navigate("/login");
  }

  function goToRegister(): void {
    setAccountMenuOpen(false);
    navigate("/register");
  }

  /*
   * ==========================================================================
   * MUSIC
   * ==========================================================================
   *
   * Profile Account Menu
   *
   * Music
   *   ↓
   * /playlists
   *   ↓
   * PlaylistPage
   *
   * This is the main Fockis Media / Playlists page.
   * ==========================================================================
   */

  function goToMusicHome(): void {
    setAccountMenuOpen(false);
    setSettingsOpen(false);

    navigate("/playlists", {
      replace: false,
    });
  }

  /*
   * ==========================================================================
   * CREATOR PLAYLISTS
   * ==========================================================================
   */

  function goToCreatorPlaylists(): void {
    setAccountMenuOpen(false);
    setSettingsOpen(false);

    navigate("/creator/playlists", {
      replace: false,
    });
  }

  /*
   * ==========================================================================
   * WALLET
   * ==========================================================================
   */

  function goToWallet(): void {
    setAccountMenuOpen(false);

    navigate("/wallet", {
      replace: false,
    });
  }

  /*
   * ==========================================================================
   * SUBSCRIPTIONS
   * ==========================================================================
   */

  function goToSubscriptions(): void {
    setAccountMenuOpen(false);

    navigate("/subscriptions", {
      replace: false,
    });
  }

  /*
   * ==========================================================================
   * LIVE
   * ==========================================================================
   */

  function goToLive(): void {
    setAccountMenuOpen(false);

    navigate("/live", {
      replace: false,
    });
  }

  /*
   * ==========================================================================
   * MONETIZATION
   * ==========================================================================
   */

  function goToMonetization(): void {
    setAccountMenuOpen(false);

    navigate("/earnings", {
      replace: false,
    });
  }

  /*
   * ==========================================================================
   * BLOCKED USERS
   * ==========================================================================
   */

  function goToBlockedUsers(): void {
    setAccountMenuOpen(false);
    setSettingsOpen(false);

    navigate("/friends/blocked", {
      replace: false,
    });
  }

  /*
   * ==========================================================================
   * FRIEND BUTTONS
   * ==========================================================================
   */

  function renderFriendButton(): React.ReactNode {
    if (canEdit) {
      return null;
    }

    if (friendDataLoading) {
      return (
        <div className="fk-profile-friend-actions">
          <button
            type="button"
            className="fk-profile-friend-button"
            disabled
          >
            <Loader2
              size={18}
              className="fk-profile-friend-button__spinner"
            />

            <span>
              Checking...
            </span>
          </button>
        </div>
      );
    }

    if (
      friendLoading ||
      blockLoading
    ) {
      return (
        <div className="fk-profile-friend-actions">
          <button
            type="button"
            className="fk-profile-friend-button"
            disabled
          >
            <Loader2
              size={18}
              className="fk-profile-friend-button__spinner"
            />

            <span>
              {blockLoading
                ? "Blocking..."
                : "Updating..."}
            </span>
          </button>
        </div>
      );
    }

    if (
      friendStatus ===
      "blocked"
    ) {
      return (
        <div className="fk-profile-friend-actions">
          <button
            type="button"
            className="fk-profile-friend-button fk-profile-friend-button--blocked"
            onClick={() =>
              void handleUnblockUser()
            }
            disabled={
              blockLoading ||
              friendLoading
            }
            title="Unblock this user"
          >
            {blockLoading ? (
              <Loader2
                size={18}
                className="fk-profile-friend-button__spinner"
              />
            ) : (
              <Ban size={18} />
            )}

            <span>
              {blockLoading
                ? "Unblocking..."
                : "Unblock"}
            </span>
          </button>
        </div>
      );
    }

    if (
      friendStatus ===
      "accepted"
    ) {
      return (
        <div className="fk-profile-friend-actions">
          <button
            type="button"
            className="fk-profile-friend-button fk-profile-friend-button--friends"
            disabled
          >
            <UserRoundCheck
              size={18}
            />

            <span>
              Friends
            </span>
          </button>

          <button
            type="button"
            className="fk-profile-friend-button fk-profile-friend-button--pending"
            onClick={() =>
              void handleRemoveFriend()
            }
          >
            <UserX size={18} />

            <span>
              Unfriend
            </span>
          </button>

          <button
            type="button"
            className="fk-profile-friend-button fk-profile-friend-button--danger"
            onClick={() =>
              void handleBlockUser()
            }
          >
            <Ban size={18} />

            <span>
              Block User
            </span>
          </button>
        </div>
      );
    }

    if (
      friendStatus ===
      "pending"
    ) {
      if (
        friendDirection ===
        "incoming"
      ) {
        return (
          <div className="fk-profile-friend-actions">
            <button
              type="button"
              className="fk-profile-friend-button fk-profile-friend-button--accept"
              onClick={() =>
                void handleAcceptFriendRequest()
              }
            >
              <UserRoundCheck
                size={18}
              />

              <span>
                Confirm
              </span>
            </button>

            <button
              type="button"
              className="fk-profile-friend-button fk-profile-friend-button--danger"
              onClick={() =>
                void handleRejectFriendRequest()
              }
            >
              <UserX size={18} />

              <span>
                Delete
              </span>
            </button>

            <button
              type="button"
              className="fk-profile-friend-button fk-profile-friend-button--danger"
              onClick={() =>
                void handleBlockUser()
              }
            >
              <Ban size={18} />

              <span>
                Block User
              </span>
            </button>
          </div>
        );
      }

      return (
        <div className="fk-profile-friend-actions">
          <button
            type="button"
            className="fk-profile-friend-button fk-profile-friend-button--pending"
            onClick={() =>
              void handleCancelFriendRequest()
            }
          >
            <UserX size={18} />

            <span>
              Requested
            </span>
          </button>

          <button
            type="button"
            className="fk-profile-friend-button fk-profile-friend-button--danger"
            onClick={() =>
              void handleBlockUser()
            }
          >
            <Ban size={18} />

            <span>
              Block User
            </span>
          </button>
        </div>
      );
    }

    return (
      <div className="fk-profile-friend-actions">
        <button
          type="button"
          className="fk-profile-friend-button"
          onClick={() =>
            void handleAddFriend()
          }
        >
          <UserPlus size={18} />

          <span>
            Add Friend
          </span>
        </button>

        <button
          type="button"
          className="fk-profile-friend-button fk-profile-friend-button--danger"
          onClick={() =>
            void handleBlockUser()
          }
        >
          <Ban size={18} />

          <span>
            Block User
          </span>
        </button>
      </div>
    );
  }

  /*
   * ==========================================================================
   * RENDER
   * ==========================================================================
   */

  return (
    <div
      className={
        theme === "dark"
          ? "fk-profile-page-wrapper fk-profile-page-wrapper--dark"
          : "fk-profile-page-wrapper"
      }
    >
      {/* ACCOUNT CONTROLS */}

      <div className="fk-profile-page__account-controls">
        <button
          type="button"
          className="fk-profile-page__settings-button"
          aria-label="Account menu"
          aria-expanded={
            accountMenuOpen
          }
          onClick={
            toggleAccountMenu
          }
        >
          <Settings
            size={20}
            strokeWidth={2}
          />
        </button>

        {accountMenuOpen && (
          <div className="fk-profile-page__account-menu">
            <div className="fk-profile-page__account-menu-header">
              <strong>
                Fockis Account
              </strong>
            </div>

            {/* ============================================================
                MUSIC
                ============================================================ */}

            <button
              type="button"
              className="fk-profile-page__account-menu-item"
              onClick={
                goToMusicHome
              }
              aria-label="Open Fockis Music"
              title="Open Fockis Music"
            >
              <ListMusic
                size={18}
              />

              <span>
                Music
              </span>
            </button>

            {/* ============================================================
                CREATOR PLAYLIST STUDIO
                ============================================================ */}

            {canEdit && (
              <button
                type="button"
                className="fk-profile-page__account-menu-item"
                onClick={
                  goToCreatorPlaylists
                }
                aria-label="Open Creator Playlist Studio"
              >
                <ListMusic
                  size={18}
                />

                <span>
                  Creator Playlist Studio
                </span>
              </button>
            )}

            {/* ============================================================
                WALLET
                ============================================================ */}

            {canEdit && (
              <button
                type="button"
                className="fk-profile-page__account-menu-item"
                onClick={
                  goToWallet
                }
              >
                <Coins size={18} />

                <span>
                  Wallet &amp; Coins
                </span>
              </button>
            )}

            {/* ============================================================
                SUBSCRIPTIONS
                ============================================================ */}

            {canEdit && (
              <button
                type="button"
                className="fk-profile-page__account-menu-item"
                onClick={
                  goToSubscriptions
                }
              >
                <Crown size={18} />

                <span>
                  Subscriptions
                </span>
              </button>
            )}

            {/* ============================================================
                LIVE
                ============================================================ */}

            <button
              type="button"
              className="fk-profile-page__account-menu-item"
              onClick={
                goToLive
              }
            >
              <Radio size={18} />

              <span>
                Live
              </span>
            </button>

            {/* ============================================================
                MONETIZATION
                ============================================================ */}

            {canEdit && (
              <button
                type="button"
                className="fk-profile-page__account-menu-item"
                onClick={
                  goToMonetization
                }
              >
                <BadgeDollarSign
                  size={18}
                />

                <span>
                  Monetization &amp; Earnings
                </span>
              </button>
            )}

            {/* ============================================================
                EARNINGS
                ============================================================ */}

            {canEdit && (
              <button
                type="button"
                className="fk-profile-page__account-menu-item"
                onClick={
                  goToMonetization
                }
              >
                <WalletCards
                  size={18}
                />

                <span>
                  Earnings &amp; Cash Out
                </span>
              </button>
            )}

            {/* ============================================================
                BLOCKED USERS
                ============================================================ */}

            {canEdit && (
              <button
                type="button"
                className="fk-profile-page__account-menu-item"
                onClick={
                  goToBlockedUsers
                }
                aria-label="Open Blocked Users"
                title="Blocked Users"
              >
                <ShieldBan
                  size={18}
                />

                <span>
                  Blocked Users
                </span>
              </button>
            )}

            {/* ============================================================
                SETTINGS
                ============================================================ */}

            {canEdit && (
              <button
                type="button"
                className="fk-profile-page__account-menu-item"
                onClick={
                  openSettings
                }
              >
                <Settings
                  size={18}
                />

                <span>
                  Settings
                </span>
              </button>
            )}

            <div className="fk-profile-page__account-menu-divider" />

            {/* ============================================================
                LOGIN
                ============================================================ */}

            <button
              type="button"
              className="fk-profile-page__account-menu-item"
              onClick={
                goToLogin
              }
            >
              <LogIn size={18} />

              <span>
                Login
              </span>
            </button>

            {/* ============================================================
                REGISTER
                ============================================================ */}

            <button
              type="button"
              className="fk-profile-page__account-menu-item"
              onClick={
                goToRegister
              }
            >
              <UserPlus
                size={18}
              />

              <span>
                Register
              </span>
            </button>

            <div className="fk-profile-page__account-menu-divider" />

            {/* ============================================================
                LOGOUT
                ============================================================ */}

            <button
              type="button"
              className="fk-profile-page__account-menu-item fk-profile-page__account-menu-item--danger"
              onClick={
                handleLogout
              }
            >
              <LogOut size={18} />

              <span>
                Logout
              </span>
            </button>
          </div>
        )}
      </div>

      {/* LOADING */}

      {loading && (
        <div className="fk-profile-page__loading">
          <div className="fk-profile-page__loading-card">
            <div className="fk-profile-page__loading-avatar" />

            <div className="fk-profile-page__loading-lines">
              <span />
              <span />
              <span />
            </div>
          </div>

          <p>
            Loading profile...
          </p>
        </div>
      )}

      {/* CREATE PROFILE */}

      {!loading &&
        profileMissing &&
        canEdit && (
          <div className="fk-profile-page__empty">
            <div className="fk-profile-page__empty-card">
              <div className="fk-profile-page__empty-icon">
                👤
              </div>

              <h2>
                Create your Fockis profile
              </h2>

              <p>
                Your profile is not set up yet.
                Create it to start sharing posts,
                connecting with friends, and building
                your Fockis presence.
              </p>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void createProfile()
                }
              >
                Create Profile
              </button>
            </div>
          </div>
        )}

      {/* ERROR */}

      {!loading &&
        !(profileMissing && canEdit) &&
        error && (
          <div className="fk-profile-page__error">
            <div className="fk-profile-page__error-card">
              <strong>
                Unable to load profile
              </strong>

              <p>
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadProfile()
                }
              >
                Try Again
              </button>
            </div>
          </div>
        )}

      {/* PROFILE NOT FOUND */}

      {!loading &&
        !(profileMissing && canEdit) &&
        !error &&
        !profile && (
          <div className="fk-profile-page__empty">
            <div className="fk-profile-page__empty-card">
              <div className="fk-profile-page__empty-icon">
                🔎
              </div>

              <h2>
                Profile not found
              </h2>

              <p>
                This profile may have been removed
                or does not exist.
              </p>
            </div>
          </div>
        )}

      {/* PROFILE CONTENT */}

      {!loading &&
        !error &&
        profile && (
          <main
            className={
              settingsOpen
                ? "fk-profile-page fk-profile-page--settings-open"
                : "fk-profile-page"
            }
          >
            {/* PROFILE HEADER */}

            {!settingsOpen && (
              <FockisProfileHeader
                user={profile.user}
                onAvatarChange={
                  canEdit
                    ? handleAvatarChange
                    : undefined
                }
              />
            )}

            {/* FOLLOW SECTION */}

            {!settingsOpen && (
              <section
                className="fk-profile-follow-section"
                aria-label="Follow information"
              >
                <div className="fk-profile-follow-stats">
                  <button
                    type="button"
                    className="fk-profile-follow-stat"
                    onClick={
                      openFollowers
                    }
                    disabled={
                      !profileUserId
                    }
                  >
                    <Users
                      size={18}
                    />

                    <span className="fk-profile-follow-stat__number">
                      {followDataLoading
                        ? "—"
                        : followersCount}
                    </span>

                    <span className="fk-profile-follow-stat__label">
                      Followers
                    </span>
                  </button>

                  <div className="fk-profile-follow-divider" />

                  <button
                    type="button"
                    className="fk-profile-follow-stat"
                    onClick={
                      openFollowing
                    }
                    disabled={
                      !profileUserId
                    }
                  >
                    <UserCheck
                      size={18}
                    />

                    <span className="fk-profile-follow-stat__number">
                      {followDataLoading
                        ? "—"
                        : followingCount}
                    </span>

                    <span className="fk-profile-follow-stat__label">
                      Following
                    </span>
                  </button>
                </div>

                {!canEdit && (
                  <button
                    type="button"
                    className={
                      isFollowing
                        ? "fk-profile-follow-button fk-profile-follow-button--following"
                        : "fk-profile-follow-button"
                    }
                    disabled={
                      followLoading ||
                      !profileUserId
                    }
                    onClick={() =>
                      void handleFollowToggle()
                    }
                  >
                    {followLoading ? (
                      <>
                        <Loader2
                          size={18}
                          className="fk-profile-follow-button__spinner"
                        />

                        <span>
                          Updating...
                        </span>
                      </>
                    ) : isFollowing ? (
                      <>
                        <UserCheck
                          size={18}
                        />

                        <span>
                          Following
                        </span>
                      </>
                    ) : (
                      <>
                        <UserPlus
                          size={18}
                        />

                        <span>
                          Follow
                        </span>
                      </>
                    )}
                  </button>
                )}

                {followError && (
                  <div
                    className="fk-profile-follow-error"
                    role="alert"
                  >
                    {followError}
                  </div>
                )}
              </section>
            )}

            {/* PROFILE CARD */}

            {!settingsOpen && (
              <FockisProfileCard
                profile={profile}
                canEdit={canEdit}
                onEditProfile={
                  canEdit
                    ? openSettings
                    : undefined
                }
              />
            )}

            {/* MESSAGE + FRIEND STATUS */}

            {!settingsOpen &&
              !canEdit && (
                <>
                  <section
                    className="fk-profile-message-section"
                    aria-label="Messaging"
                  >
                    <button
                      type="button"
                      className="fk-profile-message-button"
                      disabled={
                        !profileUserId ||
                        friendStatus === "blocked"
                      }
                      onClick={
                        handleMessageUser
                      }
                    >
                      <MessageCircle
                        size={18}
                      />

                      <span>
                        Message
                      </span>
                    </button>
                  </section>

                  <section
                    className="fk-profile-friend-section"
                    aria-label="Friendship"
                  >
                    {renderFriendButton()}

                    {friendError && (
                      <div
                        className="fk-profile-friend-error"
                        role="alert"
                      >
                        {friendError}
                      </div>
                    )}

                    {blockError && (
                      <div
                        className="fk-profile-friend-error"
                        role="alert"
                      >
                        {blockError}
                      </div>
                    )}
                  </section>
                </>
              )}

            {/* PROFILE TABS */}

            {!settingsOpen && (
              <FockisProfileTabs
                activeTab={
                  activeTab
                }
                onChange={(tab) => {
                  if (tab === "friends") {
                    navigate("/friends");
                    return;
                  }

                  setActiveTab(tab);
                }}
              />
            )}

            {/* TAB CONTENT */}

            {!settingsOpen && (
              <section className="fk-profile-page__content">
                {activeTab ===
                  "posts" && (
                  <div className="fk-profile-page__tab-content">
                    <FockisProfilePosts
                      posts={
                        profile.posts ||
                        []
                      }
                    />
                  </div>
                )}

                {activeTab ===
                  "about" && (
                  <div className="fk-profile-page__tab-content">
                    <FockisProfileAbout
                      user={
                        profile.user
                      }
                    />
                  </div>
                )}

                {activeTab ===
                  "friends" && (
                  <div className="fk-profile-page__tab-content">
                    <FockisProfileFriends
                      friends={
                        profile.friends ||
                        []
                      }
                    />
                  </div>
                )}

                {activeTab ===
                  "photos" && (
                  <div className="fk-profile-page__placeholder">
                    <div className="fk-profile-page__placeholder-icon">
                      📷
                    </div>

                    <h3>
                      Photos
                    </h3>

                    <p>
                      Photos from this profile will
                      appear here.
                    </p>
                  </div>
                )}

                {activeTab ===
                  "marketplace" && (
                  <div className="fk-profile-page__placeholder">
                    <div className="fk-profile-page__placeholder-icon">
                      🛍️
                    </div>

                    <h3>
                      Marketplace
                    </h3>

                    <p>
                      Marketplace items from this
                      profile will appear here.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* PROFILE SETTINGS */}

            {canEdit &&
              settingsOpen && (
                <section className="fk-profile-page__settings-wrapper">
                  <div className="fk-profile-page__settings-topbar">
                    <div>
                      <h2>
                        Profile Settings
                      </h2>

                      <p>
                        Manage your Fockis profile
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label="Close settings"
                      className="fk-profile-page__settings-close"
                      onClick={
                        closeSettings
                      }
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <FockisProfileSettings
                    user={
                      profile.user
                    }
                    onSave={
                      updateProfile
                    }
                    onClose={
                      closeSettings
                    }
                  />
                </section>
              )}
          </main>
        )}
    </div>
  );
}

/*
 * ============================================================================
 * DEFAULT EXPORT
 * ============================================================================
 */

export default function FockisProfilePage() {
  return (
    <ThemeProvider>
      <FockisProfilePageInner />
    </ThemeProvider>
  );
}
