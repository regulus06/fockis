export type UserAdminListQuery = {
  search?: string;
  status?: string;
  role?: string;
  accountType?: string;
  verified?: boolean | string;
  locked?: boolean | string;
  premium?: boolean | string;
  sellerApproved?: boolean | string;
  fockisIdAccessPaid?: boolean | string;
  countryCode?: string;
  online?: boolean | string;
  createdFrom?: string;
  createdTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortDirection?: "asc" | "desc" | string;
};

export type UserAdminStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "locked"
  | "deleted";

export type UserAdminBulkAction =
  | "activate"
  | "deactivate"
  | "suspend"
  | "unlock"
  | "verify"
  | "unverify"
  | "delete";