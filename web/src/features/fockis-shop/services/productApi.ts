import { FOCKIS_API_URL } from "../../../config/fockisConfig";

/**

* ============================================================================
* FOCKIS SHOP — PRODUCT API
* ============================================================================
*
* Real backend product API.
*
* Backend:
* GET /fockis-shop/products
* GET /fockis-shop/products/:id
* GET /fockis-shop/reviews/product/:productId
* GET /fockis-shop/reviews/product/:productId/summary
*
* Authentication is supported when a Fockis auth token exists.
* ============================================================================
  */

import type {
Product,
ProductListFilters,
ProductSortOption,
ProductImage,
ProductShippingInfo,
ProductReview,
ProductReviewSummary,
StockStatus,
ProductStatus,
} from "../types/product.types";

const API_BASE_URL =
import.meta.env.VITE_API_BASE_URL ||
import.meta.env.VITE_API_URL ||
FOCKIS_API_URL;

const FOCKIS_SHOP_BASE = "/fockis-shop";

type ProductQueryFilters = ProductListFilters & {
search?: string;
categoryId?: string;
pageSize?: number;
};

export interface ProductPaginatedResult {
items: Product[];
page: number;
pageSize: number;
total: number;
totalPages: number;
}

interface BackendProduct {
_id?: string;
id?: string;

name?: string;
description?: string;
shortDescription?: string;

price?: number;
salePrice?: number | null;
discount?: number;
currency?: string;

images?: unknown[];
image?: string;
emoji?: string;

category?: unknown;
categoryId?: string;
categorySlug?: string;

brand?: string;
tags?: string[];

stock?: number;
stockQuantity?: number;

sku?: string;

seller?: unknown;
storeId?: unknown;

rating?: number;
totalReviews?: number;

shipping?: Partial<ProductShippingInfo>;

status?: ProductStatus;
isActive?: boolean;

createdAt?: string;
updatedAt?: string;

slug?: string;
}

interface BackendProductPaginatedResult {
items?: BackendProduct[];
products?: BackendProduct[];

page?: number;
pageSize?: number;
total?: number;

pages?: number;
totalPages?: number;
}

interface BackendReview {
_id?: unknown;
id?: unknown;

productId?: unknown;
authorId?: unknown;

authorName?: unknown;
authorAvatarUrl?: unknown;

rating?: unknown;
title?: unknown;
body?: unknown;

verifiedPurchase?: unknown;
helpfulCount?: unknown;

sellerReply?: {
body?: unknown;
createdAt?: unknown;
} | null;

sellerReplyBody?: unknown;
sellerReplyCreatedAt?: unknown;

createdAt?: unknown;
updatedAt?: unknown;
}

interface BackendReviewSummary {
averageRating?: unknown;
totalReviews?: unknown;
ratingBreakdown?: unknown;
}

type QueryValue =
| string
| number
| boolean
| undefined
| null;

type QueryParams = Record<string, QueryValue>;

function isRecord(
value: unknown,
): value is Record<string, unknown> {
return (
typeof value === "object" &&
value !== null &&
!Array.isArray(value)
);
}

function getAuthToken(): string | null {
if (typeof window === "undefined") {
return null;
}

return (
localStorage.getItem("access_token") ||
localStorage.getItem("accessToken") ||
localStorage.getItem("token") ||
localStorage.getItem("authToken") ||
localStorage.getItem("jwt") ||
localStorage.getItem("fockis_token") ||
localStorage.getItem("fockis_auth_token")
);
}

function buildUrl(
path: string,
params?: QueryParams,
): string {
const url = new URL(
`${API_BASE_URL}${path}`,
window.location.origin,
);

if (params) {
Object.entries(params).forEach(
([key, value]) => {
if (
value !== undefined &&
value !== null &&
value !== ""
) {
url.searchParams.set(
key,
String(value),
);
}
},
);
}

return url.toString();
}

async function request<T>(
path: string,
options: RequestInit = {},
params?: QueryParams,
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
buildUrl(path, params),
{
...options,
headers,
},
);

const contentType =
response.headers.get(
"content-type",
) ?? "";

let data: unknown;

if (
contentType.includes(
"application/json",
)
) {
data = await response.json();
} else {
data = await response.text();
}

