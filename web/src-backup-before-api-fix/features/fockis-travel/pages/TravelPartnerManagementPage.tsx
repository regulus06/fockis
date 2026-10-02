import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { Link } from "react-router-dom";

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Package,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { partnersApi } from "../services/partnersApi";
import { travelApi } from "../services/travelApi";

type PartnerStatus = "pending" | "verified" | "suspended" | "rejected";

interface PartnerService {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  active?: boolean;
}

interface PartnerContact {
  email?: string;
  phone?: string;
  website?: string;
  contactName?: string;
}

interface PartnerAddress {
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  department?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface PartnerBusinessHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

interface PartnerSocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
}

interface Partner {
  _id?: string;
  id?: string;
  userId?: string;

  businessName?: string;
  category?: string;
  categories?: string[];
  description?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;

  contact?: PartnerContact;
  phone?: string;
  email?: string;
  website?: string;

  addressInfo?: PartnerAddress;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  department?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;

  services?: PartnerService[];
  amenities?: string[];
  features?: string[];

  businessHours?: PartnerBusinessHours;

  images?: string[];
  logo?: string;
  coverImage?: string;

  socialLinks?: PartnerSocialLinks;

  status?: PartnerStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  verifiedAt?: string;

  acceptingBookings?: boolean;
  active?: boolean;
  featured?: boolean;
  instantBooking?: boolean;

  cancellationPolicy?: string;
  bookingPolicy?: string;

  payoutCurrency?: string;

  listingCount?: number;

  metadata?: Record<string, unknown>;
}

interface ServiceDraft {
  name: string;
  description: string;
  price: string;
  currency: string;
  active: boolean;
}

interface PartnerNavItem {
  id: string;
  label: string;
  Icon: LucideIcon;
}

interface UploadResponse {
  success?: boolean;
  filename?: string;
  originalName?: string;
  mimetype?: string;
  type?: string;
  media?: string;
  thumbnailUrl?: string | null;
}

const CATEGORIES = [
  "Hotels & Stays",
  "Restaurants",
  "Car Rental",
  "Experiences",
  "Meeting Spaces",
  "Transportation",
  "Events",
  "Vacation Rentals",
];

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const NAV_ITEMS: PartnerNavItem[] = [
  { id: "business", label: "Business information", Icon: Settings },
  { id: "contact", label: "Contact", Icon: UserCheck },
  { id: "location", label: "Location", Icon: MapPin },
  { id: "services", label: "Services & amenities", Icon: Plus },
  { id: "hours", label: "Business hours", Icon: Clock },
  { id: "media", label: "Photos & branding", Icon: ImageIcon },
  { id: "social", label: "Social media", Icon: Globe },
  { id: "bookings", label: "Booking settings", Icon: Settings },
  { id: "verification", label: "Verification", Icon: UserCheck },
];

const EMPTY_SERVICE: ServiceDraft = {
  name: "",
  description: "",
  price: "",
  currency: "USD",
  active: true,
};

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Something went wrong. Please try again.";
}

function getStatusLabel(status?: PartnerStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "suspended":
      return "Suspended";
    default:
      return "Pending review";
  }
}

function resolveMediaUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const configuredApi =
    typeof import.meta.env.VITE_API_URL === "string"
      ? import.meta.env.VITE_API_URL.trim()
      : "";

  if (configuredApi) {
    const base = configuredApi.replace(/\/+$/, "").replace(/\/api$/i, "");

    if (trimmed.startsWith("/")) {
      return `${base}${trimmed}`;
    }

    return `${base}/${trimmed}`;
  }

  return trimmed;
}

