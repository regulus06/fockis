import {
  useCallback,
  useEffect,
  useState,
} from "react";

export interface FockisProfileUser {
  id?: string;
  _id?: string;
  userId?: string;
  fockisId?: string;
  username?: string;
  displayName?: string;
  name?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
  coverUrl?: string | null;
  coverPhotoUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  createdAt?: string;
  joinedAt?: string;
}

export interface FockisProfile {
  user: FockisProfileUser;
  posts?: unknown[];
  friends?: unknown[];
  followers?: number;
  following?: number;
  friendsCount?: number;
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
  bio?: string;
  location?: string;
  website?: string;
}

const API_URL =
  (
    import.meta.env.VITE_API_URL as
      | string
      | undefined
  )?.replace(/\/+$/, "") ||
  "http://localhost:3000";

function getToken(): string {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

function authHeaders(): HeadersInit {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function request(
  path: string,
  options: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
    },
  );

  const text = await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? String(
            (
              data as {
                message?: unknown;
              }
            ).message ||
              "Request failed",
          )
        : `Profile request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function isProfileUser(
  value: unknown,
): value is FockisProfileUser {
  return isObject(value);
}

function isFockisProfile(
  value: unknown,
): value is FockisProfile {
  if (!isObject(value)) {
    return false;
  }

  return isProfileUser(value.user);
}

function unwrapProfile(
  value: unknown,
): FockisProfile | null {
  if (!value) {
    return null;
  }

  /*
   * Direct profile:
   *
   * {
   *   user: {...},
   *   posts: [...]
   * }
   */
  if (isFockisProfile(value)) {
    return value;
  }

  if (!isObject(value)) {
    return null;
  }

  /*
   * Wrapped profile:
   *
   * {
   *   profile: {
   *     user: {...}
   *   }
   * }
   */
  const profile = value.profile;

  if (isFockisProfile(profile)) {
    return profile;
  }

  /*
   * Wrapped API response:
   *
   * {
   *   data: {
   *     user: {...}
   *   }
   * }
   */
  const data = value.data;

  if (isFockisProfile(data)) {
    return data;
  }

  /*
   * Some APIs return:
   *
   * {
   *   data: {
   *     profile: {
   *       user: {...}
   *     }
   *   }
   * }
   */
  if (isObject(data)) {
    const nestedProfile = data.profile;

    if (isFockisProfile(nestedProfile)) {
      return nestedProfile;
    }
  }

  return null;
}

function getCurrentUserId(): string {
  const direct =
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id");

  if (direct) {
    return direct.trim();
  }

  try {
    const raw =
      localStorage.getItem("user");

    if (!raw) {
      return "";
    }

    const user = JSON.parse(raw);

    return String(
      user?._id ||
        user?.id ||
        user?.userId ||
        "",
    ).trim();
  } catch {
    return "";
  }
}

export function useFockisProfile(
  requestedUserId?: string,
) {
  const [
    profile,
    setProfile,
  ] = useState<FockisProfile | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    profileMissing,
    setProfileMissing,
  ] = useState(false);

  const targetUserId =
    requestedUserId ||
    getCurrentUserId();

  const loadProfile =
    useCallback(
      async () => {
        if (!targetUserId) {
          setLoading(false);
          setProfileMissing(true);
          setProfile(null);
          return;
        }

        setLoading(true);
        setError(null);
        setProfileMissing(false);

        try {
          const paths =
            requestedUserId
              ? [
                  `/profile/${encodeURIComponent(
                    targetUserId,
                  )}`,
                  `/profiles/${encodeURIComponent(
                    targetUserId,
                  )}`,
                  `/users/${encodeURIComponent(
                    targetUserId,
                  )}/profile`,
                ]
              : [
                  "/profile/me",
                  "/profiles/me",
                  "/users/me/profile",
                ];

          let result:
            | FockisProfile
            | null = null;

          let lastError:
            | Error
            | null = null;

          for (const path of paths) {
            try {
              const response =
                await request(path);

              const unwrapped =
                unwrapProfile(
                  response,
                );

              if (unwrapped) {
                result = unwrapped;
                break;
              }

              /*
               * A successful HTTP response that
               * doesn't contain a recognized
               * profile should not immediately
               * stop us from trying the next
               * compatible endpoint.
               */
              lastError = new Error(
                "The profile response did not contain a valid Fockis profile.",
              );
            } catch (requestError) {
              lastError =
                requestError instanceof Error
                  ? requestError
                  : new Error(
                      "Profile request failed.",
                    );
            }
          }

          if (!result) {
            /*
             * If every endpoint failed, surface
             * the last real API error.
             */
            if (lastError) {
              throw lastError;
            }

            setProfile(null);
            setProfileMissing(true);
            return;
          }

          setProfile(result);
          setProfileMissing(false);
        } catch (loadError) {
          console.error(
            "[FOCKIS PROFILE] Load failed:",
            loadError,
          );

          setProfile(null);

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your Fockis profile.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        requestedUserId,
        targetUserId,
      ],
    );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const updateProfile =
    useCallback(
      async (
        value: Record<string, unknown>,
      ): Promise<
        FockisProfile | null
      > => {
        if (!targetUserId) {
          throw new Error(
            "A user ID is required to update the profile.",
          );
        }

        const paths =
          requestedUserId
            ? [
                `/profile/${encodeURIComponent(
                  targetUserId,
                )}`,
                `/profiles/${encodeURIComponent(
                  targetUserId,
                )}`,
              ]
            : [
                "/profile/me",
                "/profiles/me",
              ];

        let lastError:
          | Error
          | null = null;

        for (const path of paths) {
          try {
            const response =
              await request(
                path,
                {
                  method: "PATCH",
                  body: JSON.stringify(
                    value,
                  ),
                },
              );

            const updated =
              unwrapProfile(
                response,
              );

            if (updated) {
              setProfile(updated);
            }

            return updated;
          } catch (updateError) {
            lastError =
              updateError instanceof Error
                ? updateError
                : new Error(
                    "Profile update failed.",
                  );
          }
        }

        throw (
          lastError ||
          new Error(
            "Unable to update profile.",
          )
        );
      },
      [
        requestedUserId,
        targetUserId,
      ],
    );

  const createProfile =
    useCallback(
      async (): Promise<
        FockisProfile | null
      > => {
        const response =
          await request(
            "/profile",
            {
              method: "POST",
              body: JSON.stringify({}),
            },
          );

        const created =
          unwrapProfile(
            response,
          );

        if (created) {
          setProfile(created);
          setProfileMissing(false);
          setError(null);
        }

        return created;
      },
      [],
    );

  return {
    profile,
    loading,
    error,
    profileMissing,
    updateProfile,
    createProfile,
    loadProfile,
  };
}