import { api } from "../../../api/api";

export type DisputeStatus = "open" | "under_review" | "resolved_buyer" | "resolved_seller" | "closed";

export interface DisputeEvent {
  at: string;
  action: string;
  actorId: string | null;
  actorName: string;
  note: string;
}

export interface AdminDispute {
  id: string;
  number: string | null;
  orderId: string | null;
  orderNumber: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  openedBy: string | null;
  sellerIds: string[];
  orderTotal: number | null;
  adminNote: string;
  assignedTo: string | null;
  resolvedBy: string | null;
  history: DisputeEvent[];
  buyerUsername: string | null;
  sellerUsernames: string[];
}

export interface DisputePage {
  items: AdminDispute[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  counts: { open: number; underReview: number };
}

export type DisputeAction = "start_review" | "resolve_buyer" | "resolve_seller" | "close";

const BASE = "/admin/marketplace/disputes";

export const disputesAdminApi = {
  async list(params: Record<string, string | number>): Promise<DisputePage> {
    return (await api.get(BASE, { params })).data;
  },
  async get(id: string): Promise<AdminDispute> {
    return (await api.get(`${BASE}/${encodeURIComponent(id)}`)).data;
  },
  async review(id: string, action: DisputeAction, note: string): Promise<AdminDispute> {
    return (await api.post(`${BASE}/${encodeURIComponent(id)}/review`, { action, ...(note ? { note } : {}) })).data;
  },
};

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  open: "Open",
  under_review: "Under review",
  resolved_buyer: "Resolved for buyer",
  resolved_seller: "Resolved for seller",
  closed: "Closed",
};

export const DISPUTE_REASON_LABEL: Record<string, string> = {
  not_received: "Item not received",
  not_as_described: "Not as described",
  damaged: "Damaged",
  wrong_item: "Wrong item",
  unauthorized_charge: "Unauthorized charge",
  other: "Other",
};
