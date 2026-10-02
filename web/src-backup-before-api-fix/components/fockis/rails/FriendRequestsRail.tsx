import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Check,
  X,
  Users,
} from "lucide-react";

import {
  fockisFriendsApi,
} from "../../../features/fockisprofile/service/fockisFriendsApi";

/*
 * ============================================================================
 * TYPES
 * ============================================================================
 */

interface FriendRequest {
  _id?: string;
  id?: string;

  requester?: {
    _id?: string;
    id?: string;

    username?: string;
    firstName?: string;
    lastName?: string;

    avatar?: string;
    profilePicture?: string;

    mutualFriendsCount?: number;
  };

  receiver?: {
    _id?: string;
    id?: string;
  };

  status?: string;
}

/*
 * ============================================================================
 * HELPERS
 * ============================================================================
 */

function getName(
  requester?: FriendRequest["requester"],
): string {
  const fullName = [
    requester?.firstName,
    requester?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    requester?.username ||
    "Unknown"
  );
}

function getAvatar(
  requester?: FriendRequest["requester"],
): string {
  return (
    requester?.avatar ||
    requester?.profilePicture ||
    ""
  );
}

function getRequestId(
  request: FriendRequest,
): string {
  return String(
    request._id ||
      request.id ||
      "",
  );
}

/*
 * ============================================================================
 * FRIEND REQUESTS RAIL
 *
 * This component no longer depends on FockisRail.tsx.
 * ============================================================================
 */

export default function FriendRequestsRail() {
  const [
    requests,
    setRequests,
  ] = useState<FriendRequest[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(null);

  /*
   * ==========================================================================
   * LOAD REQUESTS
   * ==========================================================================
   */

  const loadRequests =
    useCallback(async () => {
      try {
        setLoading(true);

        const response =
          await fockisFriendsApi.getIncomingRequests(
            1,
            30,
          );

        const data =
          Array.isArray(response)
            ? response
            : Array.isArray(
                (response as any)?.data,
              )
            ? (response as any).data
            : Array.isArray(
                (response as any)?.requests,
              )
            ? (response as any).requests
            : [];

        setRequests(
          data as FriendRequest[],
        );
      } catch (error) {
        console.error(
          "[FriendRequestsRail] Failed to load friend requests:",
          error,
        );

        setRequests([]);
      } finally {
        setLoading(false);
      }
    }, []);

  /*
   * ==========================================================================
   * INITIAL LOAD
   * ==========================================================================
   */

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  /*
   * ==========================================================================
   * ACCEPT REQUEST
   * ==========================================================================
   */

  const accept =
    useCallback(
      async (
        requestId: string,
      ) => {
        if (!requestId) {
          return;
        }

        try {
          setProcessingId(
            requestId,
          );

          await fockisFriendsApi.acceptRequest(
            requestId,
          );

          setRequests(
            (current) =>
              current.filter(
                (request) =>
                  getRequestId(
                    request,
                  ) !==
                  String(
                    requestId,
                  ),
              ),
          );
        } catch (error) {
          console.error(
            "[FriendRequestsRail] Failed to accept friend request:",
            error,
          );
        } finally {
          setProcessingId(
            null,
          );
        }
      },
      [],
    );

  /*
   * ==========================================================================
   * REJECT REQUEST
   * ==========================================================================
   */

  const reject =
    useCallback(
      async (
        requestId: string,
      ) => {
        if (!requestId) {
          return;
        }

        try {
          setProcessingId(
            requestId,
          );

          await fockisFriendsApi.rejectRequest(
            requestId,
          );

          setRequests(
            (current) =>
              current.filter(
                (request) =>
                  getRequestId(
                    request,
                  ) !==
                  String(
                    requestId,
                  ),
              ),
          );
        } catch (error) {
          console.error(
            "[FriendRequestsRail] Failed to reject friend request:",
            error,
          );
        } finally {
          setProcessingId(
            null,
          );
        }
      },
      [],
    );

  /*
   * ==========================================================================
   * NOTHING TO SHOW
   * ==========================================================================
   */

  if (
    !loading &&
    requests.length === 0
  ) {
    return null;
  }

  /*
   * ==========================================================================
   * RENDER
   * ==========================================================================
   */

  return (
    <section
      className="fk-right-rail__section fk-friend-requests-rail"
      aria-label="Friend requests"
    >
      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <div className="fk-right-rail__section-header">
        <div className="fk-right-rail__section-title">
          <Users size={18} />

          <h2>
            Friend Requests
          </h2>
        </div>

        <a
          href="/friends/requests"
          className="fk-right-rail__view-all"
        >
          See all
        </a>
      </div>

      {/* ====================================================================
          CONTENT
      ==================================================================== */}

      <div className="fk-friend-requests-rail__list">
        {loading ? (
          <>
            <div className="fk-rail-card fk-rail-card--request">
              <div className="fk-rail-card__body">
                <p className="fk-rail-card__meta">
                  Loading friend requests...
                </p>
              </div>
            </div>
          </>
        ) : (
          requests.map(
            (request) => {
              const requestId =
                getRequestId(
                  request,
                );

              const requester =
                request.requester;

              const name =
                getName(
                  requester,
                );

              const avatar =
                getAvatar(
                  requester,
                );

              const isProcessing =
                processingId ===
                requestId;

              return (
                <article
                  key={
                    requestId ||
                    `${name}-${Math.random()}`
                  }
                  className="fk-rail-card fk-rail-card--request"
                >
                  {/* ======================================================
                      AVATAR
                  ====================================================== */}

                  <div className="fk-rail-card__photo">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="fk-rail-card__initial"
                        aria-hidden="true"
                      >
                        {name
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* ======================================================
                      USER INFORMATION
                  ====================================================== */}

                  <div className="fk-rail-card__body">
                    <h3>
                      {name}
                    </h3>

                    {requester?.username &&
                      requester.username !==
                        name && (
                        <p className="fk-rail-card__meta">
                          @
                          {
                            requester.username
                          }
                        </p>
                      )}

                    {typeof requester?.mutualFriendsCount ===
                      "number" &&
                      requester.mutualFriendsCount >
                        0 && (
                        <p className="fk-rail-card__meta">
                          {
                            requester.mutualFriendsCount
                          }{" "}
                          mutual friend
                          {requester.mutualFriendsCount ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      )}
                  </div>

                  {/* ======================================================
                      ACTIONS
                  ====================================================== */}

                  <div className="fk-rail-card__actions">
                    <button
                      type="button"
                      className="fk-rail-card__btn fk-rail-card__btn--primary"
                      disabled={
                        isProcessing ||
                        !requestId
                      }
                      onClick={() =>
                        void accept(
                          requestId,
                        )
                      }
                      aria-label={`Confirm friend request from ${name}`}
                    >
                      <Check
                        size={15}
                      />

                      {isProcessing
                        ? "..."
                        : "Confirm"}
                    </button>

                    <button
                      type="button"
                      className="fk-rail-card__btn fk-rail-card__btn--ghost"
                      disabled={
                        isProcessing ||
                        !requestId
                      }
                      onClick={() =>
                        void reject(
                          requestId,
                        )
                      }
                      aria-label={`Delete friend request from ${name}`}
                    >
                      <X
                        size={15}
                      />

                      {isProcessing
                        ? "..."
                        : "Delete"}
                    </button>
                  </div>
                </article>
              );
            },
          )
        )}
      </div>
    </section>
  );
}