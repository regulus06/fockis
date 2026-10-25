import { api } from "../../../api/api";

import categoryApi from "../../fockis-shop/services/categoryApi";

// =====================================================

// ACTIVE STORE HELPER

// =====================================================

async function getActiveStoreId(): Promise<string | null> {

  const savedStore = localStorage.getItem("activeStoreId");

  if (

    savedStore &&

    savedStore !== "undefined" &&

    savedStore !== "null"

  ) {

    return savedStore;

  }

  try {

    const res = await api.get("/stores/me");

    const stores = Array.isArray(res.data)

      ? res.data

      : res.data

        ? [res.data]

        : [];

    const store = stores[0];

    if (store?._id) {

      localStorage.setItem(

        "activeStoreId",

        String(store._id),

      );

      return String(store._id);

    }

  } catch (error) {

    console.error(

      "Cannot load active store:",

      error,

    );

  }

  return null;

}

// =====================================================

// SELLER API

// =====================================================

export const sellerApi = {

  // ===================================================

  // STORES

  // ===================================================

  getMyStores: async () => {

    const res = await api.get("/stores/me");

    return res.data;

  },

  getMyStore: async () => {

    const res = await api.get("/stores/me");

    return res.data;

  },

  // ===================================================

  // PUBLIC STORE

  //

  // IMPORTANT:

  // This does NOT use /stores/me.

  //

  // Anyone can use this endpoint to view a public store.

  // ===================================================

  getStoreBySlug: async (

    slug: string,

  ) => {

    if (

      !slug ||

      slug === "undefined" ||

      slug === "null"

    ) {

      throw new Error(

        "Store slug is required",

      );

    }

    const normalizedSlug =

      String(slug)

        .trim()

        .toLowerCase();

    const res = await api.get(

      `/stores/slug/${encodeURIComponent(normalizedSlug)}`,

    );

    return res.data;

  },

  // ===================================================

  // PUBLIC STORE BY DOMAIN

  // ===================================================

  getStoreByDomain: async (

    domain: string,

  ) => {

    if (

      !domain ||

      domain === "undefined" ||

      domain === "null"

    ) {

      throw new Error(

        "Store domain is required",

      );

    }

    const normalizedDomain =

      String(domain)

        .trim()

        .toLowerCase();

    const res = await api.get(

      `/stores/domain/${encodeURIComponent(normalizedDomain)}`,

    );

    return res.data;

  },

  // ===================================================

  // DOMAIN AVAILABILITY

  // ===================================================

  checkStoreDomainAvailability: async (

    domain: string,

  ) => {

    if (!domain) {

      throw new Error(

        "Domain name is required",

      );

    }

    const normalizedDomain =

      String(domain)

        .trim()

        .toLowerCase();

    const res = await api.get(

      `/stores/domain/check?domain=${encodeURIComponent(normalizedDomain)}`,

    );

    return res.data;

  },

  // ===================================================

  // CREATE STORE

  // ===================================================

  createStore: async (

    data: any,

  ) => {

    const res = await api.post(

      "/stores",

      data,

    );

    if (res.data?._id) {

      localStorage.setItem(

        "activeStoreId",

        String(res.data._id),

      );

    }

    return res.data;

  },

  // ===================================================

  // UPDATE STORE

  // ===================================================

  updateStore: async (

    id: string,

    data: any,

  ) => {

    if (!id) {

      throw new Error(

        "Store ID is required",

      );

    }

    const res = await api.put(

      `/stores/${id}`,

      data,

    );

    return res.data;

  },

  // ===================================================

  // DELETE STORE

  // ===================================================

  deleteStore: async (

    id: string,

  ) => {

    if (!id) {

      throw new Error(

        "Store ID is required",

      );

    }

    const res = await api.delete(

      `/stores/${id}`,

    );

    const activeStore =

      localStorage.getItem(

        "activeStoreId",

      );

    if (activeStore === id) {

      localStorage.removeItem(

        "activeStoreId",

      );

    }

    return res.data;

  },

  // ===================================================

  // STORE DASHBOARD

  // ===================================================

  getStoreDashboard: async (

    storeId?: string,

  ) => {

    const activeStore =

      storeId ||

      (await getActiveStoreId());

    if (!activeStore) {

      return null;

    }

    const res = await api.get(

      `/stores/${activeStore}/dashboard`,

    );

    return res.data;

  },

  // ===================================================

  // IMAGE UPLOAD

  // ===================================================

  uploadImage: async (

    formData: FormData,

  ) => {

    const res = await api.post(

      "/uploads",

      formData,

      {

        headers: {

          "Content-Type": "multipart/form-data",

        },

      },

    );

    const uploaded = res.data;

    // The backend returns `media` and `storageKey` for Google Cloud Storage.

    if (!uploaded?.success || !uploaded?.storageKey) {

      throw new Error(

        uploaded?.message ||

          "Image upload failed: the server did not return a Google Cloud Storage key.",

      );

    }

    // Use the stable API media route instead of an expiring signed URL.

    const encodedKey = String(uploaded.storageKey)

      .split("/")

      .map((segment: string) => encodeURIComponent(segment))

      .join("/");

    const baseUrl = String(api.defaults.baseURL || "")

      .replace(/\/+$/, "");

    if (!baseUrl) {

      throw new Error(

        "Image upload failed: API base URL is not configured.",

      );

    }

    const imageUrl = `${baseUrl}/uploads/media/${encodedKey}`;

    return {

      url: imageUrl,

      storageKey: String(uploaded.storageKey),

      thumbnailUrl: imageUrl,

      thumbnailStorageKey: String(uploaded.storageKey),

    };

  },

  // FOCKIS SHOP CATEGORIES

  getCategories: async () => {

    const categories = await categoryApi.listCategories();

    if (!Array.isArray(categories)) {

      console.error("Fockis Shop categories did not return an array.");

      return [];

    }

    return categories;

  },

  // PRODUCTS

  // ===================================================

  getMyProducts: async () => {

    const activeStore =

      await getActiveStoreId();

    if (!activeStore) {

      return [];

    }

    const res = await api.get(

      `/fockis-shop/products/seller/${activeStore}`,

    );

    return Array.isArray(res.data)

      ? res.data

      : [];

  },

  // ===================================================

  // CREATE PRODUCT

  // ===================================================

  createProduct: async (

    data: any,

  ) => {

    const storeId =

      data.storeId ||

      (await getActiveStoreId());

    if (

      !storeId ||

      storeId === "undefined" ||

      storeId === "null"

    ) {

      throw new Error(

        "No active store found",

      );

    }

    const images =

      Array.isArray(

        data.images,

      )

        ? data.images.filter(

            (img: string) =>

              Boolean(img) &&

              img !== "undefined" &&

              !img.includes(

                "/uploads/undefined",

              ),

          )

        : [];

    const payload: any = {

      storeId,

      name: String(

        data.name ?? "",

      ).trim(),

      description:

        data.description || "",

      price: Number(

        data.price ?? 0,

      ),

      stock: Number(

        data.stock ?? 0,

      ),

      category:

        data.category || "",

      images,

      displayLocations:

        Array.isArray(

          data.displayLocations,

        ) &&

        data.displayLocations.length

          ? data.displayLocations

          : ["marketplace"],

    };

    if (

      data.discount !== undefined &&

      data.discount !== null &&

      data.discount !== ""

    ) {

      payload.discount =

        Number(data.discount);

    }

    if (data.brand) {

      payload.brand = data.brand;

    }

    if (data.location) {

      payload.location =

        data.location;

    }

    if (

      payload.displayLocations.includes(

        "feed",

      )

    ) {

      payload.feedDays =

        Number(

          data.feedDays ?? 3,

        );

    }

    if (

      payload.displayLocations.includes(

        "story",

      ) &&

      data.storyDays !== undefined

    ) {

      payload.storyDays =

        Number(

          data.storyDays,

        );

    }

    console.log(

      "CREATE PRODUCT PAYLOAD:",

      payload,

    );

    const res = await api.post(

      "/fockis-shop/products",

      payload,

    );

    return res.data;

  },

  // ===================================================

  // SELLER PRODUCTS

  // ===================================================

  getSellerProducts: async (

    storeId?: string,

  ) => {

    const activeStore =

      storeId ||

      (await getActiveStoreId());

    if (

      !activeStore ||

      activeStore === "undefined" ||

      activeStore === "null"

    ) {

      return [];

    }

    const res = await api.get(

      `/fockis-shop/products/seller/${activeStore}`,

    );

    return Array.isArray(res.data)

      ? res.data

      : [];

  },

  // ===================================================

  // SELLER ALL PRODUCTS

  // ===================================================

  getAllSellerProducts: async () => {

    const res = await api.get(

      "/fockis-shop/products/seller",

    );

    return Array.isArray(res.data)

      ? res.data

      : [];

  },

  // ===================================================

  // PUBLIC STORE PRODUCTS

  // ===================================================

  getStoreProducts: async (

    storeId: string,

  ) => {

    if (

      !storeId ||

      storeId === "undefined" ||

      storeId === "null"

    ) {

      return [];

    }

    const res = await api.get(

      `/fockis-shop/products/store/${encodeURIComponent(storeId)}`,

    );

    return Array.isArray(res.data)

      ? res.data

      : [];

  },

  // ===================================================

  // SINGLE PRODUCT

  // ===================================================

  getProductById: async (

    id: string,

  ) => {

    if (

      !id ||

      id === "undefined" ||

      id === "null"

    ) {

      throw new Error(

        "Product ID is required",

      );

    }

    const res = await api.get(

      `/fockis-shop/products/${encodeURIComponent(id)}`,

    );

    return res.data;

  },

  // ===================================================

  // UPDATE PRODUCT

  // ===================================================

  updateProduct: async (
    id: string,
    data: any,
  ) => {
    if (
      !id ||
      id === "undefined" ||
      id === "null"
    ) {
      throw new Error("Product ID is required");
    }

    // Build a partial-update payload. Do not send empty defaults for fields
    // that the caller did not intend to change.
    const payload: Record<string, any> = {};

    if (data.name !== undefined) {
      payload.name = String(data.name).trim();
    }

    if (data.description !== undefined) {
      payload.description = data.description;
    }

    if (data.price !== undefined) {
      payload.price = Number(data.price);
    }

    if (data.stock !== undefined) {
      payload.stock = Number(data.stock);
    }

    if (data.category !== undefined) {
      payload.category = data.category;
    }

    if (Array.isArray(data.images)) {
      payload.images = data.images.filter(
        (img: unknown): img is string =>
          typeof img === "string" &&
          Boolean(img.trim()) &&
          img !== "undefined" &&
          !img.includes("/uploads/undefined"),
      );
    }

    if (Array.isArray(data.displayLocations)) {
      payload.displayLocations = data.displayLocations;
    }

    if (
      data.discount !== undefined &&
      data.discount !== null &&
      data.discount !== ""
    ) {
      payload.discount = Number(data.discount);
    }

    if (data.brand !== undefined) {
      payload.brand = data.brand;
    }

    if (data.location !== undefined) {
      payload.location = data.location;
    }

    if (
      Array.isArray(payload.displayLocations) &&
      payload.displayLocations.includes("feed")
    ) {
      payload.feedDays = Number(data.feedDays ?? 3);
    } else if (data.feedDays !== undefined) {
      payload.feedDays = Number(data.feedDays);
    }

    if (
      Array.isArray(payload.displayLocations) &&
      payload.displayLocations.includes("story") &&
      data.storyDays !== undefined
    ) {
      payload.storyDays = Number(data.storyDays);
    }

    console.log("UPDATE PRODUCT PAYLOAD:", payload);

    try {
      const res = await api.put(
        `/fockis-shop/products/${encodeURIComponent(id)}`,
        payload,
      );
      return res.data;
    } catch (error: any) {
      console.error(
        "UPDATE PRODUCT FAILED:",
        error?.response?.status,
        error?.response?.data ?? error?.message,
      );
      throw error;
    }
  },

  // DELETE PRODUCT

  // ===================================================

  deleteProduct: async (

    id: string,

  ) => {

    if (

      !id ||

      id === "undefined"

    ) {

      throw new Error(

        "Product ID is required",

      );

    }

    const res = await api.delete(

      `/fockis-shop/products/${encodeURIComponent(id)}`,

    );

    return res.data;

  },

  // ===================================================

  // ORDERS

  // ===================================================

  getSellerOrders: async (

    storeId?: string,

  ) => {

    const activeStore =

      storeId ||

      (await getActiveStoreId());

    if (

      !activeStore ||

      activeStore === "undefined"

    ) {

      return [];

    }

    const res = await api.get(

      `/marketplace/orders/seller/store/${encodeURIComponent(activeStore)}`,

    );

    return Array.isArray(res.data)

      ? res.data

      : [];

  },

  // ===================================================

  // SELLER PROFILE

  // ===================================================

  getSellerProfile: async (

    sellerId?: string,

  ) => {

    const endpoint =

      sellerId

        ? `/seller/${encodeURIComponent(

            sellerId,

          )}`

        : "/seller/profile";

    const res = await api.get(

      endpoint,

    );

    return res.data;

  },

  updateSellerProfile: async (

    data: any,

  ) => {

    const res = await api.put(

      "/seller/profile",

      data,

    );

    return res.data;

  },

  // ===================================================

  // MESSAGES

  // ===================================================

  getSellerMessages: async () => {

    const res = await api.get(

      "/messages/seller",

    );

    return res.data;

  },

  contactSeller: async (

    sellerId: string,

    message: string,

  ) => {

    if (!sellerId) {

      throw new Error(

        "Seller ID is required",

      );

    }

    const res = await api.post(

      "/messages",

      {

        sellerId,

        message,

      },

    );

    return res.data;

  },

  // ===================================================

  // PUBLIC SELLER PROFILE

  // ===================================================

  getPublicSellerProfile: async (

    sellerId: string,

  ) => {

    if (!sellerId) {

      throw new Error(

        "Seller ID is required",

      );

    }

    const res = await api.get(

      `/seller/${encodeURIComponent(

        sellerId,

      )}`,

    );

    return res.data;

  },

};

export default sellerApi;
