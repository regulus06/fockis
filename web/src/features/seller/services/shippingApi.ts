import { api } from "../../../api/api";

/* ============================================================================
SHIPMENT TYPES
============================================================================ */

export interface Shipment {
_id?: string;
id?: string;
orderId?: string;
trackingNumber?: string;
status?: string;
}

/* ============================================================================
SHIPMENT ID HELPER
============================================================================ */

/**

* Safely extracts the MongoDB shipment ID.
*
* Supports:
*
* { _id: "..." }
*
* { id: "..." }
*
* [{ _id: "..." }]
*
* [{ id: "..." }]
  */
  function getShipmentId(
  shipment:
  | Shipment
  | Shipment[]
  | null
  | undefined,
  ): string | null {
  if (!shipment) {
  return null;
  }

/*

* If the backend returns an array,
* use the first shipment.
  */
  if (Array.isArray(shipment)) {
  if (shipment.length === 0) {
  return null;
  }

return getShipmentId(

  shipment[0],
);

}

const id =
shipment._id ??
shipment.id ??
null;

if (!id) {
return null;
}

return String(id);
}

/* ============================================================================
NORMALIZE SHIPMENT RESPONSE
============================================================================ */

/**

* Normalizes the backend response into:
*
* Shipment | null
*
* Supports:
*
* 1. { _id: "..." }
*
* 2. { id: "..." }
*
* 3. [{ _id: "..." }]
*
* 4. [{ id: "..." }]
*
* 5. { data: { _id: "..." } }
*
* 6. { data: [{ _id: "..." }] }
     */
     function normalizeShipment(
     value: unknown,
     ): Shipment | null {

if (value === null) {
return null;
}

if (value === undefined) {
return null;
}

/*

* Backend returned an array.
  */
  if (Array.isArray(value)) {

if (value.length === 0) {

  return null;
}

return normalizeShipment(
  value[0],
);

}

/*

* Backend returned an object.
  */
  if (
  typeof value === "object"
  ) {

const objectValue =

  value as Record<
    string,
    unknown
  >;

/*
 * Some APIs wrap the actual
 * shipment inside "data".
 */
if (
  "data" in objectValue
) {
  return normalizeShipment(
    objectValue.data,
  );
}

/*
 * Create a clean Shipment object
 * instead of returning a generic
 * TypeScript object.
 */
const shipment: Shipment = {
  _id:
    typeof objectValue._id ===
    "string"
      ? objectValue._id
      : undefined,

  id:
    typeof objectValue.id ===
    "string"
      ? objectValue.id
      : undefined,

  orderId:
    typeof objectValue.orderId ===
    "string"
      ? objectValue.orderId
      : undefined,

  trackingNumber:
    typeof objectValue.trackingNumber ===
    "string"
      ? objectValue.trackingNumber
      : undefined,

  status:
    typeof objectValue.status ===
    "string"
      ? objectValue.status
      : undefined,
};

/*
 * If the backend returned an object
 * but it contains no recognizable
 * shipment ID, still return the object.
 *
 * This allows the caller to produce
 * the correct "missing shipment ID"
 * error.
 */
return shipment;

}

return null;
}

/* ============================================================================
SHIPPING API
============================================================================ */

export const shippingApi = {

/* ==========================================================================
CREATE SHIPMENT
========================================================================== */

createShipment:
async (
data: {
orderId: string;
trackingNumber?: string;
},
): Promise<Shipment | null> => {

  if (!data.orderId) {
    throw new Error(
      "Cannot create shipment: order ID is missing.",
    );
  }

  const response =
    await api.post(
      "/shipping",
      data,
    );

  console.log(
    "[shippingApi] Create shipment response:",
    response.data,
  );

  return normalizeShipment(
    response.data,
  );
},

/* ==========================================================================
MARK SHIPMENT AS SHIPPED
========================================================================== */

ship:
async (
shipmentId: string,
) => {
  if (!shipmentId) {
    throw new Error(
      "Cannot ship order: shipment ID is missing.",
    );
  }

  const response =
    await api.patch(
      `/shipping/${shipmentId}/ship`,
    );

  console.log(
    "[shippingApi] Ship response:",
    response.data,
  );

  return response.data;
},
/* ==========================================================================
MARK SHIPMENT AS DELIVERED
========================================================================== */

deliver:
async (
shipmentId: string,
) => {

  if (!shipmentId) {
    throw new Error(
      "Cannot deliver order: shipment ID is missing.",
    );
  }

  const response =
    await api.patch(
      `/shipping/${shipmentId}/deliver`,
    );

  console.log(
    "[shippingApi] Deliver response:",
    response.data,
  );

  return response.data;
},

/* ==========================================================================
GET SHIPMENT BY ORDER ID
========================================================================== */

getShipment:
async (
orderId: string,
): Promise<Shipment | null> => {

  if (!orderId) {
    throw new Error(
      "Cannot get shipment: order ID is missing.",
    );
  }

  try {

    const response =
      await api.get(
        `/shipping/${orderId}`,
      );

    console.log(
      "[shippingApi] Get shipment response:",
      response.data,
    );

    /*
     * Handles both:
     *
     * {
     *   _id: "..."
     * }
     *
     * and:
     *
     * [
     *   {
     *     _id: "..."
     *   }
     * ]
     */
    return normalizeShipment(
      response.data,
    );

  } catch (error: any) {

    /*
     * A 404 means there is no shipment
     * associated with this order yet.
     */
    if (
      error?.response?.status ===
      404
    ) {
      return null;
    }

    throw error;
  }
},

/* ==========================================================================
GET SHIPMENT ID
========================================================================== */

getShipmentId,

};
