import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  fockisProfileApi,
  ProfileApiError,
} from "../service/fockisprofileApi";

import {
  fockisFollowApi,
} from "../service/fockisFollowApi";

import {
  useFockisProfileStore,
} from "../store/fockisprofileStore";

import type {
  UpdateProfilePayload,
} from "../types/fockisprofiletypes";

/* ============================================================================
   FOCKIS PROFILE HOOK

   Follow counts are loaded directly from the follows collection.

   This keeps:
     • top profile follow counts
     • profile card follower count
     • database follow records

   synchronized instead of relying on stale profile.stats values.
============================================================================ */

export function useFockisProfile(userId?: string) {
  const {
    profile,
    loading,
    error,
    setProfile,
    setLoading,
    setError,
  } = useFockisProfileStore();

  const [
    profileMissing,
    setProfileMissing,
  ] = useState(false);

  const loadProfile = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);
        setProfileMissing(false);

        const data = userId
          ? await fockisProfileApi.getProfileById(userId)
          : await fockisProfileApi.getMyProfile();

        const resolvedUserId =
          data?.user?.id ||
          data?.user?._id ||
          userId ||
          "";

        let posts = data?.posts || [];
        let friends = data?.friends || [];

        if (resolvedUserId) {
          const [
            fetchedPosts,
            fetchedFriends,
            followCounts,
          ] = await Promise.all([
            fockisProfileApi
              .getProfilePosts(String(resolvedUserId))
              .catch(() => []),

            fockisProfileApi
              .getProfileFriends(String(resolvedUserId))
              .catch(() => []),

            /*
             * IMPORTANT:
             * Followers/following come from the follows collection,
             * not from the profile document.
             */
            fockisFollowApi
              .getCounts(String(resolvedUserId))
              .catch(() => ({
                followers: 0,
                following: 0,
              })),
          ]);

          posts = fetchedPosts;
          friends = fetchedFriends;

          const existingStats = data?.stats || {};

          const followers = Number(
            followCounts?.followers ?? 0,
          );

          const following = Number(
            followCounts?.following ?? 0,
          );

          setProfile({
            ...data,

            posts,
            friends,

            stats: {
              ...existingStats,

              posts: posts.length,
              friends: friends.length,

              followers,
              following,
            },
          });

          return;
        }

        const existingStats = data?.stats || {};

        setProfile({
          ...data,

          posts,
          friends,

          stats: {
            ...existingStats,

            posts:
              typeof existingStats.posts === "number"
                ? existingStats.posts
                : posts.length,

            friends:
              typeof existingStats.friends === "number"
                ? existingStats.friends
                : friends.length,

            followers:
              typeof existingStats.followers === "number"
                ? existingStats.followers
                : 0,

            following:
              typeof existingStats.following === "number"
                ? existingStats.following
                : 0,
          },
        });
      } catch (err) {
        console.error(
          "Failed loading Fockis profile:",
          err,
        );

        if (
          err instanceof ProfileApiError &&
          err.status === 403
        ) {
          setProfile(null);
          setProfileMissing(false);
          setError("This profile is unavailable.");
          return;
        }

        if (
          err instanceof ProfileApiError &&
          err.status === 404
        ) {
          setProfileMissing(!userId);
          setProfile(null);
          setError(null);
        } else {
          setProfileMissing(false);

          if (userId) {
            setProfile(null);
          }

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load profile",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [
      userId,
      setLoading,
      setError,
      setProfile,
    ],
  );

  const updateProfile =
    useCallback(
      async (
        data: UpdateProfilePayload,
      ): Promise<void> => {
        try {
          setLoading(true);
          setError(null);

          const id =
            profile?.user?.id ||
            profile?.user?._id;

          if (!id) {
            throw new Error("Missing user ID.");
          }

          await fockisProfileApi.updateProfile(
            String(id),
            data,
          );

          await loadProfile();
        } catch (err) {
          console.error(
            "Profile update failed:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Profile update failed",
          );

          throw err;
        } finally {
          setLoading(false);
        }
      },
      [
        profile?.user?.id,
        profile?.user?._id,
        loadProfile,
        setLoading,
        setError,
      ],
    );

  const createProfile =
    useCallback(
      async (
        data: UpdateProfilePayload = {},
      ): Promise<void> => {
        try {
          setLoading(true);
          setError(null);
          setProfileMissing(false);

          const current =
            await fockisProfileApi.getMyProfile();

          const id =
            current?.user?.id ||
            current?.user?._id;

          if (!id) {
            throw new Error(
              "Unable to determine current user ID.",
            );
          }

          if (Object.keys(data).length > 0) {
            await fockisProfileApi.updateProfile(
              String(id),
              data,
            );
          }

          await loadProfile();
        } catch (err) {
          console.error(
            "Profile creation failed:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Profile creation failed",
          );

          setProfileMissing(true);
          throw err;
        } finally {
          setLoading(false);
        }
      },
      [
        loadProfile,
        setLoading,
        setError,
      ],
    );

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    profileMissing,
    loadProfile,
    updateProfile,
    createProfile,
  };
}