if (!response.ok) {
let message =
`Request failed with status ${response.status}`;
if (isRecord(data)) {
  const body = data as {
    message?: unknown;
    error?: unknown;
  };

  if (
    Array.isArray(
      body.message,
    )
  ) {
    message =
      body.message
        .filter(
          (
            item,
          ): item is string =>
            typeof item ===
            "string",
        )
        .join(", ") ||
      message;
  } else if (
    typeof body.message ===
    "string"
  ) {
    message =
      body.message;
  } else if (
    typeof body.error ===
    "string"
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

if (response.status === 401) {
  throw new Error(
    "UNAUTHORIZED",
  );
}

if (response.status === 404) {
  throw new Error(
    "PRODUCT_NOT_FOUND",
  );
}

throw new Error(message);
}

return data as T;
}

function getId(
value: unknown,
): string {
if (!value) {
return "";
}

if (typeof value === "string") {
return value;
}

if (isRecord(value)) {
if (
typeof value._id ===
"string"
) {
return value._id;
}
if (
  typeof value.id ===
  "string"
) {
  return value.id;
}

}

return "";
}

function getString(
value: unknown,
fallback = "",
): string {
return typeof value === "string"
? value
: fallback;
}

function getNumber(
value: unknown,
fallback = 0,
): number {
return (
typeof value === "number" &&
Number.isFinite(value)
)
? value
: fallback;
}

function slugify(
value: string,
): string {
return value
.trim()
.toLowerCase()
.replace(
/[^a-z0-9]+/g,
"-",
)
.replace(
/^-+|-+$/g,
"",
);
}

function normalizeImages(
images: unknown,
fallbackImage?: string,
productName = "Product",
): ProductImage[] {
if (!Array.isArray(images)) {
if (fallbackImage) {
return [
{
id: "primary",
url: fallbackImage,
alt: productName,
isPrimary: true,
sortOrder: 0,
},
];
}

return [];

}

return images
.map(
(
image: unknown,
index: number,
): ProductImage | null => {
if (
typeof image ===
"string"
) {
return {
id: `image-${index}`,
url: image,
alt: productName,
isPrimary:
index === 0,
sortOrder: index,
};
}
    if (isRecord(image)) {
      const url =
        getString(
          image.url,
        ) ||
        getString(
          image.src,
        );

      if (!url) {
        return null;
      }

      return {
        id:
          getString(
            image.id,
          ) ||
          getString(
            image._id,
          ) ||
          `image-${index}`,

        url,

        alt:
          getString(
            image.alt,
          ) ||
          productName,

        isPrimary:
          typeof image.isPrimary ===
          "boolean"
            ? image.isPrimary
            : index === 0,

        sortOrder:
          getNumber(
            image.sortOrder,
            index,
          ),
      };
    }

    return null;
  },
)
.filter(
  (
    image,
  ): image is ProductImage =>
    image !== null,
);
}

function getStoreData(
product: BackendProduct,
): {
storeId: string;
storeName: string;
storeSlug: string;
storeCountryFlag?: string;
storeVerified?: boolean;
} {
const store =
product.storeId;

if (isRecord(store)) {
const storeName =
getString(
store.name,
"Fockis Store",
);
return {
  storeId:
    getId(store),

  storeName,

  storeSlug:
    getString(
      store.slug,
    ) ||
    slugify(
      storeName,
    ),

  storeCountryFlag:
    getString(
      store.countryFlag,
    ) ||
    undefined,

  storeVerified:
    typeof store.verified ===
    "boolean"
      ? store.verified
      : undefined,
};

}

return {
storeId:
getId(store),

storeName:
  "Fockis Store",

storeSlug:
  "fockis-store",
};
}

function getSellerName(
seller: unknown,
): string | undefined {
if (!isRecord(seller)) {
return undefined;
}

return (
getString(
seller.displayName,
) ||
getString(
seller.name,
) ||
getString(
seller.username,
) ||
undefined
);
}

function getCategoryData(
product: BackendProduct,
): {
categoryId: string;
categorySlug: string;
} {
if (
isRecord(
product.category,
)
) {
const category =
product.category;

const name =
  getString(
    category.name,
  );

return {
  categoryId:
    product.categoryId ||
    getId(category),

  categorySlug:
    product.categorySlug ||
    getString(
      category.slug,
    ) ||
    slugify(name),
};


}

const category =
getString(
product.category,
);

return {
categoryId:
product.categoryId ||
category,
categorySlug:
  product.categorySlug ||
  slugify(category),
};
}

function normalizeStockStatus(
product: BackendProduct,
stockQuantity: number,
): StockStatus {
if (
product.status ===
"archived" ||
product.isActive === false
) {
return "out_of_stock";
}

if (stockQuantity <= 0) {
return "out_of_stock";
}

if (stockQuantity <= 5) {
return "low_stock";
}

return "in_stock";
}

function normalizeReviews(
product: BackendProduct,
): ProductReviewSummary {
return {
averageRating:
getNumber(
product.rating,
0,
),

totalReviews:
  getNumber(
    product.totalReviews,
    0,
  ),

ratingBreakdown: {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
},
};
}

function normalizeShipping(
product: BackendProduct,
): ProductShippingInfo {
const shipping =
product.shipping ?? {};

return {
localDelivery:
shipping.localDelivery ??
false,
nationalDelivery:
  shipping.nationalDelivery ??
  false,

internationalShipping:
  shipping.internationalShipping ??
  false,

pickupAvailable:
  shipping.pickupAvailable ??
  false,

freeDeliveryThreshold:
  shipping.freeDeliveryThreshold ??
  null,

estimatedDeliveryDays:
  shipping.estimatedDeliveryDays ??
  null,

weightKg:
  shipping.weightKg ??
  null,

dimensionsCm:
  shipping.dimensionsCm ??
  null,


};
}

function normalizeProduct(
raw: BackendProduct,
): Product {
const id =
getString(raw.id) ||
getString(raw._id);

const name =
getString(
raw.name,
"Untitled Product",
);

const slug =
getString(raw.slug) ||
slugify(name);

const store =
getStoreData(raw);

const category =
getCategoryData(raw);

const price =
getNumber(
raw.price,
0,
);

const discount =
getNumber(
raw.discount,
0,
);

const calculatedSalePrice =
discount > 0
? Number(
(
price *
(1 - discount / 100)
).toFixed(2),
)
: null;

const salePrice =
raw.salePrice ??
calculatedSalePrice;

const stockQuantity =
getNumber(
raw.stockQuantity ??
raw.stock,
0,
);

let image:
| string
| undefined;

if (raw.image) {
image =
getString(
raw.image,
) || undefined;
}

if (
!image &&
Array.isArray(raw.images)
) {
const firstImage =
raw.images[0];
if (
  typeof firstImage ===
  "string"
) {
  image =
    firstImage;
} else if (
  isRecord(firstImage)
) {
  image =
    getString(
      firstImage.url,
    ) ||
    getString(
      firstImage.src,
    ) ||
    undefined;
}
}

const images =
normalizeImages(
raw.images,
image,
name,
);

const status: ProductStatus =
raw.status ??
(
raw.isActive === false
? "unpublished"
: "active"
);

return {
id,
slug,
storeId:
  store.storeId,

storeName:
  store.storeName,

storeSlug:
  store.storeSlug,

storeCountryFlag:
  store.storeCountryFlag,

storeVerified:
  store.storeVerified,

name,

description:
  getString(
    raw.description,
  ),

shortDescription:
  getString(
    raw.shortDescription,
  ) ||
  undefined,

categoryId:
  category.categoryId,

categorySlug:
  category.categorySlug,

tags:
  Array.isArray(raw.tags)
    ? raw.tags.filter(
        (
          tag,
        ): tag is string =>
          typeof tag ===
          "string",
      )
    : [],

price,

salePrice,

currency:
  getString(
    raw.currency,
    "USD",
  ),

image,

images,

emoji:
  getString(
    raw.emoji,
  ) ||
  undefined,

stockQuantity,

stockStatus:
  normalizeStockStatus(
    raw,
    stockQuantity,
  ),

lowStockThreshold:
  5,

sku:
  getString(
    raw.sku,
  ),

hasVariants:
  false,

variants: [],

shipping:
  normalizeShipping(
    raw,
  ),

reviews:
  normalizeReviews(
    raw,
  ),

badge:
  salePrice !== null &&
  salePrice < price
    ? "sale"
    : null,

status,

createdAt:
  getString(
    raw.createdAt,
    new Date().toISOString(),
  ),

updatedAt:
  getString(
    raw.updatedAt,
    new Date().toISOString(),
  ),
};
}

function normalizePaginatedResult(
data:
| BackendProductPaginatedResult
| BackendProduct[],
): ProductPaginatedResult {
if (Array.isArray(data)) {
return {
items:
data.map(
(
product,
) =>
normalizeProduct(
product,
),
),

  page: 1,

  pageSize:
    data.length,

  total:
    data.length,

  totalPages:
    data.length > 0
      ? 1
      : 0,
};

}

const rawItems =
Array.isArray(data.items)
? data.items
: Array.isArray(
data.products,
)
? data.products
: [];

const page =
getNumber(
data.page,
1,
);

const pageSize =
getNumber(
data.pageSize,
rawItems.length || 24,
);

const total =
getNumber(
data.total,
rawItems.length,
);

const calculatedTotalPages =
total > 0
? Math.ceil(
total /
Math.max(
pageSize,
1,
),
)
: 0;

const totalPages =
getNumber(
data.totalPages ??
data.pages,
calculatedTotalPages,
);

return {
items:
rawItems.map(
(
product,
) =>
normalizeProduct(
product,
),
),

page,

pageSize,

total,

totalPages,

};
}

function mapSort(
sort:
| ProductSortOption
| string
| undefined,
): string | undefined {
switch (sort) {
case "price_asc":
return "price-low";

case "price_desc":
  return "price-high";

case "rating":
  return "rating";

case "newest":
  return "newest";

case "bestselling":
  return "rating";

case "relevance":
  return undefined;

default:
  return sort;
}
}

function normalizeCategoryFilter(
filters: ProductQueryFilters,
): string | undefined {
if (
filters.categoryId
) {
return filters.categoryId;
}

return undefined;
}

// ============================================================================
// PRODUCT REVIEWS — NORMALIZATION
// ============================================================================

function normalizeReview(
raw: BackendReview,
index: number,
): ProductReview {
const id =
getId(raw.id) ||
getId(raw._id) ||
`review-${index}`;

const productId =
getId(
raw.productId,
);

const authorId =
getId(
raw.authorId,
);

const ratingNumber =
Math.round(
getNumber(
raw.rating,
0,
),
);

const rating =
Math.min(
5,
Math.max(
1,
ratingNumber || 1,
),
) as
| 1
| 2
| 3
| 4
| 5;

const sellerReplyBody =
getString(
raw.sellerReplyBody,
) ||
getString(
raw.sellerReply?.body,
);

const sellerReplyCreatedAt =
getString(
raw.sellerReplyCreatedAt,
) ||
getString(
raw.sellerReply?.createdAt,
);

const createdAt =
getString(
raw.createdAt,
new Date().toISOString(),
);

return {
id,

productId,

authorId,

authorName:
  getString(
    raw.authorName,
    "Fockis User",
  ),

authorAvatarUrl:
  getString(
    raw.authorAvatarUrl,
  ) ||
  undefined,

rating,

title:
  getString(
    raw.title,
  ) ||
  undefined,

body:
  getString(
    raw.body,
  ),

verifiedPurchase:
  Boolean(
    raw.verifiedPurchase,
  ),

helpfulCount:
  getNumber(
    raw.helpfulCount,
    0,
  ),

createdAt,

sellerReply:
  sellerReplyBody
    ? {
        body:
          sellerReplyBody,

        createdAt:
          sellerReplyCreatedAt ||
          createdAt,
      }
    : null,

};
}

function extractReviewArray(
data: unknown,
): BackendReview[] {
if (Array.isArray(data)) {
return data as BackendReview[];
}

if (!isRecord(data)) {
return [];
}

if (
Array.isArray(
data.reviews,
)
) {
return data.reviews as BackendReview[];
}

if (
Array.isArray(
data.items,
)
) {
return data.items as BackendReview[];
}

if (
Array.isArray(
data.data,
)
) {
return data.data as BackendReview[];
}

return [];
}

function normalizeReviewSummary(
data: unknown,
): ProductReviewSummary {
let raw: BackendReviewSummary =
{};

if (isRecord(data)) {
const source =
isRecord(data.data)
? data.data
: data;

raw = {
  averageRating:
    source.averageRating,

  totalReviews:
    source.totalReviews,

  ratingBreakdown:
    source.ratingBreakdown,
};

}

const breakdown: Record<
string,
unknown>

 =
 isRecord(
 raw.ratingBreakdown,
 )
 ? raw.ratingBreakdown
 : {};

return {
averageRating:
getNumber(
raw.averageRating,
0,
),
totalReviews:
  getNumber(
    raw.totalReviews,
    0,
  ),

ratingBreakdown: {
  1:
    getNumber(
      breakdown["1"],
      0,
    ),

  2:
    getNumber(
      breakdown["2"],
      0,
    ),

  3:
    getNumber(
      breakdown["3"],
      0,
    ),

  4:
    getNumber(
      breakdown["4"],
      0,
    ),

  5:
    getNumber(
      breakdown["5"],
      0,
    ),
},
};
}

// ============================================================================
// LIST PRODUCTS
// ============================================================================

export async function listProducts(
filters: ProductQueryFilters = {},
): Promise<ProductPaginatedResult> {
const page =
typeof filters.page ===
"number"
? Math.max(
1,
filters.page,
)
: 1;

const pageSize =
typeof filters.pageSize ===
"number"
? Math.max(
1,
filters.pageSize,
)
: 24;

const search =
typeof filters.search ===
"string"
? filters.search.trim()
: typeof filters.query ===
"string"
? filters.query.trim()
: undefined;

const categoryId =
normalizeCategoryFilter(
filters,
);

const sort =
mapSort(
filters.sort,
);

const data =
await request<
BackendProductPaginatedResult
>(
`${FOCKIS_SHOP_BASE}/products`,
{
method: "GET",
},
{
page,
pageSize,
search,
categoryId,
sort,
},
);

return normalizePaginatedResult(
data,
);
}

// ============================================================================
// GET PRODUCTS
// ============================================================================

export async function getProducts(
filters: ProductQueryFilters = {},
): Promise<ProductPaginatedResult> {
return listProducts(
filters,
);
}

// ============================================================================
// SEARCH PRODUCTS
// ============================================================================

export async function searchProducts(
search: string,
page = 1,
pageSize = 24,
): Promise<ProductPaginatedResult> {
return listProducts({
search,
page,
pageSize,
});
}

// ============================================================================
// GET PRODUCT BY ID
// ============================================================================

export async function getProductById(
productId: string,
): Promise<Product | null> {
if (!productId) {
return null;
}

try {
const data =
await request<
BackendProduct
>(
`${FOCKIS_SHOP_BASE}/products/${encodeURIComponent(
          productId,
        )}`,
{
method: "GET",
},
);
return normalizeProduct(
  data,
);

} catch (error) {
if (
error instanceof Error &&
(
error.message ===
"PRODUCT_NOT_FOUND" ||
error.message.includes(
"404",
) ||
error.message
.toLowerCase()
.includes(
"not found",
)
)
) {
return null;
}
throw error;
}
}

// ============================================================================
// GET PRODUCT BY SLUG
// ============================================================================

export async function getProductBySlug(
slug: string,
): Promise<Product | null> {
if (!slug) {
return null;
}

const normalizedSlug =
slug
.trim()
.toLowerCase();

const firstPage =
await listProducts({
page: 1,
pageSize: 100,
});

const found =
firstPage.items.find(
(
product: Product,
) =>
product.slug
.trim()
.toLowerCase() ===
normalizedSlug,
);

return found ?? null;
}

// ============================================================================
// GET PRODUCT REVIEWS
// ============================================================================

export async function getProductReviews(
productId: string,
): Promise<ProductReview[]> {
if (!productId) {
return [];
}

const data =
await request<unknown>(
`${FOCKIS_SHOP_BASE}/reviews/product/${encodeURIComponent(
        productId,
      )}`,
{
method: "GET",
},
);

return extractReviewArray(
data,
).map(
(
review,
index,
) =>
normalizeReview(
review,
index,
),
);
}

// ============================================================================
// GET PRODUCT REVIEW SUMMARY
// ============================================================================

export async function getProductReviewSummary(
productId: string,
): Promise<ProductReviewSummary> {
if (!productId) {
return {
averageRating: 0,
  totalReviews: 0,

  ratingBreakdown: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  },
};

}

const data =
await request<unknown>(
`${FOCKIS_SHOP_BASE}/reviews/product/${encodeURIComponent(
        productId,
      )}/summary`,
{
method: "GET",
},
);

return normalizeReviewSummary(
data,
);
}

// ============================================================================
// OBJECT API
// ============================================================================

export const productApi = {
listProducts,
getProducts,
searchProducts,
getProductById,
getProductBySlug,
getProductReviews,
getProductReviewSummary,
};

export default productApi;
