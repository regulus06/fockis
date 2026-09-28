import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Check,
  Plus,
  X,
  Clock3,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
  LayoutDashboard,
  BriefcaseBusiness,
  Camera,
  ImagePlus,
  Trash2,
  Pencil,
  Save,
} from "lucide-react";

import PartnerCTA from "../components/PartnerCTA";
import { travelApi } from "../services/travelApi";
import "../styles/TravelPartnerPage.scss";

interface Partner {
  _id?: string;
  id?: string;
  userId?: string;

  businessName: string;
  category: string;
  categories?: string[];

  description?: string;
  phone?: string;
  website?: string;
  address?: string;
  country?: string;
  city?: string;

  logo?: string;
  coverImage?: string;
  images?: string[];

  status?:
    | "pending"
    | "verified"
    | "suspended"
    | "rejected"
    | "approved"
    | "active"
    | string;

  documents?: Record<string, unknown>;

  createdAt?: string;
  updatedAt?: string;
}

interface PartnerForm {
  businessName: string;
  category: string;
  categories: string[];
  description: string;
  phone: string;
  website: string;
  address: string;
  country: string;
  city: string;
}

interface UploadResponse {
  media?: string;
  url?: string;
  path?: string;
  data?: {
    media?: string;
    url?: string;
    path?: string;
  };
}

const CATEGORIES = [
  { ic: "🏨", label: "Hotels & Stays" },
  { ic: "🍽️", label: "Restaurants" },
  { ic: "🚗", label: "Car Rental" },
  { ic: "🏝️", label: "Experiences" },
  { ic: "💼", label: "Meeting Spaces" },
  { ic: "🚐", label: "Transportation" },
  { ic: "🎉", label: "Events" },
  { ic: "🏠", label: "Vacation Rentals" },
];

const BENEFITS = [
  {
    title: "Reach global travelers",
    body:
      "Get discovered by travelers and local customers browsing Fockis Travel every day.",
  },
  {
    title: "One dashboard",
    body:
      "Manage reservations, availability, services and payments from a single place.",
  },
  {
    title: "Fast payouts",
    body:
      "Transparent pricing and predictable payout schedules, with no hidden fees.",
  },
];

const STEPS = [
  {
    title: "Create your business",
    body:
      "Enter the information for the business you want to add to Fockis Travel.",
  },
  {
    title: "Get verified",
    body:
      "Our team reviews the new business application to keep the marketplace trustworthy.",
  },
  {
    title: "Go live",
    body:
      "Once approved, create listings and start receiving bookings from Fockis travelers.",
  },
];

const EMPTY_FORM: PartnerForm = {
  businessName: "",
  category: "Hotels & Stays",
  categories: ["Hotels & Stays"],
  description: "",
  phone: "",
  website: "",
  address: "",
  country: "",
  city: "",
};

const MAX_COVER_SIZE = 100 * 1024 * 1024;

const COVER_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

function getPartnerId(partner: Partner | null): string | null {
  if (!partner) {
    return null;
  }

  return partner._id ?? partner.id ?? null;
}

function getPartnerStatus(partner: Partner | null): string {
  return String(partner?.status ?? "")
    .trim()
    .toLowerCase();
}

function isPartnerVerified(partner: Partner | null): boolean {
  const status = getPartnerStatus(partner);

  return (
    status === "verified" ||
    status === "approved" ||
    status === "active"
  );
}

function isPartnerPending(partner: Partner | null): boolean {
  return getPartnerStatus(partner) === "pending";
}

function isPartnerRejected(partner: Partner | null): boolean {
  return getPartnerStatus(partner) === "rejected";
}

function isPartnerSuspended(partner: Partner | null): boolean {
  return getPartnerStatus(partner) === "suspended";
}

function normalizePartnerResponse(value: unknown): Partner | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    "data" in value
  ) {
    return normalizePartnerResponse(
      (value as { data: unknown }).data,
    );
  }

  if (typeof value !== "object") {
    return null;
  }

  return value as Partner;
}

function normalizePartnerList(value: unknown): Partner[] {
  if (!value) {
    return [];
  }

  if (
    typeof value === "object" &&
    "data" in value
  ) {
    return normalizePartnerList(
      (value as { data: unknown }).data,
    );
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Partner =>
      Boolean(item && typeof item === "object"),
  );
}

function getUploadUrl(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    "data" in value
  ) {
    return getUploadUrl(
      (value as { data: unknown }).data,
    );
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object") {
    return null;
  }

  const response = value as UploadResponse;

  return (
    response.media ??
    response.url ??
    response.path ??
    null
  );
}

function getApiOrigin(): string {
  const configured =
    String(
      import.meta.env.VITE_API_URL ??
        import.meta.env.VITE_API_BASE_URL ??
        "",
    ).trim();

  if (configured) {
    return configured
      .replace(/\/travel\/?$/i, "")
      .replace(/\/+$/, "");
  }

  return "http://192.168.1.112:3000";
}

function resolveMediaUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const origin = getApiOrigin();

  return `${origin}/${trimmed.replace(/^\/+/, "")}`;
}

function getErrorStatus(error: unknown): number | null {
  if (
    error &&
    typeof error === "object"
  ) {
    const candidate =
      error as {
        status?: unknown;
        response?: {
          status?: unknown;
        };
      };

    if (
      typeof candidate.status === "number"
    ) {
      return candidate.status;
    }

    if (
      typeof candidate.response?.status ===
      "number"
    ) {
      return candidate.response.status;
    }
  }

  return null;
}

function formFromPartner(partner: Partner): PartnerForm {
  const categories =
    Array.isArray(partner.categories) &&
    partner.categories.length > 0
      ? partner.categories
      : partner.category
        ? [partner.category]
        : ["Hotels & Stays"];

  return {
    businessName: partner.businessName ?? "",
    category:
      partner.category ??
      categories[0] ??
      "Hotels & Stays",
    categories,
    description: partner.description ?? "",
    phone: partner.phone ?? "",
    website: partner.website ?? "",
    address: partner.address ?? "",
    country: partner.country ?? "",
    city: partner.city ?? "",
  };
}

