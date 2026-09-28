import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  orderApi,
} from "../../orders/services/orderApi";

import "../styles/SellerOrdersPage.scss";

/* =========================================================
TYPES
========================================================= */

type ShippingAddress = {
  fullName?: string;
  email?: string;
  phone?: string;
  houseOrApartmentNumber?: string;
  neighborhood?: string;
  street?: string;
  apartment?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

type OrderItem = {
  _id?: string;

  product?: {
    _id?: string;
    name?: string;
    images?: string[];
  };

  productName?: string;

  quantity: number;

  price: number;

  itemTotal?: number;

  seller?: string | {
    _id?: string;
  };

  storeId?: string | {
    _id?: string;
  };
};

type ShipmentTrackingEvent = {
  _id?: string;
  status?: string;
  description?: string;
  location?: string;
  timestamp?: string;
  createdAt?: string;
};

type Shipment = {
  _id?: string;

  seller?: string | {
    _id?: string;
  };

  storeId?: string | {
    _id?: string;
  };

  status?: string;

  carrier?: string;

  trackingNumber?: string;

  trackingUrl?: string;

  trackingEvents?: ShipmentTrackingEvent[];

  lastUpdatedAt?: string;

  estimatedDeliveryDate?: string;
};

type Order = {
  _id: string;

  orderNumber?: string;

  invoiceNumber?: string;

  subtotal?: number;

  shippingCost?: number;

  tax?: number;

  discount?: number;

  totalAmount: number;

  status: string;

  createdAt: string;

  updatedAt?: string;

  paymentMethod?: string;

  paymentStatus?: string;

  customerName?: string;

  customerEmail?: string;

  customerPhone?: string;

  customer?: {
    _id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };

  shippingAddress?: ShippingAddress;

  billingAddress?: ShippingAddress;

  items: OrderItem[];

  shipments?: Shipment[];

  carrier?: string;

  trackingNumber?: string;

  trackingUrl?: string;

  shipmentStatus?: string;

  trackingEvents?: ShipmentTrackingEvent[];

  lastTrackingUpdate?: string;
};

/* =========================================================
ICON TYPES
========================================================= */

type IconProps = {
  size?: number;
};

/* =========================================================
ICONS
========================================================= */

const IconTruck = ({
  size = 15,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 8h11v9H2zM13 11h5l3 3v3h-8z" />

    <circle
      cx="6.5"
      cy="18"
      r="1.6"
    />

    <circle
      cx="16.5"
      cy="18"
      r="1.6"
    />
  </svg>
);

const IconCheck = ({
  size = 15,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12 5 5L20 7" />
  </svg>
);

const IconInbox = ({
  size = 30,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 4h16l2 8v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6l2-8Z" />

    <path d="M2 12h5l1.5 3h7L17 12h5" />
  </svg>
);

/* =========================================================
FILTERS
========================================================= */

const FILTERS = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Pending",
    value: "pending",
  },
  {
    label: "Paid / Confirmed",
    value: "paid",
  },
  {
    label: "Processing",
    value: "processing",
  },
  {
    label: "Ready to Ship",
    value: "ready_to_ship",
  },
  {
    label: "Shipped",
    value: "shipped",
  },
  {
    label: "Delivered",
    value: "delivered",
  },
  {
    label: "Cancelled",
    value: "cancelled",
  },
];

/* =========================================================
CARRIER OPTIONS
========================================================= */

const CARRIER_OPTIONS = [
  {
    label: "USPS",
    value: "USPS",
  },
  {
    label: "UPS",
    value: "UPS",
  },
  {
    label: "FedEx",
    value: "FedEx",
  },
  {
    label: "DHL",
    value: "DHL",
  },
  {
    label: "Other / My Own Carrier",
    value: "other",
  },
];

/* =========================================================
HELPERS
========================================================= */

function normalizeOrders(
  response: unknown,
): Order[] {
  if (Array.isArray(response)) {
    return response as Order[];
  }

  if (
    response &&
    typeof response === "object"
  ) {
    const data =
      response as {
        data?: unknown;
        orders?: unknown;
        results?: unknown;
      };

    if (Array.isArray(data.data)) {
      return data.data as Order[];
    }

    if (Array.isArray(data.orders)) {
      return data.orders as Order[];
    }

    if (Array.isArray(data.results)) {
      return data.results as Order[];
    }
  }

  return [];
}

function normalizeStatus(
  value?: string,
): string {
  return (
    value ||
    ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /-/g,
      "_",
    );
}

/* =========================================================
FORMAT DATE
========================================================= */

function formatInvoiceDate(
  createdAt?: string,
): string {
  if (!createdAt) {
    return "Date unavailable";
  }

  const date =
    new Date(
      createdAt,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Date unavailable";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function formatTrackingDate(
  date?: string,
): string {
  if (!date) {
    return "";
  }

  const parsed =
    new Date(
      date,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "";
  }

  return parsed.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

/* =========================================================
PAGE
========================================================= */

export default function SellerOrdersPage() {
  const [
    orders,
    setOrders,
  ] = useState<Order[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("all");

  const [
    updatingOrderId,
    setUpdatingOrderId,
  ] = useState<string | null>(
    null,
  );

  /* =======================================================
  TRACKING FORM STATE
  ======================================================= */

  const [
    trackingFormOrderId,
    setTrackingFormOrderId,
  ] = useState<string | null>(
    null,
  );

  const [
    trackingCarrier,
    setTrackingCarrier,
  ] = useState("");

  const [
    customCarrier,
    setCustomCarrier,
  ] = useState("");

  const [
    trackingNumber,
    setTrackingNumber,
  ] = useState("");

  const [
    trackingUrl,
    setTrackingUrl,
  ] = useState("");

  const [
    trackingError,
    setTrackingError,
  ] = useState("");

  /* =======================================================
  LOAD ORDERS
  ======================================================= */

  useEffect(() => {
    void loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);

      setErrorMessage("");

      const response =
        await orderApi.getSellerOrders();

      console.log(
        "Seller orders API response:",
        response,
      );

      const normalizedOrders =
        normalizeOrders(
          response,
        );

      console.log(
        "Normalized seller orders:",
        normalizedOrders,
      );

      setOrders(
        normalizedOrders,
      );
    } catch (
      error
    ) {
      console.error(
        "Seller orders error:",
        error,
      );

      setOrders([]);

      setErrorMessage(
        "Unable to load seller orders. Please refresh the page and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
  GET SHIPMENT
  ======================================================= */

  function getShipment(
    order: Order,
  ): Shipment | null {
    if (
      order.shipments &&
      order.shipments.length > 0
    ) {
      return (
        order.shipments[
          order.shipments.length - 1
        ] || null
      );
    }

    return null;
  }

  /* =======================================================
  GET CARRIER
  ======================================================= */

  function getCarrier(
    order: Order,
  ): string {
    const shipment =
      getShipment(
        order,
      );

    return (
      shipment?.carrier ||
      order.carrier ||
      ""
    );
  }

  /* =======================================================
  GET TRACKING NUMBER
  ======================================================= */

  function getTrackingNumber(
    order: Order,
  ): string {
    const shipment =
      getShipment(
        order,
      );

    return (
      shipment?.trackingNumber ||
      order.trackingNumber ||
      ""
    );
  }

  /* =======================================================
  GET TRACKING URL
  ======================================================= */

  function getTrackingUrl(
    order: Order,
  ): string {
    const shipment =
      getShipment(
        order,
      );

    return (
      shipment?.trackingUrl ||
      order.trackingUrl ||
      ""
    );
  }

  /* =======================================================
  GET SHIPMENT STATUS
  ======================================================= */

  function getShipmentStatus(
    order: Order,
  ): string {
    const shipment =
      getShipment(
        order,
      );

    return (
      shipment?.status ||
      order.shipmentStatus ||
      order.status ||
      ""
    );
  }

  /* =======================================================
  OPEN TRACKING FORM
  ======================================================= */

  function openTrackingForm(
    order: Order,
  ) {
    const existingCarrier =
      getCarrier(
        order,
      );

    const knownCarrier =
      CARRIER_OPTIONS.some(
        option =>
          option.value !== "other" &&
          option.value.toLowerCase() ===
            existingCarrier.toLowerCase(),
      );

    setTrackingFormOrderId(
      order._id,
    );

    setTrackingCarrier(
      knownCarrier
        ? existingCarrier
        : existingCarrier
          ? "other"
          : "",
    );

    setCustomCarrier(
      knownCarrier
        ? ""
        : existingCarrier,
    );

    setTrackingNumber(
      getTrackingNumber(
        order,
      ),
    );

    setTrackingUrl(
      getTrackingUrl(
        order,
      ),
    );

    setTrackingError("");

    window.setTimeout(() => {
      const element =
        document.getElementById(
          `tracking-form-${order._id}`,
        );

      element?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
  }

  /* =======================================================
  CLOSE TRACKING FORM
  ======================================================= */

  function closeTrackingForm() {
    setTrackingFormOrderId(
      null,
    );

    setTrackingCarrier("");

    setCustomCarrier("");

    setTrackingNumber("");

    setTrackingUrl("");

    setTrackingError("");
  }

  /* =======================================================
  SHIP ORDER WITH TRACKING
  ======================================================= */

  async function shipOrder(
    orderId: string,
  ) {
    if (
      updatingOrderId
    ) {
      return;
    }

    const finalCarrier =
      trackingCarrier === "other"
        ? customCarrier.trim()
        : trackingCarrier.trim();

    const number =
      trackingNumber.trim();

    const url =
      trackingUrl.trim();

    if (!finalCarrier) {
      setTrackingError(
        trackingCarrier === "other"
          ? "Enter your carrier name."
          : "Select a carrier.",
      );

      return;
    }

    if (!number) {
      setTrackingError(
        "Tracking number is required.",
      );

      return;
    }

    try {
      setUpdatingOrderId(
        orderId,
      );

      setTrackingError("");

      setErrorMessage("");

      console.log(
        "Shipping order with tracking:",
        {
          orderId,
          carrier:
            finalCarrier,
          trackingNumber:
            number,
          trackingUrl:
            url,
        },
      );

      const response =
        await orderApi.updateStatus(
          orderId,
          {
            status:
              "shipped",

            carrier:
              finalCarrier,

            trackingNumber:
              number,

            trackingUrl:
              url ||
              undefined,

            shipmentStatus:
              "shipped",
          },
        );

      console.log(
        "Ship order response:",
        response,
      );

      closeTrackingForm();

      await loadOrders();
    } catch (
      error
    ) {
      console.error(
        "Ship order error:",
        error,
      );

      setTrackingError(
        "Unable to ship the order. Please try again.",
      );
    } finally {
      setUpdatingOrderId(
        null,
      );
    }
  }

  /* =======================================================
  UPDATE ORDER STATUS
  ======================================================= */

  async function updateStatus(
    id: string,
    nextStatus: string,
  ) {
    if (
      updatingOrderId
    ) {
      return;
    }

    try {
      setUpdatingOrderId(
        id,
      );

      setErrorMessage("");

      console.log(
        "Updating order status:",
        {
          orderId: id,
          requestedStatus:
            nextStatus,
        },
      );

      const response =
        await orderApi.updateStatus(
          id,
          {
            status:
              nextStatus,
          },
        );

      console.log(
        "Update status response:",
        response,
      );

      await loadOrders();
    } catch (
      error
    ) {
      console.error(
        "Update order status error:",
        error,
      );

      setErrorMessage(
        "Unable to update the order status.",
      );
    } finally {
      setUpdatingOrderId(
        null,
      );
    }
  }

  /* =======================================================
  FILTER ORDERS
  ======================================================= */

  const filteredOrders =
    useMemo(() => {
      if (
        filter ===
        "all"
      ) {
        return orders;
      }

      if (
        filter ===
        "paid"
      ) {
        return orders.filter(
          order => {
            const status =
              normalizeStatus(
                order.status,
              );

            const paymentStatus =
              normalizeStatus(
                order.paymentStatus,
              );

            return (
              paymentStatus ===
                "paid" ||
              status ===
                "paid"
            );
          },
        );
      }

      return orders.filter(
        order =>
          normalizeStatus(
            order.status,
          ) ===
          filter,
      );
    }, [
      orders,
      filter,
    ]);

  /* =======================================================
  CUSTOMER
  ======================================================= */

  function getCustomerName(
    order: Order,
  ): string {
    const shippingName =
      order.shippingAddress
        ?.fullName
        ?.trim();

    if (
      shippingName
    ) {
      return shippingName;
    }

    if (
      order.customerName?.trim()
    ) {
      return order.customerName.trim();
    }

    if (
      order.customer?.name?.trim()
    ) {
      return order.customer.name.trim();
    }

    const firstName =
      order.customer
        ?.firstName
        ?.trim() ??
      "";

    const lastName =
      order.customer
        ?.lastName
        ?.trim() ??
      "";

    const combinedName =
      `${firstName} ${lastName}`.trim();

    return (
      combinedName ||
      "Customer"
    );
  }

  function getCustomerEmail(
    order: Order,
  ): string {
    return (
      order.shippingAddress
        ?.email
        ?.trim() ||
      order.customerEmail
        ?.trim() ||
      order.customer
        ?.email
        ?.trim() ||
      ""
    );
  }

  function getCustomerPhone(
    order: Order,
  ): string {
    return (
      order.shippingAddress
        ?.phone
        ?.trim() ||
      order.customerPhone
        ?.trim() ||
      order.customer
        ?.phone
        ?.trim() ||
      ""
    );
  }

  function getOrderNumber(
    order: Order,
  ): string {
    return (
      order.orderNumber ||
      order._id.slice(-6)
    );
  }

  /* =======================================================
  STATUS LABEL
  ======================================================= */

  function getStatusLabel(
    status: string,
  ): string {
    switch (
      normalizeStatus(
        status,
      )
    ) {
      case "pending":
        return "Pending";

      case "paid":
        return "Paid / Confirmed";

      case "processing":
        return "Processing";

      case "ready_to_ship":
        return "Ready to Ship";

      case "shipped":
        return "Shipped";

      case "in_transit":
        return "In Transit";

      case "out_for_delivery":
        return "Out for Delivery";

      case "delivered":
        return "Delivered";

      case "cancelled":
        return "Cancelled";

      case "refunded":
        return "Refunded";

      case "return_requested":
        return "Return Requested";

      case "returned":
        return "Returned";

      default:
        return (
          status ||
          "Unknown"
        );
    }
  }

  /* =======================================================
  PAYMENT LABEL
  ======================================================= */

  function getPaymentLabel(
    order: Order,
  ): string {
    if (
      normalizeStatus(
        order.paymentStatus,
      ) ===
      "paid"
    ) {
      return "Payment confirmed";
    }

    if (
      normalizeStatus(
        order.paymentStatus,
      ) ===
      "failed"
    ) {
      return "Payment failed";
    }

    if (
      normalizeStatus(
        order.paymentStatus,
      ) ===
      "cancelled"
    ) {
      return "Payment cancelled";
    }

    return "Payment pending";
  }

  /* =======================================================
  TRACKING DISPLAY
  ======================================================= */

  function renderTrackingInfo(
    order: Order,
  ) {
    const shipment =
      getShipment(
        order,
      );

    const carrier =
      getCarrier(
        order,
      );

    const number =
      getTrackingNumber(
        order,
      );

    const url =
      getTrackingUrl(
        order,
      );

    const shipmentStatus =
      getShipmentStatus(
        order,
      );

    const events =
      shipment?.trackingEvents ||
      order.trackingEvents ||
      [];

    if (
      !carrier &&
      !number &&
      !url
    ) {
      return null;
    }

    return (
      <div className="tracking-info">
        <div className="tracking-info-main">

          {carrier && (
            <span>
              <strong>
                Carrier:
              </strong>{" "}
              {carrier}
            </span>
          )}

          {number && (
            <span>
              <strong>
                Tracking:
              </strong>{" "}
              {number}
            </span>
          )}

          {shipmentStatus && (
            <span>
              <strong>
                Shipment:
              </strong>{" "}
              {getStatusLabel(
                shipmentStatus,
              )}
            </span>
          )}

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Track Package
            </a>
          )}

        </div>

        {events.length >
          0 && (
          <div className="tracking-events">

            <span className="tracking-events-title">
              Tracking Events
            </span>

            <div className="tracking-event-list">

              {events
                .slice(
                  0,
                  5,
                )
                .map(
                  (
                    event,
                    index,
                  ) => (
                    <div
                      className="tracking-event"
                      key={
                        event._id ||
                        `${event.timestamp}-${index}`
                      }
                    >
                      <span className="tracking-event-dot" />

                      <div className="tracking-event-content">

                        <strong>
                          {
                            event.status ||
                            "Shipment update"
                          }
                        </strong>

                        {event.description && (
                          <span>
                            {
                              event.description
                            }
                          </span>
                        )}

                        {event.location && (
                          <small>
                            {
                              event.location
                            }
                          </small>
                        )}

                        {(
                          event.timestamp ||
                          event.createdAt
                        ) && (
                          <small>
                            {
                              formatTrackingDate(
                                event.timestamp ||
                                event.createdAt,
                              )
                            }
                          </small>
                        )}

                      </div>
                    </div>
                  ),
                )}

            </div>
          </div>
        )}
      </div>
    );
  }

  /* =======================================================
  INLINE TRACKING FORM
  ======================================================= */

  function renderTrackingForm(
    order: Order,
  ) {
    if (
      trackingFormOrderId !==
      order._id
    ) {
      return null;
    }

    const isUpdating =
      updatingOrderId ===
      order._id;

    return (
      <div
        id={
          `tracking-form-${order._id}`
        }
        className="tracking-form"
      >

        <div className="tracking-form-header">

          <div>
            <strong>
              Shipment Tracking
            </strong>

            <span>
              Enter the carrier and tracking number used to ship this order.
            </span>
          </div>

          <button
            type="button"
            className="tracking-cancel-btn"
            onClick={
              closeTrackingForm
            }
            disabled={
              isUpdating
            }
          >
            Cancel
          </button>

        </div>

        <div className="tracking-fields">

          <label className="tracking-field">

            <span>
              Carrier
              <em>
                *
              </em>
            </span>

            <select
              value={
                trackingCarrier
              }
              onChange={event => {
                setTrackingCarrier(
                  event.target.value,
                );

                if (
                  event.target.value !==
                  "other"
                ) {
                  setCustomCarrier("");
                }

                setTrackingError("");
              }}
              disabled={
                isUpdating
              }
            >

              <option value="">
                Select carrier
              </option>

              {CARRIER_OPTIONS.map(
                carrier => (
                  <option
                    key={
                      carrier.value
                    }
                    value={
                      carrier.value
                    }
                  >
                    {
                      carrier.label
                    }
                  </option>
                ),
              )}

            </select>

          </label>

          {trackingCarrier ===
            "other" && (
            <label className="tracking-field">

              <span>
                Your Carrier Name
                <em>
                  *
                </em>
              </span>

              <input
                type="text"
                value={
                  customCarrier
                }
                onChange={event =>
                  setCustomCarrier(
                    event.target.value,
                  )
                }
                placeholder="Enter your carrier name"
                disabled={
                  isUpdating
                }
                autoComplete="organization"
              />

            </label>
          )}

          <label className="tracking-field">

            <span>
              Tracking Number
              <em>
                *
              </em>
            </span>

            <input
              type="text"
              value={
                trackingNumber
              }
              onChange={event =>
                setTrackingNumber(
                  event.target.value,
                )
              }
              placeholder="e.g. 9400111899560000000000"
              disabled={
                isUpdating
              }
              autoComplete="off"
            />

          </label>

          <label className="tracking-field tracking-field-wide">

            <span>
              Tracking URL
              <small>
                Optional
              </small>
            </span>

            <input
              type="url"
              value={
                trackingUrl
              }
              onChange={event =>
                setTrackingUrl(
                  event.target.value,
                )
              }
              placeholder="https://carrier.com/track/..."
              disabled={
                isUpdating
              }
              autoComplete="url"
            />

          </label>

        </div>

        {trackingCarrier &&
          trackingCarrier !==
            "other" && (
          <div className="tracking-provider-note">
            <IconTruck size={14} />

            <span>
              {trackingCarrier} tracking can be synchronized automatically when carrier tracking integration is enabled.
            </span>
          </div>
        )}

        {trackingCarrier ===
          "other" && (
          <div className="tracking-provider-note">
            <IconTruck size={14} />

            <span>
              Custom carriers are saved manually. The seller or customer can use the tracking URL to follow the shipment.
            </span>
          </div>
        )}

        {trackingError && (
          <div className="tracking-error">
            {trackingError}
          </div>
        )}

        <div className="tracking-form-actions">

          <button
            type="button"
            className="icon-btn"
            onClick={
              closeTrackingForm
            }
            disabled={
              isUpdating
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="icon-btn icon-btn-success"
            onClick={() =>
              void shipOrder(
                order._id,
              )
            }
            disabled={
              isUpdating
            }
          >
            <IconTruck />

            {isUpdating
              ? "Shipping..."
              : "Ship Order"}
          </button>

        </div>

      </div>
    );
  }

  /* =======================================================
  NEXT ACTION
  ======================================================= */

  function renderAction(
    order: Order,
  ) {
    const isUpdating =
      updatingOrderId ===
      order._id;

    const status =
      normalizeStatus(
        order.status,
      );

    if (
      status ===
      "pending"
    ) {
      if (
        normalizeStatus(
          order.paymentStatus,
        ) ===
        "paid"
      ) {
        return (
          <button
            type="button"
            className="icon-btn"
            disabled={
              isUpdating
            }
            onClick={() =>
              void updateStatus(
                order._id,
                "processing",
              )
            }
          >
            {isUpdating
              ? "Updating..."
              : "Process Order"}
          </button>
        );
      }

      return null;
    }

    if (
      status ===
      "paid"
    ) {
      return (
        <button
          type="button"
          className="icon-btn"
          disabled={
            isUpdating
          }
          onClick={() =>
            void updateStatus(
              order._id,
              "processing",
            )
          }
        >
          {isUpdating
            ? "Updating..."
            : "Process Order"}
        </button>
      );
    }

    if (
      status ===
        "processing" ||
      status ===
        "ready_to_ship"
    ) {
      return (
        <button
          type="button"
          className="icon-btn"
          disabled={
            isUpdating
          }
          onClick={() => {
            if (
              trackingFormOrderId ===
              order._id
            ) {
              closeTrackingForm();
            } else {
              openTrackingForm(
                order,
              );
            }
          }}
        >
          <IconTruck />

          {trackingFormOrderId ===
          order._id
            ? "Close"
            : "Ship"}
        </button>
      );
    }

    if (
      status ===
      "shipped"
    ) {
      return (
        <button
          type="button"
          className="icon-btn icon-btn-success"
          disabled={
            isUpdating
          }
          onClick={() =>
            void updateStatus(
              order._id,
              "delivered",
            )
          }
        >
          <IconCheck />

          {isUpdating
            ? "Updating..."
            : "Delivered"}
        </button>
      );
    }

    return null;
  }

  /* =======================================================
  RENDER
  ======================================================= */

  return (
    <div className="seller-orders">

      <div className="orders-body">

        <div className="orders-header">

          <div className="header-copy">

            <span className="eyebrow">
              Fulfillment
            </span>

            <h1>
              Orders
            </h1>

            <p>
              Manage payments, confirmed orders,
              fulfillment, shipping and delivery.
            </p>

          </div>

          <div
            className="order-tabs"
            role="tablist"
            aria-label="Order status filters"
          >
            {FILTERS.map(
              item => (
                <button
                  type="button"
                  key={
                    item.value
                  }
                  className={
                    filter ===
                    item.value
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(
                      item.value,
                    )
                  }
                >
                  {
                    item.label
                  }
                </button>
              ),
            )}
          </div>

        </div>

        {errorMessage && (
          <div className="empty-state">

            <p>
              {errorMessage}
            </p>

            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                void loadOrders()
              }
            >
              Retry
            </button>

          </div>
        )}

        {loading && (
          <div className="empty-state">

            <p>
              Loading orders...
            </p>

          </div>
        )}

        {!loading &&
          !errorMessage &&
          filteredOrders.length >
            0 && (

            <div className="table-wrapper">

              <table className="orders-table">

                <thead>

                  <tr>

                    <th>
                      Order
                    </th>

                    <th>
                      Invoice
                    </th>

                    <th>
                      Customer
                    </th>

                    <th>
                      Items
                    </th>

                    <th>
                      Total
                    </th>

                    <th>
                      Payment
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredOrders.map(
                    order => {

                      const customerEmail =
                        getCustomerEmail(
                          order,
                        );

                      const customerPhone =
                        getCustomerPhone(
                          order,
                        );

                      return (
                        <tr
                          key={
                            order._id
                          }
                        >

                          <td className="order-id">
                            #
                            {
                              getOrderNumber(
                                order,
                              )
                            }
                          </td>

                          <td className="invoice-cell">

                            <strong>
                              {
                                order.invoiceNumber ||
                                "Pending"
                              }
                            </strong>

                            <small>
                              {
                                order.paymentMethod ||
                                "Payment pending"
                              }
                            </small>

                            <small className="invoice-date">
                              {
                                formatInvoiceDate(
                                  order.createdAt,
                                )
                              }
                            </small>

                          </td>

                          <td className="customer-cell">

                            <div className="customer-info">

                              <strong>
                                {
                                  getCustomerName(
                                    order,
                                  )
                                }
                              </strong>

                              {customerEmail && (
                                <small>
                                  {
                                    customerEmail
                                  }
                                </small>
                              )}

                              {customerPhone && (
                                <small>
                                  {
                                    customerPhone
                                  }
                                </small>
                              )}

                              {order.shippingAddress && (
                                <div className="shipping-address">

                                  {order.shippingAddress.houseOrApartmentNumber && (
                                    <span>
                                      {
                                        order.shippingAddress
                                          .houseOrApartmentNumber
                                      }
                                    </span>
                                  )}

                                  {order.shippingAddress.address && (
                                    <span>
                                      {
                                        order.shippingAddress
                                          .address
                                      }
                                    </span>
                                  )}

                                  {order.shippingAddress.street && (
                                    <span>
                                      {
                                        order.shippingAddress
                                          .street
                                      }
                                    </span>
                                  )}

                                  {order.shippingAddress.apartment && (
                                    <span>
                                      Apt.{" "}
                                      {
                                        order.shippingAddress
                                          .apartment
                                      }
                                    </span>
                                  )}

                                  {order.shippingAddress.neighborhood && (
                                    <span>
                                      {
                                        order.shippingAddress
                                          .neighborhood
                                      }
                                    </span>
                                  )}

                                  {(order.shippingAddress.city ||
                                    order.shippingAddress.state ||
                                    order.shippingAddress.zipCode) && (
                                    <span>
                                      {[
                                        order.shippingAddress.city,
                                        order.shippingAddress.state,
                                        order.shippingAddress.zipCode,
                                      ]
                                        .filter(Boolean)
                                        .join(
                                          ", ",
                                        )}
                                    </span>
                                  )}

                                  {order.shippingAddress.country && (
                                    <span>
                                      {
                                        order.shippingAddress
                                          .country
                                      }
                                    </span>
                                  )}

                                </div>
                              )}

                            </div>

                          </td>

                          <td>

                            <div className="items-cell">

                              {order.items?.map(
                                (
                                  item,
                                  index,
                                ) => (
                                  <div
                                    className="item-line"
                                    key={
                                      item._id ||
                                      index
                                    }
                                  >

                                    <span>
                                      {
                                        item.product?.name ||
                                        item.productName ||
                                        "Product"
                                      }
                                    </span>

                                    <span className="item-qty">
                                      ×
                                      {
                                        item.quantity
                                      }
                                    </span>

                                  </div>
                                ),
                              )}

                            </div>

                          </td>

                          <td className="total-cell">

                            {Number(
                              order.totalAmount ??
                              0,
                            ).toLocaleString(
                              "en-US",
                              {
                                style:
                                  "currency",
                                currency:
                                  "USD",
                              },
                            )}

                          </td>

                          <td>

                            <span
                              className={
                                "payment-pill payment-" +
                                (
                                  normalizeStatus(
                                    order.paymentStatus,
                                  ) ||
                                  "pending"
                                )
                              }
                            >
                              {
                                getPaymentLabel(
                                  order,
                                )
                              }
                            </span>

                          </td>

                          <td>

                            <span
                              className={
                                "status-pill status-" +
                                normalizeStatus(
                                  order.status,
                                )
                              }
                            >
                              {
                                getStatusLabel(
                                  order.status,
                                )
                              }
                            </span>

                            {(
                              normalizeStatus(
                                order.status,
                              ) ===
                                "shipped" ||
                              normalizeStatus(
                                order.status,
                              ) ===
                                "delivered"
                            ) &&
                              renderTrackingInfo(
                                order,
                              )}

                          </td>

                          <td className="action-cell">

                            {
                              renderAction(
                                order,
                              )
                            }

                          </td>

                          {trackingFormOrderId ===
                            order._id && (
                            <td
                              colSpan={
                                7
                              }
                              className="tracking-form-cell"
                            >
                              {renderTrackingForm(
                                order,
                              )}
                            </td>
                          )}

                        </tr>
                      );
                    },
                  )}

                </tbody>

              </table>

            </div>
          )}

        {!loading &&
          !errorMessage &&
          filteredOrders.length ===
            0 && (

          <div className="empty-state">

            <div className="empty-icon">

              <IconInbox />

            </div>

            <p>
              {
                orders.length ===
                0
                  ? "No orders found"
                  : "No matching orders"
              }
            </p>

            <span>
              {
                orders.length ===
                0
                  ? "Orders containing products from your store will appear here."
                  : `No orders with status "${getStatusLabel(filter)}" right now.`
              }
            </span>

            {orders.length >
              0 &&
              filter !==
                "all" && (
              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setFilter(
                    "all",
                  )
                }
              >
                View All Orders
              </button>
            )}

          </div>
        )}

      </div>

    </div>
  );
}