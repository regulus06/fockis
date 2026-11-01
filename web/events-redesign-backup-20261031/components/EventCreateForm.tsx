import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, Globe, ImagePlus, LocateFixed, Lock, MapPin, Trash2, Users, Video } from "lucide-react";

import { EVENT_CATEGORIES } from "../constants/eventCategories";
import type {
  CreateEventInput,
  EventCategory,
  EventVisibility,
  FockisEvent,
} from "../types/event.types";
import { eventMediaUrl } from "../utils/eventMedia";
import { fromLocalInputValue, toLocalInputValue, viewerTimeZone } from "../utils/eventTime";
import EventCard from "./EventCard";
import EventDateTimeFields from "./EventDateTimeFields";

interface Props {
  initialValues?: Partial<CreateEventInput>;
  submitLabel?: string;
  organizationName?: string;
  mode?: "create" | "edit";
  onSubmit: (values: CreateEventInput) => Promise<void>;
  onCancel?: () => void;
}

type Errors = Partial<Record<
  "title" | "startDate" | "endDate" | "onlineUrl" | "place" | "coordinates" | "capacity" | "media" | "form",
  string
>>;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

const VISIBILITY: Array<{ value: EventVisibility; label: string; hint: string; icon: typeof Globe }> = [
  { value: "public", label: "Public", hint: "Anyone on Fockis can find and join.", icon: Globe },
  { value: "friends", label: "Friends", hint: "Only your friends can see it.", icon: Users },
  { value: "private", label: "Private", hint: "Only people you invite.", icon: Lock },
];

function initialLocal(value?: string) {
  return value ? toLocalInputValue(value) : "";
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : Number.NaN;
}

