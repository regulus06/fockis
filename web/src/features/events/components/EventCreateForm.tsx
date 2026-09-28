import React, {
  FormEvent,
  useEffect,
  useState,
} from "react";

import type {
  CreateEventInput,
  EventCategory,
  EventVisibility,
} from "../types/event.types";

import EventDateTimeFields from "./EventDateTimeFields";

interface Props {
  initialValues?: Partial<CreateEventInput>;
  submitLabel?: string;
  organizationName?: string;
  onSubmit: (
    values: CreateEventInput,
  ) => Promise<void>;
  onCancel?: () => void;
}

/**
 * Extended form values used by the admin event form.
 *
 * These fields are supported by the form even if the
 * current CreateEventInput type has not been updated yet.
 */
type ExtendedEventFormValues =
  CreateEventInput & {
    capacity?: number;
    requireRsvp?: boolean;
  };

type AdminEventType =
  | "church_service"
  | "department_event"
  | "meeting"
  | "bible_study"
  | "special_event";

const adminEventTypes: Array<{
  value: AdminEventType;
  label: string;
  category: EventCategory;
}> = [
  {
    value: "church_service",
    label: "Church Service",
    category: "religious",
  },
  {
    value: "department_event",
    label: "Department Event",
    category: "community",
  },
  {
    value: "meeting",
    label: "Meeting",
    category: "meeting",
  },
  {
    value: "bible_study",
    label: "Bible Study",
    category: "religious",
  },
  {
    value: "special_event",
    label: "Special Event",
    category: "general",
  },
];

const categories: EventCategory[] = [
  "general",
  "music",
  "sports",
  "business",
  "education",
  "food",
  "community",
  "party",
  "conference",
  "religious",
  "school",
  "academic",
  "fundraiser",
  "workshop",
  "meeting",
  "networking",
  "cultural",
  "health",
  "youth",
  "technology",
  "environment",
  "political",
  "civic",
  "other",
];

function formatCategory(
  value: EventCategory,
): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );
}

function getInitialAdminEventType(
  category?: EventCategory,
): AdminEventType {
  switch (category) {
    case "meeting":
      return "meeting";

    case "religious":
      return "church_service";

    case "community":
      return "department_event";

    default:
      return "special_event";
  }
}

