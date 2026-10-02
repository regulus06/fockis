import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import type {
  AccessType,
  ContentType,
  CreatePlaylistPayload,
  Playlist,
  ProducerCategory,
  Visibility,
} from "../types/playlist.types";

import { playlistsApi } from "../services/playlistsApi";

/* =========================================================
   Types
========================================================= */

export interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (playlist: Playlist) => void;
  editingPlaylist?: Playlist;
}

/* =========================================================
   Icon
========================================================= */

interface IconProps {
  width?: number;
  height?: number;
}

function XIcon({
  width = 16,
  height = 16,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/* =========================================================
   Options
========================================================= */

const CONTENT_TYPES: {
  value: ContentType;
  label: string;
}[] = [
  {
    value: "music",
    label: "Music",
  },
  {
    value: "video",
    label: "Video",
  },
  {
    value: "mixed",
    label: "Mixed Media",
  },
  {
    value: "podcast",
    label: "Podcast",
  },
  {
    value: "beats",
    label: "Beats",
  },
  {
    value: "dj-mix",
    label: "DJ Mix",
  },
  {
    value: "album",
    label: "Album",
  },
  {
    value: "collection",
    label: "Collection",
  },
];

const CATEGORIES: {
  value: ProducerCategory;
  label: string;
}[] = [
  {
    value: "music-producer",
    label: "Music Producer",
  },
  {
    value: "recording-artist",
    label: "Recording Artist",
  },
  {
    value: "dj",
    label: "DJ",
  },
  {
    value: "video-producer",
    label: "Video Producer",
  },
  {
    value: "filmmaker",
    label: "Filmmaker",
  },
  {
    value: "beat-producer",
    label: "Beat Producer",
  },
  {
    value: "podcast-creator",
    label: "Podcast Creator",
  },
];

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  hint: string;
}[] = [
  {
    value: "public",
    label: "Public",
    hint: "Listed in search and browse.",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    hint: "Only reachable by direct link.",
  },
  {
    value: "private",
    label: "Private",
    hint: "Visible only to you.",
  },
];

/* =========================================================
   Default form
========================================================= */

function emptyForm(): CreatePlaylistPayload {
  return {
    title: "",
    description: "",
    category: "music-producer",
    contentType: "music",
    genre: "",
    visibility: "public",
    access: "free",
    price: undefined,
    releaseDate: "",
    tags: [],
    isFeatured: false,
    allowComments: true,
    allowSharing: true,
  };
}

/* =========================================================
   Component
========================================================= */

export function CreatePlaylistModal({
  open,
  onClose,
  onCreated,
  editingPlaylist,
}: CreatePlaylistModalProps) {
  const titleId = useId();

  const [form, setForm] =
    useState<CreatePlaylistPayload>(
      emptyForm(),
    );

  const [baseAccess, setBaseAccess] =
    useState<"free" | "paid">("free");

  const [isPremium, setIsPremium] =
    useState(false);

  const [isExclusive, setIsExclusive] =
    useState(false);

  const [coverPreview, setCoverPreview] =
    useState<string | undefined>(
      undefined,
    );

  const [tagDraft, setTagDraft] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [touched, setTouched] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /* -------------------------------------------------------
     Load / reset form
  ------------------------------------------------------- */

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editingPlaylist) {
      setForm({
        title: editingPlaylist.title,
        description:
          editingPlaylist.description,
        coverImageUrl:
          editingPlaylist.coverImageUrl,
        category:
          editingPlaylist.creator.category,
        contentType:
          editingPlaylist.contentType,
        genre:
          editingPlaylist.genre ?? "",
        visibility:
          editingPlaylist.visibility,
        access:
          editingPlaylist.access,
        price:
          editingPlaylist.price,
        releaseDate:
          editingPlaylist.releaseDate?.slice(
            0,
            10,
          ) ?? "",
        tags: editingPlaylist.tags,
        isFeatured:
          editingPlaylist.isFeatured,
        allowComments:
          editingPlaylist.allowComments,
        allowSharing:
          editingPlaylist.allowSharing,
      });

      setBaseAccess(
        editingPlaylist.access === "paid"
          ? "paid"
          : "free",
      );

      setIsPremium(
        editingPlaylist.access === "premium",
      );

      setIsExclusive(
        editingPlaylist.access ===
          "exclusive",
      );

      setCoverPreview(
        editingPlaylist.coverImageUrl,
      );
    } else {
      setForm(emptyForm());
      setBaseAccess("free");
      setIsPremium(false);
      setIsExclusive(false);
      setCoverPreview(undefined);
    }

    setError(null);
    setTouched(false);
    setTagDraft("");
  }, [
    open,
    editingPlaylist,
  ]);

  /* -------------------------------------------------------
     Do not render when closed
  ------------------------------------------------------- */

  if (!open) {
    return null;
  }

  /* -------------------------------------------------------
     Access
  ------------------------------------------------------- */

  const effectiveAccess: AccessType =
    isExclusive
      ? "exclusive"
      : isPremium
        ? "premium"
        : baseAccess;

  const showPrice =
    effectiveAccess !== "free";

  /* -------------------------------------------------------
     Cover
  ------------------------------------------------------- */

  const handleCoverChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setForm((current) => ({
      ...current,
      coverImageFile: file,
    }));

    setCoverPreview(
      URL.createObjectURL(file),
    );
  };

  /* -------------------------------------------------------
     Tags
  ------------------------------------------------------- */

  const addTag = () => {
    const value =
      tagDraft.trim();

    if (
      !value ||
      form.tags.includes(value)
    ) {
      return;
    }

    setForm((current) => ({
      ...current,
      tags: [
        ...current.tags,
        value,
      ],
    }));

    setTagDraft("");
  };

  const removeTag = (
    tag: string,
  ) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.filter(
        (item) => item !== tag,
      ),
    }));
  };

  /* -------------------------------------------------------
     Validation
  ------------------------------------------------------- */

  const isValid =
    form.title.trim().length > 0 &&
    form.description.trim().length > 0 &&
    (!showPrice ||
      (form.price ?? 0) > 0);

  /* -------------------------------------------------------
     Submit
  ------------------------------------------------------- */

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    setTouched(true);

    if (!isValid) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: CreatePlaylistPayload =
        {
          ...form,
          access: effectiveAccess,
        };

      const result = editingPlaylist
        ? await playlistsApi.updatePlaylist(
            editingPlaylist.id,
            payload,
          )
        : await playlistsApi.createPlaylist(
            payload,
          );

      onCreated(result);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save this playlist. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     Render
  ======================================================= */

  return (
    <div
      className="fk-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="fk-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <form onSubmit={handleSubmit}>
          {/* =================================================
              HEADER
          ================================================== */}

          <div className="fk-modal__header">
            <h2
              id={titleId}
              className="fk-heading-md"
            >
              {editingPlaylist
                ? "Edit Playlist"
                : "Publish New Playlist"}
            </h2>

            <button
              type="button"
              className="fk-icon-btn"
              aria-label="Close"
              onClick={onClose}
            >
              <XIcon />
            </button>
          </div>

          {/* =================================================
              BODY
          ================================================== */}

          <div className="fk-modal__body">
            {error && (
              <div
                className="fk-field__error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Cover */}

            <div className="fk-field">
              <label
                className="fk-field__label"
                htmlFor="pl-cover"
              >
                Cover image
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 8,
                    background:
                      coverPreview
                        ? `center/cover no-repeat url(${coverPreview})`
                        : "var(--fk-line)",
                    flexShrink: 0,
                    border:
                      "1px solid var(--fk-line-strong)",
                  }}
                  aria-hidden="true"
                />

                <div>
                  <input
                    id="pl-cover"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="fk-visually-hidden"
                    onChange={
                      handleCoverChange
                    }
                  />

                  <button
                    type="button"
                    className="fk-btn fk-btn--outline fk-btn--sm"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    Upload cover
                  </button>

                  <p
                    className="fk-field__hint"
                    style={{
                      marginTop: 8,
                    }}
                  >
                    Square image
                    recommended,
                    at least
                    1000×1000px.
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}

            <div className="fk-field">
              <label
                className="fk-field__label"
                htmlFor="pl-title"
              >
                Playlist title
              </label>

              <input
                id="pl-title"
                className="fk-input"
                value={form.title}
                data-touched={
                  touched
                }
                required
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      title:
                        event.target
                          .value,
                    }),
                  )
                }
                placeholder="e.g. Fockis Summer Sessions"
              />

              {touched &&
                !form.title.trim() && (
                  <span className="fk-field__error">
                    Title is required.
                  </span>
                )}
            </div>

            {/* Description */}

            <div className="fk-field">
              <label
                className="fk-field__label"
                htmlFor="pl-desc"
              >
                Description
              </label>

              <textarea
                id="pl-desc"
                className="fk-textarea"
                value={
                  form.description
                }
                data-touched={
                  touched
                }
                required
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      description:
                        event.target
                          .value,
                    }),
                  )
                }
                placeholder="Tell listeners what this collection is about."
              />

              {touched &&
                !form.description.trim() && (
                  <span className="fk-field__error">
                    Description is required.
                  </span>
                )}
            </div>

            {/* Category / content */}

            <div className="fk-field-row">
              <div className="fk-field">
                <label
                  className="fk-field__label"
                  htmlFor="pl-category"
                >
                  Producer category
                </label>

                <select
                  id="pl-category"
                  className="fk-select"
                  value={form.category}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        category:
                          event.target
                            .value as ProducerCategory,
                      }),
                    )
                  }
                >
                  {CATEGORIES.map(
                    (category) => (
                      <option
                        key={
                          category.value
                        }
                        value={
                          category.value
                        }
                      >
                        {
                          category.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="fk-field">
                <label
                  className="fk-field__label"
                  htmlFor="pl-type"
                >
                  Content type
                </label>

                <select
                  id="pl-type"
                  className="fk-select"
                  value={
                    form.contentType
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        contentType:
                          event.target
                            .value as ContentType,
                      }),
                    )
                  }
                >
                  {CONTENT_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={
                          type.value
                        }
                      >
                        {type.label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* Genre / release */}

            <div className="fk-field-row">
              <div className="fk-field">
                <label
                  className="fk-field__label"
                  htmlFor="pl-genre"
                >
                  Genre
                </label>

                <input
                  id="pl-genre"
                  className="fk-input"
                  value={form.genre}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        genre:
                          event.target
                            .value,
                      }),
                    )
                  }
                  placeholder="e.g. Hip-Hop, House, Lo-fi"
                />
              </div>

              <div className="fk-field">
                <label
                  className="fk-field__label"
                  htmlFor="pl-release"
                >
                  Release date
                </label>

                <input
                  id="pl-release"
                  type="date"
                  className="fk-input"
                  value={
                    form.releaseDate
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        releaseDate:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            {/* Visibility */}

            <div className="fk-field">
              <span className="fk-field__label">
                Visibility
              </span>

              <div className="fk-radio-group">
                {VISIBILITY_OPTIONS.map(
                  (option) => (
                    <label
                      key={
                        option.value
                      }
                      className="fk-radio-option"
                      data-checked={
                        form.visibility ===
                        option.value
                      }
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={
                          option.value
                        }
                        checked={
                          form.visibility ===
                          option.value
                        }
                        onChange={() =>
                          setForm(
                            (current) => ({
                              ...current,
                              visibility:
                                option.value,
                            }),
                          )
                        }
                      />

                      <span>
                        <strong
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {
                            option.label
                          }
                        </strong>

                        <span className="fk-field__hint">
                          {
                            option.hint
                          }
                        </span>
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>

            {/* Access */}

            <div className="fk-field">
              <span className="fk-field__label">
                Access
              </span>

              <div className="fk-radio-group">
                <label
                  className="fk-radio-option"
                  data-checked={
                    baseAccess ===
                    "free"
                  }
                >
                  <input
                    type="radio"
                    name="access"
                    checked={
                      baseAccess ===
                      "free"
                    }
                    onChange={() =>
                      setBaseAccess(
                        "free",
                      )
                    }
                  />

                  <span>Free</span>
                </label>

                <label
                  className="fk-radio-option"
                  data-checked={
                    baseAccess ===
                    "paid"
                  }
                >
                  <input
                    type="radio"
                    name="access"
                    checked={
                      baseAccess ===
                      "paid"
                    }
                    onChange={() =>
                      setBaseAccess(
                        "paid",
                      )
                    }
                  />

                  <span>Paid</span>
                </label>
              </div>

              {showPrice && (
                <div
                  style={{
                    marginTop: 8,
                  }}
                >
                  <label
                    className="fk-field__label"
                    htmlFor="pl-price"
                  >
                    Price (USD)
                  </label>

                  <input
                    id="pl-price"
                    type="number"
                    min={0.99}
                    step={0.5}
                    className="fk-input"
                    style={{
                      maxWidth: 160,
                    }}
                    value={
                      form.price ?? ""
                    }
                    data-touched={
                      touched
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          price:
                            event.target
                              .value ===
                            ""
                              ? undefined
                              : Number(
                                  event
                                    .target
                                    .value,
                                ),
                        }),
                      )
                    }
                    placeholder="4.99"
                  />

                  {touched &&
                    !(
                      form.price &&
                      form.price > 0
                    ) && (
                      <div className="fk-field__error">
                        Set a price greater
                        than $0.
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Premium */}

            <div className="fk-toggle-row">
              <div>
                <strong
                  style={{
                    display:
                      "block",
                    fontSize:
                      "0.875rem",
                  }}
                >
                  Premium content
                </strong>

                <span className="fk-field__hint">
                  Make this playlist
                  part of your premium
                  tier.
                </span>
              </div>

              <button
                type="button"
                className="fk-switch"
                role="switch"
                aria-checked={
                  isPremium
                }
                aria-label="Make this premium"
                onClick={() =>
                  setIsPremium(
                    (value) =>
                      !value,
                  )
                }
              />
            </div>

            {/* Exclusive */}

            <div className="fk-toggle-row">
              <div>
                <strong
                  style={{
                    display:
                      "block",
                    fontSize:
                      "0.875rem",
                  }}
                >
                  Exclusive content
                </strong>

                <span className="fk-field__hint">
                  Limit access to a
                  hand-picked
                  audience.
                </span>
              </div>

              <button
                type="button"
                className="fk-switch"
                role="switch"
                aria-checked={
                  isExclusive
                }
                aria-label="Make this exclusive"
                onClick={() =>
                  setIsExclusive(
                    (value) =>
                      !value,
                  )
                }
              />
            </div>

            {/* Tags */}

            <div className="fk-field">
              <label
                className="fk-field__label"
                htmlFor="pl-tags"
              >
                Tags
              </label>

              <div className="fk-tag-input">
                {form.tags.map(
                  (tag) => (
                    <span
                      key={tag}
                      className="fk-tag-chip"
                    >
                      {tag}

                      <button
                        type="button"
                        aria-label={`Remove tag ${tag}`}
                        onClick={() =>
                          removeTag(
                            tag,
                          )
                        }
                      >
                        <XIcon
                          width={12}
                          height={12}
                        />
                      </button>
                    </span>
                  ),
                )}

                <input
                  id="pl-tags"
                  value={tagDraft}
                  onChange={(event) =>
                    setTagDraft(
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" ||
                      event.key === ","
                    ) {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                />
              </div>
            </div>

            {/* Featured */}

            <div className="fk-toggle-row">
              <div>
                <strong
                  style={{
                    display:
                      "block",
                    fontSize:
                      "0.875rem",
                  }}
                >
                  Featured playlist
                </strong>

                <span className="fk-field__hint">
                  Request placement in
                  featured sections.
                </span>
              </div>

              <button
                type="button"
                className="fk-switch"
                role="switch"
                aria-checked={
                  form.isFeatured
                }
                aria-label="Featured playlist"
                onClick={() =>
                  setForm(
                    (current) => ({
                      ...current,
                      isFeatured:
                        !current.isFeatured,
                    }),
                  )
                }
              />
            </div>

            {/* Comments */}

            <div className="fk-toggle-row">
              <div>
                <strong
                  style={{
                    display:
                      "block",
                    fontSize:
                      "0.875rem",
                  }}
                >
                  Allow comments
                </strong>
              </div>

              <button
                type="button"
                className="fk-switch"
                role="switch"
                aria-checked={
                  form.allowComments
                }
                aria-label="Allow comments"
                onClick={() =>
                  setForm(
                    (current) => ({
                      ...current,
                      allowComments:
                        !current.allowComments,
                    }),
                  )
                }
              />
            </div>

            {/* Sharing */}

            <div className="fk-toggle-row">
              <div>
                <strong
                  style={{
                    display:
                      "block",
                    fontSize:
                      "0.875rem",
                  }}
                >
                  Allow sharing
                </strong>
              </div>

              <button
                type="button"
                className="fk-switch"
                role="switch"
                aria-checked={
                  form.allowSharing
                }
                aria-label="Allow sharing"
                onClick={() =>
                  setForm(
                    (current) => ({
                      ...current,
                      allowSharing:
                        !current.allowSharing,
                    }),
                  )
                }
              />
            </div>
          </div>

          {/* =================================================
              FOOTER
          ================================================== */}

          <div className="fk-modal__footer">
            <button
              type="button"
              className="fk-btn fk-btn--outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="fk-btn fk-btn--primary"
              disabled={submitting}
            >
              {submitting
                ? "Saving…"
                : editingPlaylist
                  ? "Save Changes"
                  : "Publish Playlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}