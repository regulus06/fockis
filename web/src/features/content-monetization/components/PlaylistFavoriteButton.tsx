import {
  useEffect,
  useState,
} from "react";

import {
  playlistsApi,
} from "../../playlists/services/playlistsApi";

interface Props {
  playlistId: string;

  initialIsFavorite?: boolean;

  initialFavoriteCount?: number;

  onChanged?: (
    isFavorite: boolean,
    favoriteCount: number,
  ) => void;
}

export default function PlaylistFavoriteButton({
  playlistId,
  initialIsFavorite = false,
  initialFavoriteCount = 0,
  onChanged,
}: Props) {
  const [
    isFavorite,
    setIsFavorite,
  ] = useState<boolean>(
    initialIsFavorite,
  );

  const [
    favoriteCount,
    setFavoriteCount,
  ] = useState<number>(
    initialFavoriteCount,
  );

  const [
    loading,
    setLoading,
  ] = useState<boolean>(false);

  // ==========================================================================
  // LOAD FAVORITE STATUS
  // ==========================================================================

  useEffect(() => {
    let mounted = true;

    async function loadStatus(): Promise<void> {
      try {
        const result =
          await playlistsApi.getFavoriteStatus(
            playlistId,
          );

        if (!mounted) {
          return;
        }

        /*
         * playlistsApi returns:
         *
         * {
         *   favorited: boolean;
         * }
         */
        setIsFavorite(
          Boolean(result.favorited),
        );
      } catch (error) {
        console.warn(
          "Unable to load playlist favorite status:",
          error,
        );
      }
    }

    void loadStatus();

    return () => {
      mounted = false;
    };
  }, [playlistId]);

  // ==========================================================================
  // TOGGLE FAVORITE
  // ==========================================================================

  async function handleToggle(): Promise<void> {
    if (loading) {
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      console.warn(
        "You must be logged in to favorite a playlist.",
      );

      return;
    }

    try {
      setLoading(true);

      if (isFavorite) {
        const result =
          await playlistsApi.removeFavorite(
            playlistId,
          );

        /*
         * API returns:
         *
         * {
         *   success: boolean;
         *   favorited: boolean;
         *   playlistId: string;
         * }
         */

        const nextIsFavorite =
          Boolean(result.favorited);

        setIsFavorite(
          nextIsFavorite,
        );

        onChanged?.(
          nextIsFavorite,
          favoriteCount,
        );
      } else {
        const result =
          await playlistsApi.addFavorite(
            playlistId,
          );

        /*
         * API returns:
         *
         * {
         *   success: boolean;
         *   favorited: boolean;
         *   playlistId: string;
         * }
         */

        const nextIsFavorite =
          Boolean(result.favorited);

        setIsFavorite(
          nextIsFavorite,
        );

        onChanged?.(
          nextIsFavorite,
          favoriteCount,
        );
      }
    } catch (error) {
      console.error(
        "Failed to update playlist favorite:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={
        isFavorite
          ? "Remove from My Favorites"
          : "Add to My Favorites"
      }
      title={
        isFavorite
          ? "Remove from My Favorites"
          : "Add to My Favorites"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        border:
          "1px solid #e5e7eb",
        borderRadius: "999px",
        padding: "9px 14px",
        background:
          isFavorite
            ? "#fff0f3"
            : "#ffffff",
        color:
          isFavorite
            ? "#e11d48"
            : "#374151",
        cursor:
          loading
            ? "wait"
            : "pointer",
        fontWeight: 600,
        transition:
          "all 0.2s ease",
        opacity:
          loading
            ? 0.7
            : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: "18px",
          lineHeight: 1,
        }}
      >
        {isFavorite
          ? "♥"
          : "♡"}
      </span>

      <span>
        {isFavorite
          ? "In My Favorites"
          : "Add to My Favorites"}
      </span>

      {favoriteCount > 0 && (
        <span
          style={{
            opacity: 0.7,
          }}
        >
          {favoriteCount}
        </span>
      )}
    </button>
  );
}