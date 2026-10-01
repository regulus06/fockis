import {
  type ChangeEvent,
  type ComponentType,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  IconClose,
  IconMultiPhoto,
  IconPhoto,
  IconPoll,
  IconProduct,
  IconProperty,
  IconVideo,
  IconWaves,
} from "./FockisIcons";

import "../../styles/FockisCreatePost.scss";

import { sellerApi } from "../../features/seller/services/sellerApi";
import { FOCKIS_API_URL } from "../../config/fockisConfig";

/* ============================================================================
CONSTANTS
============================================================================ */

const API_URL = FOCKIS_API_URL;

const CONTENT_MAX_HEIGHT = 160;

/* ============================================================================
TYPES
============================================================================ */

type AttachmentKind =
  | "photo"
  | "video"
  | "gallery"
  | "wave"
  | "poll"
  | "product"
  | "property"
  | "monetize";

type SubscriberAccess =
  | "everyone"
  | "subscribers"
  | "pay_to_unlock";

type MonetizationPayment =
  | "coins"
  | "stripe";

interface MonetizationSettings {
  enabled: boolean;

  /**
   * Who can access the post.
   *
   * everyone       = public post
   * subscribers    = subscribers only
   * pay_to_unlock  = public preview + paid unlock
   */
  subscriberAccess: SubscriberAccess;

  paymentMethod: MonetizationPayment;

  /**
   * Main paid unlock price.
   */
  contentPrice: number;

  /**
   * Allow downloading the original media.
   */
  downloadEnabled: boolean;

  /**
   * Separate download price.
   */
  downloadPrice: number;

  /**
   * Download included with content purchase.
   */
  downloadIncludedWithPurchase: boolean;

  /**
   * Show a preview before the user unlocks
   * paid content.
   */
  showPreviewBeforeUnlock: boolean;

  /**
   * Enable separate paid music/video
   * streaming/listening.
   */
  paidMusicVideoEnabled: boolean;

  streamListenPrice: number;
}

interface SellerStore {
  _id: string;
  name?: string;
  storeName?: string;
  description?: string;
  logo?: string;
  avatar?: string;
}

interface SellerProduct {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  discountPrice?: number;
  stock?: number;
  images?: string[];
  category?: string;
  storeId?: string;
  seller?: string;
  displayLocations?: string[];
  feedDays?: number;
}

export interface FockisCreatePostProps {
  onPostCreated?: () => void;
}

/* ============================================================================
SAFE API RESPONSE HELPERS
============================================================================ */

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function getResponseData(
  value: unknown,
): unknown {
  if (
    isRecord(value) &&
    "data" in value
  ) {
    return value.data;
  }

  return value;
}

/* ============================================================================
TOOLBAR
============================================================================ */

const TOOLS: {
  id: AttachmentKind;
  label: string;
  icon: ComponentType<{ size?: number }>;
  accept?: string;
  multiple?: boolean;
}[] = [
  {
    id: "photo",
    label: "Photo",
    icon: IconPhoto,
    accept: "image/*",
  },
  {
    id: "video",
    label: "Video",
    icon: IconVideo,
    accept: "video/*",
  },
  {
    id: "gallery",
    label: "Gallery",
    icon: IconMultiPhoto,
    accept: "image/*",
    multiple: true,
  },
  {
    id: "wave",
    label: "Wave",
    icon: IconWaves,
    accept: "video/*",
  },
  {
    id: "poll",
    label: "Poll",
    icon: IconPoll,
  },
  {
    id: "product",
    label: "Product",
    icon: IconProduct,
  },
  {
    id: "property",
    label: "Property",
    icon: IconProperty,
  },
];

const MONETIZATION_TOOL = {
  id: "monetize" as AttachmentKind,
  label: "Monetize",
};

const SUPPORTED_UPLOAD_KINDS: AttachmentKind[] = [
  "photo",
  "video",
];

/* ============================================================================
CURRENT USER
============================================================================ */

function getStoredUser(): Record<
  string,
  unknown
