import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import type {
  CreateCampaignPayload,
} from "../types/marketingTypes";


/* ============================================================================
   CAMPAIGN VALUES
============================================================================ */

type CampaignObjective =
  | "APP_INSTALL"
  | "PRODUCT_SALES"
  | "WEBSITE_TRAFFIC"
  | "ENGAGEMENT"
  | "BRAND_AWARENESS";

type CampaignAdFormat =
  | "VIDEO"
  | "IMAGE"
  | "CAROUSEL";


/* ============================================================================
   BACKEND PLACEMENTS
============================================================================ */

/*
 * These values MUST match the NestJS backend enum.
 *
 * Backend accepts:
 *
 * FEED
 * STORY
 * MARKETPLACE_BANNER
 * PRODUCT
 * STORE
 * REAL_ESTATE
 * PROFILE
 */

type BackendPlacement =
  | "FEED"
  | "STORY"
  | "MARKETPLACE_BANNER"
  | "PRODUCT"
  | "STORE"
  | "REAL_ESTATE"
  | "PROFILE";


/* ============================================================================
   UI PLACEMENTS
============================================================================ */

type FormPlacement =
  | "FEED"
  | "STORY"
  | "SIDEBAR"
  | "MARKETPLACE";


/* ============================================================================
   UI → BACKEND PLACEMENT MAP
============================================================================ */

const PLACEMENT_MAP: Record<
  FormPlacement,
  BackendPlacement | null
> = {
  FEED: "FEED",

  STORY: "STORY",

  /*
   * SIDEBAR is currently not supported by the backend.
   * Keep it visible in the UI, but never submit it.
   */
  SIDEBAR: null,

  /*
   * The backend calls the marketplace banner placement
   * MARKETPLACE_BANNER.
   */
  MARKETPLACE: "MARKETPLACE_BANNER",
};


/* ============================================================================
   FORM VALUES
============================================================================ */

/*
 * IMPORTANT:
 *
 * We omit placements from CreateCampaignPayload because the UI uses
 * FormPlacement[] while the backend uses BackendPlacement[].
 */

type CampaignFormValues =
  Omit<
    Partial<CreateCampaignPayload>,
    "placements"
  > & {
    placements?: FormPlacement[];

    headline?: string;

    adFormat?: CampaignAdFormat;

    mediaUrl?: string;

    thumbnailUrl?: string;

    appIconUrl?: string;
  };


/* ============================================================================
   PROPS
============================================================================ */

interface Props {
  loading?: boolean;

  initialValues?: CampaignFormValues;

  onSubmit: (
    payload: CreateCampaignPayload,
  ) => Promise<void> | void;
}


/* ============================================================================
   PLACEMENT OPTIONS
============================================================================ */

const PLACEMENT_OPTIONS: {
  value: FormPlacement;
  label: string;
  description: string;
}[] = [
  {
    value: "FEED",
    label: "Feed",
    description:
      "Show your advertisement in the main Fockis feed.",
  },

  {
    value: "STORY",
    label: "Stories",
    description:
      "Show your advertisement in Fockis stories.",
  },

  {
    value: "SIDEBAR",
    label: "Sidebar",
    description:
      "Show your advertisement in supported sidebar locations.",
  },

  {
    value: "MARKETPLACE",
    label: "Marketplace",
    description:
      "Show your advertisement inside the marketplace.",
  },
];


/* ============================================================================
   FILE LIMITS
============================================================================ */

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_VIDEO_SIZE =
  100 * 1024 * 1024;


/* ============================================================================
   COMPONENT
============================================================================ */

