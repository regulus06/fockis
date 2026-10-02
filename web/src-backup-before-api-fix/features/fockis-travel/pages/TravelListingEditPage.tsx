import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import { travelApi } from "../services/travelApi";
import "../styles/TravelListingEditPage.scss";

/* ============================================================================
   CONSTANTS
============================================================================ */

const CATEGORIES = [
  { icon: "🏨", label: "Hotels & Stays" },
  { icon: "🍽️", label: "Restaurants" },
  { icon: "🚗", label: "Car Rental" },
  { icon: "🏝️", label: "Experiences" },
  { icon: "💼", label: "Meeting Spaces" },
  { icon: "🚐", label: "Transportation" },
  { icon: "🎉", label: "Events" },
  { icon: "🏠", label: "Vacation Rentals" },
];

const COMMON_AMENITIES = [
  "Wi-Fi",
  "Parking",
  "Air conditioning",
  "Breakfast",
  "Pool",
  "Restaurant",
  "Pet friendly",
  "Wheelchair accessible",
];

/* ============================================================================
   TYPES
============================================================================ */

interface TravelInventory {
  total: number;
  available: number;
  reserved: number;
}

interface Listing {
  _id?: string;
  id?: string;

  title?: string;
  name?: string;

  category?: string;
  description?: string;

  price?: number;
  priceUnit?: string;

  address?: string;
  city?: string;
  country?: string;

  phone?: string;
  website?: string;

  capacity?: number;
  bedrooms?: number;
  bathrooms?: number;

  amenities?: string[];
  images?: string[];

  status?: string;

  /*
   * Supports either:
   *
   * listing.inventory
   *
   * or:
   *
   * listing.metadata.inventory
   */
  inventory?: Partial<TravelInventory>;

  metadata?: {
    inventory?: Partial<TravelInventory>;
    [key: string]: unknown;
  };

  createdAt?: string;
  updatedAt?: string;
}

interface ListingForm {
  title: string;
  category: string;
  description: string;
  price: string;
  priceUnit: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  website: string;
  capacity: string;
  bedrooms: string;
  bathrooms: string;
  amenities: string[];
  images: string[];
}

interface InventoryState {
  total: number;
  reserved: number;
}

/* ============================================================================
   HELPERS
============================================================================ */

function normalizeInteger(
  value: unknown,
  fallback = 0,
): number {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.floor(numeric));
}

function normalizeInventory(
  inventory?: Partial<TravelInventory>,
): TravelInventory {
  const total = normalizeInteger(
    inventory?.total,
    0,
  );

  const reserved = Math.min(
    total,
    normalizeInteger(
      inventory?.reserved,
      0,
    ),
  );

  return {
    total,
    reserved,
    available: Math.max(
      0,
      total - reserved,
    ),
  };
}

function getListingInventory(
  listing: Listing,
): TravelInventory {
  /*
   * Backend can eventually return:
   *
   * listing.metadata.inventory
   *
   * or:
   *
   * listing.inventory
   *
   * We support both.
   */

  const metadataInventory =
    listing.metadata?.inventory;

  if (metadataInventory) {
    return normalizeInventory(
      metadataInventory,
    );
  }

  return normalizeInventory(
    listing.inventory,
  );
}

/* ============================================================================
   PAGE
============================================================================ */

