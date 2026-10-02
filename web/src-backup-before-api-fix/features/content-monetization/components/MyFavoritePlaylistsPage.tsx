import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  playlistsApi,
} from "../../playlists/services/playlistsApi";

import {
  Playlist,
} from "../../playlists/types/playlist.types";

import PlaylistFavoriteButton
  from "./PlaylistFavoriteButton";

export default function MyFavoritePlaylistsPage() {
  const [
    playlists,
    setPlaylists,
  ] = useState<Playlist[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * ==========================================================================
   * LOAD FAVORITE PLAYLISTS
   * ==========================================================================
   */

  async function loadFavorites(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const result =
        await playlistsApi.getFavorites();

      setPlaylists(
        Array.isArray(result)
          ? result
          : [],
      );
    } catch (error) {
      console.error(
        "Failed to load favorite playlists:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load your favorite playlists.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==========================================================================
   * INITIAL LOAD
   * ==========================================================================
   */

  useEffect(() => {
    void loadFavorites();
  }, []);

  /*
   * ==========================================================================
   * REMOVE FAVORITE FROM LOCAL LIST
   * ==========================================================================
   */

  function handleRemoved(
    playlistId: string,
  ): void {
    setPlaylists(
      (current) =>
        current.filter(
          (playlist) =>
            playlist._id !==
            playlistId,
        ),
    );
  }

  /*
   * ==========================================================================
   * RENDER
   * ==========================================================================
   */

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px",
      }}
    >
      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <header
        style={{
          marginBottom: "24px",
        }}
      >
        <h1>
          My Favorites
        </h1>

        <p>
          Playlists you saved for later.
        </p>
      </header>

      {/* ====================================================================
          LOADING
      ==================================================================== */}

      {loading && (
        <p>
          Loading your favorites...
        </p>
      )}

      {/* ====================================================================
          ERROR
      ==================================================================== */}

      {!loading &&
        error && (
          <div
            style={{
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid #fecaca",
              background: "#fef2f2",
            }}
          >
            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadFavorites()
              }
            >
              Try Again
            </button>
          </div>
        )}

      {/* ====================================================================
          EMPTY STATE
      ==================================================================== */}

      {!loading &&
        !error &&
        playlists.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                marginBottom: "12px",
              }}
            >
              ♡
            </div>

            <h2>
              No favorite playlists yet
            </h2>

            <p>
              Add playlists to My Favorites
              and they will appear here.
            </p>

            <Link
              to="/playlists"
            >
              Browse Playlists
            </Link>
          </div>
        )}

      {/* ====================================================================
          PLAYLIST GRID
      ==================================================================== */}

      {!loading &&
        !error &&
        playlists.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {playlists.map(
              (playlist) => (
                <article
                  key={
                    playlist._id
                  }
                  style={{
                    border:
                      "1px solid #e5e7eb",
                    borderRadius:
                      "16px",
                    overflow:
                      "hidden",
                    background:
                      "#fff",
                  }}
                >
                  {/* ========================================================
                      PLAYLIST LINK
                  ======================================================== */}

                  <Link
                    to={`/playlists/${playlist._id}`}
                    style={{
                      display: "block",
                      textDecoration:
                        "none",
                      color:
                        "inherit",
                    }}
                  >
                    {/* ======================================================
                        COVER
                    ====================================================== */}

                    {playlist.coverImage ? (
                      <img
                        src={
                          playlist.coverImage
                        }
                        alt={
                          playlist.title
                        }
                        style={{
                          width:
                            "100%",
                          height:
                            "180px",
                          objectFit:
                            "cover",
                          display:
                            "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height:
                            "180px",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          background:
                            "#f3f4f6",
                          fontSize:
                            "48px",
                        }}
                      >
                        {playlist.type ===
                        "music"
                          ? "🎵"
                          : "🎬"}
                      </div>
                    )}

                    {/* ======================================================
                        PLAYLIST INFORMATION
                    ====================================================== */}

                    <div
                      style={{
                        padding:
                          "16px",
                      }}
                    >
                      <h3
                        style={{
                          margin:
                            "0 0 8px",
                        }}
                      >
                        {
                          playlist.title
                        }
                      </h3>

                      {playlist.description && (
                        <p
                          style={{
                            margin:
                              "0 0 10px",
                          }}
                        >
                          {
                            playlist.description
                          }
                        </p>
                      )}

                      <small>
                        {
                          playlist.items
                            ?.length ||
                          0
                        }{" "}
                        items
                      </small>
                    </div>
                  </Link>

                  {/* ========================================================
                      FAVORITE BUTTON
                  ======================================================== */}

                  <div
                    style={{
                      padding:
                        "0 16px 16px",
                    }}
                  >
                    <PlaylistFavoriteButton
                      playlistId={
                        playlist._id
                      }
                      initialIsFavorite={
                        true
                      }
                      onChanged={(
                        isFavorite,
                      ) => {
                        if (
                          !isFavorite
                        ) {
                          handleRemoved(
                            playlist._id,
                          );
                        }
                      }}
                    />
                  </div>
                </article>
              ),
            )}
          </div>
        )}
    </main>
  );
}