export default function TravelPartnerPage() {
  const [form, setForm] =
    useState<PartnerForm>(EMPTY_FORM);

  const [myPartner, setMyPartner] =
    useState<Partner | null>(null);

  const [verifiedPartners, setVerifiedPartners] =
    useState<Partner[]>([]);

  const [loadingProfile, setLoadingProfile] =
    useState(true);

  const [loadingPartners, setLoadingPartners] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [savingMedia, setSavingMedia] =
    useState(false);

  const [uploadingCover, setUploadingCover] =
    useState(false);

  const [removingCover, setRemovingCover] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [editingExisting, setEditingExisting] =
    useState(false);

  const [refreshingStatus, setRefreshingStatus] =
    useState(false);

  const [lastStatusCheck, setLastStatusCheck] =
    useState<Date | null>(null);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /*
   * coverImageValue is the actual backend value.
   *
   * Example:
   * /uploads/business-cover.jpg
   *
   * coverPreview is the browser-display value.
   *
   * Example:
   * http://192.168.1.112:3000/uploads/business-cover.jpg
   */
  const [coverImageValue, setCoverImageValue] =
    useState("");

  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  const coverInputRef =
    useRef<HTMLInputElement | null>(null);

  const loadPartnerProfile =
    useCallback(
      async (showLoading = true) => {
        if (showLoading) {
          setLoadingProfile(true);
        }

        try {
          const profile =
            await travelApi.get<Partner | null>(
              "/travel/partners/me/profile",
            );

          const normalized =
            normalizePartnerResponse(profile);

          if (normalized) {
            setMyPartner(normalized);

            const existingCover =
              normalized.coverImage ?? "";

            setCoverImageValue(existingCover);

            setCoverPreview(
              existingCover
                ? resolveMediaUrl(existingCover)
                : null,
            );

            setLastStatusCheck(new Date());

            return normalized;
          }

          setMyPartner(null);
          setCoverImageValue("");
          setCoverPreview(null);
          setLastStatusCheck(new Date());

          return null;
        } catch (err) {
          const status =
            getErrorStatus(err);

          if (status !== 401) {
            console.error(
              "Unable to load partner profile:",
              err,
            );
          }

          return null;
        } finally {
          if (showLoading) {
            setLoadingProfile(false);
          }
        }
      },
      [],
    );

  const loadVerifiedPartners =
    useCallback(async () => {
      setLoadingPartners(true);

      try {
        const partners =
          await travelApi.get<Partner[]>(
            "/travel/partners/verified",
          );

        setVerifiedPartners(
          normalizePartnerList(partners),
        );
      } catch (err) {
        console.error(
          "Unable to load verified partners:",
          err,
        );
      } finally {
        setLoadingPartners(false);
      }
    }, []);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setError("");

      const profile =
        await loadPartnerProfile(true);

      await loadVerifiedPartners();

      if (!mounted) {
        return;
      }

      if (profile) {
        setMyPartner(profile);
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [
    loadPartnerProfile,
    loadVerifiedPartners,
  ]);

  useEffect(() => {
    if (!myPartner) {
      return;
    }

    const status =
      getPartnerStatus(myPartner);

    if (
      status === "verified" ||
      status === "approved" ||
      status === "active" ||
      status === "suspended" ||
      status === "rejected"
    ) {
      return;
    }

    const interval =
      window.setInterval(() => {
        void loadPartnerProfile(false);
      }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    myPartner,
    loadPartnerProfile,
  ]);

  useEffect(() => {
    return () => {
      if (
        coverPreview?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  async function handleRefreshStatus() {
    if (refreshingStatus) {
      return;
    }

    setRefreshingStatus(true);
    setError("");

    try {
      await loadPartnerProfile(false);
    } catch (err) {
      console.error(
        "Unable to refresh partner status:",
        err,
      );
    } finally {
      setRefreshingStatus(false);
    }
  }

  function startNewBusiness() {
    setForm({
      ...EMPTY_FORM,
      categories: ["Hotels & Stays"],
    });

    setEditingExisting(false);
    setSubmitted(false);
    setError("");
    setSuccessMessage("");

    /*
     * IMPORTANT:
     * A new business starts with no cover.
     * The user can select/upload one before
     * submitting the business application.
     */
    setCoverImageValue("");
    setCoverPreview(null);

    window.setTimeout(() => {
      document
        .getElementById("apply")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function startEditBusiness() {
    if (!myPartner) {
      return;
    }

    setForm(formFromPartner(myPartner));

    setEditingExisting(true);
    setSubmitted(false);
    setError("");
    setSuccessMessage("");

    const existingCover =
      myPartner.coverImage ?? "";

    setCoverImageValue(existingCover);

    setCoverPreview(
      existingCover
        ? resolveMediaUrl(existingCover)
        : null,
    );

    window.setTimeout(() => {
      document
        .getElementById("apply")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function cancelEdit() {
    setEditingExisting(false);
    setSubmitted(false);
    setError("");
    setSuccessMessage("");

    if (myPartner) {
      setForm(formFromPartner(myPartner));

      const existingCover =
        myPartner.coverImage ?? "";

      setCoverImageValue(existingCover);

      setCoverPreview(
        existingCover
          ? resolveMediaUrl(existingCover)
          : null,
      );
    }
  }

  function updateField<
    K extends keyof PartnerForm,
  >(
    field: K,
    value: PartnerForm[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function toggleCategory(category: string) {
    setForm((previous) => {
      const exists =
        previous.categories.includes(category);

      if (exists) {
        const nextCategories =
          previous.categories.filter(
            (item) => item !== category,
          );

        if (nextCategories.length === 0) {
          return previous;
        }

        return {
          ...previous,
          categories: nextCategories,
          category:
            previous.category === category
              ? nextCategories[0]
              : previous.category,
        };
      }

      const nextCategories = [
        ...previous.categories,
        category,
      ];

      return {
        ...previous,
        categories: nextCategories,
        category:
          previous.category ||
          nextCategories[0],
      };
    });
  }

  function removeCategory(category: string) {
    setForm((previous) => {
      if (previous.categories.length <= 1) {
        return previous;
      }

      const nextCategories =
        previous.categories.filter(
          (item) => item !== category,
        );

      return {
        ...previous,
        categories: nextCategories,
        category:
          previous.category === category
            ? nextCategories[0]
            : previous.category,
      };
    });
  }

  async function uploadCoverPhoto(
    file: File,
  ): Promise<string> {
    if (!COVER_TYPES.includes(file.type)) {
      throw new Error(
        "Please choose a JPG, PNG, WebP, GIF, or AVIF image.",
      );
    }

    if (file.size > MAX_COVER_SIZE) {
      throw new Error(
        "The cover photo must be 100 MB or smaller.",
      );
    }

    setUploadingCover(true);
    setError("");
    setSuccessMessage("");

    /*
     * Create the local preview FIRST.
     *
     * This means the user sees the selected image
     * immediately, even while the upload is occurring.
     */
    const localPreview =
      URL.createObjectURL(file);

    setCoverPreview(localPreview);

    try {
      const body = new FormData();

      body.append("file", file);

      const uploaded =
        await travelApi.post<UploadResponse>(
          "/uploads",
          body,
        );

      const media =
        getUploadUrl(uploaded);

      if (!media) {
        throw new Error(
          "The image uploaded, but Fockis Travel did not return an image URL.",
        );
      }

      /*
       * Keep the backend value separately.
       */
      setCoverImageValue(media);

      /*
       * Convert /uploads/... into a URL that the
       * browser can actually request from the API.
       */
      const resolved =
        resolveMediaUrl(media);

      setCoverPreview(resolved);

      return media;
    } catch (err) {
      /*
       * Remove the failed local preview.
       */
      URL.revokeObjectURL(localPreview);
      setCoverPreview(null);
      setCoverImageValue("");

      throw err;
    } finally {
      setUploadingCover(false);
    }
  }

  async function saveCoverToExistingPartner(
    media: string,
  ): Promise<Partner | null> {
    if (!myPartner) {
      return null;
    }

    setSavingMedia(true);

    try {
      const payload = {
        logo: myPartner.logo,
        coverImage: media,
      };

      let updated: unknown;

      /*
       * Current frontend contract is PATCH.
       */
      try {
        updated =
          await travelApi.patch<Partner>(
            "/travel/partners/me/media",
            payload,
          );
      } catch (patchError) {
        const status =
          getErrorStatus(patchError);

        /*
         * Some versions of the backend used POST
         * for this endpoint.
         *
         * If PATCH is not available, retry POST.
         */
        if (
          status !== 404 &&
          status !== 405
        ) {
          throw patchError;
        }

        updated =
          await travelApi.post<Partner>(
            "/travel/partners/me/media",
            payload,
          );
      }

      const normalized =
        normalizePartnerResponse(updated);

      if (normalized) {
        setMyPartner(normalized);

        const savedCover =
          normalized.coverImage ??
          media;

        setCoverImageValue(savedCover);

        setCoverPreview(
          resolveMediaUrl(savedCover),
        );

        return normalized;
      }

      /*
       * Even if the backend does not return the
       * complete partner object, keep the local state
       * correct.
       */
      setMyPartner((previous) =>
        previous
          ? {
              ...previous,
              coverImage: media,
            }
          : previous,
      );

      setCoverImageValue(media);
      setCoverPreview(resolveMediaUrl(media));

      return {
        ...myPartner,
        coverImage: media,
      };
    } finally {
      setSavingMedia(false);
    }
  }

  async function handleCoverSelected(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      e.target.files?.[0];

    /*
     * Allows selecting the same file again later.
     */
    e.target.value = "";

    if (!file) {
      return;
    }

    try {
      const media =
        await uploadCoverPhoto(file);

      /*
       * NEW BUSINESS:
       *
       * The image is uploaded to /uploads now,
       * but there is no partner record yet.
       *
       * We keep the media path in coverImageValue.
       * The main Submit button will attach it when
       * /travel/partners/apply is called.
       */
      if (!myPartner) {
        setSuccessMessage(
          "Cover photo uploaded. Your photo is ready. Click Create Business & Submit Application below to create the business.",
        );

        return;
      }

      /*
       * EXISTING BUSINESS:
       *
       * Save the cover immediately to the partner.
       */
      await saveCoverToExistingPartner(media);

      setSuccessMessage(
        "Business cover photo saved successfully.",
      );
    } catch (err) {
      console.error(
        "Cover photo upload failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload the cover photo. Please try again.",
      );
    }
  }

  async function handleRemoveCover() {
    if (
      removingCover ||
      uploadingCover ||
      savingMedia
    ) {
      return;
    }

    /*
     * NEW BUSINESS:
     *
     * There is no partner record yet.
     * Just clear the local selected/uploaded photo.
     */
    if (!myPartner) {
      setCoverImageValue("");
      setCoverPreview(null);
      setSuccessMessage(
        "Cover photo removed from this new business.",
      );
      return;
    }

    setRemovingCover(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        logo: myPartner.logo,
        coverImage: "",
      };

      let updated: unknown;

      try {
        updated =
          await travelApi.patch<Partner>(
            "/travel/partners/me/media",
            payload,
          );
      } catch (patchError) {
        const status =
          getErrorStatus(patchError);

        if (
          status !== 404 &&
          status !== 405
        ) {
          throw patchError;
        }

        updated =
          await travelApi.post<Partner>(
            "/travel/partners/me/media",
            payload,
          );
      }

      const normalized =
        normalizePartnerResponse(updated);

      if (normalized) {
        setMyPartner(normalized);
      } else {
        setMyPartner((previous) =>
          previous
            ? {
                ...previous,
                coverImage: "",
              }
            : previous,
        );
      }

      setCoverImageValue("");
      setCoverPreview(null);

      setSuccessMessage(
        "Business cover photo removed.",
      );
    } catch (err) {
      console.error(
        "Unable to remove cover photo:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove the cover photo.",
      );
    } finally {
      setRemovingCover(false);
    }
  }

  async function savePartnerMedia(
    partner: Partner,
    coverImage?: string,
  ): Promise<Partner> {
    const media =
      coverImage ??
      partner.coverImage ??
      "";

    const payload = {
      logo: partner.logo,
      coverImage: media,
    };

    let updated: unknown;

    try {
      updated =
        await travelApi.patch<Partner>(
          "/travel/partners/me/media",
          payload,
        );
    } catch (patchError) {
      const status =
        getErrorStatus(patchError);

      if (
        status !== 404 &&
        status !== 405
      ) {
        throw patchError;
      }

      updated =
        await travelApi.post<Partner>(
          "/travel/partners/me/media",
          payload,
        );
    }

    const normalized =
      normalizePartnerResponse(updated);

    if (normalized) {
      setMyPartner(normalized);

      const savedCover =
        normalized.coverImage ?? media;

      setCoverImageValue(savedCover);

      setCoverPreview(
        savedCover
          ? resolveMediaUrl(savedCover)
          : null,
      );

      return normalized;
    }

    const fallback = {
      ...partner,
      coverImage: media,
    };

    setMyPartner(fallback);

    setCoverImageValue(media);

    setCoverPreview(
      media
        ? resolveMediaUrl(media)
        : null,
    );

    return fallback;
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setSubmitted(false);

    if (!form.businessName.trim()) {
      setError(
        "Please enter your business name.",
      );
      return;
    }

    if (form.categories.length === 0) {
      setError(
        "Please select at least one business category.",
      );
      return;
    }

    if (!form.category.trim()) {
      setError(
        "Please select a primary business category.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        businessName:
          form.businessName.trim(),

        category:
          form.category.trim() ||
          form.categories[0],

        categories:
          form.categories,

        description:
          form.description.trim() ||
          undefined,

        phone:
          form.phone.trim() ||
          undefined,

        website:
          form.website.trim() ||
          undefined,

        address:
          form.address.trim() ||
          undefined,

        country:
          form.country.trim() ||
          undefined,

        city:
          form.city.trim() ||
          undefined,
      };

      let saved: Partner | null = null;

      /*
       * ============================================================
       * UPDATE EXISTING BUSINESS
       * ============================================================
       */
      if (
        editingExisting &&
        myPartner
      ) {
        saved =
          normalizePartnerResponse(
            await travelApi.patch<Partner>(
              "/travel/partners/me/profile",
              payload,
            ),
          );

        if (!saved) {
          throw new Error(
            "The business was updated, but Fockis Travel did not return the updated business record.",
          );
        }

        /*
         * If a cover was selected while editing,
         * make sure the partner record contains it.
         */
        if (
          coverImageValue &&
          coverImageValue !==
            saved.coverImage
        ) {
          saved =
            await savePartnerMedia(
              saved,
              coverImageValue,
            );
        }

        setMyPartner(saved);

        setForm(
          formFromPartner(saved),
        );

        setEditingExisting(false);

        setSuccessMessage(
          "Your Fockis Travel business was updated successfully.",
        );
      } else {
        /*
         * ============================================================
         * CREATE NEW BUSINESS
         * ============================================================
         *
         * IMPORTANT:
         * The cover photo is included in the creation payload.
         *
         * This is what makes the uploaded cover photo part
         * of the new business instead of uploading it and
         * losing it.
         */
        saved =
          normalizePartnerResponse(
            await travelApi.post<Partner>(
              "/travel/partners/apply",
              {
                ...payload,

                /*
                 * Attach the uploaded cover image.
                 *
                 * If the user did not upload one,
                 * this is undefined.
                 */
                coverImage:
                  coverImageValue ||
                  undefined,

                status: "pending",

                documents: {},
              },
            ),
          );

        if (!saved) {
          throw new Error(
            "The business was submitted, but Fockis Travel did not return the new business record.",
          );
        }

        /*
         * If the backend accepts the coverImage field
         * directly, we are finished.
         *
         * If it does not persist media during application
         * creation, save it immediately after creation.
         */
        if (
          coverImageValue &&
          saved.coverImage !==
            coverImageValue
        ) {
          try {
            saved =
              await savePartnerMedia(
                saved,
                coverImageValue,
              );
          } catch (mediaError) {
            console.error(
              "Business was created but cover media could not be attached:",
              mediaError,
            );

            /*
             * Do not tell the user the entire business
             * creation failed if only the media save failed.
             */
            setSuccessMessage(
              "Your business was created successfully, but the cover photo could not be attached automatically. You can add it from Edit Business.",
            );
          }
        }

        setMyPartner(saved);

        setForm(
          formFromPartner(saved),
        );

        setSubmitted(true);

        if (
          !successMessage
        ) {
          setSuccessMessage(
            "Your new business application was created successfully.",
          );
        }
      }

      setLastStatusCheck(new Date());

      void loadVerifiedPartners();

      window.setTimeout(() => {
        document
          .getElementById(
            "application-status",
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error(
        "Partner business save failed:",
        err,
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          editingExisting
            ? "Unable to update the business. Please try again."
            : "Unable to create the new business. Please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const partnerStatus =
    getPartnerStatus(myPartner);

  const isPending =
    isPartnerPending(myPartner);

  const isVerified =
    isPartnerVerified(myPartner);

  const isSuspended =
    isPartnerSuspended(myPartner);

  const isRejected =
    isPartnerRejected(myPartner);

  const statusLabel =
    isVerified
      ? "Verified"
      : isSuspended
        ? "Suspended"
        : isRejected
          ? "Rejected"
          : isPending
            ? "Pending verification"
            : null;

  const statusDescription =
    isVerified
      ? "This business has been approved and can be published as a verified Fockis Travel partner."
      : isSuspended
        ? "This partner account is currently suspended. Please contact the Fockis Travel partnerships team."
        : isRejected
          ? "This business application was not approved. Please review any feedback from the partnerships team."
          : isPending
            ? "This new business application has been received and is currently being reviewed by the Fockis Travel partnerships team."
            : "Create a new business below to begin the Fockis Travel partner verification process.";

  const submittedDate =
    myPartner?.createdAt
      ? new Date(myPartner.createdAt)
      : null;

  const updatedDate =
    myPartner?.updatedAt
      ? new Date(myPartner.updatedAt)
      : null;

  function formatDate(
    date: Date | null,
  ) {
    if (
      !date ||
      Number.isNaN(date.getTime())
    ) {
      return "—";
    }

    return date.toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );
  }

  const partnerCount =
    verifiedPartners.length;

  const countryCount =
    useMemo(() => {
      const countries =
        new Set(
          verifiedPartners
            .map(
              (partner) =>
                partner.country?.trim(),
            )
            .filter(Boolean),
        );

      return countries.size;
    }, [verifiedPartners]);

  const categoryCount =
    useMemo(() => {
      const categories =
        new Set<string>();

      verifiedPartners.forEach(
        (partner) => {
          if (
            Array.isArray(
              partner.categories,
            ) &&
            partner.categories.length > 0
          ) {
            partner.categories.forEach(
              (category) => {
                if (
                  category?.trim()
                ) {
                  categories.add(
                    category.trim(),
                  );
                }
              },
            );
          } else if (
            partner.category?.trim()
          ) {
            categories.add(
              partner.category.trim(),
            );
          }
        },
      );

      return categories.size;
    }, [verifiedPartners]);

  return (
    <div className="travel-partner-page">
      <section className="tight">
        <div className="wrap">
          <div className="partner-hero">
            <div>
              <div className="eyebrow">
                Fockis Travel Partners
              </div>

              <h1>
                Manage your businesses on
                Fockis Travel
              </h1>

              <p>
                Create a new business,
                update your existing business,
                and add professional media such
                as a cover photo to your Fockis
                Travel partner profile.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 22,
                }}
              >
                <button
                  type="button"
                  className="btn btn-amber"
                  onClick={
                    startNewBusiness
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Plus size={17} />
                  Create New Business
                  <ArrowRight size={15} />
                </button>

                {myPartner && (
                  <button
                    type="button"
                    className="btn"
                    onClick={
                      startEditBusiness
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Pencil size={16} />
                    Edit Business
                  </button>
                )}

                {isVerified && (
                  <a
                    href="/travel/partner/dashboard"
                    className="btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <LayoutDashboard size={16} />
                    Partner Dashboard
                  </a>
                )}
              </div>
            </div>

            <div
              className="biz-stats-grid"
              style={{ margin: 0 }}
            >
              <div className="biz-stat-card">
                <div className="amt">
                  {loadingPartners
                    ? "—"
                    : partnerCount}
                </div>

                <div className="lbl">
                  Verified partners
                </div>
              </div>

              <div className="biz-stat-card">
                <div className="amt">
                  {loadingPartners
                    ? "—"
                    : countryCount}
                </div>

                <div className="lbl">
                  Countries
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <section className="tight">
          <div className="wrap">
            <div
              role="alert"
              style={{
                maxWidth: 900,
                padding: 16,
                borderRadius: 12,
                background: "#fff4f4",
                border:
                  "1px solid #efb8b8",
                color: "#9b2226",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <AlertTriangle
                size={19}
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />

              <div>
                <strong>
                  Unable to continue
                </strong>

                <div
                  style={{
                    marginTop: 4,
                  }}
                >
                  {error}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {successMessage && (
        <section className="tight">
          <div className="wrap">
            <div
              role="status"
              style={{
                maxWidth: 900,
                padding: 16,
                borderRadius: 12,
                background: "#f0faf4",
                border:
                  "1px solid #b7dfc5",
                color: "#176b3a",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <CheckCircle2
                size={19}
                style={{
                  flexShrink: 0,
                }}
              />

              <div>
                <strong>
                  Success
                </strong>

                <div
                  style={{
                    marginTop: 4,
                  }}
                >
                  {successMessage}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section
        className="tight"
        id="application-status"
      >
        <div className="wrap">
          <div
            style={{
              maxWidth: 900,
              padding: 24,
              borderRadius: 18,
              background: "#fff",
              border:
                "1px solid rgba(15,27,43,0.12)",
              boxShadow:
                "0 12px 35px rgba(15,27,43,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent:
                  "space-between",
                gap: 20,
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              <div>
                <div className="eyebrow">
                  Your business
                </div>

                <h2
                  style={{
                    marginBottom: 6,
                  }}
                >
                  Business account
                </h2>

                <p
                  style={{
                    margin: 0,
                    maxWidth: 620,
                  }}
                >
                  Manage your Fockis Travel
                  business profile, status and
                  cover photo.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    startNewBusiness
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  <Plus size={16} />
                  New Business
                </button>

                {myPartner && (
                  <button
                    type="button"
                    className="btn"
                    onClick={
                      startEditBusiness
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {loadingProfile ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 18,
                  borderRadius: 12,
                  background:
                    "rgba(15,27,43,0.035)",
                }}
              >
                <Loader2
                  size={19}
                  className="spin"
                />

                <span>
                  Loading your business
                  account...
                </span>
              </div>
            ) : !myPartner ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 18,
                  borderRadius: 12,
                  background:
                    "rgba(15,27,43,0.035)",
                  border:
                    "1px solid rgba(15,27,43,0.08)",
                }}
              >
                <FileCheck2 size={24} />

                <div>
                  <strong>
                    No business created yet
                  </strong>

                  <div
                    style={{
                      marginTop: 3,
                    }}
                  >
                    Create your first Fockis
                    Travel business below.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {myPartner.coverImage && (
                  <div
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      minHeight: 190,
                      borderRadius: 16,
                      marginBottom: 18,
                      background: "#e9edf2",
                    }}
                  >
                    <img
                      src={resolveMediaUrl(
                        myPartner.coverImage,
                      )}
                      alt={`${myPartner.businessName} cover`}
                      style={{
                        width: "100%",
                        height: 260,
                        objectFit: "cover",
                        display: "block",
                      }}
                      onError={(event) => {
                        console.error(
                          "Unable to load partner cover image:",
                          event.currentTarget.src,
                        );
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        left: 16,
                        bottom: 16,
                        padding:
                          "8px 12px",
                        borderRadius: 999,
                        background:
                          "rgba(0,0,0,0.65)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Business cover photo
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 16,
                    borderRadius: 12,
                    background:
                      "rgba(15,27,43,0.035)",
                    border:
                      "1px solid rgba(15,27,43,0.08)",
                    marginBottom: 18,
                  }}
                >
                  <Building2 size={21} />

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <strong>
                      {
                        myPartner.businessName
                      }
                    </strong>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 13,
                      }}
                    >
                      {
                        myPartner.category
                      }
                    </div>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding:
                        "6px 10px",
                      borderRadius: 999,
                      background:
                        isVerified
                          ? "rgba(34,197,94,0.10)"
                          : isRejected ||
                              isSuspended
                            ? "rgba(220,38,38,0.08)"
                            : "rgba(232,163,61,0.12)",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {isVerified ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <Clock3 size={14} />
                    )}

                    {statusLabel ??
                      "Application"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <strong>
                      {statusLabel ??
                        "Application"}
                    </strong>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        maxWidth: 650,
                      }}
                    >
                      {
                        statusDescription
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleRefreshStatus
                    }
                    disabled={
                      refreshingStatus
                    }
                    className="btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      gap: 8,
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {refreshingStatus ? (
                      <Loader2
                        size={15}
                        className="spin"
                      />
                    ) : (
                      <RefreshCw size={15} />
                    )}

                    {refreshingStatus
                      ? "Checking..."
                      : "Refresh status"}
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                    marginTop: 18,
                  }}
                >
                  <div
                    style={{
                      padding: 13,
                      borderRadius: 11,
                      background:
                        "rgba(15,27,43,0.035)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          ".04em",
                        opacity: 0.65,
                      }}
                    >
                      Created
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontWeight: 650,
                      }}
                    >
                      {formatDate(
                        submittedDate,
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 13,
                      borderRadius: 11,
                      background:
                        "rgba(15,27,43,0.035)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          ".04em",
                        opacity: 0.65,
                      }}
                    >
                      Last updated
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontWeight: 650,
                      }}
                    >
                      {formatDate(
                        updatedDate,
                      )}
                    </div>
                  </div>
                </div>

                {isVerified && (
                  <div
                    style={{
                      marginTop: 22,
                      padding: 20,
                      borderRadius: 14,
                      background:
                        "linear-gradient(135deg, #163a5f 0%, #0f2d4a 100%)",
                      color: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 12,
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          background:
                            "rgba(255,255,255,0.12)",
                        }}
                      >
                        <LayoutDashboard
                          size={23}
                        />
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 220,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 18,
                          }}
                        >
                          Your partner account
                          is ready
                        </strong>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            lineHeight: 1.55,
                            color:
                              "rgba(255,255,255,0.78)",
                          }}
                        >
                          Manage this business,
                          create listings,
                          review reservations
                          and continue setting
                          up your Fockis Travel
                          presence.
                        </div>
                      </div>

                      <a
                        href="/travel/partner/dashboard"
                        className="btn"
                        style={{
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          gap: 8,
                          background:
                            "#b8862f",
                          color: "#fff",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <LayoutDashboard
                          size={16}
                        />

                        Open Dashboard

                        <ArrowRight
                          size={15}
                        />
                      </a>
                    </div>
                  </div>
                )}

                {lastStatusCheck && (
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 11,
                      display: "flex",
                      alignItems:
                        "center",
                      gap: 5,
                    }}
                  >
                    <RefreshCw size={11} />

                    Status checked{" "}
                    {lastStatusCheck.toLocaleTimeString(
                      undefined,
                      {
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}

                    {isPending &&
                      " • Automatic checking is enabled"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section
        className="tight"
        id="apply"
      >
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                {editingExisting
                  ? "EDIT BUSINESS"
                  : submitted
                    ? "APPLICATION CREATED"
                    : "NEW BUSINESS"}
              </div>

              <h2>
                {editingExisting
                  ? "Update your Fockis Travel business"
                  : submitted
                    ? "Your new business application"
                    : "Create a new Fockis Travel business"}
              </h2>

              <p
                style={{
                  maxWidth: 720,
                }}
              >
                {editingExisting
                  ? "Update your existing business information and cover photo without creating another partner account."
                  : submitted
                    ? "Your new business has been submitted separately from your existing business account."
                    : "This form creates a brand-new business. It does not update or replace your existing Fockis Travel business."}
              </p>
            </div>
          </div>

          {submitted &&
            !editingExisting && (
              <div
                className="ft-empty-state"
                style={{
                  maxWidth: 640,
                  marginBottom: 24,
                }}
              >
                <div
                  className="ic"
                  aria-hidden="true"
                >
                  {isVerified
                    ? "🎉"
                    : "✅"}
                </div>

                <h4>
                  {isVerified
                    ? "Your new business is verified"
                    : "New business application received"}
                </h4>

                <p>
                  {isVerified
                    ? "Your new business is now available as a verified Fockis Travel partner."
                    : "Your new business application has been created and is waiting for verification."}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent:
                      "center",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  {isVerified && (
                    <a
                      href="/travel/partner/dashboard"
                      className="btn btn-primary"
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        gap: 8,
                      }}
                    >
                      <LayoutDashboard
                        size={16}
                      />

                      Go to Partner
                      Dashboard

                      <ArrowRight
                        size={15}
                      />
                    </a>
                  )}

                  <button
                    type="button"
                    className="btn"
                    onClick={
                      startNewBusiness
                    }
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap: 7,
                    }}
                  >
                    <Plus size={16} />

                    Create Another
                    Business
                  </button>
                </div>
              </div>
            )}

          {(!submitted ||
            editingExisting) && (
            <form
              onSubmit={handleSubmit}
              style={{
                maxWidth: 760,
                display: "grid",
                gap: 4,
              }}
            >
              <div className="ft-field">
                <label htmlFor="biz-name">
                  Business name *
                </label>

                <input
                  id="biz-name"
                  required
                  value={
                    form.businessName
                  }
                  onChange={(e) =>
                    updateField(
                      "businessName",
                      e.target.value,
                    )
                  }
                  placeholder="Your business name"
                />
              </div>

              <div className="ft-field">
                <label htmlFor="biz-category">
                  Primary category *
                </label>

                <select
                  id="biz-category"
                  required
                  value={
                    form.category
                  }
                  onChange={(e) =>
                    updateField(
                      "category",
                      e.target.value,
                    )
                  }
                >
                  {CATEGORIES.map(
                    (category) => (
                      <option
                        key={
                          category.label
                        }
                        value={
                          category.label
                        }
                      >
                        {category.ic}{" "}
                        {category.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div
                style={{
                  marginBottom: 12,
                  padding: 14,
                  borderRadius: 12,
                  background:
                    "rgba(15,27,43,0.035)",
                  border:
                    "1px solid rgba(15,27,43,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    marginBottom: 10,
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      ".04em",
                  }}
                >
                  Business services
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 8,
                  }}
                >
                  {CATEGORIES.map(
                    (category) => {
                      const selected =
                        form.categories.includes(
                          category.label,
                        );

                      return (
                        <button
                          type="button"
                          key={
                            category.label
                          }
                          onClick={() =>
                            toggleCategory(
                              category.label,
                            )
                          }
                          aria-pressed={
                            selected
                          }
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 9,
                            padding:
                              "10px 11px",
                            borderRadius:
                              10,
                            border:
                              selected
                                ? "1px solid #b8862f"
                                : "1px solid rgba(15,27,43,0.10)",
                            background:
                              selected
                                ? "rgba(184,134,47,0.10)"
                                : "#fff",
                            cursor:
                              "pointer",
                            textAlign:
                              "left",
                            font: "inherit",
                          }}
                        >
                          <span
                            style={{
                              fontSize:
                                20,
                            }}
                          >
                            {
                              category.ic
                            }
                          </span>

                          <span
                            style={{
                              flex: 1,
                              fontSize:
                                13,
                              fontWeight:
                                650,
                            }}
                          >
                            {
                              category.label
                            }
                          </span>

                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius:
                                "50%",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              background:
                                selected
                                  ? "#b8862f"
                                  : "rgba(15,27,43,0.06)",
                              color:
                                selected
                                  ? "#fff"
                                  : "inherit",
                            }}
                          >
                            {selected ? (
                              <Check
                                size={13}
                              />
                            ) : (
                              <Plus
                                size={13}
                              />
                            )}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="ft-field">
                <label>
                  Selected services
                </label>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 7,
                    marginBottom: 10,
                  }}
                >
                  {form.categories.map(
                    (category) => {
                      const info =
                        CATEGORIES.find(
                          (item) =>
                            item.label ===
                            category,
                        );

                      return (
                        <span
                          key={
                            category
                          }
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 6,
                            padding:
                              "6px 9px",
                            borderRadius:
                              999,
                            background:
                              "rgba(15,27,43,0.05)",
                            border:
                              "1px solid rgba(15,27,43,0.10)",
                            fontSize:
                              12,
                            fontWeight:
                              600,
                          }}
                        >
                          {info?.ic}

                          {category}

                          {form.categories
                            .length >
                            1 && (
                            <button
                              type="button"
                              onClick={() =>
                                removeCategory(
                                  category,
                                )
                              }
                              aria-label={`Remove ${category}`}
                              style={{
                                width: 19,
                                height: 19,
                                border: 0,
                                borderRadius:
                                  "50%",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                cursor:
                                  "pointer",
                                background:
                                  "rgba(15,27,43,0.08)",
                              }}
                            >
                              <X
                                size={11}
                              />
                            </button>
                          )}
                        </span>
                      );
                    },
                  )}
                </div>

                <small>
                  {form.categories.length}{" "}
                  {form.categories.length ===
                  1
                    ? "service"
                    : "services"}{" "}
                  selected
                </small>
              </div>

              <div
                style={{
                  marginTop: 10,
                  marginBottom: 18,
                  padding: 16,
                  borderRadius: 14,
                  background: "#f8fafc",
                  border:
                    "1px solid rgba(15,27,43,0.10)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "flex-start",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 8,
                        fontWeight: 750,
                      }}
                    >
                      <Camera size={18} />

                      Business cover photo
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        lineHeight: 1.55,
                        color:
                          "#5b6b81",
                      }}
                    >
                      Add a professional image
                      that represents this business.
                      JPG, PNG, WebP, GIF and AVIF are
                      supported, up to 100 MB.
                    </div>
                  </div>

                  <input
                    ref={
                      coverInputRef
                    }
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                    onChange={
                      handleCoverSelected
                    }
                    style={{
                      display: "none",
                    }}
                  />

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      coverInputRef.current?.click()
                    }
                    disabled={
                      uploadingCover ||
                      savingMedia ||
                      removingCover ||
                      submitting
                    }
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: 8,
                    }}
                  >
                    {uploadingCover ? (
                      <Loader2
                        size={15}
                        className="spin"
                      />
                    ) : (
                      <ImagePlus
                        size={15}
                      />
                    )}

                    {uploadingCover
                      ? "Uploading..."
                      : coverPreview
                        ? "Change Cover Photo"
                        : "Add Cover Photo"}
                  </button>
                </div>

                {/*
                 * ====================================================
                 * COVER PHOTO PREVIEW
                 * ====================================================
                 */}
                {coverPreview ? (
                  <div
                    style={{
                      position:
                        "relative",
                      overflow:
                        "hidden",
                      borderRadius:
                        13,
                      background:
                        "#e8edf3",
                    }}
                  >
                    <img
                      src={
                        coverPreview
                      }
                      alt="Business cover preview"
                      style={{
                        display:
                          "block",
                        width:
                          "100%",
                        height:
                          280,
                        objectFit:
                          "cover",
                      }}
                      onError={() => {
                        setError(
                          "The cover photo was uploaded, but the browser could not load the image from the API server. Check that the backend is running and that VITE_API_URL points to the backend.",
                        );
                      }}
                    />

                    <div
                      style={{
                        position:
                          "absolute",
                        left: 12,
                        right: 12,
                        bottom: 12,
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: 8,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <span
                        style={{
                          padding:
                            "7px 10px",
                          borderRadius:
                            999,
                          background:
                            "rgba(0,0,0,0.68)",
                          color:
                            "#fff",
                          fontSize:
                            11,
                          fontWeight:
                            700,
                        }}
                      >
                        {uploadingCover
                          ? "Uploading cover photo..."
                          : savingMedia
                            ? "Saving cover photo..."
                            : "Cover photo ready"}
                      </span>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 7,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            coverInputRef.current?.click()
                          }
                          disabled={
                            uploadingCover ||
                            savingMedia ||
                            removingCover ||
                            submitting
                          }
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 6,
                            border: 0,
                            borderRadius:
                              999,
                            padding:
                              "8px 11px",
                            cursor:
                              "pointer",
                            background:
                              "#fff",
                            color:
                              "#0e1a2b",
                            fontWeight:
                              700,
                          }}
                        >
                          <RefreshCw
                            size={13}
                          />

                          Replace
                        </button>

                        <button
                          type="button"
                          onClick={
                            handleRemoveCover
                          }
                          disabled={
                            uploadingCover ||
                            savingMedia ||
                            removingCover ||
                            submitting
                          }
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 6,
                            border: 0,
                            borderRadius:
                              999,
                            padding:
                              "8px 11px",
                            cursor:
                              "pointer",
                            background:
                              "#fff",
                            color:
                              "#9b2226",
                            fontWeight:
                              700,
                          }}
                        >
                          {removingCover ? (
                            <Loader2
                              size={13}
                              className="spin"
                            />
                          ) : (
                            <Trash2
                              size={13}
                            />
                          )}

                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      coverInputRef.current?.click()
                    }
                    disabled={
                      uploadingCover ||
                      savingMedia ||
                      removingCover ||
                      submitting
                    }
                    style={{
                      width: "100%",
                      minHeight: 210,
                      borderRadius: 13,
                      border:
                        "2px dashed rgba(15,27,43,0.16)",
                      background: "#fff",
                      cursor:
                        "pointer",
                      display: "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: 9,
                      color:
                        "#5b6b81",
                    }}
                  >
                    <ImagePlus size={34} />

                    <strong>
                      Add a cover photo
                    </strong>

                    <span
                      style={{
                        fontSize: 12,
                      }}
                    >
                      Click to choose an image
                    </span>
                  </button>
                )}

                {/*
                 * NEW BUSINESS MESSAGE
                 *
                 * This tells the user clearly that the photo
                 * is uploaded and the main form still needs
                 * to be submitted.
                 */}
                {coverPreview &&
                  !myPartner && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 10,
                        background:
                          "rgba(23,107,58,0.07)",
                        border:
                          "1px solid rgba(23,107,58,0.15)",
                        color: "#176b3a",
                        display:
                          "flex",
                        alignItems:
                          "flex-start",
                        gap: 8,
                        fontSize: 12,
                        lineHeight:
                          1.5,
                      }}
                    >
                      <CheckCircle2
                        size={15}
                        style={{
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />

                      <span>
                        Cover photo uploaded
                        successfully. Your photo is
                        ready and will be attached to
                        this business when you click
                        <strong>
                          {" "}
                          Create Business & Submit
                          Application
                        </strong>
                        .
                      </span>
                    </div>
                  )}

                {/*
                 * EXISTING BUSINESS MESSAGE
                 */}
                {coverPreview &&
                  myPartner &&
                  !uploadingCover &&
                  !savingMedia && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 10,
                        background:
                          "rgba(23,107,58,0.07)",
                        border:
                          "1px solid rgba(23,107,58,0.15)",
                        color: "#176b3a",
                        display:
                          "flex",
                        alignItems:
                          "flex-start",
                        gap: 8,
                        fontSize: 12,
                        lineHeight:
                          1.5,
                      }}
                    >
                      <CheckCircle2
                        size={15}
                        style={{
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      />

                      <span>
                        Cover photo is saved to
                        your business.
                      </span>
                    </div>
                  )}
              </div>

              <div className="ft-field">
                <label htmlFor="biz-description">
                  Business description
                </label>

                <textarea
                  id="biz-description"
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    updateField(
                      "description",
                      e.target.value,
                    )
                  }
                  placeholder="Tell travelers about this business and the services it offers..."
                  rows={5}
                />
              </div>

              <div className="ft-field">
                <label htmlFor="biz-phone">
                  Phone
                </label>

                <input
                  id="biz-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    updateField(
                      "phone",
                      e.target.value,
                    )
                  }
                  placeholder="+1..."
                />
              </div>

              <div className="ft-field">
                <label htmlFor="biz-website">
                  Website
                </label>

                <input
                  id="biz-website"
                  type="url"
                  value={
                    form.website
                  }
                  onChange={(e) =>
                    updateField(
                      "website",
                      e.target.value,
                    )
                  }
                  placeholder="https://example.com"
                />
              </div>

              <div className="ft-field">
                <label htmlFor="biz-address">
                  Address
                </label>

                <input
                  id="biz-address"
                  value={
                    form.address
                  }
                  onChange={(e) =>
                    updateField(
                      "address",
                      e.target.value,
                    )
                  }
                  placeholder="Street address"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <div className="ft-field">
                  <label htmlFor="biz-city">
                    City
                  </label>

                  <input
                    id="biz-city"
                    value={form.city}
                    onChange={(e) =>
                      updateField(
                        "city",
                        e.target.value,
                      )
                    }
                    placeholder="City"
                  />
                </div>

                <div className="ft-field">
                  <label htmlFor="biz-country">
                    Country
                  </label>

                  <input
                    id="biz-country"
                    value={
                      form.country
                    }
                    onChange={(e) =>
                      updateField(
                        "country",
                        e.target.value,
                      )
                    }
                    placeholder="Country"
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  padding: 16,
                  borderRadius: 12,
                  background:
                    "rgba(22,58,95,0.05)",
                  border:
                    "1px solid rgba(22,58,95,0.10)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems:
                      "flex-start",
                    gap: 10,
                  }}
                >
                  <BriefcaseBusiness
                    size={19}
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />

                  <div>
                    <strong>
                      {editingExisting
                        ? "Updating this existing business"
                        : "Creating a separate business"}
                    </strong>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        fontSize: 13,
                        lineHeight:
                          1.55,
                      }}
                    >
                      {editingExisting
                        ? "Your existing Fockis Travel business will be updated. No new partner account will be created."
                        : "This application creates a new Fockis Travel business. Your existing business account is not replaced."}
                    </p>
                  </div>
                </div>
              </div>

              {/*
               * ========================================================
               * FINAL SUBMIT BUTTON
               * ========================================================
               *
               * This button intentionally remains available after
               * the cover photo has uploaded.
               *
               * It is only disabled while the actual upload/save
               * operation is still running.
               */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    submitting ||
                    loadingProfile ||
                    uploadingCover ||
                    savingMedia ||
                    removingCover ||
                    form.categories.length ===
                      0
                  }
                  style={{
                    flex: 1,
                    minWidth: 240,
                    opacity:
                      submitting ||
                      loadingProfile ||
                      uploadingCover ||
                      savingMedia ||
                      removingCover ||
                      form.categories.length ===
                        0
                        ? 0.7
                        : 1,
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: 8,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={15}
                        className="spin"
                      />

                      {editingExisting
                        ? "Saving changes..."
                        : "Creating business..."}
                    </>
                  ) : (
                    <>
                      {editingExisting ? (
                        <Save size={15} />
                      ) : (
                        <Plus size={15} />
                      )}

                      {editingExisting
                        ? "Save Business Changes"
                        : "Create Business & Submit Application"}

                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {editingExisting && (
                  <button
                    type="button"
                    className="btn"
                    onClick={
                      cancelEdit
                    }
                    disabled={
                      submitting ||
                      savingMedia ||
                      uploadingCover ||
                      removingCover
                    }
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      gap: 7,
                    }}
                  >
                    <X size={15} />

                    Cancel
                  </button>
                )}
              </div>

              {!editingExisting &&
                !submitted && (
                  <div
                    style={{
                      marginTop: 4,
                      padding: 12,
                      borderRadius: 10,
                      background:
                        "rgba(184,134,47,0.07)",
                      border:
                        "1px solid rgba(184,134,47,0.16)",
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>
                      Ready to submit?
                    </strong>{" "}
                    Fill in the business
                    information above, optionally
                    upload your cover photo, then
                    click{" "}
                    <strong>
                      Create Business & Submit
                      Application
                    </strong>
                    .
                  </div>
                )}
            </form>
          )}
        </div>
      </section>

      <section className="tight">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Why partner with us
              </div>

              <h2>
                Benefits
              </h2>
            </div>
          </div>

          <div className="benefits-grid">
            {BENEFITS.map(
              (benefit) => (
                <div
                  key={
                    benefit.title
                  }
                  className="trust-item"
                >
                  <div className="check">
                    <Building2 size={13} />
                  </div>

                  <div>
                    <h5>
                      {
                        benefit.title
                      }
                    </h5>

                    <p>
                      {
                        benefit.body
                      }
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                How it works
              </div>

              <h2>
                Onboarding, in three steps
              </h2>
            </div>
          </div>

          <div className="onboarding-steps">
            {STEPS.map(
              (
                step,
                index,
              ) => (
                <div
                  key={
                    step.title
                  }
                >
                  <div className="planner-step">
                    <div
                      className="node"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </div>

                    <div>
                      <div className="label">
                        {
                          step.title
                        }
                      </div>

                      <div className="sub">
                        {
                          step.body
                        }
                      </div>
                    </div>
                  </div>

                  {index <
                    STEPS.length - 1 && (
                    <div
                      className="planner-connector"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="tight">
        <div className="wrap">
          <PartnerCTA
            title="Already running another business?"
            body="Create another Fockis Travel business without replacing your existing partner account."
            ctaLabel="Create another business →"
          />
        </div>
      </section>

      {import.meta.env.DEV && (
        <section className="tight">
          <div className="wrap">
            <div
              style={{
                fontSize: 12,
              }}
            >
              Verified partner categories
              currently represented:{" "}
              {loadingPartners
                ? "Loading..."
                : categoryCount}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                opacity: 0.65,
              }}
            >
              Current partner status:{" "}
              {partnerStatus ||
                "none"}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                opacity: 0.65,
                wordBreak:
                  "break-all",
              }}
            >
              Cover media:{" "}
              {coverImageValue ||
                "none"}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}