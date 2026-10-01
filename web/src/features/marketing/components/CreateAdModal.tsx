import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useRef,
  useState,
  useEffect,
} from "react";

import AdPlacementSelector from "./AdPlacementSelector";
import { useCreateAd } from "../hooks/useCreateAd";

import type {
  AdvertisementType,
  AdvertisementDestinationType,
  CreateAdPayload,
  Advertisement,
} from "../types/marketingTypes";

interface CreateAdModalProps {
  campaignId: string;
  onClose: () => void;
  onCreated: (ad: Advertisement) => void;
}

const AD_TYPES: AdvertisementType[] = [
  "IMAGE",
  "VIDEO",
  "CAROUSEL",
];

const DESTINATION_TYPES: AdvertisementDestinationType[] = [
  "WEBSITE",
  "APP",
  "STORE",
  "PRODUCT",
  "PROFILE",
  "POST",
];

const CTA_OPTIONS = [
  "",
  "LEARN_MORE",
  "SHOP_NOW",
  "SIGN_UP",
  "DOWNLOAD",
  "GET_STARTED",
  "CONTACT_US",
] as const;

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  FOCKIS_API_URL;

/* ============================================================================
   BACKEND PLACEMENTS

   IMPORTANT:
   The UI uses FEED / MARKETPLACE.
   The backend expects an ARRAY called `placements`.
============================================================================ */

type BackendPlacement =
  | "FEED"
  | "FEED_RAIL"
  | "FEED_VIDEO_END"
  | "STORY"
  | "MARKETPLACE_BANNER"
  | "PRODUCT"
  | "STORE"
  | "REAL_ESTATE"
  | "PROFILE";

type UiPlacement =
  | "FEED"
  | "MARKETPLACE";

/* ============================================================================
   AUTH
============================================================================ */

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const keys = [
    "token",
    "access_token",
    "accessToken",
    "jwt",
  ];

  for (const key of keys) {
    const value =
      window.localStorage.getItem(key);

    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

/* ============================================================================
   URL HELPERS
============================================================================ */

function normalizeMediaUrl(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  const raw = value.trim();

  if (!raw) {
    return "";
  }

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://")
  ) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `http:${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${API_URL}${raw}`;
  }

  return `${API_URL}/${raw}`;
}

