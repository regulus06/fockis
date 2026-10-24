import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import { Link } from "react-router-dom";

import {
  AlertCircle,
  CheckCircle2,
  Globe,
  ImagePlus,
  Link2,
  Loader2,
  LocateFixed,
  Mail,
  Phone,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa6";

import { businessesApi } from "../services/businessesApi";
import { getMyStores } from "../../fockis-shop/services/storeApi";
import { resolveProductImageUrl } from "../../fockis-shop/utils/productImage";

import type { Store } from "../../fockis-shop/types/store.types";
import type {
  Business,
  BusinessCategory,
  BusinessHoursEntry,
  BusinessImageUploadResponse,
  BusinessInput,
  BusinessPrimaryAction,
  BusinessSize,
  BusinessSocialLinks,
  BusinessStoreSummary,
} from "../types/business.types";

import BusinessDestinationButtons from "./BusinessDestinationButtons";
import BusinessSpotlightCard from "./BusinessSpotlightCard";

import {
  BUSINESS_CATEGORIES,
  BUSINESS_SIZES,
  SOCIAL_PLATFORMS,
  WEEKDAYS,
  WEEKDAY_ORDER,
  getBrowserTimeZone,
  getUsableImageUrl,
  isPlaceholderImage,
  isValidEmail,
  isValidOptionalUrl,
  toSafeExternalUrl,
} from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/BusinessForm.scss";


/* ============================================================================
   BUSINESS FORM

   Used to create a business (CreateBusinessPage) and to edit one
   (BusinessManagerPage). Talks to the existing businesses API:

   create:  POST /businesses → POST /:id/logo, /:id/cover-image (uploads)
            → POST /:id/publish (if "Publish to Feed")
            → PATCH /:id { spotlightEnabled } (if "Add to Spotlight")
   edit:    PATCH /:id → uploads → publish/unpublish if changed
============================================================================ */

interface BusinessFormProps {
  business?: Business | null;

  /*
   * Legacy hook: when provided, the parent performs the API call with the
   * collected values instead of the form.
   */
  onSubmit?: (values: BusinessInput) => Promise<void> | void;

  onSuccess?: (business: Business) => void;

  onCancel?: () => void;

  className?: string;
}

type ImageMode = "upload" | "url";

interface ImageDraft {
  mode: ImageMode;
  file: File | null;
  previewUrl: string;
  url: string;
  removed: boolean;
}

interface FormState {
  name: string;
  description: string;
  category: BusinessCategory | "";
  tagline: string;
  foundedYear: string;
  businessSize: BusinessSize | "";

  phone: string;
  email: string;

  websiteUrl: string;
  storeId: string;
  primaryAction: BusinessPrimaryAction | "";

  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: string;
  longitude: string;

  showHours: boolean;
  hours: BusinessHoursEntry[];
  byAppointmentOnly: boolean;
  timeZone: string;

  social: Required<Record<keyof BusinessSocialLinks, string>>;

  feedEnabled: boolean;
  spotlightEnabled: boolean;
}

type FieldErrors = Partial<Record<string, string>>;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DESCRIPTION_MAX = 500;
const CURRENT_YEAR = new Date().getFullYear();

const SOCIAL_ICONS: Record<keyof BusinessSocialLinks, ReactNode> = {
  facebook: <FaFacebook aria-hidden="true" />,
  instagram: <FaInstagram aria-hidden="true" />,
  linkedin: <FaLinkedin aria-hidden="true" />,
  youtube: <FaYoutube aria-hidden="true" />,
  tiktok: <FaTiktok aria-hidden="true" />,
};

const FORM_SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "images", label: "Images" },
  { id: "contact", label: "Contact" },
  { id: "links", label: "Card links" },
  { id: "address", label: "Address" },
  { id: "hours", label: "Hours" },
  { id: "social", label: "Social" },
  { id: "visibility", label: "Visibility" },
];

function defaultHours(): BusinessHoursEntry[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day,
    open: day === 0 || day === 6 ? "" : "09:00",
    close: day === 0 || day === 6 ? "" : "17:00",
    closed: day === 0 || day === 6,
  }));
}

function listTimeZones(): string[] {
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
    const zones = intl.supportedValuesOf?.("timeZone");

    if (zones?.length) {
      return zones;
    }
  } catch {
    // fall through
  }

  return [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Port-au-Prince",
    "America/Toronto",
    "Europe/London",
    "Europe/Paris",
    "Africa/Lagos",
    "Asia/Dubai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "UTC",
  ];
}

function emptyImage(url?: string): ImageDraft {
  return {
    mode: "upload",
    file: null,
    previewUrl: "",
    // Placeholder-service URLs are not shown as the business's image.
    url: url && !isPlaceholderImage(url) ? url : "",
    removed: false,
  };
}

function createInitialState(business?: Business | null): FormState {
  const hours = business?.hours?.length
    ? [0, 1, 2, 3, 4, 5, 6].map(
        (day) =>
          business.hours!.find((entry) => entry.day === day) ?? {
            day,
            open: "",
            close: "",
            closed: true,
          },
      )
    : defaultHours();

  return {
    name: business?.name ?? "",
    description: business?.description ?? "",
    category: business?.category ?? "",
    tagline: business?.tagline ?? "",
    foundedYear: business?.foundedYear ? String(business.foundedYear) : "",
    businessSize: business?.businessSize ?? "",

    phone: business?.phone ?? "",
    email: business?.email ?? "",

    websiteUrl: business?.websiteUrl ?? "",
    storeId: business?.storeId ?? "",
    primaryAction: business?.primaryAction ?? "",

    address: business?.address ?? "",
    city: business?.city ?? "",
    state: business?.state ?? "",
    zipCode: business?.zipCode ?? "",
    country: business?.country ?? "",
    latitude: business?.latitude !== undefined ? String(business.latitude) : "",
    longitude: business?.longitude !== undefined ? String(business.longitude) : "",

    showHours: Boolean(business?.hours?.length),
    hours,
    byAppointmentOnly: Boolean(business?.byAppointmentOnly),
    timeZone: business?.timeZone ?? getBrowserTimeZone(),

    social: {
      facebook: business?.socialLinks?.facebook ?? "",
      instagram: business?.socialLinks?.instagram ?? "",
      linkedin: business?.socialLinks?.linkedin ?? "",
      youtube: business?.socialLinks?.youtube ?? "",
      tiktok: business?.socialLinks?.tiktok ?? "",
    },

    feedEnabled: business?.feedEnabled ?? false,
    spotlightEnabled: business?.spotlightEnabled ?? false,
  };
}