export default function CampaignForm({
  loading = false,
  initialValues,
  onSubmit,
}: Props) {


  /* ==========================================================================
     BASIC INFORMATION
  ========================================================================== */

  const [
    name,
    setName,
  ] = useState(
    initialValues?.name ?? "",
  );


  const [
    headline,
    setHeadline,
  ] = useState(
    initialValues?.headline ?? "",
  );


  const [
    description,
    setDescription,
  ] = useState(
    initialValues?.description ?? "",
  );


  /* ==========================================================================
     OBJECTIVE
  ========================================================================== */

  const [
    objective,
    setObjective,
  ] = useState<CampaignObjective>(
    (
      initialValues?.objective as CampaignObjective
    ) ?? "BRAND_AWARENESS",
  );


  /* ==========================================================================
     AD FORMAT
  ========================================================================== */

  const [
    adFormat,
    setAdFormat,
  ] = useState<CampaignAdFormat>(
    initialValues?.adFormat ??
      "IMAGE",
  );


  /* ==========================================================================
     PLACEMENTS
  ========================================================================== */

  const [
    placements,
    setPlacements,
  ] = useState<FormPlacement[]>(
    initialValues?.placements?.length
      ? initialValues.placements
      : ["FEED"],
  );


  /* ==========================================================================
     MEDIA URL
  ========================================================================== */

  const [
    mediaUrl,
    setMediaUrl,
  ] = useState(
    initialValues?.mediaUrl ?? "",
  );


  /* ==========================================================================
     THUMBNAIL URL
  ========================================================================== */

  const [
    thumbnailUrl,
    setThumbnailUrl,
  ] = useState(
    initialValues?.thumbnailUrl ?? "",
  );


  /* ==========================================================================
     APP ICON URL
  ========================================================================== */

  const [
    appIconUrl,
    setAppIconUrl,
  ] = useState(
    initialValues?.appIconUrl ?? "",
  );


  /* ==========================================================================
     MEDIA FILE
  ========================================================================== */

  const [
    mediaFile,
    setMediaFile,
  ] = useState<File | null>(
    null,
  );


  /* ==========================================================================
     CAROUSEL FILES
  ========================================================================== */

  const [
    carouselFiles,
    setCarouselFiles,
  ] = useState<File[]>(
    [],
  );


  /* ==========================================================================
     MEDIA PREVIEW
  ========================================================================== */

  const [
    mediaPreview,
    setMediaPreview,
  ] = useState(
    initialValues?.mediaUrl ?? "",
  );


  /* ==========================================================================
     CAROUSEL PREVIEWS
  ========================================================================== */

  const carouselPreviews =
    useMemo(
      () =>
        carouselFiles.map(
          (file) =>
            URL.createObjectURL(
              file,
            ),
        ),
      [carouselFiles],
    );


  useEffect(() => {

    return () => {

      carouselPreviews.forEach(
        (url) => {
          URL.revokeObjectURL(
            url,
          );
        },
      );

    };

  }, [carouselPreviews]);


  /* ==========================================================================
     APP INSTALLATION
  ========================================================================== */

  const [
    appName,
    setAppName,
  ] = useState(
    initialValues?.appName ?? "",
  );


  const [
    appStoreUrl,
    setAppStoreUrl,
  ] = useState(
    initialValues?.appStoreUrl ?? "",
  );


  const [
    googlePlayUrl,
    setGooglePlayUrl,
  ] = useState(
    initialValues?.googlePlayUrl ?? "",
  );


  /* ==========================================================================
     BUDGET
  ========================================================================== */

  const [
    totalBudget,
    setTotalBudget,
  ] = useState(
    String(
      initialValues?.totalBudget ?? "",
    ),
  );


  const [
    dailyBudget,
    setDailyBudget,
  ] = useState(
    String(
      initialValues?.dailyBudget ?? "",
    ),
  );


  /* ==========================================================================
     DATES
  ========================================================================== */

  const [
    startDate,
    setStartDate,
  ] = useState(
    initialValues?.startDate
      ? initialValues.startDate.slice(
          0,
          10,
        )
      : "",
  );


  const [
    endDate,
    setEndDate,
  ] = useState(
    initialValues?.endDate
      ? initialValues.endDate.slice(
          0,
          10,
        )
      : "",
  );


  /* ==========================================================================
     ERROR
  ========================================================================== */

  const [
    error,
    setError,
  ] = useState("");


  /* ==========================================================================
     MEDIA ACCEPT
  ========================================================================== */

  const mediaAccept =
    useMemo(() => {

      if (
        adFormat ===
        "VIDEO"
      ) {
        return [
          "video/mp4",
          "video/webm",
          "video/quicktime",
        ].join(",");
      }

      return [
        "image/jpeg",
        "image/png",
        "image/webp",
      ].join(",");

    }, [adFormat]);


  /* ==========================================================================
     CLEAN MEDIA PREVIEW
  ========================================================================== */

  useEffect(() => {

    return () => {

      if (
        mediaPreview.startsWith(
          "blob:",
        )
      ) {
        URL.revokeObjectURL(
          mediaPreview,
        );
      }

    };

  }, [mediaPreview]);


  /* ==========================================================================
     TOGGLE PLACEMENT
  ========================================================================== */

  function togglePlacement(
    placement: FormPlacement,
  ) {

    setPlacements(
      (current) => {

        if (
          current.includes(
            placement,
          )
        ) {

          /*
           * Never allow zero selections.
           */
          if (
            current.length === 1
          ) {
            return current;
          }

          return current.filter(
            (item) =>
              item !== placement,
          );
        }

        return [
          ...current,
          placement,
        ];

      },
    );

  }


  /* ==========================================================================
     FORMAT CHANGE
  ========================================================================== */

  function handleAdFormatChange(
    nextFormat: CampaignAdFormat,
  ) {

    setAdFormat(
      nextFormat,
    );

    setError("");

    setMediaFile(
      null,
    );

    setCarouselFiles(
      [],
    );

    if (
      mediaPreview.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        mediaPreview,
      );
    }

    setMediaPreview(
      nextFormat ===
        "CAROUSEL"
        ? ""
        : mediaUrl,
    );

  }


  /* ==========================================================================
     MEDIA VALIDATION
  ========================================================================== */

  function validateMediaFile(
    file: File,
  ): boolean {

    if (
      adFormat ===
      "IMAGE"
    ) {

      if (
        !file.type.startsWith(
          "image/",
        )
      ) {

        setError(
          "Please select a valid image file.",
        );

        return false;
      }


      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {

        setError(
          "Image must be 10 MB or smaller.",
        );

        return false;
      }

    }


    if (
      adFormat ===
      "VIDEO"
    ) {

      if (
        !file.type.startsWith(
          "video/",
        )
      ) {

        setError(
          "Please select a valid video file.",
        );

        return false;
      }


      if (
        file.size >
        MAX_VIDEO_SIZE
      ) {

        setError(
          "Video must be 100 MB or smaller.",
        );

        return false;
      }

    }


    return true;
  }


  /* ==========================================================================
     MEDIA FILE SELECT
  ========================================================================== */

  function selectMediaFile(
    file: File,
  ) {

    setError("");

    if (
      !validateMediaFile(
        file,
      )
    ) {
      return;
    }


    if (
      mediaPreview.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        mediaPreview,
      );
    }


    const previewUrl =
      URL.createObjectURL(
        file,
      );


    setMediaFile(
      file,
    );

    setMediaPreview(
      previewUrl,
    );

  }


  /* ==========================================================================
     FILE INPUT CHANGE
  ========================================================================== */

  function handleMediaFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    selectMediaFile(
      file,
    );

    event.target.value =
      "";

  }


  /* ==========================================================================
     DRAG AND DROP
  ========================================================================== */

  function handleMediaDrop(
    event: DragEvent<HTMLDivElement>,
  ) {

    event.preventDefault();

    setError("");

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    selectMediaFile(
      file,
    );

  }


  /* ==========================================================================
     CAROUSEL FILES
  ========================================================================== */

  function handleCarouselFiles(
    event: ChangeEvent<HTMLInputElement>,
  ) {

    setError("");

    const files =
      Array.from(
        event.target.files ?? [],
      );


    if (
      files.length === 0
    ) {
      return;
    }


    if (
      files.some(
        (file) =>
          !file.type.startsWith(
            "image/",
          ),
      )
    ) {

      setError(
        "Carousel advertisements can only contain image files.",
      );

      event.target.value =
        "";

      return;
    }


    if (
      files.some(
        (file) =>
          file.size >
          MAX_IMAGE_SIZE,
      )
    ) {

      setError(
        "Each carousel image must be 10 MB or smaller.",
      );

      event.target.value =
        "";

      return;
    }


    setCarouselFiles(
      (current) =>
        [
          ...current,
          ...files,
        ].slice(
          0,
          10,
        ),
    );


    event.target.value =
      "";

  }


  /* ==========================================================================
     REMOVE MEDIA
  ========================================================================== */

  function removeMediaFile() {

    if (
      mediaPreview.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        mediaPreview,
      );
    }

    setMediaFile(
      null,
    );

    setMediaPreview(
      mediaUrl,
    );

  }


  /* ==========================================================================
     REMOVE CAROUSEL
  ========================================================================== */

  function removeCarouselFile(
    index: number,
  ) {

    setCarouselFiles(
      (current) =>
        current.filter(
          (_, fileIndex) =>
            fileIndex !== index,
        ),
    );

  }


  /* ==========================================================================
     CONVERT UI PLACEMENTS TO BACKEND PLACEMENTS
  ========================================================================== */

  function getBackendPlacements(): BackendPlacement[] {

    const mapped =
      placements
        .map(
          (placement) =>
            PLACEMENT_MAP[
              placement
            ],
        )
        .filter(
          (
            placement,
          ): placement is BackendPlacement =>
            placement !== null,
        );


    /*
     * Remove duplicates.
     */
    return Array.from(
      new Set(
        mapped,
      ),
    );

  }


  /* ==========================================================================
     SUBMIT
  ========================================================================== */

  async function handleSubmit(
    event: FormEvent,
  ) {

    event.preventDefault();

    setError("");


    /* ------------------------------------------------------------------------
       BASIC VALIDATION
    ------------------------------------------------------------------------ */

    if (
      !name.trim()
    ) {

      setError(
        "Campaign name is required.",
      );

      return;
    }


    if (
      !headline.trim()
    ) {

      setError(
        "Advertisement headline is required.",
      );

      return;
    }


    if (
      !startDate
    ) {

      setError(
        "Start date is required.",
      );

      return;
    }


    /* ------------------------------------------------------------------------
       PLACEMENT VALIDATION
    ------------------------------------------------------------------------ */

    const backendPlacements =
      getBackendPlacements();


    if (
      backendPlacements.length === 0
    ) {

      setError(
        "Please select at least one supported advertisement placement.",
      );

      return;
    }


    /* ------------------------------------------------------------------------
       MEDIA VALIDATION
    ------------------------------------------------------------------------ */

    if (
      adFormat ===
        "IMAGE" &&
      !mediaFile &&
      !mediaUrl.trim()
    ) {

      setError(
        "Please upload an advertisement image.",
      );

      return;
    }


    if (
      adFormat ===
        "VIDEO" &&
      !mediaFile &&
      !mediaUrl.trim()
    ) {

      setError(
        "Please upload an advertisement video.",
      );

      return;
    }


    if (
      adFormat ===
        "CAROUSEL" &&
      carouselFiles.length === 0 &&
      !mediaUrl.trim()
    ) {

      setError(
        "Please upload at least one carousel image.",
      );

      return;
    }


    /* ------------------------------------------------------------------------
       BUDGET
    ------------------------------------------------------------------------ */

    const parsedDailyBudget =
      Number(
        dailyBudget,
      );


    const parsedTotalBudget =
      Number(
        totalBudget,
      );


    if (
      !Number.isFinite(
        parsedDailyBudget,
      ) ||
      parsedDailyBudget <
        0.01
    ) {

      setError(
        "Daily budget must be at least $0.01.",
      );

      return;
    }


    if (
      !Number.isFinite(
        parsedTotalBudget,
      ) ||
      parsedTotalBudget <
        0.01
    ) {

      setError(
        "Total budget must be at least $0.01.",
      );

      return;
    }


    /* ------------------------------------------------------------------------
       APP INSTALL
    ------------------------------------------------------------------------ */

    if (
      objective ===
        "APP_INSTALL" &&
      !appName.trim()
    ) {

      setError(
        "App name is required for app installation campaigns.",
      );

      return;
    }


    /* ------------------------------------------------------------------------
       BACKEND PAYLOAD
    ------------------------------------------------------------------------ */

    const payload =
      {

        name:
          name.trim(),

        objective,

        adFormat,

        headline:
          headline.trim(),

        description:
          description.trim() ||
          undefined,

        /*
         * IMPORTANT:
         * The backend requires placements.
         */
        placements:
          backendPlacements,

        mediaUrl:
          mediaUrl.trim() ||
          undefined,

        thumbnailUrl:
          thumbnailUrl.trim() ||
          undefined,

        appIconUrl:
          appIconUrl.trim() ||
          undefined,

        appName:
          objective ===
            "APP_INSTALL"
            ? appName.trim() ||
              undefined
            : undefined,

        appStoreUrl:
          objective ===
            "APP_INSTALL"
            ? appStoreUrl.trim() ||
              undefined
            : undefined,

        googlePlayUrl:
          objective ===
            "APP_INSTALL"
            ? googlePlayUrl.trim() ||
              undefined
            : undefined,

        dailyBudget:
          parsedDailyBudget,

        totalBudget:
          parsedTotalBudget,

        startDate,

        endDate:
          endDate ||
          undefined,

      } as CreateCampaignPayload;


    /*
     * Useful during testing.
     *
     * Example request now contains:
     *
     * placements: ["FEED"]
     *
     * instead of:
     *
     * placements: undefined
     */

    console.log(
      "[Fockis Marketing] Creating campaign:",
      payload,
    );


    await onSubmit(
      payload,
    );

  }


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (

    <form
      className="fk-marketing-form"
      onSubmit={
        handleSubmit
      }
    >

      {/* ======================================================================
          ERROR
      ====================================================================== */}

      {error && (

        <div
          role="alert"
          className="fk-marketing-error"
        >
          {error}
        </div>

      )}


      {/* ======================================================================
          CAMPAIGN NAME
      ====================================================================== */}

      <div className="fk-form-field">

        <label>
          Campaign name
        </label>

        <input
          value={name}
          onChange={(event) =>
            setName(
              event.target.value,
            )
          }
          placeholder="Fockis Summer Campaign"
          maxLength={150}
          required
        />

      </div>


      {/* ======================================================================
          HEADLINE
      ====================================================================== */}

      <div className="fk-form-field">

        <label>
          Advertisement headline
        </label>

        <input
          value={headline}
          onChange={(event) =>
            setHeadline(
              event.target.value,
            )
          }
          placeholder="Discover Fockis"
          maxLength={100}
          required
        />

        <small>
          Maximum 100 characters.
        </small>

      </div>


      {/* ======================================================================
          DESCRIPTION
      ====================================================================== */}

      <div className="fk-form-field">

        <label>
          Description
        </label>

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value,
            )
          }
          placeholder="Describe your campaign"
          maxLength={500}
          rows={4}
        />

      </div>


      {/* ======================================================================
          OBJECTIVE
      ====================================================================== */}

      <div className="fk-form-field">

        <label>
          Campaign objective
        </label>

        <select
          value={objective}
          onChange={(event) =>
            setObjective(
              event.target.value as CampaignObjective,
            )
          }
        >

          <option value="BRAND_AWARENESS">
            Brand Awareness
          </option>

          <option value="WEBSITE_TRAFFIC">
            Website Traffic
          </option>

          <option value="ENGAGEMENT">
            Engagement
          </option>

          <option value="PRODUCT_SALES">
            Product Sales
          </option>

          <option value="APP_INSTALL">
            App Installations
          </option>

        </select>

      </div>


      {/* ======================================================================
          AD FORMAT
      ====================================================================== */}

      <div className="fk-form-field">

        <label>
          Advertisement format
        </label>

        <select
          value={adFormat}
          onChange={(event) =>
            handleAdFormatChange(
              event.target.value as CampaignAdFormat,
            )
          }
        >

          <option value="IMAGE">
            Image Advertisement
          </option>

          <option value="VIDEO">
            Video Advertisement
          </option>

          <option value="CAROUSEL">
            Carousel Advertisement
          </option>

        </select>

      </div>


      {/* ======================================================================
          AD CREATIVE
      ====================================================================== */}

      <section className="fk-marketing-panel fk-ad-creative-panel">

        <div>

          <span className="fk-marketing-eyebrow">
            AD CREATIVE
          </span>

          <h2>
            Upload your advertisement
          </h2>

          <p>
            Select the photo or video
            you want Fockis to display
            to users.
          </p>

        </div>


        {/* ====================================================================
            IMAGE
        ==================================================================== */}

        {adFormat ===
          "IMAGE" && (

          <div className="fk-ad-upload-area">

            <input
              id="campaign-image-upload"
              type="file"
              accept={mediaAccept}
              onChange={
                handleMediaFileChange
              }
              hidden
            />

            <label
              htmlFor="campaign-image-upload"
              className="fk-ad-upload-button"
            >

              <span className="fk-ad-upload-icon">
                🖼️
              </span>

              <strong>
                Upload Advertisement Image
              </strong>

              <small>
                Click to choose a photo
              </small>

            </label>


            <div
              className="fk-ad-drop-zone"
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={
                handleMediaDrop
              }
            >

              <strong>
                Or drag and drop your image here
              </strong>

              <span>
                JPG, PNG, WebP • Maximum 10 MB
              </span>

            </div>


            {mediaFile && (

              <div className="fk-ad-selected-file">

                <div>

                  <strong>
                    {mediaFile.name}
                  </strong>

                  <small>
                    {(
                      mediaFile.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </small>

                </div>

                <button
                  type="button"
                  onClick={
                    removeMediaFile
                  }
                >
                  Remove
                </button>

              </div>

            )}


            {mediaPreview && (

              <div className="fk-marketing-media-preview">

                <img
                  src={
                    mediaPreview
                  }
                  alt="Advertisement preview"
                />

              </div>

            )}

          </div>

        )}


        {/* ====================================================================
            VIDEO
        ==================================================================== */}

        {adFormat ===
          "VIDEO" && (

          <div className="fk-ad-upload-area">

            <input
              id="campaign-video-upload"
              type="file"
              accept={mediaAccept}
              onChange={
                handleMediaFileChange
              }
              hidden
            />

            <label
              htmlFor="campaign-video-upload"
              className="fk-ad-upload-button"
            >

              <span className="fk-ad-upload-icon">
                🎬
              </span>

              <strong>
                Upload Advertisement Video
              </strong>

              <small>
                Click to choose a video
              </small>

            </label>


            <div
              className="fk-ad-drop-zone"
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={
                handleMediaDrop
              }
            >

              <strong>
                Or drag and drop your video here
              </strong>

              <span>
                MP4, WebM, MOV • Maximum 100 MB
              </span>

            </div>


            {mediaFile && (

              <div className="fk-ad-selected-file">

                <div>

                  <strong>
                    {mediaFile.name}
                  </strong>

                  <small>
                    {(
                      mediaFile.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </small>

                </div>

                <button
                  type="button"
                  onClick={
                    removeMediaFile
                  }
                >
                  Remove
                </button>

              </div>

            )}


            {mediaPreview && (

              <div className="fk-marketing-media-preview">

                <video
                  src={
                    mediaPreview
                  }
                  controls
                  playsInline
                />

              </div>

            )}

          </div>

        )}


        {/* ====================================================================
            CAROUSEL
        ==================================================================== */}

        {adFormat ===
          "CAROUSEL" && (

          <div className="fk-ad-upload-area">

            <input
              id="campaign-carousel-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={
                handleCarouselFiles
              }
              hidden
            />

            <label
              htmlFor="campaign-carousel-upload"
              className="fk-ad-upload-button"
            >

              <span className="fk-ad-upload-icon">
                🖼️
              </span>

              <strong>
                Upload Carousel Images
              </strong>

              <small>
                Select multiple photos
              </small>

            </label>


            <div className="fk-ad-drop-zone">

              <strong>
                Add up to 10 images
              </strong>

              <span>
                JPG, PNG, WebP • Maximum 10 MB each
              </span>

            </div>


            {carouselFiles.length >
              0 && (

              <div
                className="fk-carousel-preview-grid"
              >

                {carouselFiles.map(
                  (
                    file,
                    index,
                  ) => (

                    <div
                      key={`${file.name}-${index}`}
                      className="fk-carousel-preview-item"
                    >

                      <img
                        src={
                          carouselPreviews[
                            index
                          ]
                        }
                        alt={
                          `Carousel ${index + 1}`
                        }
                      />

                      <div>

                        <small>
                          {file.name}
                        </small>

                        <button
                          type="button"
                          onClick={() =>
                            removeCarouselFile(
                              index,
                            )
                          }
                        >
                          Remove
                        </button>

                      </div>

                    </div>

                  ),
                )}

              </div>

            )}

          </div>

        )}


        {/* ====================================================================
            URL FALLBACK
        ==================================================================== */}

        <details className="fk-ad-url-fallback">

          <summary>
            Use an existing media URL instead
          </summary>

          <div className="fk-form-field">

            <label>
              Media URL
            </label>

            <input
              type="url"
              value={mediaUrl}
              onChange={(event) =>
                setMediaUrl(
                  event.target.value,
                )
              }
              placeholder="https://example.com/ad-image.jpg"
            />

            <small>
              Use this when your advertisement
              has already been uploaded to
              your media server.
            </small>

          </div>

        </details>

      </section>


      {/* ======================================================================
          VIDEO THUMBNAIL
      ====================================================================== */}

      {adFormat ===
        "VIDEO" && (

        <div className="fk-form-field">

          <label>
            Video thumbnail URL
          </label>

          <input
            type="url"
            value={thumbnailUrl}
            onChange={(event) =>
              setThumbnailUrl(
                event.target.value,
              )
            }
            placeholder="https://example.com/video-thumbnail.jpg"
          />

          <small>
            Optional preview image displayed
            before the video plays.
          </small>

        </div>

      )}


      {/* ======================================================================
          APP ICON
      ====================================================================== */}

      {objective ===
        "APP_INSTALL" && (

        <div className="fk-form-field">

          <label>
            App Icon URL
          </label>

          <input
            type="url"
            value={appIconUrl}
            onChange={(event) =>
              setAppIconUrl(
                event.target.value,
              )
            }
            placeholder="https://example.com/icon.png"
          />

        </div>

      )}


      {/* ======================================================================
          PLACEMENTS
      ====================================================================== */}

      <section className="fk-marketing-panel">

        <div>

          <span className="fk-marketing-eyebrow">
            AD PLACEMENT
          </span>

          <h2>
            Where should the advertisement appear?
          </h2>

          <p>
            Choose where Fockis should
            deliver this advertisement.
          </p>

        </div>


        <div className="fk-form-grid">

          {PLACEMENT_OPTIONS.map(
            (option) => {

              const selected =
                placements.includes(
                  option.value,
                );


              const backendValue =
                PLACEMENT_MAP[
                  option.value
                ];


              return (

                <button
                  key={
                    option.value
                  }
                  type="button"
                  className={
                    selected
                      ? "fk-placement-card is-selected"
                      : "fk-placement-card"
                  }
                  onClick={() =>
                    togglePlacement(
                      option.value,
                    )
                  }
                >

                  <span className="fk-placement-card__check">
                    {selected
                      ? "✓"
                      : ""}
                  </span>

                  <strong>
                    {option.label}
                  </strong>

                  <small>
                    {option.description}
                  </small>

                  {!backendValue && (

                    <small>
                      Backend support coming soon
                    </small>

                  )}

                </button>

              );

            },
          )}

        </div>


        <small>
          Selected:{" "}
          {placements.length}{" "}
          placement
          {placements.length !==
          1
            ? "s"
            : ""}
        </small>

      </section>


      {/* ======================================================================
          APP INSTALLATION
      ====================================================================== */}

      {objective ===
        "APP_INSTALL" && (

        <section className="fk-marketing-panel">

          <div>

            <span className="fk-marketing-eyebrow">
              APP INSTALLATION
            </span>

            <h2>
              App Download Information
            </h2>

            <p>
              Tell users where they can
              download your application.
            </p>

          </div>


          <div className="fk-form-grid">

            <div className="fk-form-field">

              <label>
                App name
              </label>

              <input
                value={appName}
                onChange={(event) =>
                  setAppName(
                    event.target.value,
                  )
                }
                maxLength={150}
                placeholder="Fockis"
                required
              />

            </div>


            <div className="fk-form-field">

              <label>
                Apple App Store URL
              </label>

              <input
                type="url"
                value={appStoreUrl}
                onChange={(event) =>
                  setAppStoreUrl(
                    event.target.value,
                  )
                }
                placeholder="https://apps.apple.com/..."
              />

            </div>


            <div className="fk-form-field">

              <label>
                Google Play URL
              </label>

              <input
                type="url"
                value={googlePlayUrl}
                onChange={(event) =>
                  setGooglePlayUrl(
                    event.target.value,
                  )
                }
                placeholder="https://play.google.com/store/apps/..."
              />

            </div>

          </div>

        </section>

      )}


      {/* ======================================================================
          BUDGET
      ====================================================================== */}

      <section className="fk-marketing-panel">

        <div>

          <span className="fk-marketing-eyebrow">
            BUDGET & SCHEDULE
          </span>

          <h2>
            Campaign budget
          </h2>

        </div>


        <div className="fk-form-grid">

          <div className="fk-form-field">

            <label>
              Total budget
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={totalBudget}
              onChange={(event) =>
                setTotalBudget(
                  event.target.value,
                )
              }
              required
            />

          </div>


          <div className="fk-form-field">

            <label>
              Daily budget
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={dailyBudget}
              onChange={(event) =>
                setDailyBudget(
                  event.target.value,
                )
              }
              required
            />

          </div>


          <div className="fk-form-field">

            <label>
              Start date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value,
                )
              }
              required
            />

          </div>


          <div className="fk-form-field">

            <label>
              End date
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value,
                )
              }
            />

          </div>

        </div>

      </section>


      {/* ======================================================================
          SUBMIT
      ====================================================================== */}

      <button
        type="submit"
        disabled={
          loading ||
          placements.length ===
            0
        }
        className="fk-marketing-primary-button"
      >

        {loading
          ? "Creating..."
          : "Create campaign"}

      </button>

    </form>

  );
}