export default function TravelListingEditPage() {
  const navigate = useNavigate();

  const { id } = useParams<{
    id: string;
  }>();

  /* ==========================================================================
     LISTING STATE
  ========================================================================== */

  const [form, setForm] =
    useState<ListingForm | null>(null);

  const [listing, setListing] =
    useState<Listing | null>(null);

  /* ==========================================================================
     INVENTORY STATE
  ========================================================================== */

  const [
    inventory,
    setInventory,
  ] = useState<InventoryState>({
    total: 0,
    reserved: 0,
  });

  const [
    initialInventory,
    setInitialInventory,
  ] = useState<InventoryState>({
    total: 0,
    reserved: 0,
  });

  /* ==========================================================================
     IMAGE STATE
  ========================================================================== */

  const [imageUrl, setImageUrl] =
    useState("");

  /* ==========================================================================
     PAGE STATE
  ========================================================================== */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [
    inventoryMessage,
    setInventoryMessage,
  ] = useState("");

  const [
    inventoryError,
    setInventoryError,
  ] = useState("");

  /* ==========================================================================
     LOAD LISTING
  ========================================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadListing() {
      if (!id) {
        setError(
          "No listing ID was provided.",
        );

        setLoading(false);

        return;
      }

      setLoading(true);
      setError("");

      try {
        const result =
          await travelApi.get<Listing>(
            `/travel/listings/${encodeURIComponent(
              id,
            )}`,
          );

        if (!mounted) {
          return;
        }

        setListing(result);

        /* --------------------------------------------------------------
           FORM
        -------------------------------------------------------------- */

        setForm({
          title:
            result.title ??
            result.name ??
            "",

          category:
            result.category ??
            "Hotels & Stays",

          description:
            result.description ??
            "",

          price:
            result.price !==
              undefined &&
            result.price !== null
              ? String(result.price)
              : "",

          priceUnit:
            result.priceUnit ??
            "night",

          address:
            result.address ??
            "",

          city:
            result.city ??
            "",

          country:
            result.country ??
            "",

          phone:
            result.phone ??
            "",

          website:
            result.website ??
            "",

          capacity:
            result.capacity !==
              undefined &&
            result.capacity !== null
              ? String(result.capacity)
              : "",

          bedrooms:
            result.bedrooms !==
              undefined &&
            result.bedrooms !== null
              ? String(result.bedrooms)
              : "",

          bathrooms:
            result.bathrooms !==
              undefined &&
            result.bathrooms !== null
              ? String(result.bathrooms)
              : "",

          amenities:
            Array.isArray(
              result.amenities,
            )
              ? result.amenities
              : [],

          images:
            Array.isArray(
              result.images,
            )
              ? result.images
              : [],
        });

        /* --------------------------------------------------------------
           INVENTORY
        -------------------------------------------------------------- */

        const loadedInventory =
          getListingInventory(result);

        const nextInventory: InventoryState =
          {
            total:
              loadedInventory.total,

            reserved:
              loadedInventory.reserved,
          };

        setInventory(nextInventory);

        setInitialInventory(
          nextInventory,
        );
      } catch (err) {
        console.error(
          "Unable to load travel listing:",
          err,
        );

        if (!mounted) {
          return;
        }

        if (
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof err.message ===
            "string"
        ) {
          setError(err.message);
        } else {
          setError(
            "Unable to load this listing.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadListing();

    return () => {
      mounted = false;
    };
  }, [id]);

  /* ==========================================================================
     FORM HELPERS
  ========================================================================== */

  function updateField<
    K extends keyof ListingForm,
  >(
    field: K,
    value: ListingForm[K],
  ) {
    setForm((previous) =>
      previous
        ? {
            ...previous,
            [field]: value,
          }
        : previous,
    );
  }

  function toggleAmenity(
    amenity: string,
  ) {
    setForm((previous) => {
      if (!previous) {
        return previous;
      }

      return {
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
      };
    });
  }

  /* ==========================================================================
     IMAGE HELPERS
  ========================================================================== */

  function addImage() {
    const url = imageUrl.trim();

    if (!url || !form) {
      return;
    }

    if (form.images.includes(url)) {
      setImageUrl("");

      return;
    }

    setForm({
      ...form,
      images: [
        ...form.images,
        url,
      ],
    });

    setImageUrl("");
  }

  function removeImage(
    url: string,
  ) {
    if (!form) {
      return;
    }

    setForm({
      ...form,

      images: form.images.filter(
        (image) =>
          image !== url,
      ),
    });
  }

  /* ==========================================================================
     INVENTORY
  ========================================================================== */

  const available = Math.max(
    0,
    inventory.total -
      inventory.reserved,
  );

  const inventoryPercentage =
    inventory.total > 0
      ? Math.min(
          100,
          Math.round(
            (available /
              inventory.total) *
              100,
          ),
        )
      : 0;

  const isFullyBooked =
    inventory.total > 0 &&
    available === 0;

  const hasInventory =
    available > 0;

  const inventoryChanged =
    inventory.total !==
      initialInventory.total ||
    inventory.reserved !==
      initialInventory.reserved;

  const listingChanged =
    inventoryChanged;

  function increaseInventory() {
    setInventory((current) => ({
      ...current,

      total:
        current.total + 1,
    }));

    setInventoryError("");
    setInventoryMessage("");
  }

  function decreaseInventory() {
    if (
      inventory.total <=
      inventory.reserved
    ) {
      setInventoryError(
        "Inventory cannot be reduced below the number of units already reserved.",
      );

      return;
    }

    setInventory((current) => ({
      ...current,

      total: Math.max(
        current.reserved,
        current.total - 1,
      ),
    }));

    setInventoryError("");
    setInventoryMessage("");
  }

  function cancelInventoryChanges() {
    if (saving) {
      return;
    }

    setInventory(
      initialInventory,
    );

    setInventoryError("");
    setInventoryMessage("");
  }

  /* ==========================================================================
     SAVE
  ========================================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!id || !form || saving) {
      return;
    }

    if (
      inventory.total <
      inventory.reserved
    ) {
      setError(
        "Total inventory cannot be lower than reserved inventory.",
      );

      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);
    setInventoryError("");
    setInventoryMessage("");

    try {
      const nextInventory: TravelInventory =
        {
          total:
            inventory.total,

          reserved:
            inventory.reserved,

          available:
            Math.max(
              0,
              inventory.total -
                inventory.reserved,
            ),
        };

      /* --------------------------------------------------------------------
         PAYLOAD

         Inventory is included in BOTH places below for compatibility.

         If your backend expects only metadata.inventory, remove the
         top-level inventory field later.

         If your backend expects only inventory, remove metadata.inventory.
      -------------------------------------------------------------------- */

      const payload = {
        title: form.title.trim(),

        name: form.title.trim(),

        category:
          form.category,

        description:
          form.description.trim() ||
          undefined,

        price: form.price
          ? Number(form.price)
          : undefined,

        priceUnit:
          form.priceUnit,

        address:
          form.address.trim() ||
          undefined,

        city:
          form.city.trim() ||
          undefined,

        country:
          form.country.trim() ||
          undefined,

        phone:
          form.phone.trim() ||
          undefined,

        website:
          form.website.trim() ||
          undefined,

        capacity:
          form.capacity
            ? Number(
                form.capacity,
              )
            : undefined,

        bedrooms:
          form.bedrooms
            ? Number(
                form.bedrooms,
              )
            : undefined,

        bathrooms:
          form.bathrooms
            ? Number(
                form.bathrooms,
              )
            : undefined,

        amenities:
          form.amenities,

        images:
          form.images,

        /* ================================================================
           INVENTORY
        ================================================================ */

        inventory:
          nextInventory,

        metadata: {
          ...(listing?.metadata ??
            {}),

          inventory:
            nextInventory,
        },
      };

      const updated =
        await travelApi.patch<Listing>(
          `/travel/listings/${encodeURIComponent(
            id,
          )}`,
          payload,
        );

      setListing(updated);

      /*
       * Use the backend response when available.
       * If the backend doesn't return inventory yet,
       * keep the local inventory.
       */

      const returnedInventory =
        getListingInventory(
          updated,
        );

      const hasReturnedInventory =
        Boolean(
          updated.inventory ||
            updated.metadata
              ?.inventory,
        );

      if (
        hasReturnedInventory
      ) {
        const next: InventoryState =
          {
            total:
              returnedInventory.total,

            reserved:
              returnedInventory.reserved,
          };

        setInventory(next);

        setInitialInventory(
          next,
        );
      } else {
        setInitialInventory(
          nextInventory,
        );

        setInventory(
          nextInventory,
        );
      }

      setInventoryMessage(
        "Inventory saved successfully.",
      );

      setSuccess(true);

      window.setTimeout(() => {
        navigate(
          "/travel/management",
        );
      }, 900);
    } catch (err) {
      console.error(
        "Unable to update travel listing:",
        err,
      );

      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof err.message ===
          "string"
      ) {
        setError(err.message);
      } else {
        setError(
          "Unable to update this listing. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (loading) {
    return (
      <div className="travel-management-page">
        <section className="tight">
          <div className="wrap">
            <div
              style={{
                minHeight: 400,
                display: "grid",
                placeItems:
                  "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 10,
                }}
              >
                <Loader2
                  size={22}
                  className="spin"
                />

                Loading listing...
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ==========================================================================
     NOT FOUND
  ========================================================================== */

  if (!form) {
    return (
      <div className="travel-management-page">
        <section className="tight">
          <div className="wrap">
            <Link
              to="/travel/management"
              className="btn"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 7,
              }}
            >
              <ArrowLeft size={15} />

              Back to Management
            </Link>

            <div
              style={{
                marginTop: 30,
                padding: 20,
                borderRadius: 12,
                background:
                  "#fff4f4",
                border:
                  "1px solid #efb8b8",
                color: "#9b2226",
              }}
            >
              {error ||
                "This listing could not be found."}
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ==========================================================================
     CATEGORY
  ========================================================================== */

  const selectedCategory =
    CATEGORIES.find(
      (category) =>
        category.label ===
        form.category,
    );

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="travel-management-page">
      <section className="tight">
        <div className="wrap">

          {/* ================================================================
              HEADER
          ================================================================ */}

          <div
            style={{
              marginBottom: 30,
            }}
          >
            <Link
              to="/travel/management"
              className="btn"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 7,
                marginBottom: 18,
              }}
            >
              <ArrowLeft size={15} />

              Back to Management
            </Link>

            <div className="eyebrow">
              Fockis Travel Partner
            </div>

            <h1>
              Edit travel listing
            </h1>

            <p
              style={{
                maxWidth: 720,
                color:
                  "var(--slate, #5B6B76)",
                marginTop: 8,
              }}
            >
              Update your listing
              information, pricing,
              location, amenities,
              inventory and photos.
            </p>
          </div>

          {/* ================================================================
              ERROR
          ================================================================ */}

          {error && (
            <div
              role="alert"
              style={{
                maxWidth: 850,
                marginBottom: 20,
                padding: 14,
                borderRadius: 10,
                background:
                  "#fff4f4",
                border:
                  "1px solid #efb8b8",
                color: "#9b2226",
                display: "flex",
                alignItems:
                  "flex-start",
                gap: 9,
              }}
            >
              <AlertCircle
                size={17}
              />

              <span>{error}</span>
            </div>
          )}

          {/* ================================================================
              SUCCESS
          ================================================================ */}

          {success && (
            <div
              style={{
                maxWidth: 850,
                marginBottom: 20,
                padding: 15,
                borderRadius: 10,
                background:
                  "#edf9f0",
                border:
                  "1px solid #b8dfc1",
                color: "#236b35",
                display: "flex",
                alignItems:
                  "center",
                gap: 10,
              }}
            >
              <Check size={18} />

              Listing updated
              successfully. Returning
              to your management
              dashboard...
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0, 1fr) 300px",
              gap: 24,
              alignItems:
                "start",
            }}
          >
            {/* ==============================================================
                MAIN COLUMN
            ============================================================== */}

            <div
              style={{
                display: "grid",
                gap: 20,
              }}
            >

              {/* ============================================================
                  BASIC
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
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Basic information
                </h2>

                <div className="ft-field">
                  <label htmlFor="edit-title">
                    Listing name *
                  </label>

                  <input
                    id="edit-title"
                    required
                    value={
                      form.title
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "title",
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="ft-field">
                  <label htmlFor="edit-category">
                    Travel category *
                  </label>

                  <select
                    id="edit-category"
                    required
                    value={
                      form.category
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "category",
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    {CATEGORIES.map(
                      (
                        category,
                      ) => (
                        <option
                          key={
                            category.label
                          }
                          value={
                            category.label
                          }
                        >
                          {
                            category.icon
                          }{" "}
                          {
                            category.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="ft-field">
                  <label htmlFor="edit-description">
                    Description *
                  </label>

                  <textarea
                    id="edit-description"
                    required
                    rows={7}
                    value={
                      form.description
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "description",
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>
              </div>

              {/* ============================================================
                  PRICING
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
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Pricing
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0, 1fr) minmax(180px, 0.6fr)",
                    gap: 12,
                  }}
                >
                  <div className="ft-field">
                    <label htmlFor="edit-price">
                      Starting price
                    </label>

                    <input
                      id="edit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        form.price
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "price",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="edit-price-unit">
                      Price unit
                    </label>

                    <select
                      id="edit-price-unit"
                      value={
                        form.priceUnit
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "priceUnit",
                          event
                            .target
                            .value,
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
              </div>

              {/* ============================================================
                  LOCATION
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
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  <MapPin
                    size={18}
                    style={{
                      verticalAlign:
                        "middle",
                      marginRight: 7,
                    }}
                  />

                  Location
                </h2>

                <div className="ft-field">
                  <label htmlFor="edit-address">
                    Address
                  </label>

                  <input
                    id="edit-address"
                    value={
                      form.address
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "address",
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div className="ft-field">
                    <label htmlFor="edit-city">
                      City
                    </label>

                    <input
                      id="edit-city"
                      value={
                        form.city
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "city",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="edit-country">
                      Country
                    </label>

                    <input
                      id="edit-country"
                      value={
                        form.country
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "country",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* ============================================================
                  LISTING DETAILS
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
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Listing details
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div className="ft-field">
                    <label htmlFor="edit-capacity">
                      Capacity
                    </label>

                    <input
                      id="edit-capacity"
                      type="number"
                      min="0"
                      value={
                        form.capacity
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "capacity",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="edit-bedrooms">
                      Bedrooms
                    </label>

                    <input
                      id="edit-bedrooms"
                      type="number"
                      min="0"
                      value={
                        form.bedrooms
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "bedrooms",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>

                  <div className="ft-field">
                    <label htmlFor="edit-bathrooms">
                      Bathrooms
                    </label>

                    <input
                      id="edit-bathrooms"
                      type="number"
                      min="0"
                      value={
                        form.bathrooms
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "bathrooms",
                          event
                            .target
                            .value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              {/* ============================================================
                  INVENTORY
              ============================================================ */}

              <section
                aria-label="Inventory management"
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow:
                    "0 8px 30px rgba(15,27,43,0.05)",
                }}
              >
                {/* ----------------------------------------------------------
                    INVENTORY HEADER
                ---------------------------------------------------------- */}

                <div
                  style={{
                    padding:
                      "20px 22px",
                    borderBottom:
                      "1px solid rgba(15,27,43,0.08)",
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: 16,
                    flexWrap:
                      "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems:
                        "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 11,
                        display:
                          "grid",
                        placeItems:
                          "center",
                        background:
                          "rgba(232,163,61,0.12)",
                        color:
                          "var(--amber, #E8A33D)",
                        flexShrink: 0,
                      }}
                    >
                      <Package
                        size={21}
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          textTransform:
                            "uppercase",
                          letterSpacing:
                            "0.08em",
                          fontWeight: 700,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        Inventory
                      </div>

                      <h3
                        style={{
                          margin:
                            "4px 0 0",
                          fontSize: 18,
                        }}
                      >
                        Manage availability
                      </h3>

                      <p
                        style={{
                          margin:
                            "5px 0 0",
                          fontSize: 12,
                          color:
                            "var(--slate, #5B6B76)",
                          lineHeight:
                            1.45,
                        }}
                      >
                        Control how many
                        units of this
                        listing can be
                        booked.
                      </p>
                    </div>
                  </div>

                  {isFullyBooked ? (
                    <span
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        gap: 6,
                        padding:
                          "6px 10px",
                        borderRadius:
                          999,
                        background:
                          "#fff0f0",
                        color:
                          "#b42318",
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      <AlertCircle
                        size={14}
                      />

                      Fully booked
                    </span>
                  ) : (
                    <span
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        gap: 6,
                        padding:
                          "6px 10px",
                        borderRadius:
                          999,
                        background:
                          "#edf9f0",
                        color:
                          "#23743b",
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      <CheckCircle2
                        size={14}
                      />

                      Available
                    </span>
                  )}
                </div>

                {/* ----------------------------------------------------------
                    INVENTORY BODY
                ---------------------------------------------------------- */}

                <div
                  style={{
                    padding: 22,
                  }}
                >
                  {/* --------------------------------------------------------
                      INVENTORY NUMBERS
                  -------------------------------------------------------- */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    {/* TOTAL */}

                    <div
                      style={{
                        padding: 15,
                        borderRadius:
                          12,
                        background:
                          "rgba(15,27,43,0.035)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color:
                            "var(--slate, #5B6B76)",
                          marginBottom:
                            5,
                        }}
                      >
                        Total
                      </div>

                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          lineHeight:
                            1,
                        }}
                      >
                        {
                          inventory.total
                        }
                      </div>
                    </div>

                    {/* AVAILABLE */}

                    <div
                      style={{
                        padding: 15,
                        borderRadius:
                          12,
                        background:
                          hasInventory
                            ? "rgba(35,116,59,0.07)"
                            : "rgba(180,35,24,0.07)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color:
                            "var(--slate, #5B6B76)",
                          marginBottom:
                            5,
                        }}
                      >
                        Available
                      </div>

                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          lineHeight:
                            1,
                          color:
                            hasInventory
                              ? "#23743b"
                              : "#b42318",
                        }}
                      >
                        {
                          available
                        }
                      </div>
                    </div>

                    {/* RESERVED */}

                    <div
                      style={{
                        padding: 15,
                        borderRadius:
                          12,
                        background:
                          "rgba(232,163,61,0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color:
                            "var(--slate, #5B6B76)",
                          marginBottom:
                            5,
                        }}
                      >
                        Reserved
                      </div>

                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          lineHeight:
                            1,
                        }}
                      >
                        {
                          inventory.reserved
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            5,
                          fontSize: 10,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        Managed by
                        bookings
                      </div>
                    </div>
                  </div>

                  {/* --------------------------------------------------------
                      AVAILABILITY BAR
                  -------------------------------------------------------- */}

                  <div
                    style={{
                      marginTop: 20,
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        marginBottom:
                          7,
                        fontSize: 12,
                        color:
                          "var(--slate, #5B6B76)",
                      }}
                    >
                      <span>
                        Inventory
                        remaining
                      </span>

                      <strong>
                        {
                          inventoryPercentage
                        }
                        %
                      </strong>
                    </div>

                    <div
                      style={{
                        width:
                          "100%",
                        height: 8,
                        borderRadius:
                          999,
                        overflow:
                          "hidden",
                        background:
                          "rgba(15,27,43,0.08)",
                      }}
                    >
                      <div
                        style={{
                          width:
                            `${inventoryPercentage}%`,
                          height:
                            "100%",
                          borderRadius:
                            999,
                          background:
                            isFullyBooked
                              ? "#b42318"
                              : "var(--amber, #E8A33D)",
                          transition:
                            "width .25s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* --------------------------------------------------------
                      INVENTORY CONTROLS
                  -------------------------------------------------------- */}

                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 20,
                      borderTop:
                        "1px solid rgba(15,27,43,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom:
                          5,
                      }}
                    >
                      Manage total
                      inventory
                    </div>

                    <p
                      style={{
                        margin:
                          "0 0 12px",
                        fontSize: 12,
                        lineHeight:
                          1.5,
                        color:
                          "var(--slate, #5B6B76)",
                      }}
                    >
                      Increase or
                      decrease the
                      total number of
                      bookable units.
                      Reserved units
                      cannot be removed.
                    </p>

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 10,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={
                          decreaseInventory
                        }
                        disabled={
                          saving ||
                          inventory.total <=
                            inventory.reserved
                        }
                        aria-label="Decrease inventory"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius:
                            9,
                          border:
                            "1px solid rgba(15,27,43,0.14)",
                          background:
                            "#fff",
                          display:
                            "grid",
                          placeItems:
                            "center",
                          cursor:
                            saving ||
                            inventory.total <=
                              inventory.reserved
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            saving ||
                            inventory.total <=
                              inventory.reserved
                              ? 0.45
                              : 1,
                        }}
                      >
                        <Minus
                          size={16}
                        />
                      </button>

                      <div
                        style={{
                          minWidth: 70,
                          textAlign:
                            "center",
                          fontSize: 22,
                          fontWeight: 800,
                        }}
                      >
                        {
                          inventory.total
                        }
                      </div>

                      <button
                        type="button"
                        onClick={
                          increaseInventory
                        }
                        disabled={
                          saving
                        }
                        aria-label="Increase inventory"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius:
                            9,
                          border:
                            "1px solid rgba(15,27,43,0.14)",
                          background:
                            "#fff",
                          display:
                            "grid",
                          placeItems:
                            "center",
                          cursor:
                            saving
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            saving
                              ? 0.45
                              : 1,
                        }}
                      >
                        <Plus
                          size={16}
                        />
                      </button>

                      <span
                        style={{
                          fontSize: 12,
                          color:
                            "var(--slate, #5B6B76)",
                        }}
                      >
                        total units
                      </span>
                    </div>

                    {/* ------------------------------------------------------
                        INVENTORY SAVE
                    ------------------------------------------------------ */}

                    {inventoryChanged && (
                      <div
                        style={{
                          marginTop: 16,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 8,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <button
                          type="submit"
                          disabled={
                            saving
                          }
                          className="btn btn-amber"
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            gap: 7,
                            minHeight:
                              40,
                          }}
                        >
                          {saving ? (
                            <Loader2
                              size={15}
                              className="spin"
                            />
                          ) : (
                            <Save
                              size={15}
                            />
                          )}

                          {saving
                            ? "Saving..."
                            : "Save inventory"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            cancelInventoryChanges
                          }
                          disabled={
                            saving
                          }
                          className="btn btn-outline"
                          style={{
                            minHeight:
                              40,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* --------------------------------------------------------
                      PROTECTION
                  -------------------------------------------------------- */}

                  <div
                    style={{
                      marginTop: 20,
                      padding: 15,
                      borderRadius: 12,
                      background:
                        "rgba(15,27,43,0.035)",
                    }}
                  >
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 8,
                        marginBottom:
                          6,
                      }}
                    >
                      <ShieldCheck
                        size={16}
                      />

                      <strong
                        style={{
                          fontSize: 13,
                        }}
                      >
                        Inventory
                        protection
                      </strong>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        lineHeight:
                          1.55,
                        color:
                          "var(--slate, #5B6B76)",
                      }}
                    >
                      Reserved units are
                      protected from
                      being removed
                      from total
                      inventory.
                      Customer
                      reservations
                      should update
                      reserved inventory
                      through the
                      booking system.
                    </p>
                  </div>

                  {/* --------------------------------------------------------
                      INVENTORY MESSAGE
                  -------------------------------------------------------- */}

                  {inventoryMessage && (
                    <div
                      role="status"
                      style={{
                        marginTop: 14,
                        padding:
                          "10px 12px",
                        borderRadius:
                          9,
                        background:
                          "#edf9f0",
                        border:
                          "1px solid rgba(35,116,59,0.18)",
                        color:
                          "#236b35",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2
                        size={15}
                        style={{
                          verticalAlign:
                            "middle",
                          marginRight: 6,
                        }}
                      />

                      {
                        inventoryMessage
                      }
                    </div>
                  )}

                  {inventoryError && (
                    <div
                      role="alert"
                      style={{
                        marginTop: 14,
                        display:
                          "flex",
                        alignItems:
                          "flex-start",
                        gap: 9,
                        padding: 12,
                        borderRadius:
                          10,
                        background:
                          "#fff4f4",
                        border:
                          "1px solid #efb8b8",
                        color:
                          "#9b2226",
                        fontSize: 12,
                        lineHeight:
                          1.5,
                      }}
                    >
                      <AlertCircle
                        size={16}
                        style={{
                          flexShrink: 0,
                        }}
                      />

                      <span>
                        {
                          inventoryError
                        }
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* ============================================================
                  AMENITIES
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
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Amenities & features
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 9,
                  }}
                >
                  {COMMON_AMENITIES.map(
                    (
                      amenity,
                    ) => {
                      const selected =
                        form.amenities.includes(
                          amenity,
                        );

                      return (
                        <button
                          type="button"
                          key={
                            amenity
                          }
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
                            borderRadius:
                              10,
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
                              borderRadius:
                                5,
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
                                size={
                                  13
                                }
                                color="#fff"
                              />
                            )}
                          </span>

                          {
                            amenity
                          }
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* ============================================================
                  CONTACT
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
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  Contact information
                </h2>

                <div className="ft-field">
                  <label htmlFor="edit-phone">
                    Phone
                  </label>

                  <input
                    id="edit-phone"
                    type="tel"
                    value={
                      form.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "phone",
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="ft-field">
                  <label htmlFor="edit-website">
                    Website
                  </label>

                  <input
                    id="edit-website"
                    type="url"
                    value={
                      form.website
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "website",
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>
              </div>

              {/* ============================================================
                  IMAGES
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
                <h2
                  style={{
                    marginTop: 0,
                  }}
                >
                  <ImagePlus
                    size={18}
                    style={{
                      verticalAlign:
                        "middle",
                      marginRight: 7,
                    }}
                  />

                  Listing photos
                </h2>

                <div
                  style={{
                    display:
                      "flex",
                    gap: 8,
                  }}
                >
                  <input
                    value={
                      imageUrl
                    }
                    onChange={(
                      event,
                    ) =>
                      setImageUrl(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="https://example.com/photo.jpg"
                  />

                  <button
                    type="button"
                    className="btn"
                    onClick={
                      addImage
                    }
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      gap: 6,
                    }}
                  >
                    <Plus
                      size={15}
                    />

                    Add
                  </button>
                </div>

                {form.images
                  .length >
                  0 && (
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(3, 1fr)",
                      gap: 10,
                      marginTop: 15,
                    }}
                  >
                    {form.images.map(
                      (
                        image,
                      ) => (
                        <div
                          key={
                            image
                          }
                          style={{
                            position:
                              "relative",
                            overflow:
                              "hidden",
                            borderRadius:
                              10,
                            border:
                              "1px solid rgba(15,27,43,0.12)",
                          }}
                        >
                          <img
                            src={
                              image
                            }
                            alt="Listing"
                            style={{
                              width:
                                "100%",
                              height: 130,
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

                          <button
                            type="button"
                            onClick={() =>
                              removeImage(
                                image,
                              )
                            }
                            aria-label="Remove image"
                            style={{
                              position:
                                "absolute",
                              top: 7,
                              right: 7,
                              width: 28,
                              height: 28,
                              border:
                                0,
                              borderRadius:
                                "50%",
                              background:
                                "rgba(0,0,0,0.65)",
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
                            <X
                              size={
                                14
                              }
                            />
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ==============================================================
                SIDEBAR
            ============================================================== */}

            <aside
              style={{
                position:
                  "sticky",
                top: 90,
                display: "grid",
                gap: 15,
              }}
            >
              {/* ------------------------------------------------------------
                  LISTING PREVIEW
              ------------------------------------------------------------ */}

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
                    "Your listing"}
                </h3>

                <div
                  style={{
                    color:
                      "var(--slate, #5B6B76)",
                    fontSize: 13,
                  }}
                >
                  {
                    form.category
                  }
                </div>

                {form.price && (
                  <div
                    style={{
                      marginTop: 16,
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    $
                    {
                      form.price
                    }

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
              </div>

              {/* ------------------------------------------------------------
                  INVENTORY SUMMARY
              ------------------------------------------------------------ */}

              <div
                style={{
                  background: "#fff",
                  border:
                    "1px solid var(--line, rgba(15,27,43,0.12))",
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
                    marginBottom:
                      12,
                  }}
                >
                  <Package
                    size={17}
                  />

                  <strong
                    style={{
                      fontSize: 13,
                    }}
                  >
                    Inventory
                  </strong>
                </div>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: 7,
                  }}
                >
                  <div
                    style={{
                      padding: 9,
                      borderRadius:
                        9,
                      background:
                        "rgba(15,27,43,0.04)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color:
                          "var(--slate, #5B6B76)",
                      }}
                    >
                      Total
                    </div>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          3,
                        fontSize: 18,
                      }}
                    >
                      {
                        inventory.total
                      }
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: 9,
                      borderRadius:
                        9,
                      background:
                        "rgba(35,116,59,0.07)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color:
                          "var(--slate, #5B6B76)",
                      }}
                    >
                      Available
                    </div>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          3,
                        fontSize: 18,
                        color:
                          "#23743b",
                      }}
                    >
                      {
                        available
                      }
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: 9,
                      borderRadius:
                        9,
                      background:
                        "rgba(232,163,61,0.08)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color:
                          "var(--slate, #5B6B76)",
                      }}
                    >
                      Reserved
                    </div>

                    <strong
                      style={{
                        display:
                          "block",
                        marginTop:
                          3,
                        fontSize: 18,
                      }}
                    >
                      {
                        inventory.reserved
                      }
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    height: 6,
                    borderRadius:
                      999,
                    overflow:
                      "hidden",
                    background:
                      "rgba(15,27,43,0.08)",
                  }}
                >
                  <div
                    style={{
                      width:
                        `${inventoryPercentage}%`,
                      height:
                        "100%",
                      background:
                        isFullyBooked
                          ? "#b42318"
                          : "var(--amber, #E8A33D)",
                    }}
                  />
                </div>
              </div>

              {/* ------------------------------------------------------------
                  STATUS
              ------------------------------------------------------------ */}

              {listing?.status && (
                <div
                  style={{
                    padding: 15,
                    borderRadius: 12,
                    background:
                      "rgba(15,27,43,0.04)",
                    border:
                      "1px solid rgba(15,27,43,0.08)",
                    fontSize: 13,
                  }}
                >
                  Current status:{" "}
                  <strong>
                    {
                      listing.status
                    }
                  </strong>
                </div>
              )}

              {/* ------------------------------------------------------------
                  SAVE ALL
              ------------------------------------------------------------ */}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  saving
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

                    Saving changes...
                  </>
                ) : (
                  <>
                    <Save
                      size={16}
                    />

                    Save changes

                    <ArrowRight
                      size={16}
                    />
                  </>
                )}
              </button>

              {listingChanged && (
                <div
                  style={{
                    fontSize: 11,
                    color:
                      "var(--slate, #5B6B76)",
                    textAlign:
                      "center",
                  }}
                >
                  Inventory changes
                  will be included
                  when you save the
                  listing.
                </div>
              )}
            </aside>
          </form>
        </div>
      </section>
    </div>
  );
}