function isValidHttpUrl(
  value: string,
): boolean {
  if (!value.trim()) {
    return false;
  }

  try {
    const url = new URL(
      value.trim(),
    );

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

/* ============================================================================
   PLACEMENT CONVERTER

   This is the important fix.

   UI:
      FEED
      MARKETPLACE

   Backend:
      placements: ["FEED"]
      placements: ["MARKETPLACE_BANNER"]
============================================================================ */

function getBackendPlacements(
  value: UiPlacement,
): BackendPlacement[] {
  switch (value) {
    case "MARKETPLACE":
      return [
        "MARKETPLACE_BANNER",
      ];

    case "FEED":
    default:
      return [
        "FEED",
      ];
  }
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function CreateAdModal({
  campaignId,
  onClose,
  onCreated,
}: CreateAdModalProps) {
  const {
    submit,
    submitting,
    error,
  } = useCreateAd();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const previewObjectUrlRef =
    useRef<string | null>(null);

  const [name, setName] =
    useState("");

  const [type, setType] =
    useState<AdvertisementType>("IMAGE");

  const [headline, setHeadline] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [mediaUrl, setMediaUrl] =
    useState("");

  const [thumbnailUrl, setThumbnailUrl] =
    useState("");

  const [appIconUrl, setAppIconUrl] =
    useState("");

  const [destinationType, setDestinationType] =
    useState<AdvertisementDestinationType>(
      "WEBSITE",
    );

  const [destinationUrl, setDestinationUrl] =
    useState("");

  const [callToAction, setCallToAction] =
    useState("");

  const [placement, setPlacement] =
    useState<UiPlacement>("FEED");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const [localError, setLocalError] =
    useState("");

  const displayError =
    localError ||
    error ||
    "";

  /* ==========================================================================
     CLEANUP
  ========================================================================== */

  useEffect(() => {
    return () => {
      if (
        previewObjectUrlRef.current
      ) {
        URL.revokeObjectURL(
          previewObjectUrlRef.current,
        );
      }
    };
  }, []);

  /* ==========================================================================
     CLOSE
  ========================================================================== */

  function handleClose() {
    if (
      submitting ||
      uploading
    ) {
      return;
    }

    onClose();
  }

  /* ==========================================================================
     RESET MEDIA
  ========================================================================== */

  function resetMedia() {
    if (
      previewObjectUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewObjectUrlRef.current,
      );

      previewObjectUrlRef.current =
        null;
    }

    setSelectedFile(null);
    setMediaUrl("");
    setPreviewUrl("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  /* ==========================================================================
     TYPE CHANGE
  ========================================================================== */

  function handleTypeChange(
    nextType: AdvertisementType,
  ) {
    setType(nextType);

    resetMedia();

    setThumbnailUrl("");
  }

  /* ==========================================================================
     FILE SELECT
  ========================================================================== */

  function handleFileSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setLocalError("");

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (type === "VIDEO") {
      if (
        !VIDEO_TYPES.includes(
          file.type,
        )
      ) {
        setLocalError(
          "Please select an MP4, WebM, or MOV video.",
        );

        event.target.value = "";

        return;
      }

      if (
        file.size >
        MAX_VIDEO_SIZE
      ) {
        setLocalError(
          "Video files must be 50 MB or smaller.",
        );

        event.target.value = "";

        return;
      }
    } else {
      if (
        !IMAGE_TYPES.includes(
          file.type,
        )
      ) {
        setLocalError(
          "Please select a JPG, PNG, or WebP image.",
        );

        event.target.value = "";

        return;
      }

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {
        setLocalError(
          "Image files must be 10 MB or smaller.",
        );

        event.target.value = "";

        return;
      }
    }

    if (
      previewObjectUrlRef.current
    ) {
      URL.revokeObjectURL(
        previewObjectUrlRef.current,
      );
    }

    const objectUrl =
      URL.createObjectURL(file);

    previewObjectUrlRef.current =
      objectUrl;

    setSelectedFile(file);
    setPreviewUrl(objectUrl);

    /*
     * Never send a blob URL to NestJS.
     */
    setMediaUrl("");
  }

  /* ==========================================================================
     UPLOAD MEDIA
  ========================================================================== */

  async function uploadMediaFile(
    file: File,
  ): Promise<string> {
    const token =
      getToken();

    if (!token) {
      throw new Error(
        "Authentication required. Please log in again.",
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    formData.append(
      "type",
      type,
    );

    formData.append(
      "campaignId",
      campaignId.trim(),
    );

    console.log(
      "[Fockis Marketing] Uploading media",
      {
        endpoint:
          `${API_URL}/marketing/ads/upload`,
        fileName:
          file.name,
        fileType:
          file.type,
        fileSize:
          file.size,
        adType:
          type,
        campaignId:
          campaignId.trim(),
      },
    );

    const response =
      await fetch(
        `${API_URL}/marketing/ads/upload`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          body: formData,
        },
      );

    const responseText =
      await response.text();

    let data: any = null;

    if (
      responseText.trim()
    ) {
      try {
        data =
          JSON.parse(
            responseText,
          );
      } catch {
        data = null;
      }
    }

    console.log(
      "[Fockis Marketing] Media upload response",
      {
        status:
          response.status,
        data,
        raw:
          responseText,
      },
    );

    if (!response.ok) {
      throw new Error(
        data?.message ||
          responseText ||
          `Media upload failed (${response.status}).`,
      );
    }

    const rawUploadedUrl =
      data?.url ??
      data?.mediaUrl ??
      data?.fileUrl ??
      data?.path ??
      data?.location ??
      data?.data?.url ??
      data?.data?.mediaUrl ??
      data?.data?.fileUrl ??
      data?.data?.path ??
      data?.advertisement?.mediaUrl ??
      data?.advertisement?.url;

    if (
      typeof rawUploadedUrl !==
        "string" ||
      !rawUploadedUrl.trim()
    ) {
      throw new Error(
        "The media upload completed, but the server did not return a media URL.",
      );
    }

    const uploadedUrl =
      normalizeMediaUrl(
        rawUploadedUrl,
      );

    console.log(
      "[Fockis Marketing] Normalized media URL",
      {
        rawUploadedUrl,
        uploadedUrl,
      },
    );

    if (
      !isValidHttpUrl(
        uploadedUrl,
      )
    ) {
      throw new Error(
        `The uploaded media URL is invalid: ${uploadedUrl}`,
      );
    }

    return uploadedUrl;
  }

  /* ==========================================================================
     ENSURE MEDIA URL
  ========================================================================== */

  async function ensureMediaUrl(): Promise<string> {
    if (selectedFile) {
      setUploading(true);

      try {
        const uploadedUrl =
          await uploadMediaFile(
            selectedFile,
          );

        setMediaUrl(
          uploadedUrl,
        );

        return uploadedUrl;
      } finally {
        setUploading(false);
      }
    }

    const enteredMediaUrl =
      mediaUrl.trim();

    if (enteredMediaUrl) {
      const normalized =
        normalizeMediaUrl(
          enteredMediaUrl,
        );

      if (
        !isValidHttpUrl(
          normalized,
        )
      ) {
        throw new Error(
          "Media URL must be a valid HTTP or HTTPS URL.",
        );
      }

      setMediaUrl(
        normalized,
      );

      return normalized;
    }

    throw new Error(
      type === "VIDEO"
        ? "Please upload a video or enter a video URL."
        : "Please upload an image or enter an image URL.",
    );
  }

  /* ==========================================================================
     SUBMIT
  ========================================================================== */

  async function handleSubmit() {
    setLocalError("");

    const cleanCampaignId =
      campaignId.trim();

    const cleanName =
      name.trim();

    const cleanHeadline =
      headline.trim();

    if (!cleanCampaignId) {
      setLocalError(
        "A campaign ID is required before creating an advertisement.",
      );

      return;
    }

    if (!cleanName) {
      setLocalError(
        "Ad name is required.",
      );

      return;
    }

    if (!cleanHeadline) {
      setLocalError(
        "Headline is required.",
      );

      return;
    }

    if (
      cleanHeadline.length >
      100
    ) {
      setLocalError(
        "Headline must be 100 characters or fewer.",
      );

      return;
    }

    if (
      destinationType === "APP" &&
      !appIconUrl.trim()
    ) {
      setLocalError(
        "App icon URL is required for app advertisements.",
      );

      return;
    }

    try {
      const finalMediaUrl =
        await ensureMediaUrl();

      if (
        !isValidHttpUrl(
          finalMediaUrl,
        )
      ) {
        throw new Error(
          "Media URL must be a valid HTTP or HTTPS URL.",
        );
      }

      const rawDestinationUrl =
        destinationUrl.trim();

      const normalizedDestinationUrl =
        rawDestinationUrl
          ? normalizeMediaUrl(
              rawDestinationUrl,
            )
          : undefined;

      const rawThumbnailUrl =
        thumbnailUrl.trim();

      const normalizedThumbnailUrl =
        rawThumbnailUrl
          ? normalizeMediaUrl(
              rawThumbnailUrl,
            )
          : undefined;

      const rawAppIconUrl =
        appIconUrl.trim();

      const normalizedAppIconUrl =
        rawAppIconUrl
          ? normalizeMediaUrl(
              rawAppIconUrl,
            )
          : undefined;

      if (
        normalizedDestinationUrl &&
        !isValidHttpUrl(
          normalizedDestinationUrl,
        )
      ) {
        throw new Error(
          "Destination URL must be a valid HTTP or HTTPS URL.",
        );
      }

      if (
        normalizedThumbnailUrl &&
        !isValidHttpUrl(
          normalizedThumbnailUrl,
        )
      ) {
        throw new Error(
          "Thumbnail URL must be a valid HTTP or HTTPS URL.",
        );
      }

      if (
        normalizedAppIconUrl &&
        !isValidHttpUrl(
          normalizedAppIconUrl,
        )
      ) {
        throw new Error(
          "App icon URL must be a valid HTTP or HTTPS URL.",
        );
      }

      /*
       * ================================================================
       * IMPORTANT FIX
       *
       * The backend DTO DOES NOT accept:
       *
       * placement: "FEED"
       *
       * It accepts:
       *
       * placements: ["FEED"]
       *
       * ================================================================
       */

      const placements =
        getBackendPlacements(
          placement,
        );

      const payload: CreateAdPayload = {
        campaignId:
          cleanCampaignId,

        name:
          cleanName,

        type,

        headline:
          cleanHeadline,

        description:
          description.trim() ||
          undefined,

        mediaUrl:
          finalMediaUrl,

        thumbnailUrl:
          type === "VIDEO"
            ? normalizedThumbnailUrl
            : undefined,

        appIconUrl:
          destinationType === "APP"
            ? normalizedAppIconUrl
            : undefined,

        destinationType,

        destinationUrl:
          normalizedDestinationUrl,

        callToAction:
          callToAction.trim() ||
          undefined,

        /*
         * FIXED:
         * placements is the backend field.
         */
        placements,

        /*
         * DO NOT SEND:
         *
         * placement
         */
      };

      console.log(
        "[Fockis Marketing] FINAL CREATE AD PAYLOAD",
        {
          endpoint:
            `${API_URL}/marketing/ads`,

          payload,

          campaignId:
            cleanCampaignId,

          placementUi:
            placement,

          placementsBackend:
            placements,

          mediaUrl:
            finalMediaUrl,

          mediaUrlIsValid:
            isValidHttpUrl(
              finalMediaUrl,
            ),
        },
      );

      const created =
        await submit(
          payload,
        );

      console.log(
        "[Fockis Marketing] Advertisement created",
        created,
      );

      if (!created) {
        throw new Error(
          "The advertisement request completed, but the server did not return the created advertisement.",
        );
      }

      onCreated(
        created,
      );

      onClose();
    } catch (
      submitError
    ) {
      console.error(
        "[Fockis Marketing] Create advertisement failed:",
        submitError,
      );

      if (
        submitError instanceof Error
      ) {
        setLocalError(
          submitError.message,
        );
      } else {
        setLocalError(
          "Unable to create the advertisement.",
        );
      }
    }
  }

  /* ==========================================================================
     UI
  ========================================================================== */

  const mediaLabel =
    type === "VIDEO"
      ? "Upload Advertisement Video"
      : type === "CAROUSEL"
        ? "Upload Carousel Media"
        : "Upload Advertisement Image";

  const accept =
    type === "VIDEO"
      ? ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
      : ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

  const canCreate =
    !submitting &&
    !uploading &&
    Boolean(
      campaignId.trim(),
    ) &&
    Boolean(
      name.trim(),
    ) &&
    Boolean(
      headline.trim(),
    ) &&
    headline.trim().length <=
      100 &&
    Boolean(
      mediaUrl.trim() ||
        selectedFile,
    );

  return (
    <div
      className="fk-marketing-modal-backdrop"
      onClick={handleClose}
    >
      <div
        className="fk-marketing-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="fk-marketing-card-header">
          <div>
            <span className="fk-marketing-eyebrow">
              AD CREATOR
            </span>

            <h2>
              Create Ad
            </h2>
          </div>

          <button
            type="button"
            className="fk-marketing-link"
            onClick={handleClose}
            disabled={
              submitting ||
              uploading
            }
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ERROR */}

        {displayError && (
          <div
            role="alert"
            className="fk-marketing-error"
          >
            {displayError}
          </div>
        )}

        {/* AD NAME */}

        <div className="fk-form-field">
          <label htmlFor="create-ad-name">
            Ad name (internal)
          </label>

          <input
            id="create-ad-name"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value,
              )
            }
            placeholder="e.g. Summer Sale — Feed Video"
            maxLength={150}
            disabled={
              submitting ||
              uploading
            }
          />
        </div>

        {/* AD TYPE */}

        <div className="fk-form-field">
          <label htmlFor="create-ad-type">
            Ad type
          </label>

          <select
            id="create-ad-type"
            value={type}
            onChange={(event) =>
              handleTypeChange(
                event.target
                  .value as AdvertisementType,
              )
            }
            disabled={
              submitting ||
              uploading
            }
          >
            {AD_TYPES.map(
              (adType) => (
                <option
                  key={adType}
                  value={adType}
                >
                  {adType ===
                  "CAROUSEL"
                    ? "Carousel"
                    : adType
                        .charAt(0)
                        .toUpperCase() +
                      adType
                        .slice(1)
                        .toLowerCase()}
                </option>
              ),
            )}
          </select>
        </div>

        {/* HEADLINE */}

        <div className="fk-form-field">
          <label htmlFor="create-ad-headline">
            Headline
          </label>

          <input
            id="create-ad-headline"
            value={headline}
            onChange={(event) =>
              setHeadline(
                event.target.value,
              )
            }
            placeholder="e.g. Discover the New Collection"
            maxLength={100}
            disabled={
              submitting ||
              uploading
            }
          />

          <small>
            Maximum 100 characters.
          </small>
        </div>

        {/* DESCRIPTION */}

        <div className="fk-form-field">
          <label htmlFor="create-ad-description">
            Description
          </label>

          <textarea
            id="create-ad-description"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            rows={3}
            maxLength={500}
            disabled={
              submitting ||
              uploading
            }
          />
        </div>

        {/* MEDIA UPLOAD */}

        <div className="fk-form-field">
          <label>
            {mediaLabel}
          </label>

          <div
            className="fk-marketing-upload-box"
            onClick={() =>
              fileInputRef.current?.click()
            }
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();

                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={
                handleFileSelected
              }
              disabled={
                submitting ||
                uploading
              }
              style={{
                display: "none",
              }}
            />

            {!selectedFile ? (
              <>
                <div
                  style={{
                    fontSize: "32px",
                    marginBottom: "8px",
                  }}
                >
                  {type === "VIDEO"
                    ? "🎬"
                    : "🖼️"}
                </div>

                <strong>
                  Click to choose a{" "}
                  {type === "VIDEO"
                    ? "video"
                    : "photo"}
                </strong>

                <p>
                  Or drag and drop your{" "}
                  {type === "VIDEO"
                    ? "video"
                    : "image"}{" "}
                  here
                </p>

                <small>
                  {type === "VIDEO"
                    ? "MP4, WebM, MOV • Maximum 50 MB"
                    : "JPG, PNG, WebP • Maximum 10 MB"}
                </small>
              </>
            ) : (
              <>
                <strong>
                  {selectedFile.name}
                </strong>

                <p>
                  {(
                    selectedFile.size /
                    (1024 * 1024)
                  ).toFixed(2)}{" "}
                  MB
                </p>

                <small>
                  Click to choose a different file
                </small>
              </>
            )}
          </div>

          {/* VIDEO PREVIEW */}

          {previewUrl &&
            type === "VIDEO" && (
              <video
                src={previewUrl}
                controls
                style={{
                  width: "100%",
                  maxHeight: "280px",
                  marginTop: "12px",
                  borderRadius: "10px",
                }}
              />
            )}

          {/* IMAGE PREVIEW */}

          {previewUrl &&
            type !== "VIDEO" && (
              <img
                src={previewUrl}
                alt="Advertisement preview"
                style={{
                  width: "100%",
                  maxHeight: "280px",
                  objectFit: "contain",
                  marginTop: "12px",
                  borderRadius: "10px",
                }}
              />
            )}

          {selectedFile && (
            <button
              type="button"
              className="fk-marketing-link"
              onClick={resetMedia}
              disabled={
                submitting ||
                uploading
              }
              style={{
                marginTop: "8px",
              }}
            >
              Remove selected file
            </button>
          )}
        </div>

        {/* EXISTING MEDIA URL */}

        <div className="fk-form-field">
          <label htmlFor="create-ad-media-url">
            Or use an existing media URL
          </label>

          <input
            id="create-ad-media-url"
            type="url"
            value={mediaUrl}
            onChange={(event) => {
              setSelectedFile(
                null,
              );

              if (
                previewObjectUrlRef.current
              ) {
                URL.revokeObjectURL(
                  previewObjectUrlRef.current,
                );

                previewObjectUrlRef.current =
                  null;
              }

              setPreviewUrl("");

              setMediaUrl(
                event.target.value,
              );
            }}
            placeholder="https://..."
            disabled={
              submitting ||
              uploading
            }
          />

          <small>
            Must be an HTTP or HTTPS URL.
          </small>
        </div>

        {/* VIDEO THUMBNAIL */}

        {type === "VIDEO" && (
          <div className="fk-form-field">
            <label htmlFor="create-ad-thumbnail">
              Thumbnail / poster URL
            </label>

            <input
              id="create-ad-thumbnail"
              type="url"
              value={
                thumbnailUrl
              }
              onChange={(event) =>
                setThumbnailUrl(
                  event.target.value,
                )
              }
              placeholder="https://..."
              disabled={
                submitting ||
                uploading
              }
            />

            <small>
              Optional.
            </small>
          </div>
        )}

        {/* DESTINATION */}

        <div className="fk-form-field">
          <label htmlFor="create-ad-destination-type">
            Destination
          </label>

          <select
            id="create-ad-destination-type"
            value={
              destinationType
            }
            onChange={(event) =>
              setDestinationType(
                event.target
                  .value as AdvertisementDestinationType,
              )
            }
            disabled={
              submitting ||
              uploading
            }
          >
            {DESTINATION_TYPES.map(
              (destination) => (
                <option
                  key={destination}
                  value={destination}
                >
                  {destination ===
                  "WEBSITE"
                    ? "Website"
                    : destination
                        .charAt(0)
                        .toUpperCase() +
                      destination
                        .slice(1)
                        .toLowerCase()}
                </option>
              ),
            )}
          </select>
        </div>

        {/* DESTINATION URL */}

        {destinationType !==
          "APP" &&
          destinationType !==
            "STORE" && (
            <div className="fk-form-field">
              <label htmlFor="create-ad-destination-url">
                Destination URL
                <span
                  style={{
                    fontWeight: 400,
                    opacity: 0.65,
                    marginLeft: "6px",
                  }}
                >
                  (Optional)
                </span>
              </label>

              <input
                id="create-ad-destination-url"
                type="url"
                value={
                  destinationUrl
                }
                onChange={(event) =>
                  setDestinationUrl(
                    event.target.value,
                  )
                }
                placeholder="https://example.com"
                disabled={
                  submitting ||
                  uploading
                }
              />

              <small>
                Optional.
              </small>
            </div>
          )}

        {/* APP */}

        {destinationType ===
          "APP" && (
          <>
            <div className="fk-marketing-description">
              <strong>
                App destination
              </strong>

              <p>
                App Store and Google Play
                URLs are taken from the
                campaign's APP_INSTALL
                settings.
              </p>
            </div>

            <div className="fk-form-field">
              <label htmlFor="create-ad-app-icon">
                App icon URL
              </label>

              <input
                id="create-ad-app-icon"
                type="url"
                value={
                  appIconUrl
                }
                onChange={(event) =>
                  setAppIconUrl(
                    event.target.value,
                  )
                }
                placeholder="https://..."
                disabled={
                  submitting ||
                  uploading
                }
              />
            </div>
          </>
        )}

        {/* STORE */}

        {destinationType ===
          "STORE" && (
          <div className="fk-marketing-description">
            <strong>
              Store destination
            </strong>

            <p>
              This advertisement will
              direct users to the
              configured Fockis store.
            </p>
          </div>
        )}

        {/* CTA */}

        <div className="fk-form-field">
          <label htmlFor="create-ad-cta">
            Call to action
          </label>

          <select
            id="create-ad-cta"
            value={
              callToAction
            }
            onChange={(event) =>
              setCallToAction(
                event.target.value,
              )
            }
            disabled={
              submitting ||
              uploading
            }
          >
            {CTA_OPTIONS.map(
              (cta) => (
                <option
                  key={
                    cta ||
                    "none"
                  }
                  value={cta}
                >
                  {cta
                    ? cta
                        .replace(
                          /_/g,
                          " ",
                        )
                        .replace(
                          /\b\w/g,
                          (
                            letter,
                          ) =>
                            letter.toUpperCase(),
                        )
                    : "No CTA"}
                </option>
              ),
            )}
          </select>
        </div>        {/* PLACEMENT */}

        <AdPlacementSelector
          value={placement}
          onChange={(value) => {
            if (
              value === "FEED" ||
              value === "MARKETPLACE"
            ) {
              setPlacement(value);
            }
          }}
        />

        {/* ACTIONS */}

        <div className="fk-marketing-action-list">
          <button
            type="button"
            className="fk-marketing-primary-button"
            disabled={
              !canCreate
            }
            onClick={
              handleSubmit
            }
          >
            {uploading
              ? "Uploading..."
              : submitting
                ? "Creating..."
                : "Create Ad"}
          </button>

          <button
            type="button"
            className="fk-marketing-secondary-button"
            onClick={
              handleClose
            }
            disabled={
              submitting ||
              uploading
            }
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}