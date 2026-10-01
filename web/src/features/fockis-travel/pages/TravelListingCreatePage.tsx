import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  ChangeEvent,
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Check,
  Clock3,
  Home,
  ImagePlus,
  Loader2,
  MapPin,
  Package,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { travelApi } from "../services/travelApi";

const CATEGORIES = [
  {
    value: "Hotels & Stays",
    label: "Hotels & Stays",
    icon: "🏨",
  },
  {
    value: "Restaurants",
    label: "Restaurants",
    icon: "🍽️",
  },
  {
    value: "Car Rental",
    label: "Car Rental",
    icon: "🚗",
  },
  {
    value: "Experiences",
    label: "Experiences",
    icon: "🎯",
  },
  {
    value: "Meeting Spaces",
    label: "Meeting Spaces",
    icon: "💼",
  },
  {
    value: "Transportation",
    label: "Transportation",
    icon: "🚌",
  },
  {
    value: "Events",
    label: "Events",
    icon: "🎉",
  },
  {
    value: "Vacation Rentals",
    label: "Vacation Rentals",
    icon: "🏡",
  },
];

const CATEGORY_TYPE_MAP: Record<string, string> = {
  "Hotels & Stays": "stay",
  Restaurants: "restaurant",
  "Car Rental": "car",
  Experiences: "experience",
  "Meeting Spaces": "meeting",
  Transportation: "transfer",
  Events: "event",
  "Vacation Rentals": "rental",
};

const PROPERTY_TYPES = [
  "Entire home",
  "Apartment",
  "Condo",
  "Townhouse",
  "Villa",
  "Cabin",
  "Cottage",
  "Guesthouse",
  "Private room",
  "Shared room",
];

const CANCELLATION_POLICIES = [
  {
    value: "flexible",
    label: "Flexible",
    description:
      "Guests can cancel with a full refund according to the booking terms.",
  },
  {
    value: "moderate",
    label: "Moderate",
    description:
      "Guests receive a partial refund depending on when they cancel.",
  },
  {
    value: "firm",
    label: "Firm",
    description:
      "A more restrictive cancellation policy with limited refunds.",
  },
  {
    value: "strict",
    label: "Strict",
    description:
      "The most restrictive cancellation option for hosts.",
  },
];

const COMMON_AMENITIES = [
  "Wi-Fi",
  "Free parking",
  "Air conditioning",
  "Heating",
  "Kitchen",
  "Washer",
  "Dryer",
  "TV",
  "Pool",
  "Hot tub",
  "Fireplace",
  "BBQ grill",
  "Patio",
  "Balcony",
  "Garden",
  "Beach access",
  "Gym",
  "Elevator",
  "Workspace",
  "Breakfast",
  "Pet friendly",
  "Wheelchair accessible",
  "Smoke alarm",
  "Carbon monoxide alarm",
];

const HOUSE_RULES = [
  "No smoking",
  "No parties or events",
  "Pets allowed",
  "Children welcome",
  "Quiet hours",
  "No commercial photography",
  "No unregistered guests",
];

const CURRENCIES = [
  {
    value: "USD",
    label: "USD — US Dollar",
  },
  {
    value: "HTG",
    label: "HTG — Haitian Gourde",
  },
  {
    value: "CAD",
    label: "CAD — Canadian Dollar",
  },
  {
    value: "EUR",
    label: "EUR — Euro",
  },
  {
    value: "GBP",
    label: "GBP — British Pound",
  },
  {
    value: "DOP",
    label: "DOP — Dominican Peso",
  },
  {
    value: "BRL",
    label: "BRL — Brazilian Real",
  },
];

const MAX_MEDIA_FILES = 30;

const MAX_MEDIA_SIZE = 100 * 1024 * 1024;

interface InventorySettings {
  total: string;
  available: string;
  reserved: string;
  lowStockThreshold: string;
  allowReservations: boolean;
}

interface ListingForm {
  title: string;
  categories: string[];
  description: string;

  price: string;
  priceUnit: string;
  currency: string;

  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  phone: string;
  website: string;

  capacity: string;
  bedrooms: string;
  bathrooms: string;
  beds: string;

  amenities: string[];
  images: string[];

  propertyType: string;
  rentalType: string;

  checkInTime: string;
  checkOutTime: string;

  minimumStay: string;
  maximumStay: string;

  cleaningFee: string;
  securityDeposit: string;

  cancellationPolicy: string;

  instantBooking: boolean;

  houseRules: string[];

  hostName: string;
  hostDescription: string;

  status: "draft" | "pending";
}

const EMPTY_FORM: ListingForm = {
  title: "",
  categories: ["Hotels & Stays"],
  description: "",

  price: "",
  priceUnit: "night",
  currency: "USD",

  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",

  phone: "",
  website: "",

  capacity: "",
  bedrooms: "",
  bathrooms: "",
  beds: "",

  amenities: [],
  images: [],

  propertyType: "Entire home",
  rentalType: "Entire place",

  checkInTime: "15:00",
  checkOutTime: "11:00",

  minimumStay: "1",
  maximumStay: "",

  cleaningFee: "",
  securityDeposit: "",

  cancellationPolicy: "flexible",

  instantBooking: false,

  houseRules: [],

  hostName: "",
  hostDescription: "",

  status: "draft",
};

const EMPTY_INVENTORY: InventorySettings = {
  total: "10",
  available: "10",
  reserved: "0",
  lowStockThreshold: "2",
  allowReservations: true,
};

function getApiOrigin(): string {
  const configured =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    FOCKIS_API_URL;

  return String(configured)
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/travel$/, "");
}

function resolveMediaUrl(value: string): string {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (
    /^(https?:|blob:|data:)/i.test(raw)
  ) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `${window.location.protocol}${raw}`;
  }

  const normalized = raw.startsWith("/")
    ? raw
    : `/${raw}`;

  return `${getApiOrigin()}${normalized}`;
}

function isVideoUrl(url: string): boolean {
  const value = String(url || "")
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();

  return (
    /\.(mp4|webm|mov|m4v|avi|mkv|ogv)$/i.test(
      value,
    ) ||
    value.includes("video/")
  );
}

function getUploadUrl(response: unknown): string {
  const root =
    response &&
    typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  const data =
    root.data &&
    typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : {};

  const media =
    typeof root.media === "string"
      ? root.media
      : typeof data.media === "string"
        ? data.media
        : typeof root.url === "string"
          ? root.url
          : typeof data.url === "string"
            ? data.url
            : "";

  return media.trim();
}

async function uploadMediaFile(
  file: File,
): Promise<string> {
  if (file.size > MAX_MEDIA_SIZE) {
    throw new Error(
      `${file.name} is larger than the 100 MB upload limit.`,
    );
  }

  const body = new FormData();

  body.append("file", file);

  const response = await travelApi.post(
    "/uploads",
    body,
  );

  const media = getUploadUrl(response);

  if (!media) {
    throw new Error(
      `The server did not return a media URL for ${file.name}.`,
    );
  }

  return media;
}

