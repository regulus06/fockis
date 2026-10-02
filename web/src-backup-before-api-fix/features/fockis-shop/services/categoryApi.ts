import type { Category } from "../types/category.types";

const API_BASE_URL =
import.meta.env.VITE_API_BASE_URL ||
import.meta.env.VITE_API_URL ||
"http://localhost:3000";

function buildUrl(path: string): string {
return new URL(
`${API_BASE_URL}${path}`,
window.location.origin,
).toString();
}

async function request<T>(
path: string,
): Promise<T> {
const response = await fetch(
buildUrl(path),
{
method: "GET",
headers: {
Accept: "application/json",
},
},
);

const contentType =
response.headers.get("content-type") ?? "";

const data: unknown =
contentType.includes("application/json")
? await response.json()
: await response.text();

if (!response.ok) {
let message =
`Request failed with status ${response.status}`;

```
if (
  data &&
  typeof data === "object"
) {
  const body = data as {
    message?: string | string[];
    error?: string;
  };

  if (
    Array.isArray(body.message)
  ) {
    message =
      body.message.join(", ");
  } else if (
    typeof body.message === "string"
  ) {
    message =
      body.message;
  } else if (
    typeof body.error === "string"
  ) {
    message =
      body.error;
  }
} else if (
  typeof data === "string" &&
  data.trim()
) {
  message = data;
}

throw new Error(message);
```

}

return data as T;
}

export async function listCategories(): Promise<Category[]> {
return request<Category[]>(
"/marketplace/categories",
);
}

function createCategorySlug(
category: Category,
): string {
const categoryWithSlug =
category as Category & {
slug?: string;
};

const source =
categoryWithSlug.slug ??
category.name ??
"";

return String(source)
.trim()
.toLowerCase()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-|-$/g, "");
}

export async function getCategoryBySlug(
slug: string,
): Promise<Category | null> {
if (!slug) {
return null;
}

const categories =
await listCategories();

const normalizedSlug =
slug
.trim()
.toLowerCase()
.replace(/[^a-z0-9]+/g, "-")
.replace(/^-|-$/g, "");

return (
categories.find(
(category) =>
createCategorySlug(category) ===
normalizedSlug,
) ?? null
);
}

export const categoryApi = {
listCategories,
getCategoryBySlug,
};

export default categoryApi;
