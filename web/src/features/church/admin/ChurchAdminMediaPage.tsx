/**
 * OrganizationAdminMediaPage.tsx
 * -----------------------------------------------------------------------------
 * FOCKIS ORGANIZATION ADMIN — MEDIA MANAGEMENT
 *
 * Organization-wide media administration.
 *
 * Supports:
 *   - Videos
 *   - Sermons / presentations
 *   - Photos
 *   - Documents
 *   - Resources
 *   - Media editing
 *   - Media deletion
 *   - Publishing / unpublishing state
 *
 * Compatibility:
 *   The existing ChurchMedia API/types are intentionally retained until the
 *   backend media domain is fully generalized.
 *
 * Route:
 *   /organizations/:organizationId/admin/media
 * -----------------------------------------------------------------------------
 */

import React, {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useParams } from "react-router-dom";

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

import "../styles/ChurchOrganizationPage.scss";

/* ============================================================================
 * LOCAL TYPES
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
  return error instanceof Error &&
    error.message.trim()
    ? error.message
    : fallback;
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

  /* ==========================================================================
   * LOAD MEDIA
   * ======================================================================== */

  async function loadMedia(): Promise<void> {
    if (!organizationId) {
      setMedia([]);
      setIsLoading(false);
      setError("Organization ID is missing.");
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
  }

  useEffect(() => {
    void loadMedia();
  }, [organizationId]);

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
      setError("Organization ID is missing.");
      return;
    }

    if (!form.title.trim()) {
      setError("Please enter a media title.");
      return;
    }

    if (!form.fileUrl.trim()) {
      setError("Please enter the media file URL.");
      return;
    }

    if (
      form.durationSeconds.trim() &&
      (
        !Number.isFinite(
          Number(form.durationSeconds),
        ) ||
        Number(form.durationSeconds) < 0
      )
    ) {
      setError(
        "Duration must be a valid positive number.",
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
          "Media updated successfully.",
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
          "Media added successfully.",
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
          "Unable to save media.",
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
        `Delete "${item.title}"? This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    if (!organizationId) {
      setError("Organization ID is missing.");
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
          (entry) => entry.id !== item.id,
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

        <main className="church-org-content">

          {/* ==================================================================
           * PAGE HEADER
           * ================================================================ */}

          <div
            className="church-section__heading"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1>
                Media Management
              </h1>

              <p>
                Manage videos, photos, documents,
                presentations, resources, and other
                organization media.
              </p>
            </div>

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

          {/* ==================================================================
           * ALERTS
           * ================================================================ */}

          {error && (
            <div
              className="church-alert church-alert--error"
              role="alert"
              style={{
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="church-alert church-alert--success"
              role="status"
              style={{
                marginBottom: "1rem",
              }}
            >
              {success}
            </div>
          )}

          {/* ==================================================================
           * QUICK ADD
           * ================================================================ */}

          <section
            style={{
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                marginBottom: "0.75rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                }}
              >
                Quick Add
              </h2>

              <p
                style={{
                  margin:
                    "0.35rem 0 0",
                  color: "#66788a",
                }}
              >
                Create media using a specific
                media category.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              {Object.values(
                ChurchMediaType,
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  className="church-button"
                  onClick={() =>
                    openCreateForm(type)
                  }
                >
                  + {getMediaLabel(type)}
                </button>
              ))}
            </div>
          </section>

          {/* ==================================================================
           * LOADING
           * ================================================================ */}

          {isLoading ? (
            <div
              className="church-empty-state"
              role="status"
            >
              Loading organization media…
            </div>
          ) : media.length === 0 ? (
            /* ================================================================
             * EMPTY STATE
             * ============================================================ */

            <div className="church-empty-state">
              <h2>
                No media yet
              </h2>

              <p>
                Add your first video, photo,
                document, presentation, or
                organization resource.
              </p>

              <button
                type="button"
                className="church-button church-button--primary"
                onClick={() =>
                  openCreateForm(
                    ChurchMediaType.Sermon,
                  )
                }
              >
                Add Your First Media
              </button>
            </div>
          ) : (
            /* ================================================================
             * MEDIA GRID
             * ============================================================ */

            <div className="church-media-grid">
              {media.map((item) => {
                const isDeleting =
                  deletingId === item.id;

                return (
                  <article
                    key={item.id}
                    className="church-media-card"
                    style={{
                      overflow: "hidden",
                    }}
                  >
                    {/* ======================================================
                     * THUMBNAIL
                     * ==================================================== */}

                    <div className="church-media-card__thumb">
                      {item.thumbnailUrl ? (
                        <img
                          src={
                            item.thumbnailUrl
                          }
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                        >
                          {getMediaInitial(
                            item.mediaType,
                          )}
                        </span>
                      )}
                    </div>

                    {/* ======================================================
                     * BODY
                     * ==================================================== */}

                    <div className="church-media-card__body">

                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          gap: "0.5rem",
                          alignItems:
                            "center",
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <span>
                          {getMediaLabel(
                            item.mediaType,
                          )}
                        </span>

                        <span>
                          Published
                        </span>
                      </div>

                      <h3>
                        {item.title}
                      </h3>

                      {item.description && (
                        <p>
                          {item.description}
                        </p>
                      )}

                      {item.speaker && (
                        <p className="church-media-card__speaker">
                          {item.speaker}
                        </p>
                      )}

                      {item.publishedAt && (
                        <p className="church-media-card__date">
                          {new Date(
                            item.publishedAt,
                          ).toLocaleDateString()}
                        </p>
                      )}

                      {/* ====================================================
                       * ACTIONS
                       * ================================================== */}

                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          marginTop:
                            "0.75rem",
                          flexWrap:
                            "wrap",
                        }}
                      >
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

                        <a
                          className="church-button"
                          href={
                            item.fileUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ==================================================================
           * CREATE / EDIT MODAL
           * ================================================================ */}

          {showForm && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="organization-media-form-title"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                background:
                  "rgba(0, 0, 0, 0.55)",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding: "1rem",
                overflowY:
                  "auto",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth:
                    "720px",
                  background:
                    "white",
                  borderRadius:
                    "12px",
                  padding:
                    "1.5rem",
                  maxHeight:
                    "90vh",
                  overflowY:
                    "auto",
                }}
              >

                {/* ========================================================
                 * MODAL HEADER
                 * ====================================================== */}

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: "1rem",
                    marginBottom:
                      "1.25rem",
                  }}
                >
                  <div>
                    <h2
                      id="organization-media-form-title"
                      style={{
                        margin:
                          "0 0 0.35rem",
                      }}
                    >
                      {editingMedia
                        ? "Edit Media"
                        : "Add Organization Media"}
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color:
                          "#66788a",
                      }}
                    >
                      Add a video, photo,
                      document,
                      presentation,
                      resource,
                      or other
                      organization
                      media.
                    </p>
                  </div>

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
                    Close
                  </button>
                </div>

                {/* ========================================================
                 * FORM
                 * ====================================================== */}

                <form
                  onSubmit={
                    handleSubmit
                  }
                >

                  {/* ======================================================
                   * MEDIA TYPE / TITLE
                   * ==================================================== */}

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "1rem",
                    }}
                  >
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
                            event.target
                              .value as ChurchMediaType,
                          )
                        }
                        style={{
                          width:
                            "100%",
                          padding:
                            "0.7rem",
                          marginTop:
                            "0.35rem",
                        }}
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
                            event.target
                              .value,
                          )
                        }
                        placeholder={
                          form.mediaType ===
                          ChurchMediaType.Sermon
                            ? "Organization presentation or message"
                            : "Media title"
                        }
                        required
                        style={{
                          width:
                            "100%",
                          padding:
                            "0.7rem",
                          marginTop:
                            "0.35rem",
                        }}
                      />
                    </label>
                  </div>

                  {/* ======================================================
                   * DESCRIPTION
                   * ==================================================== */}

                  <label
                    style={{
                      display:
                        "block",
                      marginTop:
                        "1rem",
                    }}
                  >
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
                          event.target
                            .value,
                        )
                      }
                      rows={4}
                      placeholder="Describe this media..."
                      style={{
                        width:
                          "100%",
                        padding:
                          "0.7rem",
                        marginTop:
                          "0.35rem",
                        resize:
                          "vertical",
                      }}
                    />
                  </label>

                  {/* ======================================================
                   * FILE URL
                   * ==================================================== */}

                  <label
                    style={{
                      display:
                        "block",
                      marginTop:
                        "1rem",
                    }}
                  >
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
                          event.target
                            .value,
                        )
                      }
                      placeholder="https://..."
                      required
                      style={{
                        width:
                          "100%",
                        padding:
                          "0.7rem",
                        marginTop:
                          "0.35rem",
                      }}
                    />

                    <small>
                      Enter the URL of
                      the uploaded
                      video, audio,
                      image, PDF, or
                      other resource.
                    </small>
                  </label>

                  {/* ======================================================
                   * THUMBNAIL
                   * ==================================================== */}

                  <label
                    style={{
                      display:
                        "block",
                      marginTop:
                        "1rem",
                    }}
                  >
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
                          event.target
                            .value,
                        )
                      }
                      placeholder="https://..."
                      style={{
                        width:
                          "100%",
                        padding:
                          "0.7rem",
                        marginTop:
                          "0.35rem",
                      }}
                    />
                  </label>

                  {/* ======================================================
                   * SPEAKER / DURATION
                   * ==================================================== */}

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "1rem",
                      marginTop:
                        "1rem",
                    }}
                  >
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
                            event.target
                              .value,
                          )
                        }
                        placeholder="Presenter name"
                        style={{
                          width:
                            "100%",
                          padding:
                            "0.7rem",
                          marginTop:
                            "0.35rem",
                        }}
                      />
                    </label>

                    <label>
                      <span>
                        Duration (seconds)
                      </span>

                      <input
                        type="number"
                        min="0"
                        value={
                          form.durationSeconds
                        }
                        onChange={(
                          event,
                        ) =>
                          updateField(
                            "durationSeconds",
                            event.target
                              .value,
                          )
                        }
                        placeholder="3600"
                        style={{
                          width:
                            "100%",
                          padding:
                            "0.7rem",
                          marginTop:
                            "0.35rem",
                        }}
                      />
                    </label>
                  </div>

                  {/* ======================================================
                   * TAGS
                   * ==================================================== */}

                  <label
                    style={{
                      display:
                        "block",
                      marginTop:
                        "1rem",
                    }}
                  >
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
                          event.target
                            .value,
                        )
                      }
                      placeholder="training, event, presentation, community"
                      style={{
                        width:
                          "100%",
                        padding:
                          "0.7rem",
                        marginTop:
                          "0.35rem",
                      }}
                    />

                    <small>
                      Separate tags
                      with commas.
                    </small>
                  </label>

                  {/* ======================================================
                   * PUBLISH
                   * ==================================================== */}

                  <label
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: "0.5rem",
                      marginTop:
                        "1rem",
                      cursor:
                        "pointer",
                    }}
                  >
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
                          event.target
                            .checked,
                        )
                      }
                    />

                    <span>
                      Publish immediately
                    </span>
                  </label>

                  {/* ======================================================
                   * FORM ACTIONS
                   * ==================================================== */}

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "flex-end",
                      gap: "0.75rem",
                      marginTop:
                        "1.5rem",
                      flexWrap:
                        "wrap",
                    }}
                  >
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