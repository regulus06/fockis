import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type { CartLineItem } from "../types/cart.types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL;

const CART_URL = `${API_BASE_URL}/fockis-shop/cart`;

const TOKEN_KEYS = [
  "access_token",
  "accessToken",
  "token",
  "authToken",
  "jwt",
  "fockis_token",
  "fockis_auth_token",
] as const;

type JwtPayload = {
  exp?: number;
  iat?: number;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];

    const base64 = base64Url
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map(
          (character) =>
            `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`,
        )
        .join(""),
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const candidates: Array<{
    key: string;
    token: string;
    iat: number;
  }> = [];

  for (const key of TOKEN_KEYS) {
    const token = window.localStorage.getItem(key)?.trim();

    if (!token) {
      continue;
    }

    if (isTokenExpired(token)) {
      continue;
    }

    const payload = decodeJwtPayload(token);

    candidates.push({
      key,
      token,
      iat: payload?.iat ?? 0,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (b.iat !== a.iat) {
      return b.iat - a.iat;
    }

    const aPriority = TOKEN_KEYS.indexOf(
      a.key as (typeof TOKEN_KEYS)[number],
    );

    const bPriority = TOKEN_KEYS.indexOf(
      b.key as (typeof TOKEN_KEYS)[number],
    );

    return aPriority - bPriority;
  });

  return candidates[0].token;
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  const authHeaders = getAuthHeaders();

  Object.entries(authHeaders).forEach(([key, value]) => {
    if (value) {
      headers.set(key, value);
    }
  });

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  let responseBody: unknown = null;

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
  } else {
    try {
      responseBody = await response.text();
    } catch {
      responseBody = null;
    }
  }

  if (!response.ok) {
    const backendMessage =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody
        ? String(
            (responseBody as { message?: unknown }).message ?? "",
          )
        : typeof responseBody === "string"
          ? responseBody
          : "";

    if (response.status === 401) {
      throw new Error(
        backendMessage ||
          "Your session has expired. Please sign in again.",
      );
    }

    throw new Error(
      backendMessage ||
        `Cart request failed with status ${response.status}.`,
    );
  }

  return responseBody as T;
}

export interface ServerCartItem {
  productId: string;
  quantity: number;

  product?: {
    _id?: string;
    id?: string;
    name?: string;
    title?: string;
    price?: number;
    image?: string;
    images?: string[];
    stock?: number;
  };

  price?: number;
  name?: string;
  image?: string;
}

export interface ServerCart {
  _id?: string;
  id?: string;
  userId?: string;

  items: ServerCartItem[];

  subtotal?: number;
  total?: number;

  createdAt?: string;
  updatedAt?: string;
}

export async function fetchServerCart(): Promise<ServerCart> {
  return request<ServerCart>(CART_URL, {
    method: "GET",
  });
}

export async function addItemToServerCart(
  productId: string,
  quantity: number,
): Promise<ServerCart> {
  return request<ServerCart>(CART_URL, {
    method: "POST",
    body: JSON.stringify({
      productId,
      quantity,
    }),
  });
}

export async function updateServerCartItem(
  productId: string,
  quantity: number,
): Promise<ServerCart> {
  return request<ServerCart>(
    `${CART_URL}/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        quantity,
      }),
    },
  );
}

export async function removeServerCartItem(
  productId: string,
): Promise<ServerCart> {
  return request<ServerCart>(
    `${CART_URL}/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function clearServerCart(): Promise<ServerCart> {
  return request<ServerCart>(CART_URL, {
    method: "DELETE",
  });
}

export async function syncServerCart(
  items: CartLineItem[],
): Promise<ServerCart> {
  const currentCart = await fetchServerCart();

  const serverItems = currentCart.items ?? [];

  const serverProductIds = new Set(
    serverItems.map((item) => item.productId),
  );

  for (const item of items) {
    const productId =
      String(
        (item as CartLineItem & {
          productId?: string;
          product?: { _id?: string; id?: string };
        }).productId ??
          (item as CartLineItem & {
            product?: { _id?: string; id?: string };
          }).product?._id ??
          (item as CartLineItem & {
            product?: { _id?: string; id?: string };
          }).product?.id ??
          "",
      );

    const quantity = Number(
      (item as CartLineItem & { quantity?: number }).quantity ?? 0,
    );

    if (!productId || quantity <= 0) {
      continue;
    }

    if (serverProductIds.has(productId)) {
      await updateServerCartItem(productId, quantity);
    } else {
      await addItemToServerCart(productId, quantity);
    }
  }

  return fetchServerCart();
}

export const cartApi = {
  fetchServerCart,
  addItemToServerCart,
  updateServerCartItem,
  removeServerCartItem,
  clearServerCart,
  syncServerCart,
};

export default cartApi;