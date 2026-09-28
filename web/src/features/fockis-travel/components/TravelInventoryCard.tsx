import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Minus,
  Package,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";

/* ============================================================================
   TYPES
============================================================================ */

export interface TravelInventory {
  total: number;
  available: number;
  reserved: number;
}

export interface TravelInventoryCardProps {
  listingId?: string;

  /**
   * Inventory loaded from the listing.
   *
   * Expected shape:
   * listing.metadata.inventory
   */
  initialInventory?: Partial<TravelInventory>;

  /**
   * Optional listing name.
   */
  listingName?: string;

  /**
   * Called when inventory is saved.
   *
   * The parent page connects this to:
   *
   * PATCH /travel/listings/:id
   */
  onSaveInventory?: (
    inventory: TravelInventory,
  ) => Promise<void>;

  /**
   * Prevent editing when false.
   */
  editable?: boolean;
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

  return Math.max(
    0,
    Math.floor(numeric),
  );
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

/* ============================================================================
   COMPONENT
============================================================================ */

export default function TravelInventoryCard({
  listingId,
  initialInventory,
  listingName = "Travel listing",
  onSaveInventory,
  editable = true,
}: TravelInventoryCardProps) {
  const normalizedInitialInventory =
    useMemo(
      () =>
        normalizeInventory(
          initialInventory,
        ),
      [initialInventory],
    );

  const [total, setTotal] = useState(
    normalizedInitialInventory.total,
  );

  const [reserved, setReserved] =
    useState(
      normalizedInitialInventory.reserved,
    );

  const [savedInventory, setSavedInventory] =
    useState<TravelInventory>(
      normalizedInitialInventory,
    );

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /* ==========================================================================
     SYNC WHEN PARENT LOADS/CHANGES LISTING
  ========================================================================== */

  useEffect(() => {
    const next =
      normalizeInventory(
        initialInventory,
      );

    setTotal(next.total);
    setReserved(next.reserved);
    setSavedInventory(next);
    setMessage("");
    setError("");
  }, [initialInventory]);

  /* ==========================================================================
     CALCULATED VALUES
  ========================================================================== */

  const available = Math.max(
    0,
    total - reserved,
  );

  const inventoryPercentage =
    total > 0
      ? Math.min(
          100,
          Math.round(
            (available / total) * 100,
          ),
        )
      : 0;

  const isFullyBooked =
    total > 0 &&
    available === 0;

  const hasInventory =
    available > 0;

  const hasChanges =
    total !== savedInventory.total;

  /* ==========================================================================
     INCREASE
  ========================================================================== */

  function increaseInventory() {
    if (!editable || saving) {
      return;
    }

    setError("");
    setMessage("");

    setTotal(
      (current) => current + 1,
    );
  }

  /* ==========================================================================
     DECREASE
  ========================================================================== */

  function decreaseInventory() {
    if (!editable || saving) {
      return;
    }

    if (total <= reserved) {
      setError(
        "Inventory cannot be reduced below the number of units already reserved.",
      );

      return;
    }

    setError("");
    setMessage("");

    setTotal(
      (current) =>
        Math.max(
          reserved,
          current - 1,
        ),
    );
  }

  /* ==========================================================================
     SAVE
  ========================================================================== */

  async function saveInventory() {
    if (!editable || saving) {
      return;
    }

    if (!listingId) {
      setError(
        "This listing does not have a valid ID.",
      );

      return;
    }

    if (total < reserved) {
      setError(
        "Total inventory cannot be lower than reserved inventory.",
      );

      return;
    }

    if (!onSaveInventory) {
      setError(
        "Inventory saving has not been connected to the backend.",
      );

      return;
    }

    const nextInventory: TravelInventory = {
      total,
      reserved,
      available: Math.max(
        0,
        total - reserved,
      ),
    };

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await onSaveInventory(
        nextInventory,
      );

      /*
       * Treat the newly saved inventory
       * as the new baseline.
       */
      setSavedInventory(
        nextInventory,
      );

      setMessage(
        "Inventory saved successfully.",
      );
    } catch (err) {
      console.error(
        "Unable to save travel inventory:",
        err,
      );

      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof err.message === "string"
      ) {
        setError(err.message);
      } else {
        setError(
          "Unable to save inventory. Please try again.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================================
     CANCEL LOCAL CHANGES
  ========================================================================== */

  function cancelChanges() {
    if (saving) {
      return;
    }

    setTotal(
      savedInventory.total,
    );

    setReserved(
      savedInventory.reserved,
    );

    setMessage("");
    setError("");
  }

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
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
      {/* HEADER */}

      <div
        style={{
          padding: "20px 22px",
          borderBottom:
            "1px solid rgba(15,27,43,0.08)",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 11,
              display: "grid",
              placeItems: "center",
              background:
                "rgba(232,163,61,0.12)",
              color:
                "var(--amber, #E8A33D)",
              flexShrink: 0,
            }}
          >
            <Package size={21} />
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
              {listingName}
            </h3>

            <p
              style={{
                margin:
                  "5px 0 0",
                fontSize: 12,
                color:
                  "var(--slate, #5B6B76)",
                lineHeight: 1.45,
              }}
            >
              Manage the number of units
              available for this listing.
            </p>
          </div>
        </div>

        {isFullyBooked ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding:
                "6px 10px",
              borderRadius: 999,
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
            <AlertCircle size={14} />
            Fully booked
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding:
                "6px 10px",
              borderRadius: 999,
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
            <CheckCircle2 size={14} />
            Available
          </span>
        )}
      </div>

      {/* BODY */}

      <div
        style={{
          padding: 22,
        }}
      >
        {/* INVENTORY NUMBERS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <div
            style={{
              padding: 15,
              borderRadius: 12,
              background:
                "rgba(15,27,43,0.035)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color:
                  "var(--slate, #5B6B76)",
                marginBottom: 5,
              }}
            >
              Total
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {total}
            </div>
          </div>

          <div
            style={{
              padding: 15,
              borderRadius: 12,
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
                marginBottom: 5,
              }}
            >
              Available
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1,
                color:
                  hasInventory
                    ? "#23743b"
                    : "#b42318",
              }}
            >
              {available}
            </div>
          </div>

          <div
            style={{
              padding: 15,
              borderRadius: 12,
              background:
                "rgba(232,163,61,0.08)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color:
                  "var(--slate, #5B6B76)",
                marginBottom: 5,
              }}
            >
              Reserved
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {reserved}
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 10,
                color:
                  "var(--slate, #5B6B76)",
              }}
            >
              Managed by bookings
            </div>
          </div>
        </div>

        {/* AVAILABILITY BAR */}

        <div
          style={{
            marginTop: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              gap: 10,
              marginBottom: 7,
              fontSize: 12,
              color:
                "var(--slate, #5B6B76)",
            }}
          >
            <span>
              Inventory remaining
            </span>

            <strong>
              {inventoryPercentage}%
            </strong>
          </div>

          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 999,
              overflow: "hidden",
              background:
                "rgba(15,27,43,0.08)",
            }}
          >
            <div
              style={{
                width:
                  `${inventoryPercentage}%`,
                height: "100%",
                borderRadius: 999,
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

        {/* OWNER CONTROLS */}

        {editable && (
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
                marginBottom: 5,
              }}
            >
              Manage total inventory
            </div>

            <p
              style={{
                margin:
                  "0 0 12px",
                fontSize: 12,
                lineHeight: 1.5,
                color:
                  "var(--slate, #5B6B76)",
              }}
            >
              Increase or decrease the total
              number of units available for
              this listing. Reserved units
              cannot be removed from inventory.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={
                  decreaseInventory
                }
                disabled={
                  saving ||
                  total <= reserved
                }
                aria-label="Decrease inventory"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9,
                  border:
                    "1px solid rgba(15,27,43,0.14)",
                  background: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor:
                    saving ||
                    total <= reserved
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    saving ||
                    total <= reserved
                      ? 0.45
                      : 1,
                }}
              >
                <Minus size={16} />
              </button>