export default function TravelPartnerManagementPage() {
  const [partner, setPartner] = useState<Partner | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeSection, setActiveSection] = useState("business");

  const [newAmenity, setNewAmenity] = useState("");
  const [newImage, setNewImage] = useState("");

  const [showServiceForm, setShowServiceForm] = useState(false);

  const [serviceDraft, setServiceDraft] = useState<ServiceDraft>({
    ...EMPTY_SERVICE,
  });

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    business: true,
    contact: true,
    location: true,
    services: true,
    hours: true,
    media: true,
    social: false,
    bookings: true,
    verification: true,
  });

  const loadPartner = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await partnersApi.mine();

      setPartner((result as Partner | null) ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPartner();
  }, [loadPartner]);

  function notify(message: string) {
    setSuccess(message);

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  }

  function toggleSection(id: string) {
    setExpandedSections((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  }

  function updatePartner(changes: Partial<Partner>) {
    setPartner((previous) =>
      previous ? { ...previous, ...changes } : previous,
    );
  }

  async function uploadBusinessImage(
    file: File,
    kind: "logo" | "cover" | "gallery",
  ): Promise<string> {
    if (!file) {
      throw new Error("Please select an image.");
    }

    if (!file.type.toLowerCase().startsWith("image/")) {
      throw new Error("Please select an image file.");
    }

    const maxSize = 100 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error("The image must be smaller than 100 MB.");
    }

    const formData = new FormData();

    formData.append("file", file);

    const result = await travelApi.post<UploadResponse>(
      "/uploads",
      formData,
    );

    const response = result as UploadResponse;

    const media = response?.media?.trim();

    if (!media) {
      throw new Error(
        "The server uploaded the image but did not return an image URL.",
      );
    }

    return media;
  }

  async function handleLogoUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !partner) {
      return;
    }

    try {
      setUploadingLogo(true);
      setError("");

      const media = await uploadBusinessImage(file, "logo");

      const result = await partnersApi.updateMedia({
        logo: media,
        coverImage: partner.coverImage,
      });

      setPartner((result as Partner) ?? {
        ...partner,
        logo: media,
      });

      notify("Business logo uploaded and saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleCoverUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !partner) {
      return;
    }

    try {
      setUploadingCover(true);
      setError("");

      const media = await uploadBusinessImage(file, "cover");

      const result = await partnersApi.updateMedia({
        logo: partner.logo,
        coverImage: media,
      });

      setPartner((result as Partner) ?? {
        ...partner,
        coverImage: media,
      });

      notify("Business cover photo uploaded and saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleGalleryUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !partner) {
      return;
    }

    try {
      setUploadingGallery(true);
      setError("");

      const media = await uploadBusinessImage(file, "gallery");

      const result = await partnersApi.addImage(media);

      setPartner((result as Partner) ?? {
        ...partner,
        images: [...(partner.images ?? []), media],
      });

      notify("Business photo uploaded.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingGallery(false);
    }
  }

  async function saveBusiness() {
    if (!partner) return;

    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.updateProfile({
        businessName: partner.businessName,
        category: partner.category,
        description: partner.description,
        businessType: partner.businessType,
        registrationNumber: partner.registrationNumber,
        taxId: partner.taxId,
      });

      setPartner((result as Partner) ?? partner);

      notify("Business information saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveContact() {
    if (!partner) return;

    try {
      setSaving(true);
      setError("");

      const contact = partner.contact ?? {};

      const result = await partnersApi.updateContact({
        ...contact,
        email: partner.email ?? contact.email,
        phone: partner.phone ?? contact.phone,
        website: partner.website ?? contact.website,
      });

      updatePartner({
        contact: (result as Partner)?.contact ?? contact,
      });

      notify("Contact information saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation() {
    if (!partner) return;

    try {
      setSaving(true);
      setError("");

      const location: PartnerAddress = {
        ...(partner.addressInfo ?? {}),
        address: partner.address,
        addressLine2:
          partner.addressInfo?.addressLine2 ?? partner.addressLine2,
        city: partner.city,
        state: partner.state,
        department: partner.department,
        postalCode: partner.postalCode,
        country: partner.country,
        latitude: partner.latitude,
        longitude: partner.longitude,
      };

      const result = await partnersApi.updateLocation(location);

      updatePartner({
        addressInfo: (result as Partner)?.addressInfo ?? location,
      });

      notify("Business location saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveHours() {
    if (!partner) return;

    try {
      setSaving(true);
      setError("");

      await partnersApi.updateHours(partner.businessHours ?? {});

      notify("Business hours saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function addService() {
    if (!serviceDraft.name.trim()) {
      setError("Service name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.addService({
        name: serviceDraft.name.trim(),
        description: serviceDraft.description.trim() || undefined,
        price: serviceDraft.price
          ? Number(serviceDraft.price)
          : undefined,
        currency: serviceDraft.currency.trim() || "USD",
        active: serviceDraft.active,
      });

      setPartner((result as Partner) ?? partner);

      setServiceDraft({ ...EMPTY_SERVICE });
      setShowServiceForm(false);

      notify("Service added.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeService(index: number) {
    if (!window.confirm("Remove this service?")) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.removeService(index);

      setPartner((result as Partner) ?? partner);

      notify("Service removed.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function addAmenity() {
    const value = newAmenity.trim();

    if (!value) return;

    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.addAmenity(value);

      setPartner((result as Partner) ?? partner);

      setNewAmenity("");

      notify("Amenity added.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeAmenity(amenity: string) {
    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.removeAmenity(amenity);

      setPartner((result as Partner) ?? partner);

      notify("Amenity removed.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function addImage() {
    const value = newImage.trim();

    if (!value) return;

    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.addImage(value);

      setPartner((result as Partner) ?? partner);

      setNewImage("");

      notify("Image added.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeImage(index: number) {
    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.removeImage(index);

      setPartner((result as Partner) ?? partner);

      notify("Image removed.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveMedia() {
    if (!partner) return;

    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.updateMedia({
        logo: partner.logo,
        coverImage: partner.coverImage,
      });

      setPartner((result as Partner) ?? partner);

      notify("Branding saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveSocialLinks() {
    if (!partner) return;

    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.updateSocialLinks(
        partner.socialLinks ?? {},
      );

      setPartner((result as Partner) ?? partner);

      notify("Social links saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveBookingSettings() {
    if (!partner) return;

    try {
      setSaving(true);
      setError("");

      const result = await partnersApi.updateBookingSettings({
        acceptingBookings: partner.acceptingBookings,
        instantBooking: partner.instantBooking,
        cancellationPolicy: partner.cancellationPolicy,
        bookingPolicy: partner.bookingPolicy,
      });

      setPartner((result as Partner) ?? partner);

      notify("Booking settings saved.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!partner) return;

    try {
      setSaving(true);
      setError("");

      const next = !partner.active;

      const result = await partnersApi.setActive(next);

      setPartner(
        (result as Partner) ?? {
          ...partner,
          active: next,
          acceptingBookings: next
            ? partner.acceptingBookings
            : false,
        },
      );

      notify(next ? "Business activated." : "Business deactivated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitVerification() {
    try {
      setSubmitting(true);
      setError("");

      const result = await partnersApi.submitVerification();

      setPartner((result as Partner) ?? partner);

      notify("Business submitted for verification.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="travel-partner-management">
        <div className="wrap">
          <div className="ft-empty-state">
            <Loader2 className="spin" size={28} />

            <h4>Loading your business...</h4>
          </div>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="travel-partner-management">
        <div className="wrap">
          <div className="ft-empty-state">
            <div className="ic">
              <Building2Icon />
            </div>

            <h4>You haven't created a business profile yet</h4>

            <p>
              Become a Fockis Travel partner to create and manage your
              business.
            </p>

            <Link to="/travel/partner" className="btn btn-primary">
              Become a partner →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const logoUrl = resolveMediaUrl(partner.logo);
  const coverUrl = resolveMediaUrl(partner.coverImage);

  return (
    <div className="travel-partner-management">
      <section className="tight">
        <div className="wrap">
          <div className="partner-management-header">
            <div>
              <div className="eyebrow">Fockis Travel Partner</div>

              <h1>Manage your business</h1>

              <p>
                Update your business, services, availability, branding and
                booking settings from one place.
              </p>
            </div>

            <div className="partner-header-actions">
              <div
                className={`partner-status partner-status--${
                  partner.status ?? "pending"
                }`}
              >
                <span className="status-dot" />

                {getStatusLabel(partner.status)}
              </div>

              <Link
                to="/travel/partner/inventory"
                className="btn btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  textDecoration: "none",
                }}
              >
                <Package size={16} />
                Inventory
              </Link>

              <button
                type="button"
                className={`btn ${
                  partner.active ? "btn-outline" : "btn-primary"
                }`}
                onClick={() => void toggleActive()}
                disabled={saving}
              >
                {partner.active
                  ? "Deactivate business"
                  : "Activate business"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        {error && (
          <div className="partner-alert partner-alert--error">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="partner-alert partner-alert--success">
            <Check size={17} />
            <span>{success}</span>
          </div>
        )}
      </div>

      <section className="partner-management-layout">
        <div className="wrap">
          <div className="partner-management-grid">
            <aside className="partner-management-sidebar">
              <div className="partner-nav">
                {NAV_ITEMS.map(({ id, label, Icon }) => (
                  <button
                    type="button"
                    key={id}
                    className={activeSection === id ? "is-active" : ""}
                    onClick={() => setActiveSection(id)}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                ))}

                <Link
                  to="/travel/partner/inventory"
                  className="partner-nav-inventory"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textDecoration: "none",
                  }}
                >
                  <Package size={16} />
                  <span>Inventory</span>
                </Link>
              </div>
            </aside>

            <main className="partner-management-content">
              {activeSection === "business" && (
                <PartnerSection
                  id="business"
                  title="Business information"
                  description="The basic information travelers see about your business."
                  icon={<Settings size={18} />}
                  expanded={expandedSections.business}
                  onToggle={() => toggleSection("business")}
                >
                  <div className="partner-form-grid">
                    <Field
                      label="Business name"
                      value={partner.businessName ?? ""}
                      onChange={(value) =>
                        updatePartner({ businessName: value })
                      }
                    />

                    <div className="ft-field">
                      <label>Category</label>

                      <select
                        value={partner.category ?? ""}
                        onChange={(event) =>
                          updatePartner({
                            category: event.target.value,
                          })
                        }
                      >
                        <option value="">Select category</option>

                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Field
                      label="Business type"
                      value={partner.businessType ?? ""}
                      onChange={(value) =>
                        updatePartner({ businessType: value })
                      }
                    />

                    <Field
                      label="Registration number"
                      value={partner.registrationNumber ?? ""}
                      onChange={(value) =>
                        updatePartner({
                          registrationNumber: value,
                        })
                      }
                    />

                    <Field
                      label="Tax ID"
                      value={partner.taxId ?? ""}
                      onChange={(value) =>
                        updatePartner({ taxId: value })
                      }
                    />
                  </div>

                  <TextArea
                    label="Business description"
                    value={partner.description ?? ""}
                    onChange={(value) =>
                      updatePartner({ description: value })
                    }
                    placeholder="Tell travelers what makes your business special."
                  />

                  <SaveButton
                    saving={saving}
                    onClick={() => void saveBusiness()}
                  />
                </PartnerSection>
              )}

              {activeSection === "contact" && (
                <PartnerSection
                  id="contact"
                  title="Contact information"
                  description="How customers and Fockis can reach your business."
                  icon={<UserCheck size={18} />}
                  expanded={expandedSections.contact}
                  onToggle={() => toggleSection("contact")}
                >
                  <div className="partner-form-grid">
                    <Field
                      label="Contact name"
                      value={partner.contact?.contactName ?? ""}
                      onChange={(value) =>
                        updatePartner({
                          contact: {
                            ...partner.contact,
                            contactName: value,
                          },
                        })
                      }
                    />

                    <Field
                      label="Email"
                      type="email"
                      value={
                        partner.email ??
                        partner.contact?.email ??
                        ""
                      }
                      onChange={(value) =>
                        updatePartner({
                          email: value,
                          contact: {
                            ...partner.contact,
                            email: value,
                          },
                        })
                      }
                    />

                    <Field
                      label="Phone"
                      value={
                        partner.phone ??
                        partner.contact?.phone ??
                        ""
                      }
                      onChange={(value) =>
                        updatePartner({
                          phone: value,
                          contact: {
                            ...partner.contact,
                            phone: value,
                          },
                        })
                      }
                    />

                    <Field
                      label="Website"
                      type="url"
                      value={
                        partner.website ??
                        partner.contact?.website ??
                        ""
                      }
                      onChange={(value) =>
                        updatePartner({
                          website: value,
                          contact: {
                            ...partner.contact,
                            website: value,
                          },
                        })
                      }
                    />
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() => void saveContact()}
                  />
                </PartnerSection>
              )}

              {activeSection === "location" && (
                <PartnerSection
                  id="location"
                  title="Business location"
                  description="Tell travelers where they can find you."
                  icon={<MapPin size={18} />}
                  expanded={expandedSections.location}
                  onToggle={() => toggleSection("location")}
                >
                  <div className="partner-form-grid">
                    <Field
                      label="Address"
                      value={partner.address ?? ""}
                      onChange={(value) =>
                        updatePartner({ address: value })
                      }
                    />

                    <Field
                      label="Address line 2"
                      value={
                        partner.addressInfo?.addressLine2 ??
                        partner.addressLine2 ??
                        ""
                      }
                      onChange={(value) =>
                        updatePartner({
                          addressLine2: value,
                          addressInfo: {
                            ...partner.addressInfo,
                            addressLine2: value,
                          },
                        })
                      }
                    />

                    <Field
                      label="City"
                      value={partner.city ?? ""}
                      onChange={(value) =>
                        updatePartner({ city: value })
                      }
                    />

                    <Field
                      label="State / Province"
                      value={partner.state ?? ""}
                      onChange={(value) =>
                        updatePartner({ state: value })
                      }
                    />

                    <Field
                      label="Department"
                      value={partner.department ?? ""}
                      onChange={(value) =>
                        updatePartner({
                          department: value,
                          addressInfo: {
                            ...partner.addressInfo,
                            department: value,
                          },
                        })
                      }
                    />

                    <Field
                      label="Postal code"
                      value={partner.postalCode ?? ""}
                      onChange={(value) =>
                        updatePartner({
                          postalCode: value,
                        })
                      }
                    />

                    <Field
                      label="Country"
                      value={partner.country ?? ""}
                      onChange={(value) =>
                        updatePartner({ country: value })
                      }
                    />
                  </div>

                  <div className="partner-form-grid">
                    <Field
                      label="Latitude"
                      type="number"
                      value={
                        partner.latitude !== undefined
                          ? String(partner.latitude)
                          : ""
                      }
                      onChange={(value) =>
                        updatePartner({
                          latitude: value
                            ? Number(value)
                            : undefined,
                        })
                      }
                    />

                    <Field
                      label="Longitude"
                      type="number"
                      value={
                        partner.longitude !== undefined
                          ? String(partner.longitude)
                          : ""
                      }
                      onChange={(value) =>
                        updatePartner({
                          longitude: value
                            ? Number(value)
                            : undefined,
                        })
                      }
                    />
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() => void saveLocation()}
                  />
                </PartnerSection>
              )}

              {activeSection === "services" && (
                <PartnerSection
                  id="services"
                  title="Services & amenities"
                  description="Tell travelers exactly what your business offers."
                  icon={<Plus size={18} />}
                  expanded={expandedSections.services}
                  onToggle={() => toggleSection("services")}
                >
                  <div className="partner-subsection">
                    <div className="partner-subsection-header">
                      <div>
                        <h4>Services</h4>

                        <p>
                          Add individual services, prices and
                          availability.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          setShowServiceForm((value) => !value)
                        }
                      >
                        <Plus size={15} />
                        Add service
                      </button>
                    </div>

                    {showServiceForm && (
                      <div className="partner-inline-form">
                        <div className="partner-form-grid">
                          <Field
                            label="Service name"
                            value={serviceDraft.name}
                            onChange={(value) =>
                              setServiceDraft((previous) => ({
                                ...previous,
                                name: value,
                              }))
                            }
                          />

                          <Field
                            label="Price"
                            type="number"
                            value={serviceDraft.price}
                            onChange={(value) =>
                              setServiceDraft((previous) => ({
                                ...previous,
                                price: value,
                              }))
                            }
                          />

                          <Field
                            label="Currency"
                            value={serviceDraft.currency}
                            onChange={(value) =>
                              setServiceDraft((previous) => ({
                                ...previous,
                                currency: value,
                              }))
                            }
                          />
                        </div>

                        <TextArea
                          label="Description"
                          value={serviceDraft.description}
                          onChange={(value) =>
                            setServiceDraft((previous) => ({
                              ...previous,
                              description: value,
                            }))
                          }
                        />

                        <label className="partner-checkbox">
                          <input
                            type="checkbox"
                            checked={serviceDraft.active}
                            onChange={(event) =>
                              setServiceDraft((previous) => ({
                                ...previous,
                                active:
                                  event.target.checked,
                              }))
                            }
                          />
                          Service is active
                        </label>

                        <div className="partner-inline-actions">
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() =>
                              setShowServiceForm(false)
                            }
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => void addService()}
                            disabled={saving}
                          >
                            {saving
                              ? "Adding..."
                              : "Add service"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="partner-service-list">
                      {(partner.services ?? []).length === 0 ? (
                        <EmptyInline text="No services added yet." />
                      ) : (
                        (partner.services ?? []).map(
                          (service, index) => (
                            <div
                              className="partner-service-row"
                              key={`${service.name}-${index}`}
                            >
                              <div>
                                <strong>{service.name}</strong>

                                {service.description && (
                                  <p>
                                    {service.description}
                                  </p>
                                )}

                                {service.price !== undefined && (
                                  <span>
                                    {service.currency}{" "}
                                    {service.price}
                                  </span>
                                )}
                              </div>

                              <div className="partner-row-actions">
                                <span
                                  className={
                                    service.active
                                      ? "badge badge--success"
                                      : "badge"
                                  }
                                >
                                  {service.active
                                    ? "Active"
                                    : "Inactive"}
                                </span>

                                <button
                                  type="button"
                                  className="icon-btn"
                                  aria-label="Remove service"
                                  onClick={() =>
                                    void removeService(index)
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          ),
                        )
                      )}
                    </div>
                  </div>

                  <div className="partner-subsection">
                    <div className="partner-subsection-header">
                      <div>
                        <h4>Amenities</h4>

                        <p>
                          Add facilities and features travelers
                          care about.
                        </p>
                      </div>
                    </div>

                    <div className="partner-tag-list">
                      {(partner.amenities ?? []).map(
                        (amenity) => (
                          <span
                            className="partner-tag"
                            key={amenity}
                          >
                            {amenity}

                            <button
                              type="button"
                              onClick={() =>
                                void removeAmenity(amenity)
                              }
                              aria-label={`Remove ${amenity}`}
                            >
                              ×
                            </button>
                          </span>
                        ),
                      )}
                    </div>

                    <div className="partner-add-row">
                      <input
                        value={newAmenity}
                        onChange={(event) =>
                          setNewAmenity(event.target.value)
                        }
                        placeholder="e.g. Free Wi-Fi"
                      />

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => void addAmenity()}
                        disabled={saving}
                      >
                        <Plus size={15} />
                        Add
                      </button>
                    </div>
                  </div>
                </PartnerSection>
              )}

              {activeSection === "hours" && (
                <PartnerSection
                  id="hours"
                  title="Business hours"
                  description="Set the hours travelers should expect your business to operate."
                  icon={<Clock size={18} />}
                  expanded={expandedSections.hours}
                  onToggle={() => toggleSection("hours")}
                >
                  <div className="partner-hours-list">
                    {DAYS.map((day) => (
                      <div
                        className="partner-hour-row"
                        key={day}
                      >
                        <strong>
                          {day.charAt(0).toUpperCase() +
                            day.slice(1)}
                        </strong>

                        <input
                          value={
                            partner.businessHours?.[day] ?? ""
                          }
                          onChange={(event) =>
                            updatePartner({
                              businessHours: {
                                ...partner.businessHours,
                                [day]: event.target.value,
                              },
                            })
                          }
                          placeholder="9:00 AM – 5:00 PM"
                        />
                      </div>
                    ))}
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() => void saveHours()}
                  />
                </PartnerSection>
              )}

              {activeSection === "media" && (
                <PartnerSection
                  id="media"
                  title="Photos & branding"
                  description="Upload your business logo, cover photo and gallery photos."
                  icon={<ImageIcon size={18} />}
                  expanded={expandedSections.media}
                  onToggle={() => toggleSection("media")}
                >
                  <div className="partner-media-upload-grid">
                    <div className="partner-media-upload-card">
                      <div className="partner-media-upload-heading">
                        <div>
                          <h4>Business logo</h4>
                          <p>
                            Upload the logo customers should see on
                            your business profile.
                          </p>
                        </div>
                      </div>

                      {logoUrl ? (
                        <div className="partner-media-preview partner-media-preview--logo">
                          <div className="partner-media-preview-label">
                            Current logo
                          </div>

                          <img
                            src={logoUrl}
                            alt="Business logo preview"
                          />
                        </div>
                      ) : (
                        <div className="partner-upload-placeholder">
                          <ImageIcon size={30} />
                          <span>No business logo uploaded</span>
                        </div>
                      )}

                      <label className="partner-file-upload">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                          onChange={(event) =>
                            void handleLogoUpload(event)
                          }
                          disabled={uploadingLogo}
                        />

                        {uploadingLogo ? (
                          <>
                            <Loader2
                              size={16}
                              className="spin"
                            />
                            Uploading logo...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            Upload logo
                          </>
                        )}
                      </label>

                      <Field
                        label="Logo URL"
                        type="url"
                        value={partner.logo ?? ""}
                        onChange={(value) =>
                          updatePartner({ logo: value })
                        }
                        placeholder="https://..."
                      />
                    </div>

                    <div className="partner-media-upload-card">
                      <div className="partner-media-upload-heading">
                        <div>
                          <h4>Business cover photo</h4>
                          <p>
                            Upload the main photo shown at the top
                            of your public business profile.
                          </p>
                        </div>
                      </div>

                      {coverUrl ? (
                        <div className="partner-media-preview">
                          <div className="partner-media-preview-label">
                            Current cover photo
                          </div>

                          <img
                            src={coverUrl}
                            alt="Business cover preview"
                          />
                        </div>
                      ) : (
                        <div className="partner-upload-placeholder partner-upload-placeholder--cover">
                          <ImageIcon size={30} />
                          <span>
                            No business cover photo uploaded
                          </span>
                        </div>
                      )}

                      <label className="partner-file-upload">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                          onChange={(event) =>
                            void handleCoverUpload(event)
                          }
                          disabled={uploadingCover}
                        />

                        {uploadingCover ? (
                          <>
                            <Loader2
                              size={16}
                              className="spin"
                            />
                            Uploading cover...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            Upload cover photo
                          </>
                        )}
                      </label>

                      <Field
                        label="Cover image URL"
                        type="url"
                        value={partner.coverImage ?? ""}
                        onChange={(value) =>
                          updatePartner({
                            coverImage: value,
                          })
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() => void saveMedia()}
                  />

                  <div className="partner-subsection">
                    <div className="partner-subsection-header">
                      <div>
                        <h4>Business gallery</h4>

                        <p>
                          Upload photos of your hotel, restaurant,
                          office, vehicles, rooms, services or other
                          business spaces.
                        </p>
                      </div>
                    </div>

                    <label className="partner-gallery-upload">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                        onChange={(event) =>
                          void handleGalleryUpload(event)
                        }
                        disabled={uploadingGallery}
                      />

                      {uploadingGallery ? (
                        <>
                          <Loader2
                            size={18}
                            className="spin"
                          />
                          Uploading business photo...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          Upload business photo
                        </>
                      )}

                      <small>
                        JPG, PNG, WEBP, GIF or AVIF. Maximum 100 MB.
                      </small>
                    </label>

                    <div className="partner-add-row">
                      <input
                        value={newImage}
                        onChange={(event) =>
                          setNewImage(event.target.value)
                        }
                        placeholder="Or paste a hosted image URL: https://..."
                      />

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => void addImage()}
                        disabled={saving}
                      >
                        <Plus size={15} />
                        Add URL
                      </button>
                    </div>

                    <div className="partner-image-grid">
                      {(partner.images ?? []).map(
                        (image, index) => {
                          const imageUrl =
                            resolveMediaUrl(image);

                          return (
                            <div
                              className="partner-image-card"
                              key={`${image}-${index}`}
                            >
                              <img
                                src={imageUrl}
                                alt={`Business image ${
                                  index + 1
                                }`}
                              />

                              <button
                                type="button"
                                className="partner-image-remove"
                                onClick={() =>
                                  void removeImage(index)
                                }
                                aria-label="Remove image"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          );
                        },
                      )}
                    </div>

                    {(partner.images ?? []).length === 0 && (
                      <EmptyInline text="No business gallery photos added yet." />
                    )}
                  </div>
                </PartnerSection>
              )}

              {activeSection === "social" && (
                <PartnerSection
                  id="social"
                  title="Social media"
                  description="Connect your public business profiles."
                  icon={<Globe size={18} />}
                  expanded={expandedSections.social}
                  onToggle={() => toggleSection("social")}
                >
                  <div className="partner-form-grid">
                    {[
                      "facebook",
                      "instagram",
                      "tiktok",
                      "youtube",
                      "linkedin",
                      "twitter",
                    ].map((network) => (
                      <Field
                        key={network}
                        label={
                          network.charAt(0).toUpperCase() +
                          network.slice(1)
                        }
                        type="url"
                        value={
                          (
                            partner.socialLinks as
                              | Record<string, string>
                              | undefined
                          )?.[network] ?? ""
                        }
                        onChange={(value) =>
                          updatePartner({
                            socialLinks: {
                              ...partner.socialLinks,
                              [network]: value,
                            },
                          })
                        }
                      />
                    ))}
                  </div>

                  <SaveButton
                    saving={saving}
                    onClick={() => void saveSocialLinks()}
                  />
                </PartnerSection>
              )}

              {activeSection === "bookings" && (
                <PartnerSection
                  id="bookings"
                  title="Booking settings"
                  description="Control how travelers can book your business."
                  icon={<Settings size={18} />}
                  expanded={expandedSections.bookings}
                  onToggle={() => toggleSection("bookings")}
                >
                  <div className="partner-setting-list">
                    <ToggleSetting
                      title="Accept bookings"
                      description="Allow travelers to make new bookings."
                      checked={Boolean(
                        partner.acceptingBookings,
                      )}
                      onChange={(checked) =>
                        updatePartner({
                          acceptingBookings: checked,
                        })
                      }
                    />

                    <ToggleSetting
                      title="Instant booking"
                      description="Allow eligible bookings to be confirmed immediately."
                      checked={Boolean(
                        partner.instantBooking,
                      )}
                      onChange={(checked) =>
                        updatePartner({
                          instantBooking: checked,
                        })
                      }
                    />
                  </div>

                  <TextArea
                    label="Cancellation policy"
                    value={partner.cancellationPolicy ?? ""}
                    onChange={(value) =>
                      updatePartner({
                        cancellationPolicy: value,
                      })
                    }
                  />

                  <TextArea
                    label="Booking policy"
                    value={partner.bookingPolicy ?? ""}
                    onChange={(value) =>
                      updatePartner({
                        bookingPolicy: value,
                      })
                    }
                  />

                  <SaveButton
                    saving={saving}
                    onClick={() =>
                      void saveBookingSettings()
                    }
                  />
                </PartnerSection>
              )}

              {activeSection === "verification" && (
                <PartnerSection
                  id="verification"
                  title="Verification"
                  description="Keep your business information complete so Fockis can review your application."
                  icon={<UserCheck size={18} />}
                  expanded={expandedSections.verification}
                  onToggle={() =>
                    toggleSection("verification")
                  }
                >
                  <div
                    className={`verification-card verification-card--${
                      partner.status ?? "pending"
                    }`}
                  >
                    <div className="verification-card-icon">
                      {partner.status === "verified" ? (
                        <Check size={22} />
                      ) : (
                        <Clock size={22} />
                      )}
                    </div>

                    <div>
                      <h4>
                        {getStatusLabel(partner.status)}
                      </h4>

                      <p>
                        {partner.status === "verified" &&
                        partner.verifiedAt
                          ? `Verified on ${new Date(
                              partner.verifiedAt,
                            ).toLocaleDateString()}`
                          : partner.status === "rejected"
                            ? partner.rejectionReason ??
                              "Your application needs changes before it can be approved."
                            : partner.status ===
                                "suspended"
                              ? partner.suspensionReason ??
                                "Your business is currently suspended."
                              : "Your business is waiting for verification."}
                      </p>
                    </div>
                  </div>

                  {partner.status !== "verified" &&
                    partner.status !== "suspended" && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() =>
                          void submitVerification()
                        }
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2
                              size={15}
                              className="spin"
                            />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <UserCheck size={15} />
                            Submit for verification
                          </>
                        )}
                      </button>
                    )}
                </PartnerSection>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}

function PartnerSection({
  id,
  title,
  description,
  icon,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className="partner-management-section"
      id={`partner-section-${id}`}
    >
      <button
        type="button"
        className="partner-section-header"
        onClick={onToggle}
      >
        <div className="partner-section-title">
          <span className="partner-section-icon">
            {icon}
          </span>

          <span>
            <strong>{title}</strong>

            <small>{description}</small>
          </span>
        </div>

        {expanded ? (
          <ChevronUp size={18} />
        ) : (
          <ChevronDown size={18} />
        )}
      </button>

      {expanded && (
        <div className="partner-section-body">
          {children}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="ft-field">
      <label>{label}</label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="ft-field">
      <label>{label}</label>

      <textarea
        value={value}
        placeholder={placeholder}
        rows={5}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function SaveButton({
  saving,
  onClick,
}: {
  saving: boolean;
  onClick: () => void;
}) {
  return (
    <div className="partner-save-row">
      <button
        type="button"
        className="btn btn-primary"
        onClick={onClick}
        disabled={saving}
      >
        {saving ? (
          <>
            <Loader2 size={15} className="spin" />
            Saving...
          </>
        ) : (
          <>
            <Save size={15} />
            Save changes
          </>
        )}
      </button>
    </div>
  );
}

function ToggleSetting({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="partner-toggle-setting">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />
    </label>
  );
}

function EmptyInline({ text }: { text: string }) {
  return (
    <div className="partner-empty-inline">
      {text}
    </div>
  );
}

function Building2Icon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21h18" />
      <path d="M6 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17" />
      <path d="M15 8h3a1 1 0 0 1 1 1v12" />
      <path d="M9 7h2" />
      <path d="M9 11h2" />
      <path d="M9 15h2" />
    </svg>
  );
}