export default function EventCreateForm({
  initialValues,
  submitLabel = "Create Event",
  organizationName,
  onSubmit,
  onCancel,
}: Props) {
  /**
   * IMPORTANT:
   *
   * initialValues is optional.
   *
   * The previous version attempted to read:
   *
   *   extendedInitialValues.capacity
   *
   * when initialValues was undefined.
   *
   * That caused:
   *
   *   Cannot read properties of undefined
   *
   * Defaulting to {} prevents that crash.
   */
  const extendedInitialValues =
    (initialValues as
      | Partial<ExtendedEventFormValues>
      | undefined) ?? {};

  // ==========================================================================
  // BASIC EVENT INFORMATION
  // ==========================================================================

  const [
    title,
    setTitle,
  ] = useState(
    initialValues?.title ?? "",
  );

  const [
    description,
    setDescription,
  ] = useState(
    initialValues?.description ?? "",
  );

  const [
    adminEventType,
    setAdminEventType,
  ] = useState<AdminEventType>(
    getInitialAdminEventType(
      initialValues?.category,
    ),
  );

  const [
    category,
    setCategory,
  ] = useState<EventCategory>(
    initialValues?.category ??
      "general",
  );

  const [
    visibility,
    setVisibility,
  ] = useState<EventVisibility>(
    initialValues?.visibility ??
      (initialValues?.organizationId
        ? "organization"
        : "public"),
  );

  // ==========================================================================
  // DATE / TIME
  // ==========================================================================

  const [
    startDate,
    setStartDate,
  ] = useState(
    initialValues?.startDate ?? "",
  );

  const [
    endDate,
    setEndDate,
  ] = useState(
    initialValues?.endDate ?? "",
  );

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  const [
    locationName,
    setLocationName,
  ] = useState(
    initialValues?.locationName ?? "",
  );

  const [
    address,
    setAddress,
  ] = useState(
    initialValues?.address ?? "",
  );

  // ==========================================================================
  // CAPACITY
  // ==========================================================================

  const [
    capacity,
    setCapacity,
  ] = useState<string>(
    extendedInitialValues.capacity !==
      undefined
      ? String(
          extendedInitialValues.capacity,
        )
      : "",
  );

  // ==========================================================================
  // RSVP
  // ==========================================================================

  const [
    requireRsvp,
    setRequireRsvp,
  ] = useState<boolean>(
    extendedInitialValues.requireRsvp ??
      false,
  );

  // ==========================================================================
  // COVER IMAGE
  // ==========================================================================

  const [
    coverImageUrl,
    setCoverImageUrl,
  ] = useState(
    initialValues?.coverImageUrl ?? "",
  );

  const [
    coverImageFile,
    setCoverImageFile,
  ] = useState<File | null>(
    null,
  );

  const [
    coverImagePreview,
    setCoverImagePreview,
  ] = useState<string>(
    initialValues?.coverImageUrl ??
      "",
  );

  // ==========================================================================
  // EVENT VIDEO
  // ==========================================================================

  const [
    eventVideoUrl,
    setEventVideoUrl,
  ] = useState(
    initialValues?.eventVideoUrl ?? "",
  );

  const [
    eventVideoFile,
    setEventVideoFile,
  ] = useState<File | null>(
    null,
  );

  const [
    eventVideoPreview,
    setEventVideoPreview,
  ] = useState<string>(
    initialValues?.eventVideoUrl ??
      "",
  );

  // ==========================================================================
  // ONLINE EVENT
  // ==========================================================================

  const [
    isOnline,
    setIsOnline,
  ] = useState(
    initialValues?.isOnline ??
      false,
  );

  const [
    onlineUrl,
    setOnlineUrl,
  ] = useState(
    initialValues?.onlineUrl ?? "",
  );

  // ==========================================================================
  // FORM STATE
  // ==========================================================================

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  // ==========================================================================
  // CLEANUP OBJECT URLS
  // ==========================================================================

  useEffect(() => {
    return () => {
      if (
        coverImagePreview.startsWith(
          "blob:",
        )
      ) {
        URL.revokeObjectURL(
          coverImagePreview,
        );
      }

      if (
        eventVideoPreview.startsWith(
          "blob:",
        )
      ) {
        URL.revokeObjectURL(
          eventVideoPreview,
        );
      }
    };
  }, []);

  // ==========================================================================
  // EVENT TYPE
  // ==========================================================================

  function handleAdminEventTypeChange(
    value: AdminEventType,
  ) {
    setAdminEventType(value);

    const selectedType =
      adminEventTypes.find(
        (item) =>
          item.value === value,
      );

    if (selectedType) {
      setCategory(
        selectedType.category,
      );
    }
  }

  // ==========================================================================
  // COVER IMAGE FILE
  // ==========================================================================

  function handleCoverImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setError(
        "Cover image must be JPG, PNG, or WebP.",
      );

      event.target.value = "";

      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "Cover image must be 10 MB or smaller.",
      );

      event.target.value = "";

      return;
    }

    if (
      coverImagePreview.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        coverImagePreview,
      );
    }

    setCoverImageFile(file);
    setCoverImageUrl("");

    const previewUrl =
      URL.createObjectURL(file);

    setCoverImagePreview(
      previewUrl,
    );
  }

  // ==========================================================================
  // EVENT VIDEO FILE
  // ==========================================================================

  function handleEventVideoChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setError(
        "Event video must be MP4, WebM, MOV, or AVI.",
      );

      event.target.value = "";

      return;
    }

    const maxSize =
      100 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "Event video must be 100 MB or smaller.",
      );

      event.target.value = "";

      return;
    }

    if (
      eventVideoPreview.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        eventVideoPreview,
      );
    }

    setEventVideoFile(file);
    setEventVideoUrl("");

    const previewUrl =
      URL.createObjectURL(file);

    setEventVideoPreview(
      previewUrl,
    );
  }

  // ==========================================================================
  // REMOVE COVER
  // ==========================================================================

  function handleRemoveCoverImage() {
    if (
      coverImagePreview.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        coverImagePreview,
      );
    }

    setCoverImageFile(null);
    setCoverImagePreview("");
    setCoverImageUrl("");
  }

  // ==========================================================================
  // REMOVE VIDEO
  // ==========================================================================

  function handleRemoveEventVideo() {
    if (
      eventVideoPreview.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        eventVideoPreview,
      );
    }

    setEventVideoFile(null);
    setEventVideoPreview("");
    setEventVideoUrl("");
  }

  // ==========================================================================
  // COVER URL
  // ==========================================================================

  function handleCoverImageUrlChange(
    value: string,
  ) {
    setCoverImageUrl(value);

    if (coverImageFile) {
      setCoverImageFile(null);
    }

    setCoverImagePreview(
      value.trim(),
    );
  }

  // ==========================================================================
  // VIDEO URL
  // ==========================================================================

  function handleEventVideoUrlChange(
    value: string,
  ) {
    setEventVideoUrl(value);

    if (eventVideoFile) {
      setEventVideoFile(null);
    }

    setEventVideoPreview(
      value.trim(),
    );
  }

  // ==========================================================================
  // SUBMIT
  // ==========================================================================

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError(null);

    // ------------------------------------------------------------------------
    // TITLE
    // ------------------------------------------------------------------------

    if (!title.trim()) {
      setError(
        "Event title is required.",
      );

      return;
    }

    // ------------------------------------------------------------------------
    // START DATE
    // ------------------------------------------------------------------------

    if (!startDate) {
      setError(
        "Begin date and time are required.",
      );

      return;
    }

    // ------------------------------------------------------------------------
    // END DATE
    // ------------------------------------------------------------------------

    if (!endDate) {
      setError(
        "End / expiration date and time are required.",
      );

      return;
    }

    const start =
      new Date(startDate);

    const end =
      new Date(endDate);

    if (
      Number.isNaN(
        start.getTime(),
      )
    ) {
      setError(
        "The begin date/time is invalid.",
      );

      return;
    }

    if (
      Number.isNaN(
        end.getTime(),
      )
    ) {
      setError(
        "The end / expiration date/time is invalid.",
      );

      return;
    }

    if (end <= start) {
      setError(
        "The end date/time must be after the begin date/time.",
      );

      return;
    }

    // ------------------------------------------------------------------------
    // CAPACITY
    // ------------------------------------------------------------------------

    let parsedCapacity:
      | number
      | undefined;

    if (capacity.trim()) {
      parsedCapacity =
        Number(capacity);

      if (
        !Number.isInteger(
          parsedCapacity,
        ) ||
        parsedCapacity < 1
      ) {
        setError(
          "Capacity must be a whole number greater than 0.",
        );

        return;
      }
    }

    // ------------------------------------------------------------------------
    // ONLINE URL
    // ------------------------------------------------------------------------

    if (
      isOnline &&
      onlineUrl.trim() &&
      !/^https?:\/\//i.test(
        onlineUrl.trim(),
      )
    ) {
      setError(
        "Online event URL must begin with http:// or https://.",
      );

      return;
    }

    // ------------------------------------------------------------------------
    // COVER URL
    // ------------------------------------------------------------------------

    if (
      coverImageUrl.trim() &&
      !/^https?:\/\//i.test(
        coverImageUrl.trim(),
      )
    ) {
      setError(
        "Cover image URL must begin with http:// or https://.",
      );

      return;
    }

    // ------------------------------------------------------------------------
    // VIDEO URL
    // ------------------------------------------------------------------------

    if (
      eventVideoUrl.trim() &&
      !/^https?:\/\//i.test(
        eventVideoUrl.trim(),
      )
    ) {
      setError(
        "Event video URL must begin with http:// or https://.",
      );

      return;
    }

    // ------------------------------------------------------------------------
    // SAVE
    // ------------------------------------------------------------------------

    setSaving(true);

    try {
      const values: ExtendedEventFormValues =
        {
          title:
            title.trim(),

          description:
            description.trim() ||
            undefined,

          category,

          visibility,

          organizationId:
            initialValues?.organizationId,

          startDate:
            start.toISOString(),

          endDate:
            end.toISOString(),

          locationName:
            locationName.trim() ||
            undefined,

          address:
            address.trim() ||
            undefined,

          isOnline,

          onlineUrl:
            onlineUrl.trim() ||
            undefined,

          coverImageUrl:
            coverImageUrl.trim() ||
            undefined,

          coverImageFile:
            coverImageFile ||
            undefined,

          eventVideoUrl:
            eventVideoUrl.trim() ||
            undefined,

          eventVideoFile:
            eventVideoFile ||
            undefined,

          capacity:
            parsedCapacity,

          requireRsvp,
        };

      await onSubmit(
        values as CreateEventInput,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save event.",
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <form
      className="fk-event-form"
      onSubmit={handleSubmit}
    >
      {/* ====================================================================
          ADMIN CONSOLE HEADER
      ==================================================================== */}

      <div className="fk-event-admin-header">
        <div>
          <span className="fk-event-admin-eyebrow">
            ADMIN CONSOLE
          </span>

          <h2>
            Events, Live &amp; Attendance
          </h2>

          <p>
            Create and manage events,
            livestreams, and attendance.
          </p>
        </div>

        <nav
          className="fk-event-admin-tabs"
          aria-label="Organization administration"
        >
          <span className="active">
            Events
          </span>

          <span>
            Live
          </span>

          <span>
            Attendance
          </span>
        </nav>
      </div>

      {/* ====================================================================
          CREATE EVENT HEADER
      ==================================================================== */}

      <div className="fk-event-create-heading">
        <div>
          <span className="fk-event-eyebrow">
            {organizationName
              ? "ORGANIZATION EVENT"
              : "FOCKIS EVENT"}
          </span>

          <h1>
            Create event
          </h1>

          <p>
            Create an event for your
            organization and let people
            know what is happening.
          </p>
        </div>
      </div>

      {/* ====================================================================
          ORGANIZATION CONTEXT
      ==================================================================== */}

      {organizationName && (
        <div className="fk-event-organization-context">
          <span aria-hidden="true">
            🏛️
          </span>

          <div>
            <strong>
              Organization Event
            </strong>

            <small>
              {organizationName}
            </small>
          </div>
        </div>
      )}

      {/* ====================================================================
          ERROR
      ==================================================================== */}

      {error && (
        <div
          className="fk-event-form-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ====================================================================
          TITLE
      ==================================================================== */}

      <div className="fk-event-field">
        <label htmlFor="event-title">
          Title{" "}
          <span aria-hidden="true">
            *
          </span>
        </label>

        <input
          id="event-title"
          value={title}
          onChange={(e) =>
            setTitle(
              e.target.value,
            )
          }
          placeholder="Summer Festival"
          maxLength={150}
          required
          disabled={saving}
        />
      </div>

      {/* ====================================================================
          TYPE
      ==================================================================== */}

      <div className="fk-event-field">
        <label htmlFor="event-type">
          Type
        </label>

        <select
          id="event-type"
          value={adminEventType}
          onChange={(e) =>
            handleAdminEventTypeChange(
              e.target
                .value as AdminEventType,
            )
          }
          disabled={saving}
        >
          {adminEventTypes.map(
            (item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ),
          )}
        </select>
      </div>

      {/* ====================================================================
          CATEGORY + VISIBILITY
      ==================================================================== */}

      <div className="fk-event-two-columns">
        <div className="fk-event-field">
          <label htmlFor="event-category">
            Category
          </label>

          <select
            id="event-category"
            value={category}
            onChange={(e) =>
              setCategory(
                e.target
                  .value as EventCategory,
              )
            }
            disabled={saving}
          >
            {categories.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {formatCategory(
                    item,
                  )}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="fk-event-field">
          <label htmlFor="event-visibility">
            Visibility
          </label>

          <select
            id="event-visibility"
            value={visibility}
            onChange={(e) =>
              setVisibility(
                e.target
                  .value as EventVisibility,
              )
            }
            disabled={saving}
          >
            <option value="public">
              Public
            </option>

            <option value="organization">
              Organization
            </option>

            <option value="friends">
              Friends
            </option>

            <option value="private">
              Private
            </option>
          </select>
        </div>
      </div>

      {/* ====================================================================
          SCHEDULE
      ==================================================================== */}

      <div className="fk-event-section-heading">
        <h3>
          Schedule
        </h3>

        <p>
          Choose when the event begins
          and ends.
        </p>
      </div>

      <EventDateTimeFields
        startDate={startDate}
        endDate={endDate}
        onStartChange={
          setStartDate
        }
        onEndChange={
          setEndDate
        }
      />

      {/* ====================================================================
          LOCATION
      ==================================================================== */}

      <div className="fk-event-section-heading">
        <h3>
          Location
        </h3>

        <p>
          Tell attendees where the
          event will take place.
        </p>
      </div>

      <div className="fk-event-online-toggle">
        <label>
          <input
            type="checkbox"
            checked={isOnline}
            onChange={(e) =>
              setIsOnline(
                e.target.checked,
              )
            }
            disabled={saving}
          />

          <span>
            This is an online event
          </span>
        </label>
      </div>

      {isOnline ? (
        <div className="fk-event-field">
          <label htmlFor="event-online-url">
            Online event URL
          </label>

          <input
            id="event-online-url"
            type="url"
            value={onlineUrl}
            onChange={(e) =>
              setOnlineUrl(
                e.target.value,
              )
            }
            placeholder="https://..."
            disabled={saving}
          />
        </div>
      ) : (
        <>
          <div className="fk-event-field">
            <label htmlFor="event-location">
              Location
            </label>

            <input
              id="event-location"
              value={locationName}
              onChange={(e) =>
                setLocationName(
                  e.target.value,
                )
              }
              placeholder="Ohio Stadium"
              disabled={saving}
            />
          </div>

          <div className="fk-event-field">
            <label htmlFor="event-address">
              Address
            </label>

            <input
              id="event-address"
              value={address}
              onChange={(e) =>
                setAddress(
                  e.target.value,
                )
              }
              placeholder="411 Woody Hayes Dr, Columbus, OH"
              disabled={saving}
            />
          </div>
        </>
      )}

      {/* ====================================================================
          CAPACITY + RSVP
      ==================================================================== */}

      <div className="fk-event-two-columns">
        <div className="fk-event-field">
          <label htmlFor="event-capacity">
            Capacity
          </label>

          <input
            id="event-capacity"
            type="number"
            min="1"
            step="1"
            value={capacity}
            onChange={(e) =>
              setCapacity(
                e.target.value,
              )
            }
            placeholder="Unlimited"
            disabled={saving}
          />

          <p className="fk-event-help-text">
            Leave blank for unlimited
            attendance.
          </p>
        </div>

        <div className="fk-event-field fk-event-rsvp-field">
          <label>
            RSVP
          </label>

          <label className="fk-event-checkbox-card">
            <input
              type="checkbox"
              checked={requireRsvp}
              onChange={(e) =>
                setRequireRsvp(
                  e.target.checked,
                )
              }
              disabled={saving}
            />

            <span>
              <strong>
                Require RSVP
              </strong>

              <small>
                Attendees must RSVP
                before attending.
              </small>
            </span>
          </label>
        </div>
      </div>

      {/* ====================================================================
          DESCRIPTION
      ==================================================================== */}

      <div className="fk-event-field">
        <label htmlFor="event-description">
          Description
        </label>

        <textarea
          id="event-description"
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value,
            )
          }
          placeholder={
            organizationName
              ? "Tell people about this organization event..."
              : "Tell people about your event..."
          }
          rows={5}
          maxLength={5000}
          disabled={saving}
        />

        <p className="fk-event-help-text">
          Add details, instructions,
          speakers, activities, or
          anything attendees should know.
        </p>
      </div>

      {/* ====================================================================
          COVER IMAGE
      ==================================================================== */}

      <div className="fk-event-cover-section">
        <div className="fk-event-field">
          <label>
            Cover image
          </label>

          <p className="fk-event-help-text">
            JPG, PNG, or WebP.
            Maximum 10 MB.
          </p>

          <label className="fk-event-file-button">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleCoverImageChange
              }
              disabled={saving}
              hidden
            />

            <span>
              📷 Choose Cover Image
            </span>
          </label>

          {coverImageFile && (
            <div className="fk-event-selected-file">
              <span>
                {
                  coverImageFile.name
                }
              </span>

              <span>
                {(
                  coverImageFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </span>
            </div>
          )}

          <div className="fk-event-cover-divider">
            <span>
              OR
            </span>
          </div>

          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) =>
              handleCoverImageUrlChange(
                e.target.value,
              )
            }
            placeholder="https://example.com/event-image.jpg"
            disabled={
              saving ||
              Boolean(
                coverImageFile,
              )
            }
          />
        </div>

        {coverImagePreview && (
          <div className="fk-event-cover-preview">
            <div className="fk-event-cover-preview-header">
              <span>
                Cover preview
              </span>

              <button
                type="button"
                onClick={
                  handleRemoveCoverImage
                }
                disabled={saving}
                className="fk-event-remove-image"
              >
                Remove
              </button>
            </div>

            <img
              src={
                coverImagePreview
              }
              alt="Event cover preview"
              onError={() =>
                setError(
                  "Unable to load the cover image. Check the image URL.",
                )
              }
            />
          </div>
        )}
      </div>

      {/* ====================================================================
          EVENT VIDEO
      ==================================================================== */}

      <div className="fk-event-video-section">
        <div className="fk-event-field">
          <label>
            Event video
          </label>

          <p className="fk-event-help-text">
            Upload an MP4, WebM, MOV,
            or AVI video.
            Maximum 100 MB.
          </p>

          <label className="fk-event-file-button">
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
              onChange={
                handleEventVideoChange
              }
              disabled={saving}
              hidden
            />

            <span>
              🎥 Choose Event Video
            </span>
          </label>

          {eventVideoFile && (
            <div className="fk-event-selected-file">
              <span>
                {
                  eventVideoFile.name
                }
              </span>

              <span>
                {(
                  eventVideoFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </span>
            </div>
          )}

          <div className="fk-event-cover-divider">
            <span>
              OR
            </span>
          </div>

          <input
            type="url"
            value={eventVideoUrl}
            onChange={(e) =>
              handleEventVideoUrlChange(
                e.target.value,
              )
            }
            placeholder="https://example.com/event-video.mp4"
            disabled={
              saving ||
              Boolean(
                eventVideoFile,
              )
            }
          />
        </div>

        {eventVideoPreview && (
          <div className="fk-event-video-preview">
            <div className="fk-event-cover-preview-header">
              <span>
                Video preview
              </span>

              <button
                type="button"
                onClick={
                  handleRemoveEventVideo
                }
                disabled={saving}
                className="fk-event-remove-image"
              >
                Remove
              </button>
            </div>

            <video
              src={
                eventVideoPreview
              }
              controls
              playsInline
              preload="metadata"
              className="fk-event-video-player"
            />

            {eventVideoFile && (
              <small className="fk-event-help-text">
                Video will be
                uploaded when
                you save the
                event.
              </small>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================
          ACTIONS
      ==================================================================== */}

      <div className="fk-event-form-actions">
        {onCancel && (
          <button
            type="button"
            className="fk-event-button secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          className="fk-event-button primary"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
}