/*
 * Validates the whole form. Optional fields are only checked when filled.
 */
function validate(form: FormState, images: Record<"logo" | "cover", ImageDraft>): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = "Enter your business name.";
  } else if (form.name.trim().length > 120) {
    errors.name = "Use 120 characters or fewer.";
  }

  if (!form.category) {
    errors.category = "Choose a category.";
  }

  if (!form.description.trim()) {
    errors.description = "Describe your business in a sentence or two.";
  } else if (form.description.length > DESCRIPTION_MAX) {
    errors.description = `Use ${DESCRIPTION_MAX} characters or fewer.`;
  }

  if (form.tagline.length > 160) {
    errors.tagline = "Use 160 characters or fewer.";
  }

  if (form.foundedYear) {
    const year = Number(form.foundedYear);

    if (!Number.isInteger(year) || year < 1800 || year > CURRENT_YEAR) {
      errors.foundedYear = `Enter a year between 1800 and ${CURRENT_YEAR}.`;
    }
  }

  if (form.email.trim() && !isValidEmail(form.email)) {
    errors.email = "Enter a valid email address, like name@business.com.";
  }

  if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 5) {
    errors.phone = "Enter a valid phone number.";
  } else if (form.phone.length > 30) {
    errors.phone = "Use 30 characters or fewer.";
  }

  if (!isValidOptionalUrl(form.websiteUrl)) {
    errors.websiteUrl = "Enter a full web address starting with https:// (for example https://yourbusiness.com).";
  }

  if (form.primaryAction === "WEBSITE" && !toSafeExternalUrl(form.websiteUrl)) {
    errors.primaryAction = "Add a website URL to make Visit Website the main button.";
  }

  if (form.primaryAction === "STORE" && !form.storeId) {
    errors.primaryAction = "Connect a Fockis Shop store to make Visit Store the main button.";
  }

  for (const kind of ["logo", "cover"] as const) {
    const image = images[kind];

    if (image.mode === "url" && image.url.trim() && !isValidOptionalUrl(image.url)) {
      errors[`${kind}Url`] = "Enter an image URL starting with https://.";
    }
  }

  const lat = form.latitude.trim();
  const lng = form.longitude.trim();

  if (lat || lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!lat || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.latitude = "Latitude must be between -90 and 90.";
    }

    if (!lng || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.longitude = "Longitude must be between -180 and 180.";
    }
  }

  if (form.showHours) {
    for (const entry of form.hours) {
      if (!entry.closed && (!entry.open || !entry.close)) {
        errors.hours = `Add opening and closing times for ${WEEKDAYS[entry.day]}, or mark it closed.`;
        break;
      }
    }
  }

  for (const platform of SOCIAL_PLATFORMS) {
    if (!isValidOptionalUrl(form.social[platform.key])) {
      errors[`social.${platform.key}`] = `Enter the full ${platform.label} URL starting with https://.`;
    }
  }

  return errors;
}

function buildInput(
  form: FormState,
  images: Record<"logo" | "cover", ImageDraft>,
  mode: "create" | "update",
  original?: Business | null,
): BusinessInput {
  const input: BusinessInput = {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category as BusinessCategory,
    tagline: form.tagline.trim(),
    foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
    businessSize: form.businessSize || null,

    phone: form.phone.trim(),
    email: form.email.trim(),

    websiteUrl: form.websiteUrl.trim(),
    storeId: form.storeId || null,
    primaryAction: form.primaryAction || null,

    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    zipCode: form.zipCode.trim(),
    country: form.country.trim(),
    latitude: form.latitude.trim() ? Number(form.latitude) : null,
    longitude: form.longitude.trim() ? Number(form.longitude) : null,

    hours: form.showHours
      ? form.hours.map((entry) => ({
          day: entry.day,
          closed: entry.closed,
          ...(entry.closed ? {} : { open: entry.open, close: entry.close }),
        }))
      : [],
    byAppointmentOnly: form.byAppointmentOnly,
    timeZone: form.showHours || form.byAppointmentOnly ? form.timeZone : "",

    socialLinks: { ...form.social },
  };

  // Images: only send a URL the owner typed, or "" when they removed it.
  // Uploaded files are sent separately after saving.
  for (const kind of ["logo", "cover"] as const) {
    const image = images[kind];
    const field = kind === "logo" ? "logoUrl" : "coverImageUrl";
    const originalUrl = original?.[field] ?? "";

    if (image.removed && !image.file && !(image.mode === "url" && image.url.trim())) {
      if (mode === "update" && originalUrl) {
        input[field] = "";
      }
    } else if (image.mode === "url" && image.url.trim() && image.url.trim() !== originalUrl) {
      input[field] = image.url.trim();
    }
  }

  if (mode === "create") {
    // The create endpoint does not accept empty hours/time zone.
    if (!input.hours?.length) {
      delete input.hours;
    }
    if (!input.timeZone) {
      delete input.timeZone;
    }
    if (!input.byAppointmentOnly) {
      delete input.byAppointmentOnly;
    }
  }

  return input;
}


