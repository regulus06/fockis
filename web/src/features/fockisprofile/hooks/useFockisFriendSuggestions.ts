import { useCallback, useEffect, useMemo, useState } from "react";
import { fockisFriendsApi } from "../service/fockisFriendsApi";

export interface FockisSuggestion {
  id: string;
  fullName: string;
  username?: string;
  avatar?: string;
  profilePicture?: string;
  mutualFriends?: number;
}

interface GenericObject {
  [key: string]: unknown;
}

function isObject(value: unknown): value is GenericObject {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getArrayItems(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;

  if (!isObject(response)) return [];

  const possibleArrays = [
    response.data,
    response.items,
    response.results,
    response.users,
    response.suggestions,
    response.requests,
    response.sentRequests,
    response.friendships,
  ];

  for (const value of possibleArrays) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function normalizeSuggestion(
  value: unknown,
): FockisSuggestion | null {
  if (!isObject(value)) {
    return null;
  }

  const id =
    stringValue(value.id) ||
    stringValue(value._id) ||
    stringValue(value.userId);

  if (!id) {
    return null;
  }

  const firstName = stringValue(value.firstName);
  const lastName = stringValue(value.lastName);

  const fullName =
    stringValue(value.fullName) ||
    stringValue(value.name) ||
    [firstName, lastName]
      .filter(Boolean)
      .join(" ") ||
    stringValue(value.username) ||
    "Fockis User";

  const profilePicture =
    stringValue(value.profilePicture);

  const avatar =
    stringValue(value.avatar) ||
    profilePicture;

  const mutualFriends =
    typeof value.mutualFriends === "number"
      ? value.mutualFriends
      : typeof value.mutualFriendsCount === "number"
        ? value.mutualFriendsCount
        : 0;

  return {
    id,
    fullName,
    username:
      stringValue(value.username) || undefined,
    avatar: avatar || undefined,
    profilePicture:
      profilePicture || undefined,
    mutualFriends,
  };
}

function extractUserId(
  value: unknown,
): string | null {
  if (!isObject(value)) {
    return null;
  }

  const directIds = [
    value.userId,
    value.friendId,
    value.receiverId,
    value.id,
    value._id,
  ];

  for (const candidate of directIds) {
    const id = stringValue(candidate);

    if (id) {
      return id;
    }
  }

  const receiver = value.receiver;

  if (typeof receiver === "string") {
    return receiver;
  }

  if (isObject(receiver)) {
    return (
      stringValue(receiver._id) ||
      stringValue(receiver.id) ||
      stringValue(receiver.userId) ||
      null
    );
  }

  const friend = value.friend;

  if (typeof friend === "string") {
    return friend;
  }

  if (isObject(friend)) {
    return (
      stringValue(friend._id) ||
      stringValue(friend.id) ||
      stringValue(friend.userId) ||
      null
    );
  }

  const friendship = value.friendship;

  if (isObject(friendship)) {
    const nestedReceiver =
      friendship.receiver;

    if (
      typeof nestedReceiver === "string"
    ) {
      return nestedReceiver;
    }

    if (isObject(nestedReceiver)) {
      return (
        stringValue(
          nestedReceiver._id,
        ) ||
        stringValue(
          nestedReceiver.id,
        ) ||
        stringValue(
          nestedReceiver.userId,
        ) ||
        null
      );
    }
  }

  return null;
}

/**
 * Read friendship status without assuming
 * one exact backend response shape.
 */
function getRelationshipStatus(
  response: unknown,
): string {
  if (!isObject(response)) {
    return "";
  }

  const friendship = isObject(
    response.friendship,
  )
    ? response.friendship
    : null;

  const request = isObject(
    response.request,
  )
    ? response.request
    : null;

  return (
    stringValue(response.status) ||
    stringValue(friendship?.status) ||
    stringValue(request?.status)
  ).toLowerCase();
}

function getRelationshipDirection(
  response: unknown,
): string {
  if (!isObject(response)) {
    return "";
  }

  const friendship = isObject(
    response.friendship,
  )
    ? response.friendship
    : null;

  return (
    stringValue(response.direction) ||
    stringValue(friendship?.direction)
  ).toLowerCase();
}

/**
 * For the Suggestions page, ANY pending friendship
 * means the Add Friend action must not be shown again.
 *
 * This intentionally does not depend exclusively on
 * "outgoing", because different backend responses may
 * omit direction.
 */
function hasExistingRequest(
  response: unknown,
): boolean {
  if (!isObject(response)) {
    return false;
  }

  const status =
    getRelationshipStatus(response);

  const direction =
    getRelationshipDirection(response);

  const result =
    status === "request_sent" ||
    status === "requested" ||
    status === "sent" ||
    status === "pending" ||
    status === "accepted" ||
    status === "friends" ||
    direction === "outgoing" ||
    direction === "incoming";

  console.log(
    "[FOCKIS FRIEND SUGGESTIONS] STATUS CHECK:",
    {
      status,
      direction,
      existingRelationship: result,
      response,
    },
  );

  return result;
}

export function useFockisFriendSuggestions() {
  const [suggestions, setSuggestions] =
    useState<FockisSuggestion[]>([]);

  const [sentIds, setSentIds] =
    useState<Set<string>>(
      () => new Set<string>(),
    );

  const [dismissedIds, setDismissedIds] =
    useState<Set<string>>(
      () => new Set<string>(),
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const reload = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        /*
         * ----------------------------------------------------------
         * 1. LOAD SUGGESTIONS
         * ----------------------------------------------------------
         */

        const rawSuggestions =
          await fockisFriendsApi.getSuggestions();

        console.log(
          "[FOCKIS FRIEND SUGGESTIONS] RAW SUGGESTIONS RESPONSE:",
          rawSuggestions,
        );

        const suggestionItems =
          getArrayItems(
            rawSuggestions,
          );

        const normalizedSuggestions =
          suggestionItems
            .map(normalizeSuggestion)
            .filter(
              (
                item,
              ): item is FockisSuggestion =>
                item !== null,
            );

        setSuggestions(
          normalizedSuggestions,
        );

        /*
         * ----------------------------------------------------------
         * 2. LOAD OUTGOING REQUESTS
         * ----------------------------------------------------------
         */

        const ids =
          new Set<string>();

        try {
          const rawSentRequests =
            await fockisFriendsApi.getSentRequests();

          console.log(
            "[FOCKIS FRIEND SUGGESTIONS] RAW SENT REQUESTS RESPONSE:",
            rawSentRequests,
          );

          const sentItems =
            getArrayItems(
              rawSentRequests,
            );

          console.log(
            "[FOCKIS FRIEND SUGGESTIONS] SENT REQUEST ITEMS:",
            sentItems,
          );

          for (
            const item of sentItems
          ) {
            const userId =
              extractUserId(item);

            if (userId) {
              ids.add(userId);
            }
          }
        } catch (sentError) {
          console.warn(
            "[FOCKIS FRIEND SUGGESTIONS] OUTGOING REQUESTS LOAD FAILED:",
            sentError,
          );
        }

        /*
         * ----------------------------------------------------------
         * 3. ALWAYS VERIFY SUGGESTIONS WITH STATUS API
         * ----------------------------------------------------------
         *
         * This is the important fix.
         *
         * The outgoing endpoint is currently returning [].
         * Therefore we directly ask the backend about each
         * suggested user's relationship.
         */

        const unresolvedSuggestions =
          normalizedSuggestions.filter(
            (suggestion) =>
              !ids.has(
                suggestion.id,
              ),
          );

        if (
          unresolvedSuggestions.length
        ) {
          const statusResults =
            await Promise.all(
              unresolvedSuggestions.map(
                async (
                  suggestion,
                ) => {
                  try {
                    const statusResponse =
                      await fockisFriendsApi.getStatus(
                        suggestion.id,
                      );

                    console.log(
                      "[FOCKIS FRIEND SUGGESTIONS] STATUS RESPONSE:",
                      {
                        userId:
                          suggestion.id,
                        fullName:
                          suggestion.fullName,
                        response:
                          statusResponse,
                      },
                    );

                    const existing =
                      hasExistingRequest(
                        statusResponse,
                      );

                    return {
                      userId:
                        suggestion.id,
                      existing,
                    };
                  } catch (
                    statusError
                  ) {
                    console.warn(
                      "[FOCKIS FRIEND SUGGESTIONS] STATUS FALLBACK FAILED:",
                      {
                        userId:
                          suggestion.id,
                        error:
                          statusError,
                      },
                    );

                    return {
                      userId:
                        suggestion.id,
                      existing: false,
                    };
                  }
                },
              ),
            );

          for (
            const result of statusResults
          ) {
            if (
              result.existing
            ) {
              ids.add(
                result.userId,
              );
            }
          }
        }

        /*
         * ----------------------------------------------------------
         * 4. SAVE FINAL SENT/RELATED IDS
         * ----------------------------------------------------------
         */

        setSentIds(ids);

        console.log(
          "[FOCKIS FRIEND SUGGESTIONS] FINAL RELATIONSHIP IDS:",
          Array.from(ids),
        );
      } catch (err) {
        console.error(
          "[FOCKIS FRIEND SUGGESTIONS] LOAD ERROR:",
          err,
        );

        setError(
          "Unable to load friend suggestions.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /*
   * Run exactly once on mount.
   *
   * reload has [] dependencies, so changes to
   * suggestions/sentIds cannot create a reload loop.
   */

  useEffect(() => {
    void reload();
  }, [reload]);

  /*
   * --------------------------------------------------------------
   * SEND REQUEST
   * --------------------------------------------------------------
   */

  const sendRequest =
    useCallback(
      async (userId: string) => {
        if (!userId) {
          return;
        }

        /*
         * Optimistic UI.
         */
        setSentIds(
          (previous) => {
            const next =
              new Set(previous);

            next.add(userId);

            return next;
          },
        );

        try {
          const response =
            await fockisFriendsApi.sendRequest(
              userId,
            );

          console.log(
            "[FOCKIS FRIEND SUGGESTIONS] REQUEST SENT:",
            {
              userId,
              response,
            },
          );

          /*
           * Do NOT reload suggestions here.
           *
           * The successful POST is authoritative.
           */
        } catch (err) {
          /*
           * Roll back optimistic state
           * if the request actually failed.
           */
          setSentIds(
            (previous) => {
              const next =
                new Set(previous);

              next.delete(userId);

              return next;
            },
          );

          console.error(
            "[FOCKIS FRIEND SUGGESTIONS] SEND REQUEST FAILED:",
            err,
          );

          throw err;
        }
      },
      [],
    );

  /*
   * --------------------------------------------------------------
   * DISMISS
   * --------------------------------------------------------------
   */

  const dismiss =
    useCallback(
      (userId: string) => {
        setDismissedIds(
          (previous) => {
            const next =
              new Set(previous);

            next.add(userId);

            return next;
          },
        );
      },
      [],
    );

  /*
   * --------------------------------------------------------------
   * VISIBLE SUGGESTIONS
   * --------------------------------------------------------------
   */

  const visibleSuggestions =
    useMemo(
      () =>
        suggestions.filter(
          (user) =>
            !dismissedIds.has(
              user.id,
            ),
        ),
      [
        suggestions,
        dismissedIds,
      ],
    );

  return {
    suggestions:
      visibleSuggestions,

    loading,

    error,

    sentIds,

    sendRequest,

    dismiss,

    reload,
  };
}