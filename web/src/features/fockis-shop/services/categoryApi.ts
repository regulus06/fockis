import type { Category } from "../types/category.types";
import { CATEGORIES } from "../data/categoryData";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof data === "string"
        ? data || `Request failed with status ${response.status}`
        : `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

function normalizeCategories(data: unknown): Category[] {
  let rows = data;

  for (let depth = 0; depth < 4; depth++) {
    if (Array.isArray(rows)) break;
    if (!rows || typeof rows !== "object") return [];

    const object = rows as Record<string, unknown>;
    rows =
      object.categories ??
      object.data ??
      object.items ??
      object.results;
  }

  if (!Array.isArray(rows)) return [];

  return rows.filter(
    (item): item is Category =>
      !!item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).name === "string",
  );
}

export async function listCategories(): Promise<Category[]> {
  // The current Fockis Shop category catalogue.
  // Use this when the backend catalogue is not yet implemented.
  const localCategories = Array.isArray(CATEGORIES)
    ? CATEGORIES
    : [];

  if (localCategories.length > 0) {
    return localCategories;
  }

  // Fallback if the local catalogue is empty.
  try {
    return normalizeCategories(
      await request<unknown>("/marketplace/categories"),
    );
  } catch (error) {
    console.error("[Fockis Shop] Failed to load categories:", error);
    return [];
  }
}

function createCategorySlug(category: Category): string {
  return String(
    (category as Category & { slug?: string }).slug ??
      category.name ??
      "",
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  if (!slug) return null;

  const normalizedSlug = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    (await listCategories()).find(
      (category) => createCategorySlug(category) === normalizedSlug,
    ) ?? null
  );
}

export const categoryApi = {
  listCategories,
  getCategoryBySlug,
};

export default categoryApi;