export default function EventCreateForm({
  initialValues = {},
  submitLabel = "Create event",
  organizationName,
  mode = "create",
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [description, setDescription] = useState(initialValues.description ?? "");
  const [category, setCategory] = useState<EventCategory>(initialValues.category ?? "community");
  const [visibility, setVisibility] = useState<EventVisibility>(initialValues.visibility ?? "public");
  const [startDate, setStartDate] = useState(initialLocal(initialValues.startDate));
  const [endDate, setEndDate] = useState(initialLocal(initialValues.endDate));
  const [isOnline, setIsOnline] = useState(initialValues.isOnline ?? false);
  const [onlineUrl, setOnlineUrl] = useState(initialValues.onlineUrl ?? "");
  const [locationName, setLocationName] = useState(initialValues.locationName ?? "");
  const [address, setAddress] = useState(initialValues.address ?? "");
  const [latitude, setLatitude] = useState(
    typeof initialValues.latitude === "number" ? String(initialValues.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    typeof initialValues.longitude === "number" ? String(initialValues.longitude) : "",
  );
  const [capacity, setCapacity] = useState(
    typeof initialValues.capacity === "number" ? String(initialValues.capacity) : "",
  );
  const [coverImageFile, setCoverImageFile] = useState<File | undefined>();
  const [eventVideoFile, setEventVideoFile] = useState<File | undefined>();
  const [removeCover, setRemoveCover] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [locating, setLocating] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const timeZone = viewerTimeZone();

  const fileUrl = useMemo(() => {
    const file = coverImageFile ?? eventVideoFile;

    return file ? URL.createObjectURL(file) : "";
  }, [coverImageFile, eventVideoFile]);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const existingCover =
    !removeCover && (initialValues.coverMediaType === "video" ? initialValues.coverVideoUrl : initialValues.coverImageUrl);

  function pickFile(file: File | undefined) {
    setErrors((current) => ({ ...current, media: undefined }));

    if (!file) return;

    if (IMAGE_TYPES.includes(file.type)) {
      if (file.size > MAX_IMAGE) {
        setErrors((current) => ({ ...current, media: "Images must be 10 MB or smaller." }));
        return;
      }

      setCoverImageFile(file);
      setEventVideoFile(undefined);
      setRemoveCover(false);
      return;
    }

    if (VIDEO_TYPES.includes(file.type)) {
      if (file.size > MAX_VIDEO) {
        setErrors((current) => ({ ...current, media: "Videos must be 100 MB or smaller." }));
        return;
      }

      setEventVideoFile(file);
      setCoverImageFile(undefined);
      setRemoveCover(false);
      return;
    }

    setErrors((current) => ({ ...current, media: "Use a JPG, PNG or WebP image, or an MP4, WebM, MOV, AVI or MKV video." }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setErrors((current) => ({ ...current, coordinates: "Location isn't available in this browser." }));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setErrors((current) => ({ ...current, coordinates: "Couldn't get your location. You can type coordinates instead." }));
        setLocating(false);
      },
      { timeout: 15_000 },
    );
  }

  function validate(): Errors {
    const next: Errors = {};
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (title.trim().length < 2) next.title = "Give your event a title (at least 2 characters).";
    if (!startDate || Number.isNaN(start)) next.startDate = "Choose when the event starts.";
    if (!endDate || Number.isNaN(end)) next.endDate = "Choose when the event ends.";
    else if (!Number.isNaN(start) && end <= start) next.endDate = "The end must be after the start.";
    else if (end - start > 90 * 86_400_000) next.endDate = "An event can last at most 90 days.";
    else if (end <= Date.now() && (mode === "create" || endDate !== initialLocal(initialValues.endDate))) {
      next.endDate = "The end time is already in the past.";
    }

    if (isOnline) {
      if (!/^https?:\/\/\S+\.\S+/i.test(onlineUrl.trim())) next.onlineUrl = "Add a meeting link starting with https://";
    } else {
      if (!locationName.trim() && !address.trim()) next.place = "Add a venue name or an address.";

      const lat = numberOrNull(latitude);
      const lng = numberOrNull(longitude);

      if ((lat === null) !== (lng === null)) next.coordinates = "Enter both latitude and longitude, or neither.";
      else if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) next.coordinates = "Latitude must be between -90 and 90.";
      else if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) next.coordinates = "Longitude must be between -180 and 180.";
    }

    if (capacity.trim()) {
      const value = Number(capacity);

      if (!Number.isInteger(value) || value < 1) next.capacity = "Capacity must be a whole number of at least 1.";
    }

    return next;
  }

  function values(): CreateEventInput {
    const lat = numberOrNull(latitude);
    const lng = numberOrNull(longitude);

    return {
      title: title.trim(),
      description: description.trim(),
      category,
      visibility,
      startDate: fromLocalInputValue(startDate),
      endDate: fromLocalInputValue(endDate),
      timeZone,
      isOnline,
      onlineUrl: isOnline ? onlineUrl.trim() : "",
      locationName: isOnline ? "" : locationName.trim(),
      address: isOnline ? "" : address.trim(),
      latitude: isOnline ? null : lat,
      longitude: isOnline ? null : lng,
      capacity: capacity.trim() ? Number(capacity) : null,
      coverImageFile,
      eventVideoFile,
      ...(removeCover && !coverImageFile && !eventVideoFile ? { coverImageUrl: "" } : {}),
    };
  }

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();

    const found = validate();

    setErrors(found);

    if (Object.keys(found).length) {
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }

    setSaving(true);

    try {
      await onSubmit(values());
    } catch (caught) {
      setErrors({ form: caught instanceof Error ? caught.message : "Unable to save the event." });
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSaving(false);
    }
  }

  const previewEvent: FockisEvent = {
    id: "preview",
    creatorId: "",
    organizer: null,
    title: title.trim() || "Your event title",
    description,
    category,
    visibility,
    startDate: fromLocalInputValue(startDate) || new Date(Date.now() + 86_400_000).toISOString(),
    endDate: fromLocalInputValue(endDate) || new Date(Date.now() + 90_000_000).toISOString(),
    timeZone,
    locationName,
    address,
    isOnline,
    coverImageUrl: coverImageFile ? fileUrl : !eventVideoFile && !removeCover ? initialValues.coverImageUrl ?? "" : "",
    coverVideoUrl: eventVideoFile ? fileUrl : !coverImageFile && !removeCover ? initialValues.coverVideoUrl ?? "" : "",
    coverMediaType: eventVideoFile ? "video" : coverImageFile ? "image" : initialValues.coverMediaType ?? "image",
    attendeeCount: 1,
    interestedCount: 0,
    capacity: capacity ? Number(capacity) || null : null,
    spotsLeft: null,
    isFull: false,
    isGoing: true,
    isInterested: false,
    isInvited: false,
    viewerRsvp: "going",
    isOwner: true,
    status: "upcoming",
    isCancelled: false,
    cancelledAt: null,
    canRsvp: false,
    createdAt: "",
    updatedAt: "",
  };

  const errorList = Object.values(errors).filter(Boolean);

  return (
    <form className="fke-form" onSubmit={submit} noValidate>
      <header className="fke-form__header">
        <div>
          <span className="fke-eyebrow">{mode === "edit" ? "Edit event" : "New event"}</span>
          <h1>{submitLabel}</h1>
          {organizationName && <p>For {organizationName}</p>}
        </div>
        <button type="button" className="fke-btn fke-btn--ghost" onClick={() => setPreview((value) => !value)} aria-pressed={preview}>
          {preview ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          {preview ? "Hide preview" : "Preview"}
        </button>
      </header>

      {errorList.length > 0 && (
        <div className="fke-form__errors" role="alert" tabIndex={-1} ref={errorRef}>
          <strong>Please check the following:</strong>
          <ul>
            {errorList.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {preview && (
        <div className="fke-form__preview" aria-label="Preview">
          <EventCard event={previewEvent} onOpen={() => undefined} footer={<span className="fke-muted">Preview</span>} />
        </div>
      )}

      <section className="fke-form__section">
        <label className="fke-field">
          <span>Event title</span>
          <input
            required
            minLength={2}
            maxLength={150}
            value={title}
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            placeholder="Give your event a name"
            aria-invalid={Boolean(errors.title) || undefined}
          />
          {errors.title && <small className="fke-error-text">{errors.title}</small>}
        </label>

        <label className="fke-field">
          <span>Description</span>
          <textarea
            maxLength={5000}
            rows={5}
            value={description}
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            placeholder="What should people know? Agenda, what to bring, who it's for…"
          />
          <small className="fke-muted">{description.length.toLocaleString()} / 5,000</small>
        </label>

        <label className="fke-field">
          <span>Category</span>
          <select value={category} onChange={(changeEvent) => setCategory(changeEvent.target.value as EventCategory)}>
            {EVENT_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="fke-form__section">
        <EventDateTimeFields
          startDate={startDate}
          endDate={endDate}
          onStartChange={(value) => {
            setStartDate(value);

            // Keep the end after the start: default to a 2-hour event.
            const start = new Date(value).getTime();
            const end = new Date(endDate).getTime();

            if (!Number.isNaN(start) && (!endDate || Number.isNaN(end) || end <= start)) {
              setEndDate(toLocalInputValue(new Date(start + 2 * 3_600_000).toISOString()));
            }
          }}
          onEndChange={setEndDate}
          errors={{ startDate: errors.startDate, endDate: errors.endDate }}
          timeZoneLabel={timeZone}
        />
      </section>

      <section className="fke-form__section">
        <fieldset className="fke-fieldset">
          <legend>Where</legend>
          <div className="fke-segmented" role="radiogroup" aria-label="Event format">
            <button type="button" role="radio" aria-checked={!isOnline} className={!isOnline ? "is-active" : ""} onClick={() => setIsOnline(false)}>
              <MapPin size={16} aria-hidden="true" /> In person
            </button>
            <button type="button" role="radio" aria-checked={isOnline} className={isOnline ? "is-active" : ""} onClick={() => setIsOnline(true)}>
              <Globe size={16} aria-hidden="true" /> Online
            </button>
          </div>

          {isOnline ? (
            <label className="fke-field">
              <span>Meeting link</span>
              <input
                type="url"
                inputMode="url"
                placeholder="https://"
                value={onlineUrl}
                onChange={(changeEvent) => setOnlineUrl(changeEvent.target.value)}
                aria-invalid={Boolean(errors.onlineUrl) || undefined}
              />
              <small className="fke-muted">Only shown to people who are going or interested.</small>
              {errors.onlineUrl && <small className="fke-error-text">{errors.onlineUrl}</small>}
            </label>
          ) : (
            <>
              <div className="fke-form-grid">
                <label className="fke-field">
                  <span>Venue</span>
                  <input maxLength={255} value={locationName} onChange={(changeEvent) => setLocationName(changeEvent.target.value)} placeholder="Venue or place name" />
                </label>
                <label className="fke-field">
                  <span>Address</span>
                  <input maxLength={500} value={address} onChange={(changeEvent) => setAddress(changeEvent.target.value)} placeholder="Street, city" />
                </label>
              </div>
              {errors.place && <small className="fke-error-text">{errors.place}</small>}

              <details className="fke-disclosure" open={Boolean(latitude || longitude)}>
                <summary>Pin the exact location (optional, enables “Nearby”)</summary>
                <div className="fke-form-grid fke-form-grid--3">
                  <label className="fke-field">
                    <span>Latitude</span>
                    <input inputMode="decimal" value={latitude} onChange={(changeEvent) => setLatitude(changeEvent.target.value)} placeholder="18.5392" />
                  </label>
                  <label className="fke-field">
                    <span>Longitude</span>
                    <input inputMode="decimal" value={longitude} onChange={(changeEvent) => setLongitude(changeEvent.target.value)} placeholder="-72.3350" />
                  </label>
                  <button type="button" className="fke-btn fke-btn--ghost fke-form__locate" onClick={useCurrentLocation} disabled={locating}>
                    <LocateFixed size={16} aria-hidden="true" />
                    {locating ? "Locating…" : "Use current location"}
                  </button>
                </div>
                {errors.coordinates && <small className="fke-error-text">{errors.coordinates}</small>}
              </details>
            </>
          )}
        </fieldset>
      </section>

      <section className="fke-form__section">
        <fieldset className="fke-fieldset">
          <legend>Cover</legend>

          <div className="fke-upload">
            {fileUrl || existingCover ? (
              <div className="fke-upload__preview">
                {(eventVideoFile || (!coverImageFile && initialValues.coverMediaType === "video" && existingCover)) ? (
                  <video src={fileUrl || eventMediaUrl(existingCover || "")} muted playsInline preload="metadata" controls />
                ) : (
                  <img src={fileUrl || eventMediaUrl(existingCover || "")} alt="Cover preview" />
                )}
                <button
                  type="button"
                  className="fke-btn fke-btn--ghost"
                  onClick={() => {
                    setCoverImageFile(undefined);
                    setEventVideoFile(undefined);
                    setRemoveCover(Boolean(initialValues.coverImageUrl || initialValues.coverVideoUrl));
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" /> Remove
                </button>
              </div>
            ) : (
              <label className="fke-upload__drop">
                <input
                  type="file"
                  accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
                  onChange={(changeEvent) => {
                    pickFile(changeEvent.target.files?.[0]);
                    changeEvent.target.value = "";
                  }}
                />
                <span className="fke-upload__icons" aria-hidden="true">
                  <ImagePlus size={22} />
                  <Video size={22} />
                </span>
                <strong>Add a cover image or video</strong>
                <small>Images up to 10 MB (JPG, PNG, WebP) · Videos up to 100 MB</small>
              </label>
            )}
          </div>
          {errors.media && <small className="fke-error-text">{errors.media}</small>}
        </fieldset>
      </section>

      <section className="fke-form__section">
        <fieldset className="fke-fieldset">
          <legend>Privacy & capacity</legend>
          <div className="fke-choice-grid" role="radiogroup" aria-label="Visibility">
            {VISIBILITY.map((option) => (
              <button
                type="button"
                role="radio"
                aria-checked={visibility === option.value}
                key={option.value}
                className={`fke-choice ${visibility === option.value ? "is-active" : ""}`}
                onClick={() => setVisibility(option.value)}
              >
                <option.icon size={18} aria-hidden="true" />
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </button>
            ))}
          </div>
          {visibility === "organization" && (
            <p className="fke-muted">This event uses organization visibility: only invited people and participants can see it.</p>
          )}

          <label className="fke-field fke-field--narrow">
            <span>Capacity (optional)</span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={capacity}
              onChange={(changeEvent) => setCapacity(changeEvent.target.value)}
              placeholder="Unlimited"
              aria-invalid={Boolean(errors.capacity) || undefined}
            />
            {errors.capacity && <small className="fke-error-text">{errors.capacity}</small>}
          </label>
        </fieldset>
      </section>

      <div className="fke-form__actions">
        {onCancel && (
          <button type="button" className="fke-btn fke-btn--ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
        <button type="submit" className="fke-btn fke-btn--primary fke-btn--lg" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
