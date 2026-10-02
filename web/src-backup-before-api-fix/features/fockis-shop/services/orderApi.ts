/**

* ============================================================================
* FOCKIS SHOP — ORDER API
* ============================================================================
*
* Real backend order API.
*
* Backend:
* GET /fockis-shop/orders
* GET /fockis-shop/orders/:orderId
*
* Authentication:
* Required.
*
* The backend determines the current customer from the JWT.
* ============================================================================
  */

import type { Order } from "../types/order.types";

// ============================================================================
// API BASE URL
// ============================================================================

const API_BASE_URL =
import.meta.env.VITE_API_URL ||
import.meta.env.VITE_API_BASE_URL ||
"http://localhost:3000";

const ORDERS_ENDPOINT =
`${API_BASE_URL}/fockis-shop/orders`;

// ============================================================================
// AUTH
// ============================================================================

function getAuthToken(): string | null {
const tokenKeys = [
"access_token",
"accessToken",
"token",
"authToken",
"jwt",
"fockis_token",
"fockis_auth_token",
];

let bestToken: string | null = null;
let bestIssuedAt = -1;
let bestPriority = Number.MAX_SAFE_INTEGER;

for (
let index = 0;
index < tokenKeys.length;
index += 1
) {
const key = tokenKeys[index];
const token =
localStorage.getItem(key)?.trim();

if (!token) {
  continue;
}

let issuedAt = 0;

try {
  const parts = token.split(".");

  if (parts.length === 3) {
    const payload = JSON.parse(
      atob(
        parts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/"),
      ),
    );

    if (
      typeof payload?.exp ===
      "number"
    ) {
      const now =
        Math.floor(
          Date.now() / 1000,
        );

      if (
        payload.exp <= now
      ) {
        continue;
      }
    }

    if (
      typeof payload?.iat ===
      "number"
    ) {
      issuedAt = payload.iat;
    }
  }
} catch {
  // Keep non-JWT tokens usable.
}

if (
  issuedAt > bestIssuedAt ||
  (
    issuedAt === bestIssuedAt &&
    index < bestPriority
  )
) {
  bestToken = token;
  bestIssuedAt = issuedAt;
  bestPriority = index;
}
}

return bestToken;
}

// ============================================================================
// URL
// ============================================================================

function buildUrl(
path: string,
): string {
return new URL(
path,
window.location.origin,
).toString();
}

// ============================================================================
// REQUEST
// ============================================================================

async function request<T>(
path: string,
): Promise<T> {
const token =
getAuthToken();

const headers =
new Headers();

headers.set(
"Accept",
"application/json",
);

if (token) {
headers.set(
"Authorization",
`Bearer ${token}`,
);
}

const response =
await fetch(
buildUrl(path),
{
method: "GET",
headers,
credentials: "include",
},
);

const contentType =
response.headers.get(
"content-type",
) || "";

if (!response.ok) {
let message =
`Request failed with status ${response.status}`;
if (
  contentType.includes(
    "application/json",
  )
) {
  try {
    const body =
      await response.json();

    if (
      typeof body?.message ===
      "string"
    ) {
      message =
        body.message;
    } else if (
      Array.isArray(
        body?.message,
      )
    ) {
      message =
        body.message.join(
          ", ",
        );
    } else if (
      typeof body?.error ===
      "string"
    ) {
      message =
        body.error;
    }
  } catch {
    // Ignore invalid JSON.
  }
} else {
  try {
    const text =
      await response.text();

    if (text) {
      message = text;
    }
  } catch {
    // Ignore response parsing errors.
  }
}

if (
  response.status === 401
) {
  throw new Error(
    "UNAUTHORIZED",
  );
}

if (
  response.status === 403
) {
  throw new Error(
    "FORBIDDEN",
  );
}

if (
  response.status === 404
) {
  throw new Error(
    "ORDER_NOT_FOUND",
  );
}

throw new Error(
  message,
);
}

if (
response.status === 204
) {
return undefined as T;
}

if (
!contentType.includes(
"application/json",
)
) {
const text =
await response.text();

if (!text) {
  return undefined as T;
}

try {
  return JSON.parse(
    text,
  ) as T;
} catch {
  return text as T;
}

}

return response.json() as Promise<T>;
}

// ============================================================================
// LIST CURRENT USER ORDERS
// ============================================================================

export async function listMyOrders(): Promise<
Order[]

> {
 const result =
 await request<
 Order[] |
 {
 items?: Order[];
 data?: Order[];
 }
>(
 ORDERS_ENDPOINT,
 );

if (
Array.isArray(result)
) {
return result;
}

if (
Array.isArray(
result?.items,
)
) {
return result.items;
}

if (
Array.isArray(
result?.data,
)
) {
return result.data;
}

return [];
}

// ============================================================================
// GET ORDER BY ID
// ============================================================================

export async function getOrderById(
orderId: string,
): Promise<Order | null> {
if (
!orderId ||
!orderId.trim()
) {
return null;
}

try {
const result =
await request<
Order |
{
data?: Order;
}
>(
`${ORDERS_ENDPOINT}/${encodeURIComponent(
          orderId.trim(),
        )}`,
);
if (
  result &&
  typeof result ===
    "object" &&
  "data" in result &&
  result.data
) {
  return result.data;
}

return result as Order;

} catch (error) {
if (
error instanceof Error &&
error.message ===
"ORDER_NOT_FOUND"
) {
return null;
}
throw error;
}
}

// ============================================================================
// OBJECT API
// ============================================================================

export const orderApi = {
listMyOrders,
getOrderById,
};

export default orderApi;