export default function TravelListingCreatePage() {
  const navigate = useNavigate();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const thumbnailStripRef =
    useRef<HTMLDivElement | null>(null);

  const [form, setForm] =
    useState<ListingForm>(EMPTY_FORM);

  const [inventory, setInventory] =
    useState<InventorySettings>(
      EMPTY_INVENTORY,
    );

  const [imageUrl, setImageUrl] =
    useState("");

  const [selectedMediaIndex, setSelectedMediaIndex] =
    useState(0);

  const [uploadingMedia, setUploadingMedia] =
    useState(false);

  const [uploadProgress, setUploadProgress] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const selectedCategories = useMemo(
    () =>
      CATEGORIES.filter((category) =>
        form.categories.includes(
          category.value,
        ),
      ),
    [form.categories],
  );

  const primaryCategory =
    form.categories[0] ||
    "Hotels & Stays";

  const selectedCategory = useMemo(
    () =>
      CATEGORIES.find(
        (category) =>
          category.value ===
          primaryCategory,
      ),
    [primaryCategory],
  );

  const isVacationRental =
    form.categories.includes(
      "Vacation Rentals",
    );

  const totalInventory = Math.max(
    0,
    Number(inventory.total) || 0,
  );

  const availableInventory = Math.max(
    0,
    Number(inventory.available) || 0,
  );

  const reservedInventory = Math.max(
    0,
    Number(inventory.reserved) || 0,
  );

  const lowStockThreshold = Math.max(
    0,
    Number(inventory.lowStockThreshold) || 0,
  );

  const inventoryStatus =
    !inventory.allowReservations
      ? "disabled"
      : availableInventory <= 0
        ? "sold-out"
        : availableInventory <=
            lowStockThreshold
          ? "low"
          : "available";

  const selectedMedia =
    form.images[selectedMediaIndex] ||
    form.images[0] ||
    "";

  const selectedMediaUrl =
    resolveMediaUrl(selectedMedia);

  const updateInventoryField = (
    field: keyof InventorySettings,
    value: string | boolean,
  ) => {
    setInventory((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleTotalInventoryChange = (
    value: string,
  ) => {
    const cleanValue = value.replace(
      /\D/g,
      "",
    );

    const nextTotal =
      Number(cleanValue) || 0;

    const reserved =
      Number(inventory.reserved) || 0;

    const nextAvailable = Math.max(
      0,
      nextTotal - reserved,
    );

    setInventory((previous) => ({
      ...previous,
      total: cleanValue,
      available: String(
        nextAvailable,
      ),
    }));
  };

  const handleAvailableInventoryChange = (
    value: string,
  ) => {
    const cleanValue = value.replace(
      /\D/g,
      "",
    );

    const total =
      Number(inventory.total) || 0;

    const reserved =
      Number(inventory.reserved) || 0;

    const maximumAvailable = Math.max(
      0,
      total - reserved,
    );

    const requested =
      Number(cleanValue) || 0;

    const nextAvailable = Math.min(
      requested,
      maximumAvailable,
    );

    setInventory((previous) => ({
      ...previous,
      available: String(
        nextAvailable,
      ),
    }));
  };

  const handleReservedInventoryChange = (
    value: string,
  ) => {
    const cleanValue = value.replace(
      /\D/g,
      "",
    );

    const total =
      Number(inventory.total) || 0;

    const requested =
      Number(cleanValue) || 0;

    const nextReserved = Math.min(
      requested,
      total,
    );

    const nextAvailable = Math.max(
      0,
      total - nextReserved,
    );

    setInventory((previous) => ({
      ...previous,
      reserved: String(
        nextReserved,
      ),
      available: String(
        nextAvailable,
      ),
    }));
  };

  const toggleCategory = (
    category: string,
  ) => {
    setForm((previous) => {
      const alreadySelected =
        previous.categories.includes(
          category,
        );

      if (alreadySelected) {
        if (
          previous.categories.length ===
          1
        ) {
          return previous;
        }

        const nextCategories =
          previous.categories.filter(
            (item) =>
              item !== category,
          );

        return {
          ...previous,
          categories:
            nextCategories,
          priceUnit:
            nextCategories.includes(
              "Vacation Rentals",
            )
              ? "night"
              : previous.priceUnit,
        };
      }

      const nextCategories = [
        ...previous.categories,
        category,
      ];

      return {
        ...previous,
        categories:
          nextCategories,
        priceUnit:
          nextCategories.includes(
            "Vacation Rentals",
          )
            ? "night"
            : previous.priceUnit,
      };
    });
  };

  const toggleAmenity = (
    amenity: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      amenities:
        previous.amenities.includes(
          amenity,
        )
          ? previous.amenities.filter(
              (item) =>
                item !== amenity,
            )
          : [
              ...previous.amenities,
              amenity,
            ],
    }));
  };

  const toggleHouseRule = (
    rule: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      houseRules:
        previous.houseRules.includes(
          rule,
        )
          ? previous.houseRules.filter(
              (item) =>
                item !== rule,
            )
          : [
              ...previous.houseRules,
              rule,
            ],
    }));
  };

  const addImageUrl = () => {
    const trimmed =
      imageUrl.trim();

    if (!trimmed) {
      return;
    }

    if (
      form.images.includes(trimmed)
    ) {
      setImageUrl("");
      return;
    }

    setForm((previous) => ({
      ...previous,
      images: [
        ...previous.images,
        trimmed,
      ],
    }));

    setSelectedMediaIndex(
      form.images.length,
    );

    setImageUrl("");
  };

  const handleMediaUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(
      event.target.files || [],
    );

    event.target.value = "";

    if (!files.length) {
      return;
    }

    if (
      form.images.length + files.length >
      MAX_MEDIA_FILES
    ) {
      setError(
        `You can upload up to ${MAX_MEDIA_FILES} photos or videos per listing.`,
      );
      return;
    }

    setUploadingMedia(true);
    setError("");
    setUploadProgress(
      `Uploading 0 of ${files.length} files...`,
    );

    const uploadedUrls: string[] = [];

    try {
      for (
        let index = 0;
        index < files.length;
        index += 1
      ) {
        const file = files[index];

        if (
          !file.type.startsWith(
            "image/",
          ) &&
          !file.type.startsWith(
            "video/",
          )
        ) {
          throw new Error(
            `${file.name} is not a supported photo or video file.`,
          );
        }

        setUploadProgress(
          `Uploading ${index + 1} of ${files.length}: ${file.name}`,
        );

        const uploadedUrl =
          await uploadMediaFile(
            file,
          );

        uploadedUrls.push(
          uploadedUrl,
        );
      }

      if (
        uploadedUrls.length > 0
      ) {
        setForm((previous) => ({
          ...previous,
          images: [
            ...previous.images,
            ...uploadedUrls,
          ],
        }));

        setSelectedMediaIndex(
          form.images.length,
        );
      }

      setUploadProgress(
        `${uploadedUrls.length} media file${
          uploadedUrls.length === 1
            ? ""
            : "s"
        } uploaded successfully.`,
      );
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the selected media.";

      console.error(
        "[Fockis Travel] Media upload failed:",
        uploadError,
      );

      setError(message);
    } finally {
      setUploadingMedia(false);

      window.setTimeout(() => {
        setUploadProgress("");
      }, 2500);
    }
  };

  const openMediaPicker = () => {
    if (uploadingMedia) {
      return;
    }

    fileInputRef.current?.click();
  };

  const removeImage = (
    index: number,
  ) => {
    setForm((previous) => {
      const nextImages =
        previous.images.filter(
          (_, imageIndex) =>
            imageIndex !== index,
        );

      return {
        ...previous,
        images: nextImages,
      };
    });

    setSelectedMediaIndex(
      (previousIndex) => {
        if (
          form.images.length <= 1
        ) {
          return 0;
        }

        if (
          index < previousIndex
        ) {
          return previousIndex - 1;
        }

        if (
          index === previousIndex &&
          previousIndex >=
            form.images.length - 1
        ) {
          return Math.max(
            0,
            previousIndex - 1,
          );
        }

        return previousIndex;
      },
    );
  };

  const makeCover = (
    index: number,
  ) => {
    if (
      index < 0 ||
      index >= form.images.length
    ) {
      return;
    }

    if (index === 0) {
      setSelectedMediaIndex(0);
      return;
    }

    setForm((previous) => {
      const nextImages = [
        ...previous.images,
      ];

      const [selected] =
        nextImages.splice(
          index,
          1,
        );

      nextImages.unshift(
        selected,
      );

      return {
        ...previous,
        images: nextImages,
      };
    });

    setSelectedMediaIndex(0);
  };

  const moveMedia = (
    index: number,
    direction: "left" | "right",
  ) => {
    const targetIndex =
      direction === "left"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= form.images.length
    ) {
      return;
    }

    setForm((previous) => {
      const nextImages = [
        ...previous.images,
      ];

      const current =
        nextImages[index];

      nextImages[index] =
        nextImages[targetIndex];

      nextImages[targetIndex] =
        current;

      return {
        ...previous,
        images: nextImages,
      };
    });

    setSelectedMediaIndex(
      targetIndex,
    );
  };

  const selectMedia = (
    index: number,
  ) => {
    setSelectedMediaIndex(index);
  };

  const scrollThumbnails = (
    direction: "left" | "right",
  ) => {
    const container =
      thumbnailStripRef.current;

    if (!container) {
      return;
    }

    container.scrollBy({
      left:
        direction === "left"
          ? -260
          : 260,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const total =
        Number(inventory.total);

      const available =
        Number(
          inventory.available,
        );

      const reserved =
        Number(
          inventory.reserved,
        );

      const threshold =
        Number(
          inventory.lowStockThreshold,
        );

      if (
        !Number.isFinite(total) ||
        total < 0
      ) {
        throw new Error(
          "Total inventory must be 0 or greater.",
        );
      }

      if (
        !Number.isFinite(available) ||
        available < 0
      ) {
        throw new Error(
          "Available inventory must be 0 or greater.",
        );
      }

      if (
        !Number.isFinite(reserved) ||
        reserved < 0
      ) {
        throw new Error(
          "Reserved inventory must be 0 or greater.",
        );
      }

      if (
        available + reserved !==
        total
      ) {
        throw new Error(
          "Available inventory must equal total inventory minus reserved inventory.",
        );
      }

      if (
        !Number.isFinite(threshold) ||
        threshold < 0
      ) {
        throw new Error(
          "Low-stock threshold must be 0 or greater.",
        );
      }

      const name =
        form.title.trim();

      const description =
        form.description.trim();

      const country =
        form.country.trim();

      const city =
        form.city.trim();

      const price =
        Number(form.price);

      const currency =
        form.currency
          .trim()
          .toUpperCase();

      const categories =
        form.categories
          .map((category) =>
            category.trim(),
          )
          .filter(Boolean);

      const listingType =
        CATEGORY_TYPE_MAP[
          categories[0]
        ] || "stay";

      if (
        categories.length === 0
      ) {
        throw new Error(
          "Select at least one listing category.",
        );
      }

      if (!name) {
        throw new Error(
          "Listing name is required.",
        );
      }

      if (!description) {
        throw new Error(
          "Listing description is required.",
        );
      }

      if (!country) {
        throw new Error(
          "Country is required.",
        );
      }

      if (!city) {
        throw new Error(
          "City is required.",
        );
      }

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        throw new Error(
          "Price must be 0 or greater.",
        );
      }

      if (!currency) {
        throw new Error(
          "Currency is required.",
        );
      }

      if (
        uploadingMedia
      ) {
        throw new Error(
          "Please wait for all media uploads to finish before creating the listing.",
        );
      }

      const metadata = {
        state:
          form.state.trim() ||
          undefined,

        beds:
          form.beds
            ? Number(form.beds)
            : undefined,

        propertyType:
          isVacationRental
            ? form.propertyType
            : undefined,

        rentalType:
          isVacationRental
            ? form.rentalType
            : undefined,

        checkInTime:
          isVacationRental
            ? form.checkInTime
            : undefined,

        checkOutTime:
          isVacationRental
            ? form.checkOutTime
            : undefined,

        minimumStay:
          isVacationRental &&
          form.minimumStay
            ? Number(
                form.minimumStay,
              )
            : undefined,

        maximumStay:
          isVacationRental &&
          form.maximumStay
            ? Number(
                form.maximumStay,
              )
            : undefined,

        cleaningFee:
          isVacationRental &&
          form.cleaningFee
            ? Number(
                form.cleaningFee,
              )
            : undefined,

        securityDeposit:
          isVacationRental &&
          form.securityDeposit
            ? Number(
                form.securityDeposit,
              )
            : undefined,

        cancellationPolicy:
          isVacationRental
            ? form.cancellationPolicy
            : undefined,

        instantBooking:
          isVacationRental
            ? form.instantBooking
            : undefined,

        houseRules:
          isVacationRental
            ? form.houseRules
            : undefined,

        hostName:
          form.hostName.trim() ||
          undefined,

        hostDescription:
          form.hostDescription.trim() ||
          undefined,

        inventoryLowStockThreshold:
          threshold,

        allowReservations:
          inventory.allowReservations,

        status:
          form.status,

        categories,

        mediaCount:
          form.images.length,

        coverMedia:
          form.images[0] ||
          undefined,
      };

      const payload = {
        name,

        title: name,

        type: listingType,

        category: categories[0],

        categories,

        description,

        country,

        city,

        address:
          form.address.trim() ||
          undefined,

        postalCode:
          form.postalCode.trim() ||
          undefined,

        phone:
          form.phone.trim() ||
          undefined,

        website:
          form.website.trim() ||
          undefined,

        currency,

        price,

        priceUnit:
          form.priceUnit,

        capacity:
          form.capacity
            ? Number(form.capacity)
            : undefined,

        bedrooms:
          form.bedrooms
            ? Number(form.bedrooms)
            : undefined,

        bathrooms:
          form.bathrooms
            ? Number(form.bathrooms)
            : undefined,

        amenities:
          form.amenities,

        /*
         * The first item in images is always
         * the listing's main/cover media.
         *
         * Additional photos/videos follow it
         * in the order selected by the partner.
         */
        images:
          form.images,

        inventory: {
          total,
          reserved,
          available,
        },

        metadata,
      };

      console.log(
        "[Fockis Travel] Creating listing:",
        payload,
      );

      await travelApi.post(
        "/travel/listings",
        payload,
      );

      setSuccess(true);

      window.setTimeout(() => {
        navigate(
          "/travel/management",
        );
      }, 900);
    } catch (requestError) {
      const apiError =
        requestError as {
          message?: string;
          details?: unknown;
          response?: {
            data?: {
              message?: string;
            };
          };
        };

      const responseMessage =
        apiError?.response?.data
          ?.message;

      const message =
        typeof responseMessage ===
        "string"
          ? responseMessage
          : typeof apiError?.message ===
              "string"
            ? apiError.message
            : requestError instanceof
                Error
              ? requestError.message
              : "Unable to create the travel listing.";

      console.error(
        "[Fockis Travel] Listing creation failed:",
        requestError,
      );

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="travel-management-page">
      <section
        style={{
          padding:
            "32px 20px 70px",
          background:
            "linear-gradient(180deg, #f7f9fb 0%, #eef2f5 100%)",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              marginBottom: 25,
            }}
          >
            <Link
              to="/travel/management"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 7,
                color:
                  "var(--navy, #163a5f)",
                textDecoration:
                  "none",
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 15,
              }}
            >
              <ArrowLeft size={16} />
              Back to Management
            </Link>

            <div
              style={{
                color:
                  "var(--amber, #b8862f)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing:
                  "0.12em",
                textTransform:
                  "uppercase",
              }}
            >
              Fockis Travel Partner
            </div>

            <h1
              style={{
                margin:
                  "6px 0 8px",
                fontSize:
                  "clamp(30px, 4vw, 48px)",
                color:
                  "var(--navy, #163a5f)",
              }}
            >
              Create a new travel listing
            </h1>

            <p
              style={{
                margin: 0,
                maxWidth: 760,
                color:
                  "var(--slate, #5B6B76)",
                lineHeight: 1.6,
              }}
            >
              Add your property, business,
              experience, transportation service,
              or other travel inventory to the
              Fockis Travel marketplace.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginBottom: 18,
                padding:
                  "13px 16px",
                borderRadius: 12,
                background:
                  "#fff1f1",
                border:
                  "1px solid #efb5b5",
                color:
                  "#8f1d1d",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              style={{
                marginBottom: 18,
                padding:
                  "13px 16px",
                borderRadius: 12,
                background:
                  "#edf9f0",
                border:
                  "1px solid #b9dfc1",
                color:
                  "#236b35",
                fontSize: 14,
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 8,
              }}
            >
              <Check size={17} />
              Listing created successfully.
              Returning to Travel Management...
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) 320px",
              gap: 20,
              alignItems:
                "start",
            }}
          >
            <div
              style={{
                display:
                  "grid",
                gap: 18,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Basic information
                </h2>

                <div
                  style={{
                    display:
                      "grid",
                    gap: 15,
                  }}
                >
                  <div className="ft-field">
                    <label htmlFor="listing-title">
                      Listing title
                    </label>

                    <input
                      id="listing-title"
                      required
                      value={form.title}
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            title:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="Fockis Hotel Bar"
                    />
                  </div>

                  <div className="ft-field">
                    <label>
                      Categories
                    </label>

                    <p
                      style={{
                        margin:
                          "0 0 10px",
                        color:
                          "var(--slate, #5B6B76)",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      Select every category that
                      applies. A single listing can
                      appear in multiple Travel
                      categories.
                    </p>

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: 9,
                      }}
                    >
                      {CATEGORIES.map(
                        (category) => {
                          const selected =
                            form.categories.includes(
                              category.value,
                            );

                          return (
                            <button
                              key={
                                category.value
                              }
                              type="button"
                              onClick={() =>
                                toggleCategory(
                                  category.value,
                                )
                              }
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 10,
                                width:
                                  "100%",
                                padding:
                                  "12px 14px",
                                borderRadius: 11,
                                border:
                                  selected
                                    ? "2px solid var(--amber, #E8A33D)"
                                    : "1px solid rgba(15,27,43,0.12)",
                                background:
                                  selected
                                    ? "rgba(232,163,61,0.08)"
                                    : "#fff",
                                cursor:
                                  "pointer",
                                textAlign:
                                  "left",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 21,
                                }}
                              >
                                {
                                  category.icon
                                }
                              </span>

                              <span
                                style={{
                                  flex: 1,
                                  fontWeight:
                                    selected
                                      ? 700
                                      : 500,
                                }}
                              >
                                {
                                  category.label
                                }
                              </span>

                              <span
                                style={{
                                  width: 21,
                                  height: 21,
                                  borderRadius: 5,
                                  display:
                                    "grid",
                                  placeItems:
                                    "center",
                                  background:
                                    selected
                                      ? "var(--amber, #E8A33D)"
                                      : "rgba(15,27,43,0.06)",
                                }}
                              >
                                {selected && (
                                  <Check
                                    size={13}
                                    color="#fff"
                                  />
                                )}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        color:
                          "var(--slate, #5B6B76)",
                      }}
                    >
                      Primary category:{" "}
                      <strong>
                        {primaryCategory}
                      </strong>
                    </div>
                  </div>

                  <div className="ft-field">
                    <label htmlFor="listing-description">
                      Description
                    </label>

                    <textarea
                      id="listing-description"
                      required
                      rows={6}
                      value={
                        form.description
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            description:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="Describe what guests can expect from this listing."
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Reservation inventory
                </h2>

                <p
                  style={{
                    color:
                      "var(--slate, #5B6B76)",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Set how many units can be
                  reserved. For a hotel this can
                  represent rooms, while another
                  business can use it for seats,
                  vehicles, appointments, or
                  available units.
                </p>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div className="ft-field">
                    <label htmlFor="inventory-total">
                      Total
                    </label>

                    <input
                      id="inventory-total"
                      type="number"
                      min="0"
                      value={
                        inventory.total
                      }
                      onChange={(event) =>
                        handleTotalInventoryChange(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="inventory-available">
                      Available
                    </label>

                    <input
                      id="inventory-available"
                      type="number"
                      min="0"
                      value={
                        inventory.available
                      }
                      onChange={(event) =>
                        handleAvailableInventoryChange(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="inventory-reserved">
                      Reserved
                    </label>

                    <input
                      id="inventory-reserved"
                      type="number"
                      min="0"
                      value={
                        inventory.reserved
                      }
                      onChange={(event) =>
                        handleReservedInventoryChange(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="inventory-threshold">
                      Low stock threshold
                    </label>

                    <input
                      id="inventory-threshold"
                      type="number"
                      min="0"
                      value={
                        inventory.lowStockThreshold
                      }
                      onChange={(event) =>
                        updateInventoryField(
                          "lowStockThreshold",
                          event.target.value.replace(
                            /\D/g,
                            "",
                          ),
                        )
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateInventoryField(
                      "allowReservations",
                      !inventory.allowReservations,
                    )
                  }
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "flex-start",
                    gap: 12,
                    width: "100%",
                    border: 0,
                    background:
                      "transparent",
                    padding:
                      "18px 0 0",
                    cursor:
                      "pointer",
                    textAlign:
                      "left",
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius:
                        999,
                      background:
                        inventory.allowReservations
                          ? "var(--amber, #E8A33D)"
                          : "#d7dde2",
                      position:
                        "relative",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius:
                          "50%",
                        background:
                          "#fff",
                        position:
                          "absolute",
                        top: 2,
                        left:
                          inventory.allowReservations
                            ? 22
                            : 2,
                      }}
                    />
                  </span>

                  <span>
                    <strong>
                      Allow reservations
                    </strong>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop: 4,
                        fontSize: 13,
                        color:
                          "var(--slate, #5B6B76)",
                      }}
                    >
                      Customers can reserve
                      available inventory.
                    </span>
                  </span>
                </button>

                <div
                  style={{
                    marginTop: 18,
                    padding: 15,
                    borderRadius: 12,
                    background:
                      inventoryStatus ===
                      "sold-out"
                        ? "#fff1f1"
                        : inventoryStatus ===
                            "low"
                          ? "#fff8eb"
                          : inventoryStatus ===
                              "disabled"
                            ? "#f4f5f6"
                            : "#edf9f0",
                    border:
                      "1px solid rgba(15,27,43,0.08)",
                  }}
                >
                  <strong>
                    Inventory status:{" "}
                    {inventoryStatus ===
                    "sold-out"
                      ? "Sold out"
                      : inventoryStatus ===
                          "low"
                        ? "Low stock"
                        : inventoryStatus ===
                            "disabled"
                          ? "Reservations disabled"
                          : "Available"}
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                      color:
                        "var(--slate, #5B6B76)",
                    }}
                  >
                    {
                      availableInventory
                    }{" "}
                    available out of{" "}
                    {totalInventory} total,
                    with{" "}
                    {reservedInventory}{" "}
                    reserved.
                  </div>
                </div>
              </div>

              {isVacationRental && (
                <div
                  style={{
                    background: "#fff",
                    border:
                      "1px solid var(--line, rgba(15,27,43,0.12))",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                    }}
                  >
                    Vacation rental details
                  </h2>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div className="ft-field">
                      <label htmlFor="property-type">
                        Property type
                      </label>

                      <select
                        id="property-type"
                        value={
                          form.propertyType
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              propertyType:
                                event.target.value,
                            }),
                          )
                        }
                      >
                        {PROPERTY_TYPES.map(
                          (property) => (
                            <option
                              key={property}
                              value={property}
                            >
                              {property}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="ft-field">
                      <label htmlFor="rental-type">
                        Guest access
                      </label>

                      <select
                        id="rental-type"
                        value={
                          form.rentalType
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              rentalType:
                                event.target.value,
                            }),
                          )
                        }
                      >
                        <option value="Entire place">
                          Entire place
                        </option>
                        <option value="Private room">
                          Private room
                        </option>
                        <option value="Shared room">
                          Shared room
                        </option>
                      </select>
                    </div>

                    <div className="ft-field">
                      <label htmlFor="check-in">
                        Check-in time
                      </label>

                      <input
                        id="check-in"
                        type="time"
                        value={
                          form.checkInTime
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              checkInTime:
                                event.target.value,
                            }),
                          )
                        }
                      />
                    </div>

                    <div className="ft-field">
                      <label htmlFor="check-out">
                        Check-out time
                      </label>

                      <input
                        id="check-out"
                        type="time"
                        value={
                          form.checkOutTime
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              checkOutTime:
                                event.target.value,
                            }),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Pricing
                </h2>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr 1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div className="ft-field">
                    <label htmlFor="listing-price">
                      Starting price
                    </label>

                    <input
                      id="listing-price"
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            price:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="listing-currency">
                      Currency
                    </label>

                    <select
                      id="listing-currency"
                      value={
                        form.currency
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            currency:
                              event.target.value,
                          }),
                        )
                      }
                    >
                      {CURRENCIES.map(
                        (currency) => (
                          <option
                            key={
                              currency.value
                            }
                            value={
                              currency.value
                            }
                          >
                            {currency.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="ft-field">
                    <label htmlFor="listing-price-unit">
                      Price unit
                    </label>

                    <select
                      id="listing-price-unit"
                      value={
                        form.priceUnit
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            priceUnit:
                              event.target.value,
                          }),
                        )
                      }
                    >
                      <option value="night">
                        Per night
                      </option>
                      <option value="day">
                        Per day
                      </option>
                      <option value="hour">
                        Per hour
                      </option>
                      <option value="person">
                        Per person
                      </option>
                      <option value="vehicle">
                        Per vehicle
                      </option>
                      <option value="event">
                        Per event
                      </option>
                      <option value="custom">
                        Custom
                      </option>
                    </select>
                  </div>
                </div>

                {isVacationRental && (
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    <div className="ft-field">
                      <label htmlFor="cleaning-fee">
                        Cleaning fee
                      </label>

                      <input
                        id="cleaning-fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.cleaningFee
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              cleaningFee:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div className="ft-field">
                      <label htmlFor="security-deposit">
                        Security deposit
                      </label>

                      <input
                        id="security-deposit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          form.securityDeposit
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              securityDeposit:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              {isVacationRental && (
                <div
                  style={{
                    background: "#fff",
                    border:
                      "1px solid var(--line, rgba(15,27,43,0.12))",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                    }}
                  >
                    Stay requirements
                  </h2>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div className="ft-field">
                      <label htmlFor="minimum-stay">
                        Minimum nights
                      </label>

                      <input
                        id="minimum-stay"
                        type="number"
                        min="1"
                        value={
                          form.minimumStay
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              minimumStay:
                                event.target.value,
                            }),
                          )
                        }
                      />
                    </div>

                    <div className="ft-field">
                      <label htmlFor="maximum-stay">
                        Maximum nights
                      </label>

                      <input
                        id="maximum-stay"
                        type="number"
                        min="1"
                        value={
                          form.maximumStay
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              maximumStay:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="No maximum"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Location
                </h2>

                <div
                  style={{
                    display:
                      "grid",
                    gap: 12,
                  }}
                >
                  <div className="ft-field">
                    <label htmlFor="listing-address">
                      Address
                    </label>

                    <input
                      id="listing-address"
                      value={
                        form.address
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            address:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="Street address"
                    />
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div className="ft-field">
                      <label htmlFor="listing-city">
                        City
                      </label>

                      <input
                        id="listing-city"
                        required
                        value={
                          form.city
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              city:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="City"
                      />
                    </div>

                    <div className="ft-field">
                      <label htmlFor="listing-state">
                        State / Province / Department
                      </label>

                      <input
                        id="listing-state"
                        value={
                          form.state
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              state:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="State, province, or department"
                      />
                    </div>

                    <div className="ft-field">
                      <label htmlFor="listing-postal-code">
                        ZIP / Postal code
                      </label>

                      <input
                        id="listing-postal-code"
                        value={
                          form.postalCode
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              postalCode:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="ZIP code"
                      />
                    </div>

                    <div className="ft-field">
                      <label htmlFor="listing-country">
                        Country
                      </label>

                      <input
                        id="listing-country"
                        required
                        value={
                          form.country
                        }
                        onChange={(event) =>
                          setForm(
                            (previous) => ({
                              ...previous,
                              country:
                                event.target.value,
                            }),
                          )
                        }
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Guests & sleeping arrangements
                </h2>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div className="ft-field">
                    <label htmlFor="listing-capacity">
                      <Users size={14} /> Guests
                    </label>

                    <input
                      id="listing-capacity"
                      type="number"
                      min="0"
                      value={
                        form.capacity
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            capacity:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="Guests"
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="listing-bedrooms">
                      <Home size={14} /> Bedrooms
                    </label>

                    <input
                      id="listing-bedrooms"
                      type="number"
                      min="0"
                      value={
                        form.bedrooms
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            bedrooms:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="listing-beds">
                      <BedDouble size={14} /> Beds
                    </label>

                    <input
                      id="listing-beds"
                      type="number"
                      min="0"
                      value={
                        form.beds
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            beds:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="listing-bathrooms">
                      <Bath size={14} /> Bathrooms
                    </label>

                    <input
                      id="listing-bathrooms"
                      type="number"
                      min="0"
                      step="0.5"
                      value={
                        form.bathrooms
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            bathrooms:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 9,
                    marginBottom: 6,
                  }}
                >
                  <Sparkles size={19} />

                  <h2
                    style={{
                      margin: 0,
                    }}
                  >
                    Amenities & features
                  </h2>
                </div>

                <p
                  style={{
                    color:
                      "var(--slate, #5B6B76)",
                    fontSize: 14,
                  }}
                >
                  Select everything guests
                  can use.
                </p>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 9,
                  }}
                >
                  {COMMON_AMENITIES.map(
                    (amenity) => {
                      const selected =
                        form.amenities.includes(
                          amenity,
                        );

                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() =>
                            toggleAmenity(
                              amenity,
                            )
                          }
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 9,
                            padding:
                              "11px 13px",
                            borderRadius: 10,
                            border:
                              selected
                                ? "2px solid var(--amber, #E8A33D)"
                                : "1px solid rgba(15,27,43,0.12)",
                            background:
                              selected
                                ? "rgba(232,163,61,0.08)"
                                : "#fff",
                            cursor:
                              "pointer",
                            textAlign:
                              "left",
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 5,
                              display:
                                "grid",
                              placeItems:
                                "center",
                              background:
                                selected
                                  ? "var(--amber, #E8A33D)"
                                  : "rgba(15,27,43,0.06)",
                              flexShrink: 0,
                            }}
                          >
                            {selected && (
                              <Check
                                size={13}
                                color="#fff"
                              />
                            )}
                          </span>

                          {amenity}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {isVacationRental && (
                <div
                  style={{
                    background: "#fff",
                    border:
                      "1px solid var(--line, rgba(15,27,43,0.12))",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                    }}
                  >
                    House rules
                  </h2>

                  <p
                    style={{
                      color:
                        "var(--slate, #5B6B76)",
                      fontSize: 14,
                    }}
                  >
                    Let guests know what is
                    expected during their stay.
                  </p>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: 9,
                    }}
                  >
                    {HOUSE_RULES.map(
                      (rule) => {
                        const selected =
                          form.houseRules.includes(
                            rule,
                          );

                        return (
                          <button
                            key={rule}
                            type="button"
                            onClick={() =>
                              toggleHouseRule(
                                rule,
                              )
                            }
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 9,
                              padding:
                                "11px 13px",
                              borderRadius: 10,
                              border:
                                selected
                                  ? "2px solid var(--amber, #E8A33D)"
                                  : "1px solid rgba(15,27,43,0.12)",
                              background:
                                selected
                                  ? "rgba(232,163,61,0.08)"
                                  : "#fff",
                              cursor:
                                "pointer",
                              textAlign:
                                "left",
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 5,
                                display:
                                  "grid",
                                placeItems:
                                  "center",
                                background:
                                  selected
                                    ? "var(--amber, #E8A33D)"
                                    : "rgba(15,27,43,0.06)",
                              }}
                            >
                              {selected && (
                                <Check
                                  size={13}
                                  color="#fff"
                                />
                              )}
                            </span>

                            {rule}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {isVacationRental && (
                <div
                  style={{
                    background: "#fff",
                    border:
                      "1px solid var(--line, rgba(15,27,43,0.12))",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 9,
                      marginBottom: 8,
                    }}
                  >
                    <ShieldCheck
                      size={19}
                    />

                    <h2
                      style={{
                        margin: 0,
                      }}
                    >
                      Cancellation policy
                    </h2>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gap: 10,
                    }}
                  >
                    {CANCELLATION_POLICIES.map(
                      (policy) => {
                        const selected =
                          form.cancellationPolicy ===
                          policy.value;

                        return (
                          <button
                            key={
                              policy.value
                            }
                            type="button"
                            onClick={() =>
                              setForm(
                                (
                                  previous,
                                ) => ({
                                  ...previous,
                                  cancellationPolicy:
                                    policy.value,
                                }),
                              )
                            }
                            style={{
                              display:
                                "block",
                              width:
                                "100%",
                              textAlign:
                                "left",
                              padding:
                                "14px 16px",
                              borderRadius: 12,
                              border:
                                selected
                                  ? "2px solid var(--amber, #E8A33D)"
                                  : "1px solid rgba(15,27,43,0.12)",
                              background:
                                selected
                                  ? "rgba(232,163,61,0.08)"
                                  : "#fff",
                              cursor:
                                "pointer",
                            }}
                          >
                            <strong>
                              {
                                policy.label
                              }
                            </strong>

                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 13,
                                color:
                                  "var(--slate, #5B6B76)",
                              }}
                            >
                              {
                                policy.description
                              }
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {isVacationRental && (
                <div
                  style={{
                    background: "#fff",
                    border:
                      "1px solid var(--line, rgba(15,27,43,0.12))",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 9,
                      marginBottom: 8,
                    }}
                  >
                    <Clock3 size={19} />

                    <h2
                      style={{
                        margin: 0,
                      }}
                    >
                      Booking settings
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          instantBooking:
                            !previous.instantBooking,
                        }),
                      )
                    }
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "flex-start",
                      gap: 12,
                      width:
                        "100%",
                      border: 0,
                      background:
                        "transparent",
                      padding: 0,
                      cursor:
                        "pointer",
                      textAlign:
                        "left",
                    }}
                  >
                    <span
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius:
                          999,
                        background:
                          form.instantBooking
                            ? "var(--amber, #E8A33D)"
                            : "#d7dde2",
                        position:
                          "relative",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius:
                            "50%",
                          background:
                            "#fff",
                          position:
                            "absolute",
                          top: 2,
                          left:
                            form.instantBooking
                              ? 22
                              : 2,
                        }}
                      />
                    </span>

                    <span>
                      <strong>
                        Instant booking
                      </strong>

                      <span
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                          fontSize: 13,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        Allow eligible guests
                        to book immediately
                        without waiting for
                        host approval.
                      </span>
                    </span>
                  </button>
                </div>
              )}

              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Host / contact information
                </h2>

                {isVacationRental && (
                  <p
                    style={{
                      color:
                        "var(--slate, #5B6B76)",
                      fontSize: 14,
                    }}
                  >
                    This information helps
                    guests understand who manages
                    the property.
                  </p>
                )}

                <div className="ft-field">
                  <label htmlFor="host-name">
                    Host name
                  </label>

                  <input
                    id="host-name"
                    value={
                      form.hostName
                    }
                    onChange={(event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          hostName:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="Your name or business name"
                  />
                </div>

                {isVacationRental && (
                  <div className="ft-field">
                    <label htmlFor="host-description">
                      About the host
                    </label>

                    <textarea
                      id="host-description"
                      rows={4}
                      value={
                        form.hostDescription
                      }
                      onChange={(event) =>
                        setForm(
                          (previous) => ({
                            ...previous,
                            hostDescription:
                              event.target.value,
                          }),
                        )
                      }
                      placeholder="Tell guests a little about yourself and why you enjoy hosting."
                    />
                  </div>
                )}

                <div className="ft-field">
                  <label htmlFor="listing-phone">
                    Phone
                  </label>

                  <input
                    id="listing-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          phone:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="+1..."
                  />
                </div>

                <div className="ft-field">
                  <label htmlFor="listing-website">
                    Website
                  </label>

                  <input
                    id="listing-website"
                    type="url"
                    value={
                      form.website
                    }
                    onChange={(event) =>
                      setForm(
                        (previous) => ({
                          ...previous,
                          website:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* ============================================================
                  LISTING MEDIA
                  ============================================================ */}
              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 9,
                    marginBottom: 6,
                  }}
                >
                  <ImagePlus size={19} />

                  <h2
                    style={{
                      margin: 0,
                    }}
                  >
                    Listing photos & videos
                  </h2>
                </div>

                <p
                  style={{
                    marginTop: 5,
                    color:
                      "var(--slate, #5B6B76)",
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  Upload several photos and videos
                  for this listing. The first media
                  item is the main listing cover.
                  Customers can browse the remaining
                  media from the listing gallery.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={
                    handleMediaUpload
                  }
                  style={{
                    display: "none",
                  }}
                />

                <button
                  type="button"
                  onClick={
                    openMediaPicker
                  }
                  disabled={
                    uploadingMedia ||
                    form.images.length >=
                      MAX_MEDIA_FILES
                  }
                  style={{
                    width: "100%",
                    minHeight: 120,
                    borderRadius: 14,
                    border:
                      "2px dashed rgba(22,58,95,0.28)",
                    background:
                      "linear-gradient(180deg, rgba(22,58,95,0.035), rgba(184,134,47,0.045))",
                    color:
                      "var(--navy, #163a5f)",
                    cursor:
                      uploadingMedia
                        ? "wait"
                        : "pointer",
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: 8,
                    padding: 18,
                  }}
                >
                  {uploadingMedia ? (
                    <>
                      <Loader2
                        size={28}
                        className="spin"
                      />

                      <strong>
                        Uploading media...
                      </strong>

                      <span
                        style={{
                          fontSize: 13,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        {uploadProgress}
                      </span>
                    </>
                  ) : (
                    <>
                      <ImagePlus
                        size={30}
                      />

                      <strong>
                        Upload photos & videos
                      </strong>

                      <span
                        style={{
                          fontSize: 13,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        Select multiple files at once
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        JPG, PNG, WEBP, GIF, MP4, WEBM,
                        MOV and other supported media
                      </span>
                    </>
                  )}
                </button>

                <div
                  style={{
                    display:
                      "flex",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  <input
                    value={imageUrl}
                    onChange={(event) =>
                      setImageUrl(
                        event.target.value,
                      )
                    }
                    placeholder="Or add an image/video URL"
                  />

                  <button
                    type="button"
                    className="btn"
                    onClick={
                      addImageUrl
                    }
                  >
                    <Plus size={15} />
                    Add URL
                  </button>
                </div>

                {uploadProgress &&
                  !uploadingMedia && (
                    <div
                      style={{
                        marginTop: 10,
                        padding:
                          "9px 12px",
                        borderRadius: 9,
                        background:
                          "#edf9f0",
                        color:
                          "#236b35",
                        fontSize: 13,
                      }}
                    >
                      <Check
                        size={14}
                        style={{
                          verticalAlign:
                            "middle",
                          marginRight: 5,
                        }}
                      />
                      {uploadProgress}
                    </div>
                  )}

                {form.images.length >
                  0 && (
                  <div
                    style={{
                      marginTop: 20,
                    }}
                  >
                    {/* Main media */}
                    <div
                      style={{
                        position:
                          "relative",
                        width: "100%",
                        height:
                          "min(430px, 48vw)",
                        minHeight: 260,
                        borderRadius: 14,
                        overflow:
                          "hidden",
                        background:
                          "#111820",
                        border:
                          "1px solid rgba(15,27,43,0.14)",
                      }}
                    >
                      {selectedMediaUrl ? (
                        isVideoUrl(
                          selectedMedia,
                        ) ? (
                          <video
                            key={
                              selectedMedia
                            }
                            src={
                              selectedMediaUrl
                            }
                            controls
                            playsInline
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              objectFit:
                                "cover",
                              display:
                                "block",
                            }}
                          />
                        ) : (
                          <img
                            src={
                              selectedMediaUrl
                            }
                            alt="Listing cover preview"
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              objectFit:
                                "cover",
                              display:
                                "block",
                            }}
                            onError={(
                              event,
                            ) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />
                        )
                      ) : null}

                      <div
                        style={{
                          position:
                            "absolute",
                          top: 12,
                          left: 12,
                          padding:
                            "6px 10px",
                          borderRadius: 999,
                          background:
                            "rgba(0,0,0,0.7)",
                          color:
                            "#fff",
                          fontSize: 12,
                          fontWeight: 700,
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          gap: 6,
                        }}
                      >
                        <Sparkles
                          size={13}
                        />
                        Main listing media
                      </div>

                      <div
                        style={{
                          position:
                            "absolute",
                          bottom: 12,
                          left: 12,
                          padding:
                            "6px 10px",
                          borderRadius: 999,
                          background:
                            "rgba(0,0,0,0.68)",
                          color:
                            "#fff",
                          fontSize: 12,
                        }}
                      >
                        {isVideoUrl(
                          selectedMedia,
                        )
                          ? "Video"
                          : "Photo"}{" "}
                        {selectedMediaIndex +
                          1}{" "}
                        of{" "}
                        {form.images.length}
                      </div>

                      {form.images.length >
                        1 && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMediaIndex(
                                (previous) =>
                                  previous <=
                                  0
                                    ? form.images.length -
                                      1
                                    : previous -
                                      1,
                              )
                            }
                            aria-label="Previous listing media"
                            style={{
                              position:
                                "absolute",
                              left: 12,
                              top: "50%",
                              transform:
                                "translateY(-50%)",
                              width: 42,
                              height: 42,
                              border: 0,
                              borderRadius:
                                "50%",
                              background:
                                "rgba(0,0,0,0.62)",
                              color:
                                "#fff",
                              display:
                                "grid",
                              placeItems:
                                "center",
                              cursor:
                                "pointer",
                            }}
                          >
                            <ArrowLeft
                              size={20}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMediaIndex(
                                (previous) =>
                                  previous >=
                                  form.images.length -
                                    1
                                    ? 0
                                    : previous +
                                      1,
                              )
                            }
                            aria-label="Next listing media"
                            style={{
                              position:
                                "absolute",
                              right: 12,
                              top: "50%",
                              transform:
                                "translateY(-50%)",
                              width: 42,
                              height: 42,
                              border: 0,
                              borderRadius:
                                "50%",
                              background:
                                "rgba(0,0,0,0.62)",
                              color:
                                "#fff",
                              display:
                                "grid",
                              placeItems:
                                "center",
                              cursor:
                                "pointer",
                            }}
                          >
                            <ArrowRight
                              size={20}
                            />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Thumbnail controls */}
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          scrollThumbnails(
                            "left",
                          )
                        }
                        aria-label="Scroll listing media left"
                        style={{
                          flexShrink: 0,
                          width: 38,
                          height: 38,
                          borderRadius:
                            "50%",
                          border:
                            "1px solid rgba(15,27,43,0.14)",
                          background:
                            "#fff",
                          color:
                            "var(--navy, #163a5f)",
                          display:
                            "grid",
                          placeItems:
                            "center",
                          cursor:
                            "pointer",
                        }}
                      >
                        <ArrowLeft
                          size={17}
                        />
                      </button>

                      <div
                        ref={
                          thumbnailStripRef
                        }
                        style={{
                          display:
                            "flex",
                          gap: 9,
                          overflowX:
                            "auto",
                          scrollBehavior:
                            "smooth",
                          flex: 1,
                          padding:
                            "2px 1px 7px",
                          scrollbarWidth:
                            "thin",
                        }}
                      >
                        {form.images.map(
                          (
                            image,
                            index,
                          ) => {
                            const mediaUrl =
                              resolveMediaUrl(
                                image,
                              );

                            const active =
                              index ===
                              selectedMediaIndex;

                            const isVideo =
                              isVideoUrl(
                                image,
                              );

                            return (
                              <button
                                key={`${image}-${index}`}
                                type="button"
                                onClick={() =>
                                  selectMedia(
                                    index,
                                  )
                                }
                                aria-label={`Select listing media ${index + 1}`}
                                style={{
                                  position:
                                    "relative",
                                  flex:
                                    "0 0 108px",
                                  width: 108,
                                  height: 76,
                                  padding: 0,
                                  border:
                                    active
                                      ? "3px solid var(--amber, #E8A33D)"
                                      : "2px solid transparent",
                                  borderRadius: 10,
                                  overflow:
                                    "hidden",
                                  background:
                                    "#18212a",
                                  cursor:
                                    "pointer",
                                }}
                              >
                                {isVideo ? (
                                  <video
                                    src={
                                      mediaUrl
                                    }
                                    muted
                                    playsInline
                                    preload="metadata"
                                    style={{
                                      width:
                                        "100%",
                                      height:
                                        "100%",
                                      objectFit:
                                        "cover",
                                      display:
                                        "block",
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={
                                      mediaUrl
                                    }
                                    alt={`Listing media ${index + 1}`}
                                    style={{
                                      width:
                                        "100%",
                                      height:
                                        "100%",
                                      objectFit:
                                        "cover",
                                      display:
                                        "block",
                                    }}
                                  />
                                )}

                                <span
                                  style={{
                                    position:
                                      "absolute",
                                    left: 5,
                                    bottom: 5,
                                    padding:
                                      "3px 6px",
                                    borderRadius: 5,
                                    background:
                                      "rgba(0,0,0,0.7)",
                                    color:
                                      "#fff",
                                    fontSize: 9,
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  {isVideo
                                    ? "VIDEO"
                                    : "PHOTO"}
                                </span>

                                {index ===
                                  0 && (
                                  <span
                                    style={{
                                      position:
                                        "absolute",
                                      top: 5,
                                      left: 5,
                                      padding:
                                        "3px 6px",
                                      borderRadius: 5,
                                      background:
                                        "var(--amber, #E8A33D)",
                                      color:
                                        "#fff",
                                      fontSize: 9,
                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    COVER
                                  </span>
                                )}
                              </button>
                            );
                          },
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          scrollThumbnails(
                            "right",
                          )
                        }
                        aria-label="Scroll listing media right"
                        style={{
                          flexShrink: 0,
                          width: 38,
                          height: 38,
                          borderRadius:
                            "50%",
                          border:
                            "1px solid rgba(15,27,43,0.14)",
                          background:
                            "#fff",
                          color:
                            "var(--navy, #163a5f)",
                          display:
                            "grid",
                          placeItems:
                            "center",
                          cursor:
                            "pointer",
                        }}
                      >
                        <ArrowRight
                          size={17}
                        />
                      </button>
                    </div>

                    {/* Selected media controls */}
                    <div
                      style={{
                        display:
                          "flex",
                        flexWrap:
                          "wrap",
                        alignItems:
                          "center",
                        gap: 8,
                        marginTop: 12,
                        padding:
                          "12px 14px",
                        borderRadius: 11,
                        background:
                          "#f5f7f8",
                        border:
                          "1px solid rgba(15,27,43,0.08)",
                      }}
                    >
                      <strong
                        style={{
                          marginRight:
                            "auto",
                          fontSize: 13,
                        }}
                      >
                        Media{" "}
                        {selectedMediaIndex +
                          1}{" "}
                        selected
                      </strong>

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          selectedMediaIndex ===
                          0
                        }
                        onClick={() =>
                          makeCover(
                            selectedMediaIndex,
                          )
                        }
                      >
                        <Sparkles
                          size={14}
                        />
                        Make cover
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          selectedMediaIndex ===
                          0
                        }
                        onClick={() =>
                          moveMedia(
                            selectedMediaIndex,
                            "left",
                          )
                        }
                      >
                        <ArrowLeft
                          size={14}
                        />
                        Move left
                      </button>

                      <button
                        type="button"
                        className="btn"
                        disabled={
                          selectedMediaIndex >=
                          form.images.length -
                            1
                        }
                        onClick={() =>
                          moveMedia(
                            selectedMediaIndex,
                            "right",
                          )
                        }
                      >
                        Move right
                        <ArrowRight
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        className="btn"
                        onClick={() =>
                          removeImage(
                            selectedMediaIndex,
                          )
                        }
                      >
                        <X size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    padding: 13,
                    borderRadius: 11,
                    background:
                      "rgba(22,58,95,0.045)",
                    color:
                      "var(--slate, #5B6B76)",
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <strong
                    style={{
                      color:
                        "var(--navy, #163a5f)",
                    }}
                  >
                    Listing media:
                  </strong>{" "}
                  You can upload up to{" "}
                  {MAX_MEDIA_FILES} photos or
                  videos. The first item is used as
                  the main listing cover. Use
                  "Make cover" to move any photo or
                  video to the front.
                </div>
              </div>
            </div>

            <aside
              style={{
                position:
                  "sticky",
                top: 90,
                display:
                  "grid",
                gap: 15,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 9,
                    marginBottom: 15,
                  }}
                >
                  <Building2
                    size={18}
                  />

                  <strong>
                    Listing preview
                  </strong>
                </div>

                {form.images.length >
                  0 && (
                  <div
                    style={{
                      position:
                        "relative",
                      width:
                        "100%",
                      height: 180,
                      borderRadius: 12,
                      overflow:
                        "hidden",
                      background:
                        "#18212a",
                      marginBottom: 15,
                    }}
                  >
                    {selectedMediaUrl &&
                      (isVideoUrl(
                        selectedMedia,
                      ) ? (
                        <video
                          key={
                            selectedMedia
                          }
                          src={
                            selectedMediaUrl
                          }
                          muted
                          playsInline
                          preload="metadata"
                          controls
                          style={{
                            width:
                              "100%",
                            height:
                              "100%",
                            objectFit:
                              "cover",
                          }}
                        />
                      ) : (
                        <img
                          src={
                            selectedMediaUrl
                          }
                          alt="Listing preview"
                          style={{
                            width:
                              "100%",
                            height:
                              "100%",
                            objectFit:
                              "cover",
                            display:
                              "block",
                          }}
                        />
                      ))}

                    <span
                      style={{
                        position:
                          "absolute",
                        top: 9,
                        left: 9,
                        padding:
                          "5px 8px",
                        borderRadius:
                          999,
                        background:
                          "rgba(0,0,0,0.68)",
                        color:
                          "#fff",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      COVER
                    </span>
                  </div>
                )}

                <div
                  style={{
                    fontSize: 36,
                    marginBottom: 8,
                  }}
                >
                  {
                    selectedCategory?.icon
                  }
                </div>

                <h3
                  style={{
                    margin:
                      "0 0 5px",
                  }}
                >
                  {form.title ||
                    "Your listing name"}
                </h3>

                <div
                  style={{
                    fontSize: 13,
                    color:
                      "var(--slate, #5B6B76)",
                    lineHeight: 1.5,
                  }}
                >
                  {selectedCategories
                    .map(
                      (category) =>
                        `${category.icon} ${category.label}`,
                    )
                    .join(" • ")}
                </div>

                {form.images.length >
                  0 && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color:
                        "var(--slate, #5B6B76)",
                    }}
                  >
                    {form.images.length}{" "}
                    media item
                    {form.images.length ===
                    1
                      ? ""
                      : "s"}{" "}
                    uploaded
                  </div>
                )}

                {isVacationRental &&
                  form.propertyType && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                      }}
                    >
                      {form.propertyType}
                    </div>
                  )}

                {(form.city ||
                  form.country) && (
                  <div
                    style={{
                      display:
                        "flex",
                      gap: 5,
                      alignItems:
                        "center",
                      marginTop: 12,
                      fontSize: 13,
                    }}
                  >
                    <MapPin
                      size={13}
                    />

                    {[
                      form.city,
                      form.state,
                      form.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}

                {form.price && (
                  <div
                    style={{
                      marginTop: 18,
                      fontWeight: 700,
                      fontSize: 20,
                    }}
                  >
                    {form.currency}{" "}
                    {form.price}

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        marginLeft: 4,
                      }}
                    >
                      /{" "}
                      {
                        form.priceUnit
                      }
                    </span>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 15,
                    borderTop:
                      "1px solid rgba(15,27,43,0.08)",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 7,
                      marginBottom: 10,
                    }}
                  >
                    <Package
                      size={15}
                    />

                    <strong
                      style={{
                        fontSize: 13,
                      }}
                    >
                      Availability
                    </strong>
                  </div>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(3, 1fr)",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        padding:
                          "9px 5px",
                        borderRadius:
                          9,
                        background:
                          "#f5f7f8",
                        textAlign:
                          "center",
                      }}
                    >
                      <strong
                        style={{
                          display:
                            "block",
                          fontSize:
                            18,
                        }}
                      >
                        {
                          totalInventory
                        }
                      </strong>

                      <span
                        style={{
                          fontSize:
                            10,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        Total
                      </span>
                    </div>

                    <div
                      style={{
                        padding:
                          "9px 5px",
                        borderRadius:
                          9,
                        background:
                          "#edf9f0",
                        textAlign:
                          "center",
                      }}
                    >
                      <strong
                        style={{
                          display:
                            "block",
                          fontSize:
                            18,
                          color:
                            "#236b35",
                        }}
                      >
                        {
                          availableInventory
                        }
                      </strong>

                      <span
                        style={{
                          fontSize:
                            10,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        Available
                      </span>
                    </div>

                    <div
                      style={{
                        padding:
                          "9px 5px",
                        borderRadius:
                          9,
                        background:
                          "#fff4f4",
                        textAlign:
                          "center",
                      }}
                    >
                      <strong
                        style={{
                          display:
                            "block",
                          fontSize:
                            18,
                          color:
                            "#9b2226",
                        }}
                      >
                        {
                          reservedInventory
                        }
                      </strong>

                      <span
                        style={{
                          fontSize:
                            10,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        Reserved
                      </span>
                    </div>
                  </div>
                </div>

                {isVacationRental &&
                  (form.capacity ||
                    form.bedrooms ||
                    form.beds ||
                    form.bathrooms) && (
                    <div
                      style={{
                        display:
                          "grid",
                        gap: 7,
                        marginTop: 15,
                        paddingTop: 15,
                        borderTop:
                          "1px solid rgba(15,27,43,0.08)",
                        fontSize: 13,
                      }}
                    >
                      {form.capacity && (
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 7,
                            alignItems:
                              "center",
                          }}
                        >
                          <Users
                            size={14}
                          />

                          {form.capacity}{" "}
                          guests
                        </div>
                      )}

                      {form.bedrooms && (
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 7,
                            alignItems:
                              "center",
                          }}
                        >
                          <Home
                            size={14}
                          />

                          {form.bedrooms}{" "}
                          bedrooms
                        </div>
                      )}

                      {form.beds && (
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 7,
                            alignItems:
                              "center",
                          }}
                        >
                          <BedDouble
                            size={14}
                          />

                          {form.beds} beds
                        </div>
                      )}

                      {form.bathrooms && (
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 7,
                            alignItems:
                              "center",
                          }}
                        >
                          <Bath
                            size={14}
                          />

                          {form.bathrooms}{" "}
                          bathrooms
                        </div>
                      )}
                    </div>
                  )}
              </div>

              <div
                style={{
                  background:
                    "rgba(232,163,61,0.09)",
                  border:
                    "1px solid rgba(232,163,61,0.25)",
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Package
                    size={17}
                  />

                  <strong>
                    Reservation inventory
                  </strong>
                </div>

                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.65,
                    color:
                      "var(--slate, #5B6B76)",
                  }}
                >
                  Every successful reservation
                  should decrease the available
                  quantity by the number reserved.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    background:
                      "#fff",
                    border:
                      "1px solid rgba(15,27,43,0.08)",
                    fontSize: 13,
                  }}
                >
                  <strong>
                    Example
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                    }}
                  >
                    10 available
                    <ArrowRight
                      size={13}
                      style={{
                        verticalAlign:
                          "middle",
                        margin:
                          "0 5px",
                      }}
                    />
                    1 reserved
                    <ArrowRight
                      size={13}
                      style={{
                        verticalAlign:
                          "middle",
                        margin:
                          "0 5px",
                      }}
                    />
                    9 available
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      color:
                        "var(--slate, #5B6B76)",
                    }}
                  >
                    If that reservation is
                    cancelled, it can return to
                    10 available.
                  </div>
                </div>
              </div>

              <div
                style={{
                  background:
                    "rgba(232,163,61,0.09)",
                  border:
                    "1px solid rgba(232,163,61,0.25)",
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <strong>
                  Before you publish
                </strong>

                <ul
                  style={{
                    margin:
                      "10px 0 0",
                    paddingLeft: 19,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  <li>
                    Use accurate property
                    information.
                  </li>

                  <li>
                    Select all applicable
                    categories.
                  </li>

                  <li>
                    Add high-quality photos
                    and videos.
                  </li>

                  <li>
                    Choose the best media as
                    the listing cover.
                  </li>

                  <li>
                    Set an accurate starting
                    price.
                  </li>

                  <li>
                    Make sure your location is
                    correct.
                  </li>

                  <li>
                    Set the correct inventory
                    quantity.
                  </li>

                  <li>
                    Confirm available inventory
                    equals total minus reserved.
                  </li>

                  {isVacationRental && (
                    <>
                      <li>
                        Provide accurate guest
                        capacity.
                      </li>

                      <li>
                        Set your check-in and
                        check-out times.
                      </li>

                      <li>
                        Clearly state your house
                        rules.
                      </li>

                      <li>
                        Select a cancellation
                        policy.
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  saving ||
                  uploadingMedia
                }
                style={{
                  width: "100%",
                  justifyContent:
                    "center",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 8,
                  padding:
                    "13px 18px",
                }}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      className="spin"
                    />

                    Creating listing...
                  </>
                ) : uploadingMedia ? (
                  <>
                    <Loader2
                      size={16}
                      className="spin"
                    />

                    Uploading media...
                  </>
                ) : (
                  <>
                    <Save size={16} />

                    Create listing

                    <ArrowRight
                      size={16}
                    />
                  </>
                )}
              </button>
            </aside>
          </form>
        </div>
      </section>
    </div>
  );
}