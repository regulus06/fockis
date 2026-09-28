/**
 * OrganizationAdminMediaPage.tsx
 * -----------------------------------------------------------------------------
 * FOCKIS ORGANIZATION ADMIN — MEDIA MANAGEMENT
 *
 * Organization-wide media administration for every Fockis organization type.
 *
 * Works with:
 *   - Church
 *   - Business
 *   - Nonprofit
 *   - School
 *   - Ministry
 *   - Community
 *   - Club
 *   - Other organization types
 *
 * Supports:
 *   - Videos
 *   - Presentations
 *   - Photos
 *   - Documents
 *   - Audio
 *   - Resources
 *   - Media editing
 *   - Media deletion
 *   - Publishing / unpublishing
 *   - Tags
 *   - Thumbnails
 *   - Presenter / speaker information
 *
 * Backend compatibility:
 *   Existing ChurchMedia API/types are intentionally retained until
 *   the backend media domain is fully generalized.
 *
 * Route:
 *   /organizations/:organizationId/admin/media
 * -----------------------------------------------------------------------------
 */

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import ChurchSidebar from "../components/ChurchSidebar";

import {
  churchDelete,
  churchGet,
  churchPost,
  churchPut,
} from "../api/churchApi";

import {
  CHURCH_MEDIA_TYPE_LABELS,
  ChurchMediaType,
  type ChurchMedia,
} from "../types/church.types";

import "../styles/OrganizationAdminMediaPage.scss";

/* ============================================================================
 * TYPES
 * ========================================================================== */

interface MediaFormState {
  mediaType: ChurchMediaType;
  title: string;
  description: string;
  fileUrl: string;
  thumbnailUrl: string;
  durationSeconds: string;
  speaker: string;
  tags: string;
  published: boolean;
}

