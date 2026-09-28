export type ShopModerationAction = "approve" | "reject" | "changes_requested" | "flag" | "suspend" | "restore" | "hide" | "block" | "delete";

export interface ShopAdminStats {
  pendingProducts: number;
  flaggedProducts: number;
  pendingSellers: number;
  suspendedSellers: number;
  stores: number;
}