              <div
                style={{
                  minWidth: 70,
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {total}
              </div>

              <button
                type="button"
                onClick={
                  increaseInventory
                }
                disabled={saving}
                aria-label="Increase inventory"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9,
                  border:
                    "1px solid rgba(15,27,43,0.14)",
                  background: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    saving ? 0.45 : 1,
                }}
              >
                <Plus size={16} />
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

            {hasChanges && (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={
                    saveInventory
                  }
                  disabled={saving}
                  className="btn btn-amber"
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: 7,
                    minHeight: 40,
                  }}
                >
                  {saving ? (
                    <Loader2
                      size={15}
                      className="spin"
                    />
                  ) : (
                    <Save size={15} />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save inventory"}
                </button>

                <button
                  type="button"
                  onClick={
                    cancelChanges
                  }
                  disabled={saving}
                  className="btn btn-outline"
                  style={{
                    minHeight: 40,
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* PROTECTION */}

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
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <ShieldCheck size={16} />

            <strong
              style={{
                fontSize: 13,
              }}
            >
              Inventory protection
            </strong>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color:
                "var(--slate, #5B6B76)",
            }}
          >
            Reserved units are protected from
            being removed from the listing's
            total inventory. Customer
            reservations should update reserved
            inventory through the booking system.
          </p>
        </div>

        {/* SUCCESS */}

        {message && (
          <div
            role="status"
            style={{
              marginTop: 14,
              padding:
                "10px 12px",
              borderRadius: 9,
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

            {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 14,
              display: "flex",
              alignItems:
                "flex-start",
              gap: 9,
              padding: 12,
              borderRadius: 10,
              background:
                "#fff4f4",
              border:
                "1px solid #efb8b8",
              color:
                "#9b2226",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <AlertCircle
              size={16}
              style={{
                flexShrink: 0,
                marginTop: 1,
              }}
            />

            <span>{error}</span>
          </div>
        )}
      </div>
    </section>
  );
}