interface MediaListResponse {
  items: ChurchMedia[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/* ============================================================================
 * CONSTANTS
 * ========================================================================== */

const EMPTY_FORM: MediaFormState = {
  mediaType: ChurchMediaType.Sermon,
  title: "",
  description: "",
  fileUrl: "",
  thumbnailUrl: "",
  durationSeconds: "",
  speaker: "",
  tags: "",
  published: true,
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function createFormFromMedia(
  item: ChurchMedia,
): MediaFormState {
  return {
    mediaType: item.mediaType,
    title: item.title,
    description: item.description ?? "",
    fileUrl: item.fileUrl,
    thumbnailUrl: item.thumbnailUrl ?? "",
    durationSeconds:
      item.durationSeconds !== null &&
      item.durationSeconds !== undefined
        ? String(item.durationSeconds)
        : "",
    speaker: item.speaker ?? "",
    tags: item.tags?.join(", ") ?? "",
    published: true,
  };
}

function getMediaLabel(
  type: ChurchMediaType,
): string {
  return (
    CHURCH_MEDIA_TYPE_LABELS[type] ??
    String(type)
  );
}

function getMediaInitial(
  type: ChurchMediaType,
): string {
  const label = getMediaLabel(type);

  return (
    label.trim().charAt(0).toUpperCase() ||
    "M"
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function formatDate(
  value: string | Date | undefined | null,
): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

function formatDuration(
  seconds: number | null | undefined,
): string | null {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return null;
  }

  const totalSeconds = Math.floor(seconds);

  const hours = Math.floor(
    totalSeconds / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  const remainingSeconds =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(
      2,
      "0",
    )}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(
      remainingSeconds,
    ).padStart(2, "0")}s`;
  }

  return `${remainingSeconds}s`;
}

/* ============================================================================
 * COMPONENT
 * ========================================================================== */

export default function OrganizationAdminMediaPage(): React.JSX.Element {
  const {
    organizationId = "",
  } = useParams<{
    organizationId: string;
  }>();

  const navigate = useNavigate();

  /* ==========================================================================
   * STATE
   * ======================================================================== */

  const [media, setMedia] =
    useState<ChurchMedia[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [editingMedia, setEditingMedia] =
    useState<ChurchMedia | null>(null);

  const [form, setForm] =
    useState<MediaFormState>(EMPTY_FORM);

  const [isSaving, setIsSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [filterType, setFilterType] =
    useState<"all" | ChurchMediaType>(
      "all",
    );

  const [filterPublished, setFilterPublished] =
    useState<
      "all" | "published" | "draft"
    >("all");

  /* ==========================================================================
   * DERIVED VALUES
   * ======================================================================== */

  const organizationBasePath =
    organizationId
      ? `/organizations/${encodeURIComponent(
          organizationId,
        )}`
      : "/organizations";

  const filteredMedia = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return media.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.description
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.speaker
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        item.tags?.some((tag) =>
          tag
            .toLowerCase()
            .includes(normalizedSearch),
        );

      const matchesType =
        filterType === "all" ||
        item.mediaType === filterType;

      const isPublished =
        true;

      const matchesPublished =
        filterPublished === "all" ||
        (filterPublished ===
          "published" &&
          isPublished) ||
        (filterPublished === "draft" &&
          !isPublished);

      return (
        matchesSearch &&
        matchesType &&
        matchesPublished
      );
    });
  }, [
    media,
    search,
    filterType,
    filterPublished,
  ]);

  const mediaTypeCounts = useMemo(() => {
    const counts = new Map<
      ChurchMediaType,
      number
    >();

    media.forEach((item) => {
      counts.set(
        item.mediaType,
        (counts.get(item.mediaType) ?? 0) +
          1,
      );
    });

    return counts;
  }, [media]);

  /* ==========================================================================
   * LOAD MEDIA
   * ======================================================================== */

  const loadMedia =
    useCallback(async (): Promise<void> => {
      if (!organizationId) {
        setMedia([]);
        setIsLoading(false);
        setError(
          "Organization ID is missing.",
        );
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result =
          await churchGet<MediaListResponse>(
            `/organizations/${organizationId}/media`,
            {
              page: 1,
              pageSize: 100,
            },
          );

        setMedia(result.items ?? []);
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to load organization media.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, [organizationId]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  /* ==========================================================================
   * FORM
   * ======================================================================== */

  function openCreateForm(
    type: ChurchMediaType = ChurchMediaType.Sermon,
  ): void {
    setEditingMedia(null);

    setForm({
      ...EMPTY_FORM,
      mediaType: type,
    });

    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function openEditForm(
    item: ChurchMedia,
  ): void {
    setEditingMedia(item);

    setForm(
      createFormFromMedia(item),
    );

    setError(null);
    setSuccess(null);
    setShowForm(true);
  }

  function closeForm(): void {
    if (isSaving) {
      return;
    }

    setShowForm(false);
    setEditingMedia(null);
    setForm(EMPTY_FORM);
  }

  function updateField<
    K extends keyof MediaFormState,
  >(
    field: K,
    value: MediaFormState[K],
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* ==========================================================================
   * SAVE
   * ======================================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!organizationId) {
      setError(
        "Organization ID is missing.",
      );
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Please enter a media title.",
      );
      return;
    }

    if (!form.fileUrl.trim()) {
      setError(
        "Please enter the media file URL.",
      );
      return;
    }

    if (
      form.durationSeconds.trim() &&
      (
        !Number.isFinite(
          Number(
            form.durationSeconds,
          ),
        ) ||
        Number(
          form.durationSeconds,
        ) < 0
      )
    ) {
      setError(
        "Duration must be a valid non-negative number.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const parsedDuration =
      form.durationSeconds.trim()
        ? Number(form.durationSeconds)
        : undefined;

    const payload = {
      mediaType: form.mediaType,

      title: form.title.trim(),

      description:
        form.description.trim() ||
        undefined,

      fileUrl:
        form.fileUrl.trim(),

      thumbnailUrl:
        form.thumbnailUrl.trim() ||
        undefined,

      durationSeconds:
        parsedDuration,

      speaker:
        form.speaker.trim() ||
        undefined,

      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),

      published:
        form.published,
    };

    try {
      if (editingMedia) {
        await churchPut<ChurchMedia>(
          `/organizations/${organizationId}/media/${editingMedia.id}`,
          payload,
        );

        setSuccess(
          "Organization media updated successfully.",
        );
      } else {
        await churchPost<ChurchMedia>(
          `/organizations/${organizationId}/media`,
          {
            organizationId,
            ...payload,
          },
        );

        setSuccess(
          "Organization media added successfully.",
        );
      }

      setShowForm(false);
      setEditingMedia(null);
      setForm(EMPTY_FORM);

      await loadMedia();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to save organization media.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* ==========================================================================
   * DELETE
   * ======================================================================== */

  async function handleDelete(
    item: ChurchMedia,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Delete "${item.title}"?\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    if (!organizationId) {
      setError(
        "Organization ID is missing.",
      );
      return;
    }

    setDeletingId(item.id);
    setError(null);
    setSuccess(null);

    try {
      await churchDelete(
        `/organizations/${organizationId}/media/${item.id}`,
      );

      setMedia((current) =>
        current.filter(
          (entry) =>
            entry.id !== item.id,
        ),
      );

      setSuccess(
        "Media deleted successfully.",
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete media.",
        ),
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <div className="church-page organization-admin-media-page">
      <ChurchHeader />

      <div className="church-container church-org-layout">
        <ChurchSidebar
          organizationId={organizationId}
        />

        <main className="church-org-content organization-admin-media-page__content">
          {/* ==================================================================
           * BREADCRUMB / BACK
           * ================================================================ */}

          <div className="organization-admin-media-page__breadcrumb">
            <button
              type="button"
              className="organization-admin-media-page__back"
              onClick={() =>
                navigate(
                  organizationBasePath,
                )
              }
            >
              ← Organization
            </button>

            <span aria-hidden="true">
              /
            </span>

            <span>
              Admin
            </span>

            <span aria-hidden="true">
              /
            </span>

            <strong>
              Media
            </strong>
          </div>

          {/* ==================================================================
           * PAGE HERO
           * ================================================================ */}

          <section className="organization-admin-media-page__hero">
            <div className="organization-admin-media-page__hero-copy">
              <span className="organization-admin-media-page__eyebrow">
                ORGANIZATION ADMIN
              </span>

              <h1>
                Media Management
              </h1>

              <p>
                Manage the videos, photos,
                documents, presentations,
                audio, and resources your
                organization shares with
                its members and community.
              </p>
            </div>

            <div className="organization-admin-media-page__hero-actions">
              <button
                type="button"
                className="church-button"
                onClick={() =>
                  navigate(
                    `${organizationBasePath}/media`,
                  )
                }
              >
                View Media
              </button>

              <button
                type="button"
                className="church-button church-button--primary"
                onClick={() =>
                  openCreateForm(
                    ChurchMediaType.Sermon,
                  )
                }
              >
                + Add Media
              </button>
            </div>
          </section>

          {/* ==================================================================
           * STATS
           * ================================================================ */}

          <section
            className="organization-admin-media-page__stats"
            aria-label="Media statistics"
          >
            <article className="organization-admin-media-stat">
              <span className="organization-admin-media-stat__icon">
                ◫
              </span>

              <div>
                <strong>
                  {media.length}
                </strong>

                <span>
                  Total media
                </span>
              </div>
            </article>

            <article className="organization-admin-media-stat">
              <span className="organization-admin-media-stat__icon">
                ▶
              </span>

              <div>
                <strong>
                  {mediaTypeCounts.get(
                    ChurchMediaType.Video,
                  ) ?? 0}
                </strong>

                <span>
                  Videos
                </span>
              </div>
            </article>

            <article className="organization-admin-media-stat">
              <span className="organization-admin-media-stat__icon">
                ▣
              </span>

              <div>
                <strong>
                  {mediaTypeCounts.get(
                    ChurchMediaType.Photo,
                  ) ?? 0}
                </strong>

                <span>
                  Photos
                </span>
              </div>
            </article>

            <article className="organization-admin-media-stat">
              <span className="organization-admin-media-stat__icon">
                ▤
              </span>

              <div>
                <strong>
                  {mediaTypeCounts.get(
                    ChurchMediaType.Document,
                  ) ?? 0}
                </strong>

                <span>
                  Documents
                </span>
              </div>
            </article>
          </section>

          {/* ==================================================================
           * ALERTS
           * ================================================================ */}

          {error && (
            <div
              className="organization-admin-media-page__alert organization-admin-media-page__alert--error"
              role="alert"
            >
              <span aria-hidden="true">
                !
              </span>

              <div>
                <strong>
                  Something went wrong
                </strong>

                <p>
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError(null)
                }
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {success && (
            <div
              className="organization-admin-media-page__alert organization-admin-media-page__alert--success"
              role="status"
            >
              <span aria-hidden="true">
                ✓
              </span>

              <div>
                <strong>
                  Success
                </strong>

                <p>
                  {success}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSuccess(null)
                }
                aria-label="Dismiss success message"
              >
                ×
              </button>
            </div>
          )}

          {/* ==================================================================
           * QUICK ADD
           * ================================================================ */}

          <section className="organization-admin-media-page__quick-add">
            <div className="organization-admin-media-page__section-heading">
              <div>
                <span className="organization-admin-media-page__section-kicker">
                  CREATE
                </span>

                <h2>
                  Quick Add
                </h2>

                <p>
                  Start with a media
                  category.
                </p>
              </div>
            </div>

            <div className="organization-admin-media-page__quick-grid">
              {Object.values(
                ChurchMediaType,
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  className="organization-admin-media-quick-card"
                  onClick={() =>
                    openCreateForm(type)
                  }
                >
                  <span className="organization-admin-media-quick-card__icon">
                    {getMediaInitial(type)}
                  </span>

                  <span>
                    {getMediaLabel(type)}
                  </span>

                  <small>
                    Add {getMediaLabel(
                      type,
                    ).toLowerCase()}
                  </small>
                </button>
              ))}
            </div>
          </section>

          {/* ==================================================================
           * FILTERS
           * ================================================================ */}

          <section className="organization-admin-media-page__library">
            <div className="organization-admin-media-page__library-heading">
              <div>
                <span className="organization-admin-media-page__section-kicker">
                  LIBRARY
                </span>

                <h2>
                  Organization Media
                </h2>

                <p>
                  Search and manage
                  published organization
                  resources.
                </p>
              </div>

              <span className="organization-admin-media-page__result-count">
                {filteredMedia.length}
                {" "}
                {filteredMedia.length ===
                1
                  ? "item"
                  : "items"}
              </span>
            </div>

            <div className="organization-admin-media-page__filters">
              <label className="organization-admin-media-page__search">
                <span className="organization-admin-media-page__sr-only">
                  Search media
                </span>

                <span
                  className="organization-admin-media-page__search-icon"
                  aria-hidden="true"
                >
                  ⌕
                </span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search media, presenters, descriptions, or tags..."
                />
              </label>

              <label>
                <span className="organization-admin-media-page__sr-only">
                  Filter by media type
                </span>

                <select
                  value={filterType}
                  onChange={(event) =>
                    setFilterType(
                      event.target
                        .value as
                        | "all"
                        | ChurchMediaType,
                    )
                  }
                >
                  <option value="all">
                    All media types
                  </option>

                  {Object.values(
                    ChurchMediaType,
                  ).map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {getMediaLabel(type)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="organization-admin-media-page__sr-only">
                  Filter by publishing status
                </span>

                <select
                  value={
                    filterPublished
                  }
                  onChange={(event) =>
                    setFilterPublished(
                      event.target
                        .value as
                        | "all"
                        | "published"
                        | "draft",
                    )
                  }
                >
                  <option value="all">
                    All statuses
                  </option>

                  <option value="published">
                    Published
                  </option>

                  <option value="draft">
                    Drafts
                  </option>
                </select>
              </label>

              {(search ||
                filterType !== "all" ||
                filterPublished !==
                  "all") && (
                <button
                  type="button"
                  className="organization-admin-media-page__clear-filters"
                  onClick={() => {
                    setSearch("");
                    setFilterType(
                      "all",
                    );
                    setFilterPublished(
                      "all",
                    );
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* ================================================================
             * LOADING
             * ============================================================ */}

            {isLoading ? (
              <div
                className="organization-admin-media-page__loading"
                role="status"
              >
                <div className="organization-admin-media-page__loading-spinner" />

                <strong>
                  Loading organization
                  media…
                </strong>

                <span>
                  Please wait while the
                  media library loads.
                </span>
              </div>
            ) : filteredMedia.length ===
              0 ? (
              /* ================================================================
               * EMPTY
               * ============================================================ */

              <div className="organization-admin-media-page__empty">
                <div className="organization-admin-media-page__empty-icon">
                  ◫
                </div>

                <h3>
                  {media.length === 0
                    ? "No media yet"
                    : "No matching media"}
                </h3>

                <p>
                  {media.length === 0
                    ? "Build your organization media library by adding your first video, photo, document, presentation, audio file, or resource."
                    : "Try a different search term or remove one of the filters."}
                </p>

                {media.length === 0 ? (
                  <button
                    type="button"
                    className="church-button church-button--primary"
                    onClick={() =>
                      openCreateForm(
                        ChurchMediaType.Sermon,
                      )
                    }
                  >
                    + Add Your First Media
                  </button>
                ) : (
                  <button
                    type="button"
                    className="church-button"
                    onClick={() => {
                      setSearch("");
                      setFilterType(
                        "all",
                      );
                      setFilterPublished(
                        "all",
                      );
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              /* ================================================================
               * MEDIA GRID
               * ============================================================ */

              <div className="organization-admin-media-grid">
                {filteredMedia.map(
                  (item) => {
                    const isDeleting =
                      deletingId ===
                      item.id;

                    const formattedDate =
                      formatDate(
                        item.publishedAt,
                      );

                    const duration =
                      formatDuration(
                        item.durationSeconds,
                      );

                    return (
                      <article
                        key={item.id}
                        className="organization-admin-media-card"
                      >
                        {/* ==================================================
                         * THUMBNAIL
                         * ================================================ */}

                        <div className="organization-admin-media-card__thumb">
                          {item.thumbnailUrl ? (
                            <img
                              src={
                                item.thumbnailUrl
                              }
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <div className="organization-admin-media-card__fallback">
                              <span>
                                {getMediaInitial(
                                  item.mediaType,
                                )}
                              </span>

                              <small>
                                {getMediaLabel(
                                  item.mediaType,
                                )}
                              </small>
                            </div>
                          )}

                          <span className="organization-admin-media-card__type">
                            {getMediaLabel(
                              item.mediaType,
                            )}
                          </span>

                          <span className="organization-admin-media-card__published">
                            <span
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                            Published
                          </span>
                        </div>

                        {/* ==================================================
                         * BODY
                         * ================================================ */}

                        <div className="organization-admin-media-card__body">
                          <h3>
                            {item.title}
                          </h3>

                          {item.description && (
                            <p className="organization-admin-media-card__description">
                              {
                                item.description
                              }
                            </p>
                          )}

                          <div className="organization-admin-media-card__meta">
                            {item.speaker && (
                              <span>
                                <strong>
                                  Presenter:
                                </strong>
                                {" "}
                                {
                                  item.speaker
                                }
                              </span>
                            )}

                            {duration && (
                              <span>
                                <strong>
                                  Duration:
                                </strong>
                                {" "}
                                {duration}
                              </span>
                            )}

                            {formattedDate && (
                              <span>
                                <strong>
                                  Published:
                                </strong>
                                {" "}
                                {
                                  formattedDate
                                }
                              </span>
                            )}
                          </div>

                          {item.tags &&
                            item.tags
                              .length >
                              0 && (
                              <div className="organization-admin-media-card__tags">
                                {item.tags
                                  .slice(
                                    0,
                                    4,
                                  )
                                  .map(
                                    (
                                      tag,
                                    ) => (
                                      <span
                                        key={
                                          tag
                                        }
                                      >
                                        #
                                        {
                                          tag
                                        }
                                      </span>
                                    ),
                                  )}
                              </div>
                            )}

                          {/* =================================================
                           * ACTIONS
                           * =============================================== */}

                          <div className="organization-admin-media-card__actions">
                            <a
                              className="church-button organization-admin-media-card__view"
                              href={
                                item.fileUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              View
                            </a>

                            <button
                              type="button"
                              className="church-button"
                              onClick={() =>
                                openEditForm(
                                  item,
                                )
                              }
                              disabled={
                                isDeleting
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="church-button church-button--danger"
                              onClick={() =>
                                void handleDelete(
                                  item,
                                )
                              }
                              disabled={
                                isDeleting
                              }
                            >
                              {isDeleting
                                ? "Deleting…"
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>

          {/* ==================================================================
           * FORM MODAL
           * ================================================================ */}

          {showForm && (
            <div
              className="organization-admin-media-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="organization-media-form-title"
            >
              <div
                className="organization-admin-media-modal__backdrop"
                onClick={closeForm}
                aria-hidden="true"
              />

              <div className="organization-admin-media-modal__panel">
                <div className="organization-admin-media-modal__header">
                  <div>
                    <span className="organization-admin-media-page__section-kicker">
                      {editingMedia
                        ? "EDIT MEDIA"
                        : "ADD MEDIA"}
                    </span>

                    <h2 id="organization-media-form-title">
                      {editingMedia
                        ? "Edit Organization Media"
                        : "Add Organization Media"}
                    </h2>

                    <p>
                      Add content that
                      members and your
                      organization
                      community can access.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="organization-admin-media-modal__close"
                    onClick={closeForm}
                    disabled={
                      isSaving
                    }
                    aria-label="Close media form"
                  >
                    ×
                  </button>
                </div>

                <form
                  className="organization-admin-media-form"
                  onSubmit={
                    handleSubmit
                  }
                >
                  {/* ========================================================
                   * BASIC INFORMATION
                   * ====================================================== */}

                  <div className="organization-admin-media-form__section">
                    <div className="organization-admin-media-form__section-title">
                      <span>
                        01
                      </span>

                      <div>
                        <h3>
                          Basic information
                        </h3>

                        <p>
                          Tell your
                          organization
                          what this
                          media is.
                        </p>
                      </div>
                    </div>

                    <div className="organization-admin-media-form__grid">
                      <label>
                        <span>
                          Media Type
                        </span>

                        <select
                          value={
                            form.mediaType
                          }
                          onChange={(
                            event,
                          ) =>
                            updateField(
                              "mediaType",
                              event
                                .target
                                .value as ChurchMediaType,
                            )
                          }
                        >
                          {Object.values(
                            ChurchMediaType,
                          ).map(
                            (
                              type,
                            ) => (
                              <option
                                key={
                                  type
                                }
                                value={
                                  type
                                }
                              >
                                {getMediaLabel(
                                  type,
                                )}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label>
                        <span>
                          Title *
                        </span>

                        <input
                          type="text"
                          value={
                            form.title
                          }
                          onChange={(
                            event,
                          ) =>
                            updateField(
                              "title",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Enter a clear media title"
                          required
                        />
                      </label>
                    </div>

                    <label>
                      <span>
                        Description
                      </span>

                      <textarea
                        value={
                          form.description
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "description",
                            event
                              .target
                              .value,
                          )
                        }
                        rows={4}
                        placeholder="Describe this media and why it is useful to your organization..."
                      />
                    </label>
                  </div>

                  {/* ========================================================
                   * MEDIA LOCATION
                   * ====================================================== */}

                  <div className="organization-admin-media-form__section">
                    <div className="organization-admin-media-form__section-title">
                      <span>
                        02
                      </span>

                      <div>
                        <h3>
                          Media files
                        </h3>

                        <p>
                          Connect the
                          media and
                          optional
                          thumbnail.
                        </p>
                      </div>
                    </div>

                    <label>
                      <span>
                        File / Media URL *
                      </span>

                      <input
                        type="url"
                        value={
                          form.fileUrl
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "fileUrl",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="https://..."
                        required
                      />

                      <small>
                        Use the URL of the
                        video, audio,
                        image, PDF, or
                        other organization
                        resource.
                      </small>
                    </label>

                    <label>
                      <span>
                        Thumbnail URL
                      </span>

                      <input
                        type="url"
                        value={
                          form.thumbnailUrl
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "thumbnailUrl",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="https://..."
                      />

                      <small>
                        Optional image shown
                        as the media preview.
                      </small>
                    </label>
                  </div>

                  {/* ========================================================
                   * DETAILS
                   * ====================================================== */}

                  <div className="organization-admin-media-form__section">
                    <div className="organization-admin-media-form__section-title">
                      <span>
                        03
                      </span>

                      <div>
                        <h3>
                          Additional details
                        </h3>

                        <p>
                          Add information
                          that helps
                          members discover
                          your media.
                        </p>
                      </div>
                    </div>

                    <div className="organization-admin-media-form__grid">
                      <label>
                        <span>
                          Presenter / Speaker
                        </span>

                        <input
                          type="text"
                          value={
                            form.speaker
                          }
                          onChange={(
                            event,
                          ) =>
                            updateField(
                              "speaker",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="Presenter, speaker, creator, or host"
                        />
                      </label>

                      <label>
                        <span>
                          Duration (seconds)
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            form.durationSeconds
                          }
                          onChange={(
                            event,
                          ) =>
                            updateField(
                              "durationSeconds",
                              event
                                .target
                                .value,
                            )
                          }
                          placeholder="3600"
                        />
                      </label>
                    </div>

                    <label>
                      <span>
                        Tags
                      </span>

                      <input
                        type="text"
                        value={
                          form.tags
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "tags",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="training, event, presentation, community"
                      />

                      <small>
                        Separate tags with
                        commas.
                      </small>
                    </label>
                  </div>

                  {/* ========================================================
                   * PUBLISHING
                   * ====================================================== */}

                  <div className="organization-admin-media-form__publish">
                    <label className="organization-admin-media-form__checkbox">
                      <input
                        type="checkbox"
                        checked={
                          form.published
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "published",
                            event
                              .target
                              .checked,
                          )
                        }
                      />

                      <span className="organization-admin-media-form__checkbox-box">
                        ✓
                      </span>

                      <span>
                        <strong>
                          Publish immediately
                        </strong>

                        <small>
                          Make this media
                          available to
                          your
                          organization
                          after saving.
                        </small>
                      </span>
                    </label>
                  </div>

                  {/* ========================================================
                   * ACTIONS
                   * ====================================================== */}

                  <div className="organization-admin-media-form__actions">
                    <button
                      type="button"
                      className="church-button"
                      onClick={
                        closeForm
                      }
                      disabled={
                        isSaving
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="church-button church-button--primary"
                      disabled={
                        isSaving
                      }
                    >
                      {isSaving
                        ? "Saving…"
                        : editingMedia
                          ? "Save Changes"
                          : "Add Media"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}