> | null {
  try {
    const raw =
      localStorage.getItem("user");

    if (!raw) {
      return null;
    }

    const parsed: unknown =
      JSON.parse(raw);

    return isRecord(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function getCurrentUserId(): string {
  const storedUserId =
    localStorage.getItem("userId");

  if (storedUserId) {
    return storedUserId;
  }

  const storedUser =
    getStoredUser();

  return String(
    storedUser?._id ||
      storedUser?.id ||
      "",
  );
}

function getCurrentUsername(): string {
  const flatUsername =
    localStorage.getItem("username");

  if (flatUsername) {
    return flatUsername;
  }

  const user =
    getStoredUser();

  return String(
    user?.username ||
      user?.name ||
      user?.fullName ||
      "User",
  );
}

function getCurrentUserPhoto(): string {
  const user =
    getStoredUser();

  const raw =
    user?.avatar ||
    user?.userPhoto ||
    user?.photo ||
    user?.profilePhoto ||
    user?.profilePicture ||
    "";

  if (
    typeof raw !== "string" ||
    !raw.trim()
  ) {
    return "";
  }

  return normalizeImageUrl(raw);
}

/* ============================================================================
   IMAGE NORMALIZER
============================================================================ */

function normalizeImageUrl(
  image?: string,
): string {
  if (!image) {
    return "";
  }

  let clean = image.trim();

  if (!clean) {
    return "";
  }

  /*
   * Keep browser-local preview URLs and data URLs.
   */
  if (
    clean.startsWith("blob:") ||
    clean.startsWith("data:")
  ) {
    return clean;
  }

  /*
   * Convert legacy localhost media URLs to the current backend.
   */
  if (
    clean.startsWith(FOCKIS_API_URL) ||
    clean.startsWith("https://localhost:3000") ||
    clean.startsWith("http://127.0.0.1:3000") ||
    clean.startsWith("https://127.0.0.1:3000")
  ) {
    try {
      const parsed = new URL(clean);

      clean =
        parsed.pathname +
        parsed.search +
        parsed.hash;
    } catch {
      clean = clean.replace(
        /^https?:\/\/(?:localhost|127\.0\.0\.1):3000/i,
        "",
      );
    }
  }

  /*
   * Keep valid external URLs.
   */
  if (
    clean.startsWith("http://") ||
    clean.startsWith("https://")
  ) {
    return clean;
  }

  clean = clean.replace(/\\/g, "/");

  const path = clean.replace(/^\/+/, "");

  if (!path) {
    return "";
  }

  /*
   * Paths already returned by the backend.
   */
  if (
    path.startsWith("uploads/") ||
    path.startsWith("api/uploads/") ||
    path.startsWith("media/") ||
    path.startsWith("public/uploads/") ||
    path.startsWith("upload/")
  ) {
    return `${API_URL}/${path}`;
  }

  /*
   * Product/profile images that are stored as a filename only.
   */
  return `${API_URL}/uploads/${path}`;
}

/* ============================================================================
PRICE
============================================================================ */

function getProductPrice(
  product: SellerProduct,
): number {
  if (
    product.discountPrice !==
      undefined &&
    product.discountPrice !== null
  ) {
    return Number(
      product.discountPrice,
    );
  }

  return Number(
    product.price || 0,
  );
}

/* ============================================================================
NORMALIZE STORE RESPONSE
============================================================================ */

function normalizeStores(
  result: unknown,
): SellerStore[] {
  const data =
    getResponseData(result);

  if (Array.isArray(data)) {
    return data.filter(
      (
        item,
      ): item is SellerStore =>
        isRecord(item) &&
        typeof item._id === "string",
    ) as SellerStore[];
  }

  if (
    isRecord(data) &&
    typeof data._id === "string"
  ) {
    return [
      data as unknown as SellerStore,
    ];
  }

  return [];
}

/* ============================================================================
NORMALIZE PRODUCT RESPONSE
============================================================================ */

function normalizeProducts(
  result: unknown,
): SellerProduct[] {
  const data =
    getResponseData(result);

  if (Array.isArray(data)) {
    return data.filter(
      (
        item,
      ): item is SellerProduct =>
        isRecord(item) &&
        typeof item._id === "string" &&
        typeof item.name === "string",
    ) as SellerProduct[];
  }

  if (
    isRecord(data) &&
    typeof data._id === "string" &&
    typeof data.name === "string"
  ) {
    return [
      data as unknown as SellerProduct,
    ];
  }

  return [];
}

/* ============================================================================
NORMALIZE UPDATED PRODUCT
============================================================================ */

function normalizeUpdatedProduct(
  result: unknown,
  fallback: SellerProduct,
): SellerProduct {
  const data =
    getResponseData(result);

  if (
    isRecord(data) &&
    typeof data._id === "string" &&
    typeof data.name === "string"
  ) {
    return data as unknown as SellerProduct;
  }

  return fallback;
}

/* ============================================================================
DEFAULT MONETIZATION
============================================================================ */

function getDefaultMonetization(): MonetizationSettings {
  return {
    enabled: false,

    subscriberAccess: "everyone",

    paymentMethod: "coins",

    contentPrice: 0,

    downloadEnabled: false,

    downloadPrice: 0,

    downloadIncludedWithPurchase: true,

    showPreviewBeforeUnlock: true,

    paidMusicVideoEnabled: false,

    streamListenPrice: 0,
  };
}

/* ============================================================================
COMPONENT
============================================================================ */

export default function FockisCreatePost({
  onPostCreated,
}: FockisCreatePostProps) {
  /* ==========================================================================
  POST STATE
  ========================================================================== */

  const [
    content,
    setContent,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null,
  );

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    info,
    setInfo,
  ] = useState("");

  /* ==========================================================================
  MONETIZATION
  ========================================================================== */

  const [
    showMonetization,
    setShowMonetization,
  ] = useState(false);

  const [
    monetization,
    setMonetization,
  ] = useState<MonetizationSettings>(
    getDefaultMonetization(),
  );

  /* ==========================================================================
  PRODUCT PICKER
  ========================================================================== */

  const [
    showProductPicker,
    setShowProductPicker,
  ] = useState(false);

  const [
    stores,
    setStores,
  ] = useState<SellerStore[]>([]);

  const [
    selectedStore,
    setSelectedStore,
  ] = useState<SellerStore | null>(
    null,
  );

  const [
    products,
    setProducts,
  ] = useState<SellerProduct[]>([]);

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState<SellerProduct | null>(
    null,
  );

  const [
    isLoadingStores,
    setIsLoadingStores,
  ] = useState(false);

  const [
    isLoadingProducts,
    setIsLoadingProducts,
  ] = useState(false);

  const [
    isPublishingProduct,
    setIsPublishingProduct,
  ] = useState(false);

  const [
    productError,
    setProductError,
  ] = useState("");

  /* ==========================================================================
  REFS
  ========================================================================== */

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const contentInputRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );

  const pendingKindRef =
    useRef<AttachmentKind>("photo");

  /* ==========================================================================
  USER
  ========================================================================== */

  const username =
    getCurrentUsername();

  const userPhoto =
    getCurrentUserPhoto();

  const userInitial =
    username
      .trim()
      .charAt(0)
      .toUpperCase() || "U";

  /* ==========================================================================
  CLEANUP PREVIEW
  ========================================================================== */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }
    };
  }, [previewUrl]);

  /* ==========================================================================
  MONETIZATION
  ========================================================================== */

  const openMonetization = (): void => {
    setError("");
    setSuccess("");
    setInfo("");

    setShowMonetization(true);
  };

  const closeMonetization = (): void => {
    setShowMonetization(false);
  };

  const updateMonetization = <
    K extends keyof MonetizationSettings
  >(
    key: K,
    value: MonetizationSettings[K],
  ): void => {
    setMonetization(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  };

  const resetMonetization = (): void => {
    setMonetization(
      getDefaultMonetization(),
    );
  };

  /* ==========================================================================
  PRODUCT PICKER
  ========================================================================== */

  const openProductPicker =
    async (): Promise<void> => {
      setError("");
      setSuccess("");
      setInfo("");
      setProductError("");

      setShowProductPicker(true);

      setSelectedStore(null);
      setProducts([]);
      setSelectedProduct(null);

      setIsLoadingStores(true);

      try {
        const result =
          await sellerApi.getMyStores();

        const storeList =
          normalizeStores(result);

        setStores(storeList);

        if (
          storeList.length === 1
        ) {
          await loadStoreProducts(
            storeList[0],
          );
        }
      } catch (err) {
        console.error(
          "Fockis product store loading error:",
          err,
        );

        setProductError(
          err instanceof Error
            ? err.message
            : "Unable to load your stores.",
        );
      } finally {
        setIsLoadingStores(false);
      }
    };

  const loadStoreProducts =
    async (
      store: SellerStore,
    ): Promise<void> => {
      if (!store?._id) {
        return;
      }

      setSelectedStore(store);
      setProducts([]);
      setSelectedProduct(null);
      setProductError("");
      setIsLoadingProducts(true);

      try {
        const result =
          await sellerApi.getStoreProducts(
            store._id,
          );

        setProducts(
          normalizeProducts(result),
        );
      } catch (err) {
        console.error(
          "Fockis store products loading error:",
          err,
        );

        setProductError(
          err instanceof Error
            ? err.message
            : "Unable to load products from this store.",
        );
      } finally {
        setIsLoadingProducts(false);
      }
    };

  const closeProductPicker =
    (): void => {
      if (isPublishingProduct) {
        return;
      }

      setShowProductPicker(false);
      setSelectedStore(null);
      setProducts([]);
      setSelectedProduct(null);
      setProductError("");
    };

  const publishProductToFeed =
    async (
      product: SellerProduct,
    ): Promise<void> => {
      if (!product?._id) {
        return;
      }

      setProductError("");
      setIsPublishingProduct(true);
      setSelectedProduct(product);

      try {
        const existingLocations =
          Array.isArray(
            product.displayLocations,
          )
            ? product.displayLocations
            : [];

        const displayLocations =
          Array.from(
            new Set([
              ...existingLocations,
              "marketplace",
              "feed",
            ]),
          );

        const updatedProduct =
          await sellerApi.updateProduct(
            product._id,
            {
              displayLocations,
            },
          );

        const publishedProduct =
          normalizeUpdatedProduct(
            updatedProduct,
            {
              ...product,
              displayLocations,
            },
          );

        setSelectedProduct(
          publishedProduct,
        );

        setShowProductPicker(false);

        setSuccess(
          "Your product was published to Fockis Feed.",
        );

        onPostCreated?.();
      } catch (err) {
        console.error(
          "Fockis product publishing error:",
          err,
        );

        setProductError(
          err instanceof Error
            ? err.message
            : "Unable to publish this product to Fockis Feed.",
        );
      } finally {
        setIsPublishingProduct(false);
      }
    };

  /* ==========================================================================
  TOOL CLICK
  ========================================================================== */

  const handleToolClick = (
    tool: (typeof TOOLS)[number],
  ): void => {
    setError("");
    setSuccess("");
    setInfo("");

    if (tool.id === "product") {
      void openProductPicker();
      return;
    }

    if (
      !SUPPORTED_UPLOAD_KINDS.includes(
        tool.id,
      )
    ) {
      setInfo(
        `${tool.label} posts are coming soon.`,
      );

      return;
    }

    pendingKindRef.current =
      tool.id;

    if (fileInputRef.current) {
      fileInputRef.current.accept =
        tool.accept ||
        "image/*,video/*";

      fileInputRef.current.multiple =
        Boolean(tool.multiple);

      fileInputRef.current.value = "";

      fileInputRef.current.click();
    }
  };

  /* ==========================================================================
  CONTENT INPUT
  ========================================================================== */

  const handleContentChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ): void => {
    setContent(
      event.target.value,
    );

    const el =
      event.target;

    el.style.height = "auto";

    el.style.height = `${Math.min(
      el.scrollHeight,
      CONTENT_MAX_HEIGHT,
    )}px`;
  };

  const resetContentHeight =
    (): void => {
      if (contentInputRef.current) {
        contentInputRef.current.style.height =
          "auto";
      }
    };

  /* ==========================================================================
  SELECT MEDIA
  ========================================================================== */

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");
    setInfo("");

    const isImage =
      file.type.startsWith(
        "image/",
      );

    const isVideo =
      file.type.startsWith(
        "video/",
      );

    if (!isImage && !isVideo) {
      setError(
        "Please select an image or video.",
      );

      event.target.value = "";

      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    const newPreviewUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(
      newPreviewUrl,
    );
  };

  /* ==========================================================================
  REMOVE MEDIA
  ========================================================================== */

  const removeMedia = (): void => {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl,
      );
    }

    setSelectedFile(null);
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* ==========================================================================
  MONETIZATION VALIDATION
  ========================================================================== */

  const validateMonetization =
    (): boolean => {
      if (!monetization.enabled) {
        return true;
      }

      /*
       * Pay-to-unlock requires a price.
       */
      if (
        monetization.subscriberAccess ===
          "pay_to_unlock" &&
        monetization.contentPrice <= 0
      ) {
        setError(
          "Set a price for Pay to unlock.",
        );

        setShowMonetization(true);

        return false;
      }

      if (
        monetization.contentPrice < 0
      ) {
        setError(
          "Content price cannot be negative.",
        );

        setShowMonetization(true);

        return false;
      }

      if (
        monetization.downloadEnabled &&
        !monetization.downloadIncludedWithPurchase &&
        monetization.downloadPrice <= 0
      ) {
        setError(
          "Set a download price or include the download with the purchase.",
        );

        setShowMonetization(true);

        return false;
      }

      if (
        monetization.downloadPrice < 0
      ) {
        setError(
          "Download price cannot be negative.",
        );

        setShowMonetization(true);

        return false;
      }

      if (
        monetization.paidMusicVideoEnabled &&
        monetization.streamListenPrice <= 0
      ) {
        setError(
          "Set a stream/listen price.",
        );

        setShowMonetization(true);

        return false;
      }

      if (
        monetization.streamListenPrice < 0
      ) {
        setError(
          "Stream/listen price cannot be negative.",
        );

        setShowMonetization(true);

        return false;
      }

      return true;
    };

  /* ==========================================================================
  CREATE POST
  ========================================================================== */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setInfo("");

    const trimmedContent =
      content.trim();

    if (
      !trimmedContent &&
      !selectedFile
    ) {
      setError(
        "Write something or add a photo or video.",
      );

      return;
    }

    const userId =
      getCurrentUserId();

    if (!userId) {
      setError(
        "Please log in before posting.",
      );

      return;
    }

    if (!validateMonetization()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token =
        localStorage.getItem("token");

      const formData =
        new FormData();

      formData.append(
        "user",
        userId,
      );

      formData.append(
        "username",
        username,
      );

      formData.append(
        "userPhoto",
        userPhoto,
      );

      formData.append(
        "content",
        trimmedContent,
      );

      /*
       * IMPORTANT:
       * The complete monetization configuration
       * is sent with the post.
       */
      formData.append(
        "monetization",
        JSON.stringify(
          monetization,
        ),
      );

      if (selectedFile) {
        formData.append(
          "file",
          selectedFile,
        );
      }

      const response =
        await fetch(
          `${API_URL}/posts`,
          {
            method: "POST",

            headers: token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : undefined,

            body: formData,
          },
        );

      if (!response.ok) {
        const responseText =
          await response.text();

        throw new Error(
          responseText ||
            "Failed to create post.",
        );
      }

      setContent("");

      removeMedia();

      resetContentHeight();

      resetMonetization();

      setShowMonetization(false);

      setSuccess(
        monetization.enabled
          ? "Your monetized post was published."
          : "Your post was published.",
      );

      onPostCreated?.();
    } catch (err) {
      console.error(
        "Fockis create post error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to publish your post.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasContent =
    Boolean(
      content.trim() ||
        selectedFile,
    );

  const monetizationActive =
    monetization.enabled;

  const accessLabel =
    monetization.subscriberAccess ===
    "everyone"
      ? "Everyone"
      : monetization.subscriberAccess ===
          "subscribers"
        ? "Subscribers only"
        : "Pay to unlock";

  const priceLabel =
    monetization.paymentMethod ===
    "coins"
      ? `${monetization.contentPrice} coins`
      : `$${monetization.contentPrice.toFixed(
          2,
        )}`;

  /* ==========================================================================
  RENDER
  ========================================================================== */

  return (
    <>
      <section className="fk-create-post">
        <form onSubmit={handleSubmit}>
          {/* ================================================================
              TOP ROW
          ================================================================ */}

          <div className="fk-create-post__row">
            <div className="fk-create-post__avatar">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={username}
                />
              ) : (
                userInitial
              )}
            </div>

            <textarea
              ref={contentInputRef}
              className="fk-create-post__input"
              value={content}
              onChange={
                handleContentChange
              }
              placeholder="What's happening on Fockis?"
              maxLength={5000}
              rows={1}
            />
          </div>

          {content.length > 0 && (
            <span className="fk-create-post__counter">
              {content.length}/5000
            </span>
          )}

          {/* ================================================================
              MEDIA PREVIEW
          ================================================================ */}

          {selectedFile &&
            previewUrl && (
              <div className="fk-create-post__preview">
                <button
                  type="button"
                  className="fk-create-post__remove"
                  onClick={
                    removeMedia
                  }
                  aria-label="Remove selected media"
                >
                  <IconClose
                    size={18}
                  />
                </button>

                {selectedFile.type.startsWith(
                  "video/",
                ) ? (
                  <video
                    src={previewUrl}
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Selected post media"
                  />
                )}
              </div>
            )}

          {/* ================================================================
              MONETIZATION SUMMARY
          ================================================================ */}

          {monetizationActive && (
            <div className="fk-create-post__monetization-summary">
              <div>
                <strong>
                  💰 Monetization enabled
                </strong>

                <span>
                  {accessLabel}
                </span>
              </div>

              {monetization.subscriberAccess ===
                "pay_to_unlock" && (
                <span>
                  {priceLabel}
                </span>
              )}

              {monetization.downloadEnabled && (
                <span>
                  ⬇ Downloads enabled
                </span>
              )}

              {monetization.showPreviewBeforeUnlock &&
                monetization.subscriberAccess ===
                  "pay_to_unlock" && (
                  <span>
                    👁 Preview enabled
                  </span>
                )}

              {monetization.paidMusicVideoEnabled && (
                <span>
                  🎵 Stream/listen:{" "}
                  {monetization.paymentMethod ===
                  "coins"
                    ? `${monetization.streamListenPrice} coins`
                    : `$${monetization.streamListenPrice.toFixed(
                        2,
                      )}`}
                </span>
              )}

              <button
                type="button"
                onClick={
                  openMonetization
                }
              >
                Edit
              </button>
            </div>
          )}

          {/* ================================================================
              HIDDEN FILE INPUT
          ================================================================ */}

          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={
              handleFileChange
            }
          />

          {/* ================================================================
              TOOLBAR
          ================================================================ */}

          <div className="fk-create-post__toolbar">
            {TOOLS.map((tool) => {
              const Icon =
                tool.icon;

              return (
                <button
                  key={tool.id}
                  type="button"
                  data-tool={tool.id}
                  className="fk-create-post__tool"
                  onClick={() =>
                    handleToolClick(
                      tool,
                    )
                  }
                >
                  <Icon size={17} />

                  <span>
                    {tool.label}
                  </span>
                </button>
              );
            })}

            {/* ============================================================
                MONETIZE BUTTON
            ============================================================ */}

            <button
              type="button"
              data-tool={
                MONETIZATION_TOOL.id
              }
              className={`fk-create-post__tool ${
                monetizationActive
                  ? "is-active"
                  : ""
              }`}
              onClick={
                openMonetization
              }
            >
              <span aria-hidden="true">
                💰
              </span>

              <span>
                {monetizationActive
                  ? "Monetized"
                  : "Monetize"}
              </span>
            </button>

            {hasContent && (
              <button
                type="submit"
                className="fk-create-post__submit"
                disabled={
                  isSubmitting
                }
              >
                {isSubmitting
                  ? "Publishing..."
                  : "Post"}
              </button>
            )}
          </div>

          {/* ================================================================
              MESSAGES
          ================================================================ */}

          {error && (
            <div
              className="fk-create-post__message fk-create-post__message--error"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="fk-create-post__message fk-create-post__message--success"
              role="status"
            >
              {success}
            </div>
          )}

          {info && (
            <div
              className="fk-create-post__message fk-create-post__message--info"
              role="status"
            >
              {info}
            </div>
          )}
        </form>
      </section>

      {/* ====================================================================
          MONETIZATION MODAL
      ==================================================================== */}

      {showMonetization && (
        <div
          className="fk-monetization-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Content monetization settings"
        >
          <div className="fk-monetization-modal">
            {/* ==============================================================
                HEADER
            ============================================================== */}

            <div className="fk-monetization-modal__header">
              <div>
                <span className="fk-monetization-modal__eyebrow">
                  FOCKIS MONETIZATION
                </span>

                <h2>
                  Monetize this content
                </h2>

                <p>
                  Choose who can access
                  your post and how you
                  want to earn.
                </p>
              </div>

              <button
                type="button"
                className="fk-monetization-modal__close"
                onClick={
                  closeMonetization
                }
                aria-label="Close monetization settings"
              >
                <IconClose
                  size={20}
                />
              </button>
            </div>

            <div className="fk-monetization-modal__body">
              {/* ============================================================
                  ENABLE
              ============================================================ */}

              <div className="fk-monetization-card fk-monetization-card--primary">
                <div>
                  <strong>
                    Monetize this post
                  </strong>

                  <span>
                    Allow this content
                    to generate creator
                    earnings.
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={
                    monetization.enabled
                  }
                  className={`fk-monetization-switch ${
                    monetization.enabled
                      ? "is-on"
                      : ""
                  }`}
                  onClick={() =>
                    updateMonetization(
                      "enabled",
                      !monetization.enabled,
                    )
                  }
                >
                  <span />
                </button>
              </div>

              {monetization.enabled && (
                <>
                  {/* ========================================================
                      1. SUBSCRIBER ACCESS
                  ======================================================== */}

                  <div className="fk-monetization-section">
                    <div className="fk-monetization-section__heading">
                      <span className="fk-monetization-step">
                        1
                      </span>

                      <div>
                        <h3>
                          Subscriber Access
                        </h3>

                        <p>
                          Choose who can
                          access this
                          content.
                        </p>
                      </div>
                    </div>

                    <div className="fk-monetization-options">
                      {/* EVERYONE */}

                      <button
                        type="button"
                        className={`fk-monetization-option ${
                          monetization.subscriberAccess ===
                          "everyone"
                            ? "is-selected"
                            : ""
                        }`}
                        onClick={() =>
                          updateMonetization(
                            "subscriberAccess",
                            "everyone",
                          )
                        }
                      >
                        <span className="fk-monetization-option__radio">
                          {monetization.subscriberAccess ===
                          "everyone"
                            ? "●"
                            : "○"}
                        </span>

                        <div>
                          <strong>
                            Everyone
                          </strong>

                          <span>
                            Anyone can see
                            this post.
                          </span>
                        </div>
                      </button>

                      {/* SUBSCRIBERS */}

                      <button
                        type="button"
                        className={`fk-monetization-option ${
                          monetization.subscriberAccess ===
                          "subscribers"
                            ? "is-selected"
                            : ""
                        }`}
                        onClick={() =>
                          updateMonetization(
                            "subscriberAccess",
                            "subscribers",
                          )
                        }
                      >
                        <span className="fk-monetization-option__radio">
                          {monetization.subscriberAccess ===
                          "subscribers"
                            ? "●"
                            : "○"}
                        </span>

                        <div>
                          <strong>
                            Subscribers only
                          </strong>

                          <span>
                            Only your
                            subscribers
                            can access
                            this content.
                          </span>
                        </div>
                      </button>

                      {/* PAY TO UNLOCK */}

                      <button
                        type="button"
                        className={`fk-monetization-option ${
                          monetization.subscriberAccess ===
                          "pay_to_unlock"
                            ? "is-selected"
                            : ""
                        }`}
                        onClick={() =>
                          updateMonetization(
                            "subscriberAccess",
                            "pay_to_unlock",
                          )
                        }
                      >
                        <span className="fk-monetization-option__radio">
                          {monetization.subscriberAccess ===
                          "pay_to_unlock"
                            ? "●"
                            : "○"}
                        </span>

                        <div>
                          <strong>
                            Pay to unlock
                          </strong>

                          <span>
                            Show a preview
                            and charge
                            users to
                            unlock the
                            full content.
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ========================================================
                      2. PRICE
                  ======================================================== */}

                  {monetization.subscriberAccess ===
                    "pay_to_unlock" && (
                    <div className="fk-monetization-section">
                      <div className="fk-monetization-section__heading">
                        <span className="fk-monetization-step">
                          2
                        </span>

                        <div>
                          <h3>
                            Price
                          </h3>

                          <p>
                            Set what users
                            pay to unlock
                            this content.
                          </p>
                        </div>
                      </div>

                      <div className="fk-monetization-payment-tabs">
                        <button
                          type="button"
                          className={
                            monetization.paymentMethod ===
                            "coins"
                              ? "is-selected"
                              : ""
                          }
                          onClick={() =>
                            updateMonetization(
                              "paymentMethod",
                              "coins",
                            )
                          }
                        >
                          🪙 Fockis Coins
                        </button>

                        <button
                          type="button"
                          className={
                            monetization.paymentMethod ===
                            "stripe"
                              ? "is-selected"
                              : ""
                          }
                          onClick={() =>
                            updateMonetization(
                              "paymentMethod",
                              "stripe",
                            )
                          }
                        >
                          💳 Stripe
                        </button>
                      </div>

                      <label className="fk-monetization-field">
                        <span>
                          Unlock price
                        </span>

                        <div className="fk-monetization-price-input">
                          <span>
                            {monetization.paymentMethod ===
                            "coins"
                              ? "🪙"
                              : "$"}
                          </span>

                          <input
                            type="number"
                            min="0"
                            step={
                              monetization.paymentMethod ===
                              "coins"
                                ? "1"
                                : "0.01"
                            }
                            value={
                              monetization.contentPrice
                            }
                            onChange={(
                              event,
                            ) =>
                              updateMonetization(
                                "contentPrice",
                                Math.max(
                                  0,
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                ),
                              )
                            }
                          />
                        </div>
                      </label>
                    </div>
                  )}

                  {/* ========================================================
                      PREVIEW
                  ======================================================== */}

                  {monetization.subscriberAccess ===
                    "pay_to_unlock" && (
                    <div className="fk-monetization-section">
                      <div className="fk-monetization-section__heading">
                        <span className="fk-monetization-step">
                          3
                        </span>

                        <div>
                          <h3>
                            Preview
                          </h3>

                          <p>
                            Let users see a
                            preview before
                            they unlock
                            the content.
                          </p>
                        </div>
                      </div>

                      <div className="fk-monetization-card">
                        <div>
                          <strong>
                            Show preview
                            before
                            unlocking
                          </strong>

                          <span>
                            Users can see
                            your preview
                            before
                            purchasing.
                          </span>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={
                            monetization.showPreviewBeforeUnlock
                          }
                          className={`fk-monetization-switch ${
                            monetization.showPreviewBeforeUnlock
                              ? "is-on"
                              : ""
                          }`}
                          onClick={() =>
                            updateMonetization(
                              "showPreviewBeforeUnlock",
                              !monetization.showPreviewBeforeUnlock,
                            )
                          }
                        >
                          <span />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ========================================================
                      DOWNLOADS
                  ======================================================== */}

                  <div className="fk-monetization-section">
                    <div className="fk-monetization-section__heading">
                      <span className="fk-monetization-step">
                        4
                      </span>

                      <div>
                        <h3>
                          Download
                        </h3>

                        <p>
                          Decide whether
                          users can
                          download your
                          original media.
                        </p>
                      </div>
                    </div>

                    <div className="fk-monetization-card">
                      <div>
                        <strong>
                          Allow downloads
                        </strong>

                        <span>
                          Let users
                          download the
                          original file.
                        </span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={
                          monetization.downloadEnabled
                        }
                        className={`fk-monetization-switch ${
                          monetization.downloadEnabled
                            ? "is-on"
                            : ""
                        }`}
                        onClick={() =>
                          updateMonetization(
                            "downloadEnabled",
                            !monetization.downloadEnabled,
                          )
                        }
                      >
                        <span />
                      </button>
                    </div>

                    {monetization.downloadEnabled && (
                      <>
                        <label className="fk-monetization-checkbox">
                          <input
                            type="checkbox"
                            checked={
                              monetization.downloadIncludedWithPurchase
                            }
                            onChange={(
                              event,
                            ) =>
                              updateMonetization(
                                "downloadIncludedWithPurchase",
                                event.target.checked,
                              )
                            }
                          />

                          <span>
                            Include download
                            with content
                            purchase
                          </span>
                        </label>

                        {!monetization.downloadIncludedWithPurchase && (
                          <label className="fk-monetization-field">
                            <span>
                              Download price
                            </span>

                            <div className="fk-monetization-price-input">
                              <span>
                                {monetization.paymentMethod ===
                                "coins"
                                  ? "🪙"
                                  : "$"}
                              </span>

                              <input
                                type="number"
                                min="0"
                                step={
                                  monetization.paymentMethod ===
                                  "coins"
                                    ? "1"
                                    : "0.01"
                                }
                                value={
                                  monetization.downloadPrice
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateMonetization(
                                    "downloadPrice",
                                    Math.max(
                                      0,
                                      Number(
                                        event
                                          .target
                                          .value,
                                      ),
                                    ),
                                  )
                                }
                              />
                            </div>
                          </label>
                        )}
                      </>
                    )}
                  </div>

                  {/* ========================================================
                      MUSIC / VIDEO
                  ======================================================== */}

                  <div className="fk-monetization-section">
                    <div className="fk-monetization-section__heading">
                      <span className="fk-monetization-step">
                        5
                      </span>

                      <div>
                        <h3>
                          Music &amp; Video
                        </h3>

                        <p>
                          Optionally charge
                          separately for
                          streaming or
                          listening.
                        </p>
                      </div>
                    </div>

                    <div className="fk-monetization-card">
                      <div>
                        <strong>
                          Paid stream /
                          listen
                        </strong>

                        <span>
                          Charge users for
                          streaming or
                          listening access.
                        </span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={
                          monetization.paidMusicVideoEnabled
                        }
                        className={`fk-monetization-switch ${
                          monetization.paidMusicVideoEnabled
                            ? "is-on"
                            : ""
                        }`}
                        onClick={() =>
                          updateMonetization(
                            "paidMusicVideoEnabled",
                            !monetization.paidMusicVideoEnabled,
                          )
                        }
                      >
                        <span />
                      </button>
                    </div>

                    {monetization.paidMusicVideoEnabled && (
                      <label className="fk-monetization-field">
                        <span>
                          Stream / listen
                          price
                        </span>

                        <div className="fk-monetization-price-input">
                          <span>
                            {monetization.paymentMethod ===
                            "coins"
                              ? "🪙"
                              : "$"}
                          </span>

                          <input
                            type="number"
                            min="0"
                            step={
                              monetization.paymentMethod ===
                              "coins"
                                ? "1"
                                : "0.01"
                            }
                            value={
                              monetization.streamListenPrice
                            }
                            onChange={(
                              event,
                            ) =>
                              updateMonetization(
                                "streamListenPrice",
                                Math.max(
                                  0,
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                ),
                              )
                            }
                          />
                        </div>
                      </label>
                    )}
                  </div>

                  {/* ========================================================
                      PREVIEW SUMMARY
                  ======================================================== */}

                  <div className="fk-monetization-preview">
                    <div className="fk-monetization-preview__icon">
                      💰
                    </div>

                    <div>
                      <strong>
                        Monetization Preview
                      </strong>

                      <p>
                        {accessLabel}

                        {monetization.subscriberAccess ===
                          "pay_to_unlock" &&
                          ` • ${priceLabel}`}

                        {monetization.downloadEnabled &&
                          " • Downloads enabled"}

                        {monetization.showPreviewBeforeUnlock &&
                          monetization.subscriberAccess ===
                            "pay_to_unlock" &&
                          " • Preview enabled"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ==============================================================
                FOOTER
            ============================================================== */}

            <div className="fk-monetization-modal__footer">
              <button
                type="button"
                className="fk-monetization-modal__reset"
                onClick={
                  resetMonetization
                }
              >
                Reset
              </button>

              <div>
                <button
                  type="button"
                  className="fk-monetization-modal__cancel"
                  onClick={
                    closeMonetization
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="fk-monetization-modal__save"
                  onClick={() => {
                    if (
                      monetization.enabled &&
                      !validateMonetization()
                    ) {
                      return;
                    }

                    closeMonetization();
                  }}
                >
                  Save Monetization
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          PRODUCT PICKER MODAL
      ==================================================================== */}

      {showProductPicker && (
        <div
          className="fk-product-picker-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Select a product"
        >
          <div className="fk-product-picker">
            <div className="fk-product-picker__header">
              <div>
                <h2>
                  Post a Product
                </h2>

                <p>
                  Select a product
                  from your store
                  to publish it on
                  Fockis Feed.
                </p>
              </div>

              <button
                type="button"
                className="fk-product-picker__close"
                onClick={
                  closeProductPicker
                }
                disabled={
                  isPublishingProduct
                }
                aria-label="Close product selector"
              >
                <IconClose
                  size={20}
                />
              </button>
            </div>

            {!selectedStore && (
              <div className="fk-product-picker__body">
                <div className="fk-product-picker__section-title">
                  Choose your store
                </div>

                {isLoadingStores ? (
                  <div className="fk-product-picker__loading">
                    Loading your
                    stores...
                  </div>
                ) : stores.length ===
                  0 ? (
                  <div className="fk-product-picker__empty">
                    <strong>
                      You don't
                      have a store
                      yet.
                    </strong>

                    <span>
                      Create a
                      seller store
                      first, then
                      you can post
                      products to
                      Fockis Feed.
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        closeProductPicker();

                        window.location.href =
                          "/seller/create-store";
                      }}
                    >
                      Create Store
                    </button>
                  </div>
                ) : (
                  <div className="fk-product-picker__stores">
                    {stores.map(
                      (store) => (
                        <button
                          key={
                            store._id
                          }
                          type="button"
                          className="fk-product-picker__store"
                          onClick={() =>
                            void loadStoreProducts(
                              store,
                            )
                          }
                        >
                          <div className="fk-product-picker__store-avatar">
                            {store.logo ||
                            store.avatar ? (
                              <img
                                src={normalizeImageUrl(
                                  store.logo ||
                                    store.avatar,
                                )}
                                alt=""
                              />
                            ) : (
                              (
                                store.storeName ||
                                store.name ||
                                "S"
                              )
                                .charAt(
                                  0,
                                )
                                .toUpperCase()
                            )}
                          </div>

                          <div className="fk-product-picker__store-info">
                            <strong>
                              {store.storeName ||
                                store.name ||
                                "My Store"}
                            </strong>

                            <span>
                              Select this
                              store
                            </span>
                          </div>

                          <span className="fk-product-picker__arrow">
                            →
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedStore && (
              <div className="fk-product-picker__body">
                <button
                  type="button"
                  className="fk-product-picker__back"
                  onClick={() => {
                    setSelectedStore(
                      null,
                    );
                    setProducts([]);
                    setSelectedProduct(
                      null,
                    );
                    setProductError("");
                  }}
                  disabled={
                    isPublishingProduct
                  }
                >
                  ← Back to
                  stores
                </button>

                <div className="fk-product-picker__store-heading">
                  <div>
                    <span>
                      STORE
                    </span>

                    <strong>
                      {selectedStore.storeName ||
                        selectedStore.name ||
                        "My Store"}
                    </strong>
                  </div>
                </div>

                <div className="fk-product-picker__section-title">
                  Choose a product
                </div>

                {isLoadingProducts ? (
                  <div className="fk-product-picker__loading">
                    Loading your
                    products...
                  </div>
                ) : products.length ===
                  0 ? (
                  <div className="fk-product-picker__empty">
                    <strong>
                      No products
                      found.
                    </strong>

                    <span>
                      Add a product
                      to this store
                      before
                      posting to
                      Fockis Feed.
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        closeProductPicker();

                        window.location.href =
                          "/seller/products/add";
                      }}
                    >
                      Add Product
                    </button>
                  </div>
                ) : (
                  <div className="fk-product-picker__products">
                    {products.map(
                      (product) => {
                        const image =
                          normalizeImageUrl(
                            product
                              .images?.[0],
                          );

                        const price =
                          getProductPrice(
                            product,
                          );

                        const alreadyInFeed =
                          Array.isArray(
                            product.displayLocations,
                          ) &&
                          product.displayLocations.includes(
                            "feed",
                          );

                        const isCurrentProductPublishing =
                          isPublishingProduct &&
                          selectedProduct?._id ===
                            product._id;

                        return (
                          <button
                            key={
                              product._id
                            }
                            type="button"
                            className={[
                              "fk-product-picker__product",
                              alreadyInFeed
                                ? "is-published"
                                : "",
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(
                                " ",
                              )}
                            onClick={() => {
                              if (
                                isPublishingProduct
                              ) {
                                return;
                              }

                              setSelectedProduct(
                                product,
                              );

                              void publishProductToFeed(
                                product,
                              );
                            }}
                            disabled={
                              isPublishingProduct
                            }
                          >
                            <div className="fk-product-picker__product-image">
                              {image ? (
                                <img
                                  src={
                                    image
                                  }
                                  alt={
                                    product.name
                                  }
                                />
                              ) : (
                                <div className="fk-product-picker__product-placeholder">
                                  <IconProduct
                                    size={
                                      26
                                    }
                                  />
                                </div>
                              )}
                            </div>

                            <div className="fk-product-picker__product-info">
                              <strong>
                                {
                                  product.name
                                }
                              </strong>

                              <span className="fk-product-picker__product-price">
                                $
                                {price.toFixed(
                                  2,
                                )}
                              </span>

                              {product.stock !==
                                undefined && (
                                <span className="fk-product-picker__product-stock">
                                  {
                                    product.stock
                                  }{" "}
                                  in
                                  stock
                                </span>
                              )}
                            </div>

                            <div className="fk-product-picker__product-action">
                              {isCurrentProductPublishing ? (
                                <span>
                                  Publishing...
                                </span>
                              ) : alreadyInFeed ? (
                                <span>
                                  Post Again
                                </span>
                              ) : (
                                <span>
                                  Post
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                )}

                {productError && (
                  <div
                    className="fk-product-picker__error"
                    role="alert"
                  >
                    {
                      productError
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}