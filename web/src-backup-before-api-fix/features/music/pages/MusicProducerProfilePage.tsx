import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import producerApi, {
  ProducerProfile,
  UpdateProducerProfilePayload,
} from "../services/producerApi";

import { musicApi } from "../services/musicApi";
import type { MusicContent } from "../types/music.types";

import "../styles/MusicProducerProfile.scss";

type FormState = {
  producerName: string;
  bio: string;
  genres: string;
  profileImage: string;
  coverImage: string;
  website: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  spotify: string;
};

type ProducerStats = {
  followers: number;
  releases: number;
  plays: number;
  views: number;
  sales: number;
  revenueCents: number;
};

const EMPTY_FORM: FormState = {
  producerName: "",
  bio: "",
  genres: "",
  profileImage: "",
  coverImage: "",
  website: "",
  instagram: "",
  youtube: "",
  tiktok: "",
  spotify: "",
};

// ============================================================================
// HELPERS
// ============================================================================

function profileToForm(
  profile: ProducerProfile,
): FormState {
  return {
    producerName: profile.producerName ?? "",
    bio: profile.bio ?? "",
    genres: Array.isArray(profile.genres)
      ? profile.genres.join(", ")
      : "",
    profileImage: profile.profileImage ?? "",
    coverImage: profile.coverImage ?? "",
    website: profile.website ?? "",
    instagram: profile.instagram ?? "",
    youtube: profile.youtube ?? "",
    tiktok: profile.tiktok ?? "",
    spotify: profile.spotify ?? "",
  };
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const responseMessage = (
    error as {
      response?: {
        data?: {
          message?: unknown;
        };
      };
    }
  )?.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage.join(", ");
  }

  if (
    typeof responseMessage === "string" &&
    responseMessage.trim()
  ) {
    return responseMessage;
  }

  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return "FP";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`
    .toUpperCase();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(
    "en-US",
  ).format(value);
}

function formatMoney(
  cents: number,
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  ).format(cents / 100);
}

/**
 * Safely read the ID from a MusicContent object.
 *
 * The API may return either Mongo's `_id`
 * or the normalized `id` field.
 */
function getContentId(
  content: MusicContent,
): string {
  const item = content as MusicContent & {
    _id?: string;
    id?: string;
  };

  return String(
    item.id ??
      item._id ??
      "",
  );
}

/**
 * Convert potentially missing numeric
 * analytics values into safe numbers.
 */
function safeNumber(
  value: unknown,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

/**
 * Creator Manager's content is the source of
 * truth for profile release analytics.
 *
 * Published content:
 *   releases = number of published releases
 *   plays    = sum of playCount
 *   views    = sum of viewCount
 *   sales    = sum of purchaseCount
 *   revenue  = sum of purchaseCount * priceCents
 *
 * Processing/draft/scheduled/failed content
 * does not count as a released item.
 */
function calculateProducerStats(
  profile: ProducerProfile,
  content: MusicContent[],
): ProducerStats {
  const publishedContent =
    content.filter(
      (item) =>
        String(
          item.status ?? "",
        ).toLowerCase() ===
        "published",
    );

  const releases =
    publishedContent.length;

  const plays =
    publishedContent.reduce(
      (total, item) =>
        total +
        safeNumber(
          item.playCount,
        ),
      0,
    );

  const views =
    publishedContent.reduce(
      (total, item) =>
        total +
        safeNumber(
          item.viewCount,
        ),
      0,
    );

  const sales =
    publishedContent.reduce(
      (total, item) =>
        total +
        safeNumber(
          item.purchaseCount,
        ),
      0,
    );

  const revenueCents =
    publishedContent.reduce(
      (total, item) => {
        const purchases =
          safeNumber(
            item.purchaseCount,
          );

        const priceCents =
          safeNumber(
            item.priceCents,
          );

        return (
          total +
          purchases *
            priceCents
        );
      },
      0,
    );

  return {
    followers: safeNumber(
      profile.followersCount,
    ),
    releases,
    plays,
    views,
    sales,
    revenueCents,
  };
}

// ============================================================================
// PAGE
// ============================================================================

export default function MusicProducerProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState<ProducerProfile | null>(
      null,
    );

  const [form, setForm] =
    useState<FormState>(
      EMPTY_FORM,
    );

  const [content, setContent] =
    useState<MusicContent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [contentLoading, setContentLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<
      "profile" | "public"
    >("profile");

  const [showPreview, setShowPreview] =
    useState(false);

  // ==========================================================================
  // LOAD PRODUCER PROFILE + CREATOR MANAGER CONTENT
  // ==========================================================================

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setContentLoading(true);
        setError("");

        /**
         * Load both sources.
         *
         * producerApi:
         *   identity + editable producer profile
         *
         * musicApi:
         *   Creator Manager content + analytics
         */
        const [
          profileResult,
          studioContent,
        ] = await Promise.all([
          producerApi.getMe(),
          musicApi.myStudioContent(),
        ]);

        if (!mounted) {
          return;
        }

        if (
          !profileResult.exists ||
          !profileResult.profile
        ) {
          navigate(
            "/music/become-producer",
            {
              replace: true,
            },
          );

          return;
        }

        setProfile(
          profileResult.profile,
        );

        setForm(
          profileToForm(
            profileResult.profile,
          ),
        );

        /**
         * Normalize the studio result.
         *
         * Some versions of the API return
         * an array directly while others may
         * return an object containing `items`.
         */
        let normalizedContent: MusicContent[] =
          [];

        if (
          Array.isArray(
            studioContent,
          )
        ) {
          normalizedContent =
            studioContent;
        } else {
          const possibleResult =
            studioContent as unknown as {
              items?: MusicContent[];
              content?: MusicContent[];
              data?: MusicContent[];
            };

          if (
            Array.isArray(
              possibleResult.items,
            )
          ) {
            normalizedContent =
              possibleResult.items;
          } else if (
            Array.isArray(
              possibleResult.content,
            )
          ) {
            normalizedContent =
              possibleResult.content;
          } else if (
            Array.isArray(
              possibleResult.data,
            )
          ) {
            normalizedContent =
              possibleResult.data;
          }
        }

        setContent(
          normalizedContent,
        );
      } catch (err) {
        if (!mounted) {
          return;
        }

        setError(
          getErrorMessage(
            err,
            "Unable to load your producer profile.",
          ),
        );
      } finally {
        if (mounted) {
          setLoading(false);
          setContentLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // ==========================================================================
  // CREATOR MANAGER → PRODUCER PROFILE STATS
  // ==========================================================================

  const stats = useMemo(() => {
    if (!profile) {
      return {
        followers: 0,
        releases: 0,
        plays: 0,
        views: 0,
        sales: 0,
        revenueCents: 0,
      };
    }

    return calculateProducerStats(
      profile,
      content,
    );
  }, [
    profile,
    content,
  ]);

  // ==========================================================================
  // FORM DERIVED DATA
  // ==========================================================================

  const initials = useMemo(
    () =>
      getInitials(
        form.producerName,
      ),
    [form.producerName],
  );

  const genreList = useMemo(
    () =>
      form.genres
        .split(",")
        .map(
          (genre) =>
            genre.trim(),
        )
        .filter(Boolean),
    [form.genres],
  );

  // ==========================================================================
  // FORM HANDLERS
  // ==========================================================================

  function updateField(
    field: keyof FormState,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setSuccess("");
    setError("");
  }

  function resetForm() {
    if (!profile) {
      return;
    }

    setForm(
      profileToForm(profile),
    );

    setError("");
    setSuccess("");
  }

  // ==========================================================================
  // SAVE PRODUCER PROFILE
  // ==========================================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !form.producerName.trim()
    ) {
      setError(
        "Producer name is required.",
      );

      return;
    }

    if (
      !form.genres.trim()
    ) {
      setError(
        "Add at least one music genre.",
      );

      return;
    }

    const payload: UpdateProducerProfilePayload =
      {
        producerName:
          form.producerName.trim(),

        bio:
          form.bio.trim(),

        genres:
          genreList,

        profileImage:
          normalizeUrl(
            form.profileImage,
          ),

        coverImage:
          normalizeUrl(
            form.coverImage,
          ),

        website:
          normalizeUrl(
            form.website,
          ),

        instagram:
          normalizeUrl(
            form.instagram,
          ),

        youtube:
          normalizeUrl(
            form.youtube,
          ),

        tiktok:
          normalizeUrl(
            form.tiktok,
          ),

        spotify:
          normalizeUrl(
            form.spotify,
          ),
      };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updated =
        await producerApi.updateMe(
          payload,
        );

      setProfile(updated);

      setForm(
        profileToForm(updated),
      );

      setSuccess(
        "Your producer profile has been saved successfully.",
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to save your producer profile.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (loading) {
    return (
      <main className="music-producer-profile">
        <section className="music-producer-profile__loading">
          <div className="music-producer-profile__spinner" />

          <h2>
            Loading Creator Profile
          </h2>

          <p>
            Loading your producer
            profile and studio
            analytics...
          </p>
        </section>
      </main>
    );
  }

  // ==========================================================================
  // PROFILE NOT FOUND
  // ==========================================================================

  if (!profile) {
    return (
      <main className="music-producer-profile">
        <section className="music-producer-profile__empty">
          <div className="music-producer-profile__empty-icon">
            ♪
          </div>

          <h1>
            Producer profile not found
          </h1>

          <p>
            You do not have an active
            Fockis Music producer
            profile yet.
          </p>

          <Link
            to="/music/become-producer"
            className="music-producer-profile__primary-button"
          >
            Become a Producer
          </Link>
        </section>
      </main>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <main className="music-producer-profile">
      {/* ================================================================
          TOP BAR
      ================================================================ */}

      <header className="music-producer-profile__topbar">
        <div>
          <Link
            to="/music/producer"
            className="music-producer-profile__back"
          >
            ← Back to Creator Manager
          </Link>

          <h1>
            Producer Profile
          </h1>

          <p>
            Manage your public creator
            identity and Fockis Music
            profile.
          </p>
        </div>

        <div className="music-producer-profile__top-actions">
          <Link
            to="/music/producer"
            className="music-producer-profile__secondary-button"
          >
            Creator Manager
          </Link>

          <Link
            to="/music/producer/team"
            className="music-producer-profile__team-button"
          >
            Manage Team
          </Link>
        </div>
      </header>

      {/* ================================================================
          ALERTS
      ================================================================ */}

      {error && (
        <div className="music-producer-profile__alert music-producer-profile__alert--error">
          <strong>
            Something went wrong
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {success && (
        <div className="music-producer-profile__alert music-producer-profile__alert--success">
          <strong>
            Profile Updated
          </strong>

          <span>
            {success}
          </span>
        </div>
      )}

      {/* ================================================================
          HERO
      ================================================================ */}

      <section className="music-producer-profile__hero">
        <div
          className="music-producer-profile__cover"
          style={
            form.coverImage
              ? {
                  backgroundImage: `url("${form.coverImage}")`,
                }
              : undefined
          }
        >
          {!form.coverImage && (
            <div className="music-producer-profile__cover-placeholder">
              <strong>
                {initials}
              </strong>

              <span>
                FOCKIS MUSIC
              </span>
            </div>
          )}

          <div className="music-producer-profile__cover-overlay" />
        </div>

        <div className="music-producer-profile__identity">
          <div className="music-producer-profile__avatar">
            {form.profileImage ? (
              <img
                src={form.profileImage}
                alt={
                  form.producerName ||
                  "Producer profile"
                }
              />
            ) : (
              initials
            )}
          </div>

          <div className="music-producer-profile__identity-content">
            <div className="music-producer-profile__status-row">
              <span
                className={`music-producer-profile__status music-producer-profile__status--${profile.status}`}
              >
                <span />
                {profile.status}
              </span>

              {profile.status ===
                "approved" && (
                <span className="music-producer-profile__verified">
                  ✓ Verified Creator
                </span>
              )}
            </div>

            <h2>
              {form.producerName ||
                "Your Producer Name"}
            </h2>

            <p>
              {form.bio ||
                "Add a professional bio to tell listeners and buyers about your work."}
            </p>
          </div>

          <button
            type="button"
            className="music-producer-profile__preview-button"
            onClick={() =>
              setShowPreview(true)
            }
          >
            Preview Public Page
          </button>
        </div>

        {/* ==============================================================
            CONNECTED CREATOR MANAGER STATS
        ============================================================== */}

        <div className="music-producer-profile__stats">
          <div>
            <strong>
              {formatNumber(
                stats.followers,
              )}
            </strong>

            <span>
              Followers
            </span>
          </div>

          <div>
            <strong>
              {contentLoading ? (
                "..."
              ) : (
                formatNumber(
                  stats.releases,
                )
              )}
            </strong>

            <span>
              Releases
            </span>
          </div>

          <div>
            <strong>
              {contentLoading ? (
                "..."
              ) : (
                formatNumber(
                  stats.plays,
                )
              )}
            </strong>

            <span>
              Plays
            </span>
          </div>

          <div>
            <strong>
              {contentLoading ? (
                "..."
              ) : (
                formatNumber(
                  stats.views,
                )
              )}
            </strong>

            <span>
              Views
            </span>
          </div>

          <div>
            <strong>
              {contentLoading ? (
                "..."
              ) : (
                formatNumber(
                  stats.sales,
                )
              )}
            </strong>

            <span>
              Sales
            </span>
          </div>
        </div>
      </section>

      {/* ================================================================
          TABS
      ================================================================ */}

      <div className="music-producer-profile__tabs">
        <button
          type="button"
          className={
            activeTab === "profile"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setActiveTab("profile")
          }
        >
          Profile Settings
        </button>

        <button
          type="button"
          className={
            activeTab === "public"
              ? "is-active"
              : ""
          }
          onClick={() =>
            setActiveTab("public")
          }
        >
          Public Profile
        </button>
      </div>

      {/* ================================================================
          PROFILE TAB
      ================================================================ */}

      {activeTab ===
        "profile" && (
        <div className="music-producer-profile__content">
          <form
            className="music-producer-profile__card"
            onSubmit={handleSubmit}
          >
            <div className="music-producer-profile__card-header">
              <span className="music-producer-profile__eyebrow">
                CREATOR IDENTITY
              </span>

              <h2>
                Producer Information
              </h2>

              <p>
                This information appears
                on your Fockis Music
                creator page.
              </p>
            </div>

            <div className="music-producer-profile__form-grid">
              {/* Producer Name */}

              <label className="music-producer-profile__field">
                <span>
                  Producer Name
                </span>

                <input
                  type="text"
                  value={
                    form.producerName
                  }
                  onChange={(event) =>
                    updateField(
                      "producerName",
                      event.target
                        .value,
                    )
                  }
                  placeholder="Your producer name"
                  maxLength={100}
                />
              </label>

              {/* Genres */}

              <label className="music-producer-profile__field">
                <span>
                  Music Genres
                </span>

                <input
                  type="text"
                  value={
                    form.genres
                  }
                  onChange={(event) =>
                    updateField(
                      "genres",
                      event.target
                        .value,
                    )
                  }
                  placeholder="Hip Hop, R&B, Gospel"
                />

                <small>
                  Separate multiple
                  genres with commas.
                </small>
              </label>

              {/* Bio */}

              <label className="music-producer-profile__field music-producer-profile__field--full">
                <span>
                  Producer Bio
                </span>

                <textarea
                  value={
                    form.bio
                  }
                  onChange={(event) =>
                    updateField(
                      "bio",
                      event.target
                        .value,
                    )
                  }
                  placeholder="Tell listeners about yourself, your sound, your experience, and your creative work."
                  rows={6}
                  maxLength={2000}
                />
              </label>

              {/* Profile Image */}

              <label className="music-producer-profile__field">
                <span>
                  Profile Image URL
                </span>

                <input
                  type="text"
                  value={
                    form.profileImage
                  }
                  onChange={(event) =>
                    updateField(
                      "profileImage",
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://..."
                />

                <small>
                  Use a public image URL.
                </small>
              </label>

              {/* Cover Image */}

              <label className="music-producer-profile__field">
                <span>
                  Cover Image URL
                </span>

                <input
                  type="text"
                  value={
                    form.coverImage
                  }
                  onChange={(event) =>
                    updateField(
                      "coverImage",
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://..."
                />

                <small>
                  Recommended wide
                  landscape image.
                </small>
              </label>

              {/* Website */}

              <label className="music-producer-profile__field">
                <span>
                  Website
                </span>

                <input
                  type="text"
                  value={
                    form.website
                  }
                  onChange={(event) =>
                    updateField(
                      "website",
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://yourwebsite.com"
                />
              </label>

              {/* Instagram */}

              <label className="music-producer-profile__field">
                <span>
                  Instagram
                </span>

                <input
                  type="text"
                  value={
                    form.instagram
                  }
                  onChange={(event) =>
                    updateField(
                      "instagram",
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://instagram.com/..."
                />
              </label>

              {/* YouTube */}

              <label className="music-producer-profile__field">
                <span>
                  YouTube
                </span>

                <input
                  type="text"
                  value={
                    form.youtube
                  }
                  onChange={(event) =>
                    updateField(
                      "youtube",
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://youtube.com/..."
                />
              </label>

              {/* TikTok */}

              <label className="music-producer-profile__field">
                <span>
                  TikTok
                </span>

                <input
                  type="text"
                  value={
                    form.tiktok
                  }
                  onChange={(event) =>
                    updateField(
                      "tiktok",
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://tiktok.com/@..."
                />
              </label>

              {/* Spotify */}

              <label className="music-producer-profile__field">
                <span>
                  Spotify
                </span>

                <input
                  type="text"
                  value={
                    form.spotify
                  }
                  onChange={(event) =>
                    updateField(
                      "spotify",
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://open.spotify.com/..."
                />
              </label>
            </div>

            {/* ==========================================================
                IMAGE PREVIEWS
            ========================================================== */}

            <div className="music-producer-profile__image-previews">
              <div className="music-producer-profile__image-preview">
                <span>
                  PROFILE IMAGE
                </span>

                <div className="music-producer-profile__mini-avatar">
                  {form.profileImage ? (
                    <img
                      src={
                        form.profileImage
                      }
                      alt="Profile preview"
                    />
                  ) : (
                    initials
                  )}
                </div>
              </div>

              <div
                className="music-producer-profile__image-preview music-producer-profile__image-preview--cover"
                style={
                  form.coverImage
                    ? {
                        backgroundImage: `url("${form.coverImage}")`,
                      }
                    : undefined
                }
              >
                {!form.coverImage && (
                  <span>
                    COVER IMAGE
                  </span>
                )}
              </div>
            </div>

            {/* ==========================================================
                SAVE ACTIONS
            ========================================================== */}

            <div className="music-producer-profile__actions">
              <button
                type="button"
                className="music-producer-profile__cancel-button"
                onClick={
                  resetForm
                }
                disabled={
                  saving
                }
              >
                Reset Changes
              </button>

              <button
                type="submit"
                className="music-producer-profile__save-button"
                disabled={
                  saving
                }
              >
                {saving && (
                  <span className="music-producer-profile__button-spinner" />
                )}

                {saving
                  ? "Saving..."
                  : "Save Producer Profile"}
              </button>
            </div>
          </form>

          {/* ============================================================
              TEAM MANAGEMENT
          ============================================================ */}

          <section className="music-producer-profile__card music-producer-profile__management-card">
            <div>
              <span className="music-producer-profile__eyebrow">
                CREATOR OPERATIONS
              </span>

              <h2>
                Manage Your Creator Team
              </h2>

              <p>
                Invite managers, editors,
                marketers, analysts, and
                other collaborators to help
                operate your Fockis Music
                creator profile.
              </p>
            </div>

            <Link
              to="/music/producer/team"
              className="music-producer-profile__team-link"
            >
              Open Team Management
            </Link>
          </section>

          {/* ============================================================
              CONNECTED STUDIO SUMMARY
          ============================================================ */}

          <section className="music-producer-profile__card">
            <div className="music-producer-profile__card-header">
              <span className="music-producer-profile__eyebrow">
                CREATOR MANAGER CONNECTION
              </span>

              <h2>
                Studio Performance
              </h2>

              <p>
                These numbers are
                synchronized directly from
                your Creator Manager content.
              </p>
            </div>

            <div className="music-producer-profile__stats">
              <div>
                <strong>
                  {formatNumber(
                    stats.releases,
                  )}
                </strong>

                <span>
                  Published Releases
                </span>
              </div>

              <div>
                <strong>
                  {formatNumber(
                    stats.plays,
                  )}
                </strong>

                <span>
                  Total Plays
                </span>
              </div>

              <div>
                <strong>
                  {formatNumber(
                    stats.views,
                  )}
                </strong>

                <span>
                  Total Views
                </span>
              </div>

              <div>
                <strong>
                  {formatNumber(
                    stats.sales,
                  )}
                </strong>

                <span>
                  Purchases
                </span>
              </div>

              <div>
                <strong>
                  {formatMoney(
                    stats.revenueCents,
                  )}
                </strong>

                <span>
                  Gross Revenue
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ================================================================
          PUBLIC PROFILE TAB
      ================================================================ */}

      {activeTab ===
        "public" && (
        <div className="music-producer-profile__content">
          <section className="music-producer-profile__public-card">
            <span className="music-producer-profile__eyebrow">
              PUBLIC CREATOR PAGE
            </span>

            <h2>
              {form.producerName ||
                "Your Producer Profile"}
            </h2>

            <p>
              This is a preview of the
              information listeners and
              buyers can see on your public
              Fockis Music creator profile.
            </p>

            <div className="music-producer-profile__public-preview">
              <div
                className="music-producer-profile__public-preview-cover"
                style={
                  form.coverImage
                    ? {
                        backgroundImage: `url("${form.coverImage}")`,
                        backgroundPosition:
                          "center",
                        backgroundSize:
                          "cover",
                      }
                    : undefined
                }
              />

              <div className="music-producer-profile__public-preview-body">
                <div className="music-producer-profile__public-avatar">
                  {form.profileImage ? (
                    <img
                      src={
                        form.profileImage
                      }
                      alt={
                        form.producerName
                      }
                    />
                  ) : (
                    initials
                  )}
                </div>

                <div>
                  <h3>
                    {form.producerName ||
                      "Producer Name"}
                  </h3>

                  <p>
                    {form.bio ||
                      "Your producer biography will appear here."}
                  </p>

                  <div className="music-producer-profile__genre-list">
                    {genreList.length >
                    0 ? (
                      genreList.map(
                        (
                          genre,
                          index,
                        ) => (
                          <span
                            key={`${genre}-${index}`}
                          >
                            {genre}
                          </span>
                        ),
                      )
                    ) : (
                      <span>
                        Add genres
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ==========================================================
                PUBLIC STATS
            ========================================================== */}

            <div className="music-producer-profile__stats">
              <div>
                <strong>
                  {formatNumber(
                    stats.followers,
                  )}
                </strong>

                <span>
                  Followers
                </span>
              </div>

              <div>
                <strong>
                  {formatNumber(
                    stats.releases,
                  )}
                </strong>

                <span>
                  Releases
                </span>
              </div>

              <div>
                <strong>
                  {formatNumber(
                    stats.plays,
                  )}
                </strong>

                <span>
                  Plays
                </span>
              </div>

              <div>
                <strong>
                  {formatNumber(
                    stats.views,
                  )}
                </strong>

                <span>
                  Views
                </span>
              </div>

              <div>
                <strong>
                  {formatNumber(
                    stats.sales,
                  )}
                </strong>

                <span>
                  Sales
                </span>
              </div>
            </div>

            <button
              type="button"
              className="music-producer-profile__primary-button"
              onClick={() =>
                setShowPreview(true)
              }
            >
              Open Full Preview
            </button>
          </section>
        </div>
      )}

      {/* ================================================================
          PUBLIC PROFILE MODAL
      ================================================================ */}

      {showPreview && (
        <div
          className="music-producer-profile__modal-backdrop"
          onClick={() =>
            setShowPreview(false)
          }
        >
          <section
            className="music-producer-profile__modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header className="music-producer-profile__modal-header">
              <div>
                <span className="music-producer-profile__eyebrow">
                  FOCKIS MUSIC
                </span>

                <h2>
                  Public Creator Preview
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close preview"
                onClick={() =>
                  setShowPreview(false)
                }
              >
                ×
              </button>
            </header>

            <div
              className="music-producer-profile__modal-cover"
              style={
                form.coverImage
                  ? {
                      backgroundImage: `url("${form.coverImage}")`,
                    }
                  : undefined
              }
            />

            <div className="music-producer-profile__modal-profile">
              <div className="music-producer-profile__modal-avatar">
                {form.profileImage ? (
                  <img
                    src={
                      form.profileImage
                    }
                    alt={
                      form.producerName
                    }
                  />
                ) : (
                  initials
                )}
              </div>

              <div>
                <h3>
                  {form.producerName ||
                    "Producer Name"}
                </h3>

                <span>
                  {profile.status ===
                  "approved"
                    ? "✓ Verified Fockis Music Creator"
                    : `Creator status: ${profile.status}`}
                </span>
              </div>
            </div>

            <div className="music-producer-profile__modal-body">
              <p>
                {form.bio ||
                  "This producer has not added a biography yet."}
              </p>

              <div className="music-producer-profile__genre-list">
                {genreList.map(
                  (
                    genre,
                    index,
                  ) => (
                    <span
                      key={`${genre}-${index}`}
                    >
                      {genre}
                    </span>
                  ),
                )}
              </div>

              <div className="music-producer-profile__modal-stats">
                <div>
                  <strong>
                    {formatNumber(
                      stats.releases,
                    )}
                  </strong>

                  <span>
                    Releases
                  </span>
                </div>

                <div>
                  <strong>
                    {formatNumber(
                      stats.plays,
                    )}
                  </strong>

                  <span>
                    Plays
                  </span>
                </div>

                <div>
                  <strong>
                    {formatNumber(
                      stats.views,
                    )}
                  </strong>

                  <span>
                    Views
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="music-producer-profile__primary-button"
              onClick={() =>
                setShowPreview(false)
              }
            >
              Close Preview
            </button>
          </section>
        </div>
      )}
    </main>
  );
}