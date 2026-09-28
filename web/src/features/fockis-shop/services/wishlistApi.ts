const API_BASE_URL = (
(import.meta.env.VITE_API_URL as string | undefined) ||
(import.meta.env.VITE_API_BASE_URL as string | undefined) ||
"http://localhost:3000"
).replace();

const WISHLIST_ENDPOINT =
`${API_BASE_URL}/fockis-shop/wishlist`;

type WishlistObjectResponse = {
productIds?: unknown;
items?: unknown;
data?: unknown;
};

type WishlistResponse =
| string[]
| WishlistObjectResponse;

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

const candidates: Array<{
token: string;
issuedAt: number;
priority: number;
}> = [];

for (const [priority, key] of tokenKeys.entries()) {
const token = localStorage.getItem(key)?.trim();

if (!token) {
  continue;
}

let issuedAt = 0;

try {
  const parts = token.split(".");

  if (parts.length === 3) {
    const encodedPayload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const paddedPayload =
      encodedPayload +
      "=".repeat(
        (4 - (encodedPayload.length % 4)) % 4,
      );

    const payload = JSON.parse(
      atob(paddedPayload),
    ) as {
      exp?: unknown;
      iat?: unknown;
    };

    if (typeof payload.exp === "number") {
      const now = Math.floor(
        Date.now() / 1000,
      );

      if (payload.exp <= now) {
        continue;
      }
    }

    if (typeof payload.iat === "number") {
      issuedAt = payload.iat;
    }
  }
} catch {
  // Keep token if JWT cannot be decoded.
}

candidates.push({
  token,
  issuedAt,
  priority,
});


}

if (candidates.length === 0) {
return null;
}

candidates.sort((a, b) => {
if (b.issuedAt !== a.issuedAt) {
return b.issuedAt - a.issuedAt;
}

return a.priority - b.priority;

});

return candidates[0].token;
}

async function parseResponse<T>(
response: Response,
): Promise<T> {
const contentType =
response.headers.get("content-type") || "";

if (!response.ok) {
let message =
`Request failed with status ${response.status}.`;

if (
  contentType.includes("application/json")
) {
  try {
    const body = (await response.json()) as {
      message?: unknown;
      error?: unknown;
    };

    if (typeof body.message === "string") {
      message = body.message;
    } else if (Array.isArray(body.message)) {
      message = body.message
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .join(", ");
    } else if (
      typeof body.error === "string"
    ) {
      message = body.error;
    }
  } catch {
    // Ignore invalid JSON.
  }
} else {
  try {
    const text = await response.text();

    if (text.trim()) {
      message = text;
    }
  } catch {
    // Ignore response parsing errors.
  }
}

if (response.status === 401) {
  throw new Error("UNAUTHORIZED");
}

if (response.status === 403) {
  throw new Error("FORBIDDEN");
}

if (response.status === 404) {
  throw new Error("WISHLIST_NOT_FOUND");
}

throw new Error(message);
}

if (response.status === 204) {
return undefined as T;
}

const text = await response.text();

if (!text.trim()) {
return undefined as T;
}

try {
return JSON.parse(text) as T;
} catch {
throw new Error(
"Invalid JSON response from wishlist API.",
);
}
}

async function request<T>(
path: string,
options: RequestInit = {},
): Promise<T> {
const token = getAuthToken();

const headers = new Headers(
options.headers,
);

headers.set(
"Accept",
"application/json",
);

if (options.body) {
headers.set(
"Content-Type",
"application/json",
);
}

if (token) {
headers.set(
"Authorization",
`Bearer ${token}`,
);
}

const response = await fetch(
path,
{
...options,
headers,
credentials: "include",
},
);

return parseResponse<T>(response);
}

function normalizeProductIds(
value: unknown,
): string[] {
if (!Array.isArray(value)) {
return [];
}

return Array.from(
new Set(
value
.filter(
(productId): productId is string =>
typeof productId === "string" &&
productId.trim().length > 0,
)
.map((productId) =>
productId.trim(),
),
),
);
}

export async function fetchServerWishlist(): Promise<
string[]

> {
 const result =
 await request<WishlistResponse>(
 WISHLIST_ENDPOINT,
 {
 method: "GET",
 },
 );

if (Array.isArray(result)) {
return normalizeProductIds(result);
}

if (
result &&
typeof result === "object"
) {
const productIds =
normalizeProductIds(
result.productIds,
);

if (productIds.length > 0) {
  return productIds;
}

const items =
  normalizeProductIds(
    result.items,
  );

if (items.length > 0) {
  return items;
}

const data =
  normalizeProductIds(
    result.data,
  );

if (data.length > 0) {
  return data;
}

}

return [];
}

export async function syncServerWishlist(
productIds: string[],
): Promise<void> {
const uniqueProductIds =
normalizeProductIds(productIds);

await request<void>(
WISHLIST_ENDPOINT,
{
method: "PUT",
body: JSON.stringify({
productIds: uniqueProductIds,
}),
},
);
}

export const wishlistApi = {
fetchServerWishlist,
syncServerWishlist,
};

export default wishlistApi;