/* ============================================================================
   COMPONENT
============================================================================ */

export default function BusinessForm({
  business,
  onSubmit,
  onSuccess,
  onCancel,
  className = "",
}: BusinessFormProps) {
  const [form, setForm] = useState<FormState>(() => createInitialState(business));
  const [images, setImages] = useState<Record<"logo" | "cover", ImageDraft>>(() => ({
    logo: emptyImage(business?.logoUrl),
    cover: emptyImage(business?.coverImageUrl),
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Set once a create succeeds, so a retry after a partial failure updates
  // the same business instead of creating a duplicate.
  const [savedBusiness, setSavedBusiness] = useState<Business | null>(business ?? null);

  const [stores, setStores] = useState<Store[]>([]);
  const [storesState, setStoresState] = useState<"loading" | "ready" | "error">("loading");

  const [locating, setLocating] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const timeZones = useMemo(listTimeZones, []);

  const isEditing = Boolean(savedBusiness?.id);

  /* --------------------------------------------------------------------------
     SYNC WHEN THE EDITED BUSINESS CHANGES
  -------------------------------------------------------------------------- */

  useEffect(() => {
    setForm(createInitialState(business));
    setImages({
      logo: emptyImage(business?.logoUrl),
      cover: emptyImage(business?.coverImageUrl),
    });
    setSavedBusiness(business ?? null);
    setErrors({});
    setSubmitError(null);
    setStatusMessage(null);
    // Only re-initialise when a different business is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id]);

  /* --------------------------------------------------------------------------
     OWNER'S FOCKIS SHOP STORES
  -------------------------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    getMyStores()
      .then((items) => {
        if (mounted) {
          setStores(items.filter((store) => store.status !== "suspended" && store.status !== "closed"));
          setStoresState("ready");
        }
      })
      .catch(() => {
        if (mounted) {
          setStoresState("error");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* --------------------------------------------------------------------------
     OBJECT URL CLEANUP
  -------------------------------------------------------------------------- */

  useEffect(
    () => () => {
      for (const image of Object.values(images)) {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* --------------------------------------------------------------------------
     FIELD HELPERS
  -------------------------------------------------------------------------- */

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));

    if (errors[key as string]) {
      setErrors((previous) => ({ ...previous, [key]: undefined }));
    }
  };

  const onText =
    (key: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setField(key, event.target.value as never);

  const blurValidate = (key: string) => () => {
    const next = validate(form, images);

    setErrors((previous) => ({ ...previous, [key]: next[key] }));
  };

  const fieldProps = (key: string) => ({
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `fkb-err-${key.replace(".", "-")}` : undefined,
  });

  const updateHours = (day: number, changes: Partial<BusinessHoursEntry>) => {
    setForm((previous) => ({
      ...previous,
      hours: previous.hours.map((entry) => (entry.day === day ? { ...entry, ...changes } : entry)),
    }));
    setErrors((previous) => ({ ...previous, hours: undefined }));
  };

  const copyMondayToWeekdays = () => {
    const monday = form.hours.find((entry) => entry.day === 1);

    if (!monday) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      hours: previous.hours.map((entry) =>
        entry.day >= 1 && entry.day <= 5
          ? { ...entry, open: monday.open, close: monday.close, closed: monday.closed }
          : entry,
      ),
    }));
  };

  /* --------------------------------------------------------------------------
     IMAGES
  -------------------------------------------------------------------------- */

  const pickImage = (kind: "logo" | "cover", event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((previous) => ({ ...previous, [`${kind}File`]: "Choose a JPG, PNG, WEBP or GIF image." }));
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((previous) => ({ ...previous, [`${kind}File`]: "Images must be 10 MB or smaller." }));
      return;
    }

    setErrors((previous) => ({ ...previous, [`${kind}File`]: undefined }));

    setImages((previous) => {
      if (previous[kind].previewUrl) {
        URL.revokeObjectURL(previous[kind].previewUrl);
      }

      return {
        ...previous,
        [kind]: {
          ...previous[kind],
          mode: "upload",
          file,
          previewUrl: URL.createObjectURL(file),
          removed: false,
        },
      };
    });
  };

  const removeImage = (kind: "logo" | "cover") => {
    setImages((previous) => {
      if (previous[kind].previewUrl) {
        URL.revokeObjectURL(previous[kind].previewUrl);
      }

      return {
        ...previous,
        [kind]: { mode: previous[kind].mode, file: null, previewUrl: "", url: "", removed: true },
      };
    });
  };

  const imagePreview = (kind: "logo" | "cover"): string | undefined => {
    const image = images[kind];

    if (image.previewUrl) {
      return image.previewUrl;
    }

    if (image.removed && !(image.mode === "url" && image.url)) {
      return undefined;
    }

    return getUsableImageUrl(image.url) && isValidOptionalUrl(image.url)
      ? image.url
      : image.mode === "upload"
        ? getUsableImageUrl(image.url)
        : undefined;
  };

  /* --------------------------------------------------------------------------
     LOCATION
  -------------------------------------------------------------------------- */

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setErrors((previous) => ({ ...previous, latitude: "Your browser does not support location sharing." }));
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((previous) => ({
          ...previous,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setErrors((previous) => ({ ...previous, latitude: undefined, longitude: undefined }));
        setLocating(false);
      },
      () => {
        setErrors((previous) => ({
          ...previous,
          latitude: "Location access was not granted. You can type the coordinates instead.",
        }));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  /* --------------------------------------------------------------------------
     PREVIEW
  -------------------------------------------------------------------------- */

  const selectedStore = stores.find((store) => store.id === form.storeId);

  const draftStore: BusinessStoreSummary | null = selectedStore
    ? {
        id: selectedStore.id,
        name: selectedStore.name,
        slug: selectedStore.slug,
        logo: resolveProductImageUrl(selectedStore.logoUrl),
        verified: selectedStore.verified,
      }
    : form.storeId && savedBusiness?.store?.id === form.storeId
      ? savedBusiness.store
      : null;

  const previewBusiness: Business = {
    ...(savedBusiness ?? ({} as Business)),
    id: savedBusiness?.id ?? "preview",
    ownerId: savedBusiness?.ownerId ?? "",
    name: form.name.trim() || "Your business name",
    description: form.description.trim() || "Your business description will appear here.",
    tagline: form.tagline.trim() || undefined,
    category: (form.category || "OTHER") as BusinessCategory,
    logoUrl: imagePreview("logo"),
    coverImageUrl: imagePreview("cover"),
    websiteUrl: toSafeExternalUrl(form.websiteUrl) ?? undefined,
    store: draftStore,
    storeId: form.storeId || undefined,
    primaryAction: form.primaryAction || undefined,
    city: form.city.trim(),
    state: form.state.trim(),
    status: savedBusiness?.status ?? "DRAFT",
    feedEnabled: form.feedEnabled,
    spotlightEnabled: form.spotlightEnabled,
    spotlightPriority: savedBusiness?.spotlightPriority ?? 0,
    views: 0,
    websiteClicks: 0,
    storeClicks: 0,
    verified: savedBusiness?.verified ?? false,
    deals: savedBusiness?.deals ?? [],
    createdAt: savedBusiness?.createdAt ?? "",
    updatedAt: savedBusiness?.updatedAt ?? "",
  };

  /* --------------------------------------------------------------------------
     SUBMIT
  -------------------------------------------------------------------------- */

  const focusFirstError = (nextErrors: FieldErrors) => {
    const firstKey = Object.keys(nextErrors).find((key) => nextErrors[key]);

    if (!firstKey) {
      return;
    }

    window.setTimeout(() => {
      const field =
        formRef.current?.querySelector<HTMLElement>(`[data-field="${firstKey}"]`) ??
        formRef.current?.querySelector<HTMLElement>(`[aria-invalid="true"]`);

      field?.focus();
      field?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSubmitError(null);
    setStatusMessage(null);

    const nextErrors = validate(form, images);
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      setSubmitError("Please fix the highlighted fields.");
      focusFirstError(nextErrors);
      return;
    }

    setSaving(true);

    let current: Business | null = savedBusiness;
    const failures: string[] = [];

    try {
      const mode = current?.id ? "update" : "create";
      const input = buildInput(form, images, mode, current);

      if (onSubmit) {
        await onSubmit(input);
        return;
      }

      // 1. Save the business record.
      setStatusMessage(mode === "create" ? "Creating your business…" : "Saving changes…");

      current = mode === "create"
        ? await businessesApi.create(input)
        : await businessesApi.update(current!.id, input);

      setSavedBusiness(current);

      // 2. Upload images.
      for (const kind of ["logo", "cover"] as const) {
        const file = images[kind].file;

        if (!file) {
          continue;
        }

        setStatusMessage(kind === "logo" ? "Uploading logo…" : "Uploading cover image…");

        try {
          const result: BusinessImageUploadResponse =
            kind === "logo"
              ? await businessesApi.uploadLogo(current.id, file)
              : await businessesApi.uploadCoverImage(current.id, file);

          current = {
            ...current,
            ...(kind === "logo"
              ? { logoUrl: result.business.logoUrl ?? current.logoUrl }
              : { coverImageUrl: result.business.coverImageUrl ?? current.coverImageUrl }),
          };

          setImages((previous) => ({ ...previous, [kind]: { ...emptyImage(kind === "logo" ? current!.logoUrl : current!.coverImageUrl) } }));
        } catch (err) {
          failures.push(`${kind === "logo" ? "Logo" : "Cover image"} upload failed: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }

      // 3. Feed publishing.
      if (form.feedEnabled !== current.feedEnabled) {
        setStatusMessage(form.feedEnabled ? "Publishing to Fockis…" : "Unpublishing…");

        try {
          current = form.feedEnabled
            ? await businessesApi.publish(current.id)
            : await businessesApi.unpublish(current.id);
        } catch (err) {
          failures.push(`Publishing failed: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }

      // 4. Spotlight (only possible once published).
      const wantsSpotlight = form.feedEnabled && form.spotlightEnabled;

      if (wantsSpotlight !== current.spotlightEnabled && (current.feedEnabled || !wantsSpotlight)) {
        try {
          current = await businessesApi.update(current.id, { spotlightEnabled: wantsSpotlight });
        } catch (err) {
          failures.push(`Spotlight update failed: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      }

      setSavedBusiness(current);
      setStatusMessage(null);

      if (failures.length) {
        setSubmitError(
          `${mode === "create" ? "Your business was created" : "Your changes were saved"}, but some steps didn't finish. ${failures.join(" ")} Submit again to retry.`,
        );
        return;
      }

      onSuccess?.(current);
    } catch (err) {
      setStatusMessage(null);
      setSubmitError(err instanceof Error ? err.message : "Unable to save the business. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------------------------------------------------
     RENDER HELPERS
  -------------------------------------------------------------------------- */

  const fieldError = (name: string) =>
    errors[name] ? (
      <span className="fkb-field__error" id={`fkb-err-${name.replace(".", "-")}`}>
        <AlertCircle size={14} aria-hidden="true" />
        {errors[name]}
      </span>
    ) : null;

  const websitePreviewOk = Boolean(toSafeExternalUrl(form.websiteUrl)) && isValidOptionalUrl(form.websiteUrl);

  return (
    <form
      ref={formRef}
      className={`fkb fkb-form ${className}`}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={saving}
    >
      <div className="fkb-form__layout">
        <div className="fkb-form__main">
          <nav className="fkb-form__nav" aria-label="Form sections">
            {FORM_SECTIONS.map((section) => (
              <a key={section.id} href={`#fkb-form-${section.id}`}>
                {section.label}
              </a>
            ))}
          </nav>

          {submitError && (
            <div className="fkb-alert fkb-alert--error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          {/* ============================================================
              BASIC INFORMATION
          ============================================================ */}

          <FormSection id="basics" title="Basic information" description="What customers see first.">
            <div className="fkb-form__grid">
              <div className="fkb-field fkb-field--full">
                <label className="fkb-field__label" htmlFor="fkb-name">
                  Business name<span className="fkb-field__required" aria-hidden="true">*</span>
                </label>
                <input
                  id="fkb-name"
                  data-field="name"
                  className="fkb-input"
                  value={form.name}
                  onChange={onText("name")}
                  onBlur={blurValidate("name")}
                  maxLength={120}
                  required
                  autoComplete="organization"
                  {...fieldProps("name")}
                />
                {fieldError("name")}
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-category">
                  Category<span className="fkb-field__required" aria-hidden="true">*</span>
                </label>
                <select
                  id="fkb-category"
                  data-field="category"
                  className="fkb-input"
                  value={form.category}
                  onChange={onText("category")}
                  required
                  {...fieldProps("category")}
                >
                  <option value="">Choose a category</option>
                  {BUSINESS_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {fieldError("category")}
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-tagline">
                  Tagline
                </label>
                <input
                  id="fkb-tagline"
                  data-field="tagline"
                  className="fkb-input"
                  value={form.tagline}
                  onChange={onText("tagline")}
                  maxLength={160}
                  placeholder="e.g. Honest auto repair since 1998"
                  {...fieldProps("tagline")}
                />
                {fieldError("tagline")}
              </div>

              <div className="fkb-field fkb-field--full">
                <label className="fkb-field__label" htmlFor="fkb-description">
                  Description<span className="fkb-field__required" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="fkb-description"
                  data-field="description"
                  className="fkb-input"
                  value={form.description}
                  onChange={onText("description")}
                  onBlur={blurValidate("description")}
                  maxLength={DESCRIPTION_MAX}
                  rows={5}
                  required
                  placeholder="What you do, who you serve and what makes you different."
                  {...fieldProps("description")}
                />
                <div className="fkb-form__row-between">
                  {fieldError("description")}
                  <span className="fkb-field__hint fkb-form__counter" aria-live="polite">
                    {form.description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-founded">
                  Year founded
                </label>
                <input
                  id="fkb-founded"
                  data-field="foundedYear"
                  className="fkb-input"
                  inputMode="numeric"
                  value={form.foundedYear}
                  onChange={(event) => setField("foundedYear", event.target.value.replace(/\D/g, "").slice(0, 4))}
                  onBlur={blurValidate("foundedYear")}
                  placeholder={String(CURRENT_YEAR - 10)}
                  {...fieldProps("foundedYear")}
                />
                {fieldError("foundedYear")}
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-size">
                  Business size
                </label>
                <select
                  id="fkb-size"
                  className="fkb-input"
                  value={form.businessSize}
                  onChange={onText("businessSize")}
                >
                  <option value="">Not specified</option>
                  {BUSINESS_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          {/* ============================================================
              IMAGES
          ============================================================ */}

          <FormSection id="images" title="Images" description="JPG, PNG, WEBP or GIF up to 10 MB. Images are uploaded when you save.">
            <div className="fkb-form__images">
              {(["logo", "cover"] as const).map((kind) => {
                const image = images[kind];
                const preview = imagePreview(kind);
                const label = kind === "logo" ? "Logo" : "Cover image";

                return (
                  <div key={kind} className={`fkb-image-field fkb-image-field--${kind}`}>
                    <div className="fkb-image-field__head">
                      <span className="fkb-field__label">{label}</span>
                      <div className="fkb-image-field__modes" role="group" aria-label={`${label} source`}>
                        <button
                          type="button"
                          className="fkb-chip"
                          aria-pressed={image.mode === "upload"}
                          onClick={() => setImages((previous) => ({ ...previous, [kind]: { ...previous[kind], mode: "upload" } }))}
                        >
                          <ImagePlus size={14} aria-hidden="true" />
                          Upload
                        </button>
                        <button
                          type="button"
                          className="fkb-chip"
                          aria-pressed={image.mode === "url"}
                          onClick={() => setImages((previous) => ({ ...previous, [kind]: { ...previous[kind], mode: "url" } }))}
                        >
                          <Link2 size={14} aria-hidden="true" />
                          URL
                        </button>
                      </div>
                    </div>

                    <div className="fkb-image-field__preview">
                      {preview ? (
                        <img src={preview} alt={`${label} preview`} />
                      ) : (
                        <span className="fkb-image-field__empty">
                          <ImagePlus size={24} aria-hidden="true" />
                          {kind === "logo" ? "Square image, at least 400×400" : "Wide image, about 1600×600"}
                        </span>
                      )}
                    </div>

                    {image.mode === "upload" ? (
                      <div className="fkb-image-field__actions">
                        <label className="fkb-btn fkb-btn--secondary fkb-btn--sm fkb-image-field__picker">
                          <ImagePlus size={15} aria-hidden="true" />
                          {preview ? "Replace" : "Choose image"}
                          <input
                            type="file"
                            accept={IMAGE_TYPES.join(",")}
                            onChange={(event) => pickImage(kind, event)}
                            className="fkb-visually-hidden"
                            aria-describedby={errors[`${kind}File`] ? `fkb-err-${kind}File` : undefined}
                          />
                        </label>
                        {preview && (
                          <button type="button" className="fkb-btn fkb-btn--ghost fkb-btn--sm" onClick={() => removeImage(kind)}>
                            <Trash2 size={15} aria-hidden="true" />
                            Remove
                          </button>
                        )}
                        {image.file && <span className="fkb-field__hint">{image.file.name}</span>}
                      </div>
                    ) : (
                      <div className="fkb-field">
                        <label className="fkb-visually-hidden" htmlFor={`fkb-${kind}-url`}>
                          {label} URL
                        </label>
                        <input
                          id={`fkb-${kind}-url`}
                          data-field={`${kind}Url`}
                          className="fkb-input"
                          type="url"
                          inputMode="url"
                          placeholder="https://"
                          value={image.url}
                          onChange={(event) =>
                            setImages((previous) => ({
                              ...previous,
                              [kind]: { ...previous[kind], url: event.target.value, removed: false },
                            }))
                          }
                          {...fieldProps(`${kind}Url`)}
                        />
                      </div>
                    )}

                    {fieldError(`${kind}File`)}
                    {fieldError(`${kind}Url`)}
                  </div>
                );
              })}
            </div>
          </FormSection>

          {/* ============================================================
              CONTACT
          ============================================================ */}

          <FormSection id="contact" title="Contact information" description="How customers can reach you. Your website is set under Business Card Links.">
            <div className="fkb-form__grid">
              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-phone">
                  Phone
                </label>
                <div className="fkb-input-group">
                  <Phone size={16} aria-hidden="true" />
                  <input
                    id="fkb-phone"
                    data-field="phone"
                    className="fkb-input"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={onText("phone")}
                    onBlur={blurValidate("phone")}
                    maxLength={30}
                    placeholder="+1 555 555 5555"
                    {...fieldProps("phone")}
                  />
                </div>
                {fieldError("phone")}
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-email">
                  Email
                </label>
                <div className="fkb-input-group">
                  <Mail size={16} aria-hidden="true" />
                  <input
                    id="fkb-email"
                    data-field="email"
                    className="fkb-input"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={onText("email")}
                    onBlur={blurValidate("email")}
                    maxLength={254}
                    placeholder="hello@yourbusiness.com"
                    {...fieldProps("email")}
                  />
                </div>
                {fieldError("email")}
              </div>
            </div>
          </FormSection>

          {/* ============================================================
              BUSINESS CARD LINKS
          ============================================================ */}

          <FormSection
            id="links"
            title="Business Card Links"
            description="Choose where the buttons on your business card and profile take customers."
          >
            <div className="fkb-form__stack">
              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-website">
                  Official website
                </label>
                <div className="fkb-input-group">
                  <Globe size={16} aria-hidden="true" />
                  <input
                    id="fkb-website"
                    data-field="websiteUrl"
                    className="fkb-input"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    value={form.websiteUrl}
                    onChange={onText("websiteUrl")}
                    onBlur={blurValidate("websiteUrl")}
                    placeholder="https://yourbusiness.com"
                    maxLength={2000}
                    {...fieldProps("websiteUrl")}
                  />
                </div>
                {fieldError("websiteUrl")}
                {websitePreviewOk && (
                  <span className="fkb-field__hint fkb-form__ok">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    Visit Website will open this address in a new tab.
                  </span>
                )}
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-store">
                  Fockis Shop store
                </label>

                {storesState === "loading" ? (
                  <div className="fkb-skeleton" style={{ height: 44 }} role="status" aria-label="Loading your stores" />
                ) : storesState === "error" ? (
                  <div className="fkb-alert fkb-alert--warning">
                    <AlertCircle size={16} aria-hidden="true" />
                    <span>Your Fockis Shop stores couldn't be loaded. You can connect a store later from Business Manager.</span>
                  </div>
                ) : stores.length === 0 && !form.storeId ? (
                  <div className="fkb-form__store-empty">
                    <ShoppingBag size={18} aria-hidden="true" />
                    <span>
                      You don't have a Fockis Shop store yet.{" "}
                      <Link to="/shop/sell">Open a store</Link> to sell products from your business profile.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="fkb-input-group">
                      <ShoppingBag size={16} aria-hidden="true" />
                      <select
                        id="fkb-store"
                        className="fkb-input"
                        value={form.storeId}
                        onChange={(event) => {
                          const value = event.target.value;

                          setForm((previous) => ({
                            ...previous,
                            storeId: value,
                            primaryAction: !value && previous.primaryAction === "STORE" ? "" : previous.primaryAction,
                          }));
                          setErrors((previous) => ({ ...previous, primaryAction: undefined }));
                        }}
                      >
                        <option value="">No store connected</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                        {form.storeId && !selectedStore && (
                          <option value={form.storeId}>
                            {savedBusiness?.store?.name ?? "Connected store (unavailable)"}
                          </option>
                        )}
                      </select>
                    </div>
                    <span className="fkb-field__hint">
                      Only stores you own are listed. Choose "No store connected" to disconnect.
                    </span>
                  </>
                )}
              </div>

              <fieldset className="fkb-form__fieldset" data-field="primaryAction">
                <legend className="fkb-field__label">Main button on your business card</legend>

                <div className="fkb-form__choices">
                  <label className="fkb-toggle">
                    <input
                      type="radio"
                      name="primaryAction"
                      value="WEBSITE"
                      checked={form.primaryAction === "WEBSITE"}
                      disabled={!websitePreviewOk}
                      onChange={() => setField("primaryAction", "WEBSITE")}
                    />
                    <span>
                      <strong>Visit Website</strong>
                      <small>{websitePreviewOk ? "Send customers to your website." : "Add a website above first."}</small>
                    </span>
                  </label>

                  <label className="fkb-toggle">
                    <input
                      type="radio"
                      name="primaryAction"
                      value="STORE"
                      checked={form.primaryAction === "STORE"}
                      disabled={!form.storeId}
                      onChange={() => setField("primaryAction", "STORE")}
                    />
                    <span>
                      <strong>Visit Store</strong>
                      <small>{form.storeId ? "Send customers to your Fockis Shop store." : "Connect a store above first."}</small>
                    </span>
                  </label>

                  <label className="fkb-toggle">
                    <input
                      type="radio"
                      name="primaryAction"
                      value=""
                      checked={form.primaryAction === ""}
                      onChange={() => setField("primaryAction", "")}
                    />
                    <span>
                      <strong>Automatic</strong>
                      <small>Website first when you have one.</small>
                    </span>
                  </label>
                </div>
                {fieldError("primaryAction")}
              </fieldset>

              <div className="fkb-form__button-preview">
                <span className="fkb-field__hint">Button preview</span>
                <div className="fkb-form__button-preview-row">
                  {previewBusiness.websiteUrl || previewBusiness.store ? (
                    <BusinessDestinationButtons business={previewBusiness} preview size="sm" />
                  ) : (
                    <span className="fkb-muted">No destination buttons will be shown.</span>
                  )}
                </div>
              </div>
            </div>
          </FormSection>

          {/* ============================================================
              ADDRESS
          ============================================================ */}

          <FormSection id="address" title="Business address" description="Shown on your profile with a link to directions. Leave blank for online-only businesses.">
            <div className="fkb-form__grid">
              <div className="fkb-field fkb-field--full">
                <label className="fkb-field__label" htmlFor="fkb-address">
                  Street address
                </label>
                <input id="fkb-address" className="fkb-input" autoComplete="street-address" value={form.address} onChange={onText("address")} maxLength={200} />
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-city">
                  City
                </label>
                <input id="fkb-city" className="fkb-input" autoComplete="address-level2" value={form.city} onChange={onText("city")} maxLength={100} />
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-state">
                  State / region
                </label>
                <input id="fkb-state" className="fkb-input" autoComplete="address-level1" value={form.state} onChange={onText("state")} maxLength={100} />
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-zip">
                  ZIP / postal code
                </label>
                <input id="fkb-zip" className="fkb-input" autoComplete="postal-code" value={form.zipCode} onChange={onText("zipCode")} maxLength={20} />
              </div>

              <div className="fkb-field">
                <label className="fkb-field__label" htmlFor="fkb-country">
                  Country
                </label>
                <input id="fkb-country" className="fkb-input" autoComplete="country-name" value={form.country} onChange={onText("country")} maxLength={100} />
              </div>
            </div>

            <div className="fkb-form__subsection">
              <div className="fkb-form__row-between">
                <div>
                  <span className="fkb-field__label">Map location (optional)</span>
                  <p className="fkb-field__hint">Coordinates give customers precise directions and enable "Nearest to me" search.</p>
                </div>
                <button type="button" className="fkb-btn fkb-btn--secondary fkb-btn--sm" onClick={useCurrentLocation} disabled={locating}>
                  {locating ? <Loader2 size={15} className="fkb-spin" aria-hidden="true" /> : <LocateFixed size={15} aria-hidden="true" />}
                  Use my location
                </button>
              </div>

              <div className="fkb-form__grid">
                <div className="fkb-field">
                  <label className="fkb-field__label" htmlFor="fkb-lat">
                    Latitude
                  </label>
                  <input
                    id="fkb-lat"
                    data-field="latitude"
                    className="fkb-input"
                    inputMode="decimal"
                    value={form.latitude}
                    onChange={onText("latitude")}
                    onBlur={blurValidate("latitude")}
                    placeholder="40.7128"
                    {...fieldProps("latitude")}
                  />
                  {fieldError("latitude")}
                </div>

                <div className="fkb-field">
                  <label className="fkb-field__label" htmlFor="fkb-lng">
                    Longitude
                  </label>
                  <input
                    id="fkb-lng"
                    data-field="longitude"
                    className="fkb-input"
                    inputMode="decimal"
                    value={form.longitude}
                    onChange={onText("longitude")}
                    onBlur={blurValidate("longitude")}
                    placeholder="-74.0060"
                    {...fieldProps("longitude")}
                  />
                  {fieldError("longitude")}
                </div>
              </div>
            </div>
          </FormSection>

          {/* ============================================================
              HOURS
          ============================================================ */}

          <FormSection id="hours" title="Business hours" description="Let customers know when you're open.">
            <div className="fkb-form__stack">
              <label className="fkb-toggle">
                <input type="checkbox" checked={form.showHours} onChange={(event) => setField("showHours", event.target.checked)} />
                <span>
                  <strong>List opening hours</strong>
                  <small>Show your weekly schedule on your profile.</small>
                </span>
              </label>

              {form.showHours && (
                <div className="fkb-hours-editor" data-field="hours">
                  {WEEKDAY_ORDER.map((day) => {
                    const entry = form.hours.find((item) => item.day === day)!;

                    return (
                      <div key={day} className="fkb-hours-editor__row">
                        <span className="fkb-hours-editor__day" id={`fkb-day-${day}`}>
                          {WEEKDAYS[day]}
                        </span>

                        <label className="fkb-hours-editor__closed">
                          <input
                            type="checkbox"
                            checked={!entry.closed}
                            onChange={(event) => updateHours(day, { closed: !event.target.checked })}
                            aria-describedby={`fkb-day-${day}`}
                          />
                          Open
                        </label>

                        {entry.closed ? (
                          <span className="fkb-muted fkb-hours-editor__times">Closed</span>
                        ) : (
                          <span className="fkb-hours-editor__times">
                            <input
                              type="time"
                              className="fkb-input"
                              value={entry.open ?? ""}
                              onChange={(event) => updateHours(day, { open: event.target.value })}
                              aria-label={`${WEEKDAYS[day]} opening time`}
                            />
                            <span aria-hidden="true">–</span>
                            <input
                              type="time"
                              className="fkb-input"
                              value={entry.close ?? ""}
                              onChange={(event) => updateHours(day, { close: event.target.value })}
                              aria-label={`${WEEKDAYS[day]} closing time`}
                            />
                          </span>
                        )}
                      </div>
                    );
                  })}

                  <button type="button" className="fkb-btn fkb-btn--ghost fkb-btn--sm fkb-hours-editor__copy" onClick={copyMondayToWeekdays}>
                    Copy Monday's hours to Tuesday–Friday
                  </button>
                  {fieldError("hours")}
                </div>
              )}

              <label className="fkb-toggle">
                <input type="checkbox" checked={form.byAppointmentOnly} onChange={(event) => setField("byAppointmentOnly", event.target.checked)} />
                <span>
                  <strong>By appointment only</strong>
                  <small>Customers need to book or call ahead.</small>
                </span>
              </label>

              {(form.showHours || form.byAppointmentOnly) && (
                <div className="fkb-field">
                  <label className="fkb-field__label" htmlFor="fkb-timezone">
                    Time zone
                  </label>
                  <select id="fkb-timezone" className="fkb-input" value={form.timeZone} onChange={onText("timeZone")}>
                    {form.timeZone && !timeZones.includes(form.timeZone) && <option value={form.timeZone}>{form.timeZone}</option>}
                    {timeZones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  <span className="fkb-field__hint">Used to show "Open now" correctly to visitors anywhere.</span>
                </div>
              )}
            </div>
          </FormSection>

          {/* ============================================================
              SOCIAL
          ============================================================ */}

          <FormSection id="social" title="Social media" description="Full profile links, starting with https://.">
            <div className="fkb-form__grid">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div key={platform.key} className="fkb-field">
                  <label className="fkb-field__label" htmlFor={`fkb-social-${platform.key}`}>
                    {platform.label}
                  </label>
                  <div className="fkb-input-group fkb-input-group--brand">
                    {SOCIAL_ICONS[platform.key]}
                    <input
                      id={`fkb-social-${platform.key}`}
                      data-field={`social.${platform.key}`}
                      className="fkb-input"
                      type="url"
                      inputMode="url"
                      value={form.social[platform.key]}
                      placeholder={platform.placeholder}
                      maxLength={500}
                      onChange={(event) => {
                        const value = event.target.value;

                        setForm((previous) => ({ ...previous, social: { ...previous.social, [platform.key]: value } }));
                        setErrors((previous) => ({ ...previous, [`social.${platform.key}`]: undefined }));
                      }}
                      onBlur={blurValidate(`social.${platform.key}`)}
                      {...fieldProps(`social.${platform.key}`)}
                    />
                  </div>
                  {fieldError(`social.${platform.key}`)}
                </div>
              ))}
            </div>
          </FormSection>

          {/* ============================================================
              VISIBILITY
          ============================================================ */}

          <FormSection id="visibility" title="Fockis visibility" description="Control where your business appears.">
            <div className="fkb-form__stack">
              <label className="fkb-toggle">
                <input
                  type="checkbox"
                  checked={form.feedEnabled}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      feedEnabled: event.target.checked,
                      spotlightEnabled: event.target.checked ? previous.spotlightEnabled : false,
                    }))
                  }
                />
                <span>
                  <strong>Publish to Feed</strong>
                  <small>Make your business public in the Businesses directory and the Fockis Feed. Unpublished businesses are only visible to you.</small>
                </span>
              </label>

              <label className="fkb-toggle">
                <input
                  type="checkbox"
                  checked={form.spotlightEnabled}
                  disabled={!form.feedEnabled}
                  onChange={(event) => setField("spotlightEnabled", event.target.checked)}
                />
                <span>
                  <strong>Add to Spotlight</strong>
                  <small>
                    {form.feedEnabled
                      ? "Request a place in the featured Spotlight rail. The order of Spotlight businesses is managed by Fockis."
                      : "Publish your business to the Feed to use Spotlight."}
                  </small>
                </span>
              </label>
            </div>
          </FormSection>

          {/* ============================================================
              ACTIONS
          ============================================================ */}

          <div className="fkb-form__actions">
            <span className="fkb-form__status" role="status" aria-live="polite">
              {statusMessage && (
                <>
                  <Loader2 size={16} className="fkb-spin" aria-hidden="true" />
                  {statusMessage}
                </>
              )}
            </span>

            <div className="fkb-form__actions-buttons">
              {onCancel && (
                <button type="button" className="fkb-btn fkb-btn--secondary fkb-btn--lg" onClick={onCancel} disabled={saving}>
                  Cancel
                </button>
              )}

              <button type="submit" className="fkb-btn fkb-btn--primary fkb-btn--lg" disabled={saving}>
                {saving && <Loader2 size={16} className="fkb-spin" aria-hidden="true" />}
                {saving ? "Saving…" : isEditing ? "Save changes" : "Create business"}
              </button>
            </div>
          </div>
        </div>

        {/* ==============================================================
            LIVE PREVIEW
        ============================================================== */}

        <aside className="fkb-form__preview" aria-label="Business card preview">
          <span className="fkb-field__hint fkb-form__preview-label">Card preview</span>
          <div className="fkb-form__preview-card" aria-hidden="true" ref={(element) => element?.setAttribute("inert", "")}>
            <BusinessSpotlightCard business={previewBusiness} />
          </div>
          <p className="fkb-field__hint">This is how your business appears in the directory.</p>
        </aside>
      </div>
    </form>
  );
}


/* ============================================================================
   SECTION WRAPPER
============================================================================ */

function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={`fkb-form-${id}`} className="fkb-form__section" aria-labelledby={`fkb-form-${id}-title`}>
      <header className="fkb-form__section-head">
        <h2 id={`fkb-form-${id}-title`}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      {children}
    </section>
  );
}
