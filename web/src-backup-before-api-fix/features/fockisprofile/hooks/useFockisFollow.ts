import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { fockisFollowApi } from "../service/fockisFollowApi";

import type { FollowStatus } from "../types/fockisprofiletypes";

const DEFAULT_FOLLOW_STATUS: FollowStatus = {
  isFollowing: false,
  isFollowedBy: false,
};

export function useFockisFollow(userId?: string) {
  const [status, setStatus] = useState<FollowStatus>(
    DEFAULT_FOLLOW_STATUS,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!userId) {
      setStatus(DEFAULT_FOLLOW_STATUS);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fockisFollowApi.getStatus(userId);

      setStatus({
        isFollowing: Boolean(result?.isFollowing),
        isFollowedBy: Boolean(result?.isFollowedBy),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load follow status",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const follow = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await fockisFollowApi.follow(userId);

      setStatus((current) => ({
        ...current,
        isFollowing: true,
        isFollowedBy: Boolean(
          result?.isFollowedBy ?? current.isFollowedBy,
        ),
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to follow user",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const unfollow = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      await fockisFollowApi.unfollow(userId);

      setStatus((current) => ({
        ...current,
        isFollowing: false,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to unfollow user",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    isFollowing: status.isFollowing,
    isFollowedBy: status.isFollowedBy,
    loading,
    error,
    follow,
    unfollow,
    reload: loadStatus,
  };
}
