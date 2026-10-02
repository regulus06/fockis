// features/admin/services/marketplaceAdminApi.ts

import api from "../../../api/api";

import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from "../types/Category";

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const marketplaceAdminApi = {
  // ===========================
  // Dashboard
  // ===========================

  getDashboard: () =>
    api.get("/admin/marketplace/dashboard"),

  getAnalytics: (params?: {
    from?: string;
    to?: string;
  }) =>
    api.get("/admin/marketplace/analytics", {
      params,
    }),

  // ===========================
  // Products
  // ===========================

  getProducts: (params?: PaginationParams) =>
    api.get("/admin/products", {
      params,
    }),

  getProduct: (id: string) =>
    api.get(`/admin/products/${id}`),

  createProduct: (data: any) =>
    api.post("/admin/products", data),

  updateProduct: (
    id: string,
    data: any,
  ) =>
    api.patch(`/admin/products/${id}`, data),

  deleteProduct: (id: string) =>
    api.delete(`/admin/products/${id}`),

  featureProduct: (id: string) =>
    api.patch(`/admin/products/${id}/feature`),

  unfeatureProduct: (id: string) =>
    api.patch(`/admin/products/${id}/unfeature`),

  hideProduct: (id: string) =>
    api.patch(`/admin/products/${id}/hide`),

  showProduct: (id: string) =>
    api.patch(`/admin/products/${id}/show`),

  approveProduct: (id: string) =>
    api.patch(`/admin/products/${id}/approve`),

  rejectProduct: (
    id: string,
    reason?: string,
  ) =>
    api.patch(`/admin/products/${id}/reject`, {
      reason,
    }),

  // ===========================
  // Categories
  // ===========================

  getCategories: (
    params?: PaginationParams,
  ) =>
    api.get("/admin/categories", {
      params,
    }),

  getCategory: (id: string) =>
    api.get(`/admin/categories/${id}`),

  createCategory: (
    data: CreateCategoryDto,
  ) =>
    api.post("/admin/categories", data),

  updateCategory: (
    id: string,
    data: UpdateCategoryDto,
  ) =>
    api.patch(
      `/admin/categories/${id}`,
      data,
    ),

  updateCategoryStatus: (
    id: string,
    status: "active" | "inactive",
  ) =>
    api.patch(`/admin/categories/${id}`, {
      status,
    }),

  deleteCategory: (id: string) =>
    api.delete(`/admin/categories/${id}`),

  // ===========================
  // Sellers
  // ===========================

  getSellers: (
    params?: PaginationParams,
  ) =>
    api.get("/admin/sellers", {
      params,
    }),

  getSeller: (id: string) =>
    api.get(`/admin/sellers/${id}`),

  verifySeller: (id: string) =>
    api.patch(`/admin/sellers/${id}/verify`),

  suspendSeller: (id: string) =>
    api.patch(`/admin/sellers/${id}/suspend`),

  activateSeller: (id: string) =>
    api.patch(`/admin/sellers/${id}/activate`),

  deleteSeller: (id: string) =>
    api.delete(`/admin/sellers/${id}`),

  // ===========================
  // Reviews
  // ===========================

  getReviews: (
    params?: PaginationParams,
  ) =>
    api.get("/admin/reviews", {
      params,
    }),

  approveReview: (id: string) =>
    api.patch(`/admin/reviews/${id}/approve`),

  rejectReview: (id: string) =>
    api.patch(`/admin/reviews/${id}/reject`),

  deleteReview: (id: string) =>
    api.delete(`/admin/reviews/${id}`),

  // ===========================
  // Inventory
  // ===========================

  getInventory: (
    params?: PaginationParams,
  ) =>
    api.get("/admin/inventory", {
      params,
    }),

  getInventoryItem: (id: string) =>
    api.get(`/admin/inventory/${id}`),

  updateInventory: (
    id: string,
    quantity: number,
  ) =>
    api.patch(`/admin/inventory/${id}`, {
      quantity,
    }),

  restockInventory: (
    id: string,
    quantity: number,
  ) =>
    api.patch(
      `/admin/inventory/${id}/restock`,
      {
        quantity,
      },
    ),

  // ===========================
  // Orders
  // ===========================

  getOrders: (
    params?: PaginationParams,
  ) =>
    api.get("/admin/orders", {
      params,
    }),

  getOrder: (id: string) =>
    api.get(`/admin/orders/${id}`),

  updateOrderStatus: (
    id: string,
    status: string,
  ) =>
    api.patch(`/admin/orders/${id}`, {
      status,
    }),

  cancelOrder: (id: string) =>
    api.patch(`/admin/orders/${id}/cancel`),

  refundOrder: (id: string) =>
    api.patch(`/admin/orders/${id}/refund`),

  // ===========================
  // Coupons
  // ===========================

  getCoupons: (
    params?: PaginationParams,
  ) =>
    api.get("/admin/coupons", {
      params,
    }),

  createCoupon: (data: any) =>
    api.post("/admin/coupons", data),

  updateCoupon: (
    id: string,
    data: any,
  ) =>
    api.patch(`/admin/coupons/${id}`, data),

  deleteCoupon: (id: string) =>
    api.delete(`/admin/coupons/${id}`),

  // ===========================
  // Stores
  // ===========================

  getStores: (
    params?: PaginationParams,
  ) =>
    api.get("/admin/stores", {
      params,
    }),

  getStore: (id: string) =>
    api.get(`/admin/stores/${id}`),

  approveStore: (id: string) =>
    api.patch(`/admin/stores/${id}/approve`),

  suspendStore: (id: string) =>
    api.patch(`/admin/stores/${id}/suspend`),

  deleteStore: (id: string) =>
    api.delete(`/admin/stores/${id}`),

  // ===========================
  // Shipping
  // ===========================

  getShipments: (
    params?: PaginationParams,
  ) =>
    api.get("/admin/shipping", {
      params,
    }),

  updateShipment: (
    id: string,
    data: any,
  ) =>
    api.patch(`/admin/shipping/${id}`, data),

  // ===========================
  // Notifications
  // ===========================

  sendNotification: (data: any) =>
    api.post(
      "/admin/notifications",
      data,
    ),
};