import type { ReactNode } from "react";

export type AdminUserRole = "user" | "moderator" | "admin" | "super_admin";

export type AdminUserAccountType = "user" | "seller" | "business";

export type AdminUserStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "locked"
  | "deleted";

export type AdminUserVerificationStatus = "verified" | "unverified";

export type AdminUserPremiumStatus = "premium" | "standard";

export type AdminUserFockisIdStatus = "paid" | "unpaid" | "not_assigned";

export type AdminUserSortField =
  | "createdAt"
  | "updatedAt"
  | "lastActiveAt"
  | "lastLoginAt"
  | "username"
  | "email"
  | "followersCount"
  | "postsCount";

export type SortDirection = "asc" | "desc";

export type AdminUserListFilters = {
  search?: string;
  role?: AdminUserRole | "all";
  accountType?: AdminUserAccountType | "all";
  status?: AdminUserStatus | "all";
  verified?: boolean;
  premium?: boolean;
  fockisIdAccessPaid?: boolean;
  countryCode?: string;
  sellerApproved?: boolean;
  online?: boolean;
  locked?: boolean;
  createdFrom?: string;
  createdTo?: string;
  lastActiveFrom?: string;
  lastActiveTo?: string;
  sortBy?: AdminUserSortField;
  sortDirection?: SortDirection;
  page?: number;
  limit?: number;
};

export type AdminUserStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  lockedUsers: number;
  onlineUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  premiumUsers: number;
  sellers: number;
  businesses: number;
  admins: number;
  moderators: number;
  fockisIdsAssigned: number;
  fockisIdAccessPaid: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
};

export type AdminUser = {
  id: string;
  _id?: string;

  username: string;
  email: string;

  firstName: string;
  lastName: string;
  displayName: string;

  bio?: string;
  location?: string;
  website?: string;
  phone?: string;

  profilePicture?: string;
  coverPhoto?: string;

  gender?: string;
  birthDate?: string;

  countryCode?: string;
  callingCode?: string;

  fockisId?: string;
  publicFockisId?: string;

  fockisIdAccessPaid: boolean;
  fockisIdAccessPaidAt?: string | null;
  fockisIdAccessPaymentId?: string | null;

  role: AdminUserRole;
  permissions: string[];

  accountType: AdminUserAccountType;

  verified: boolean;
  isActive: boolean;
  isPrivate: boolean;

  sellerApproved: boolean;
  storeName?: string;
  storeDescription?: string;

  premium: boolean;
  subscriptionType?: string;
  subscriptionExpiresAt?: string | null;

  online: boolean;
  lastSeen?: string | null;
  lastActiveAt?: string | null;

  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  lastLoginUserAgent?: string | null;

  failedLoginAttempts: number;
  lastFailedLoginAt?: string | null;
  lockedUntil?: string | null;
  lockoutCount: number;

  mustChangePassword: boolean;
  passwordChangedAt?: string | null;
  passwordResetByAdmin: boolean;

  followersCount: number;
  followingCount: number;
  friendsCount: number;

  postsCount: number;
  likesReceived: number;

  createdAt: string;
  updatedAt: string;
};

export type AdminUserListResponse = {
  items: AdminUser[];
  users?: AdminUser[];

  total: number;
  page: number;
  limit: number;
  pages?: number;
  skip?: number;
};

export type AdminUserActionResponse = {
  success: boolean;
  message?: string;
  user?: AdminUser;
};

export type AdminUserActivity = {
  id: string;
  userId: string;

  type:
    | "login"
    | "logout"
    | "profile_update"
    | "password_change"
    | "password_reset"
    | "fockis_id_payment"
    | "fockis_id_reveal"
    | "account_created"
    | "account_suspended"
    | "account_reactivated"
    | "account_locked"
    | "account_unlocked"
    | "admin_action"
    | "other";

  description: string;

  ip?: string;
  userAgent?: string;

  metadata?: Record<string, unknown>;

  createdAt: string;
};

export type AdminUserActivityResponse = {
  items: AdminUserActivity[];
  activities?: AdminUserActivity[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
};

export type AdminUserBooking = {
  id: string;
  _id?: string;

  bookingCode: string;

  userId: string;
  listingId: string;

  listingName?: string;
  partnerId?: string;
  partnerName?: string;

  type:
    | "stay"
    | "rental"
    | "meeting"
    | "event"
    | "restaurant"
    | "car"
    | "flight"
    | "transfer"
    | "experience"
    | "attraction"
    | "thing"
    | string;

  startAt: string;
  endAt: string;

  quantity: number;
  guests: number;

  currency: string;

  subtotal: number;
  fees: number;
  tax: number;
  total: number;

  status: "pending" | "confirmed" | "cancelled" | "completed" | "refunded" | string;

  paymentStatus: string;

  notes?: string;

  createdAt: string;
  updatedAt?: string;
};

export type AdminUserBookingsResponse = {
  items: AdminUserBooking[];
  bookings?: AdminUserBooking[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
};

export type AdminUserPayment = {
  id: string;
  _id?: string;

  userId: string;

  amount: number;
  currency: string;

  status:
    | "pending"
    | "processing"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "refunded"
    | "partially_refunded"
    | string;

  paymentMethod?: string;
  provider?: string;

  providerPaymentId?: string;
  stripePaymentIntentId?: string;

  description?: string;

  metadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt?: string;
};

export type AdminUserPaymentsResponse = {
  items: AdminUserPayment[];
  payments?: AdminUserPayment[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
};

export type AdminUserReport = {
  id: string;
  _id?: string;

  reporterId?: string;
  reporterName?: string;

  reportedUserId: string;
  reportedUserName?: string;

  type:
    | "spam"
    | "harassment"
    | "fraud"
    | "abuse"
    | "impersonation"
    | "inappropriate"
    | "other"
    | string;

  reason: string;
  description?: string;

  status: "open" | "investigating" | "resolved" | "dismissed" | "escalated" | string;

  priority: "low" | "medium" | "high" | "critical" | string;

  assignedAdminId?: string;
  assignedAdminName?: string;

  resolution?: string;

  createdAt: string;
  updatedAt?: string;
};

export type AdminUserReportsResponse = {
  items: AdminUserReport[];
  reports?: AdminUserReport[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
};

export type AdminUserMessageSummary = {
  conversationId: string;

  participantId: string;
  participantName?: string;
  participantFockisId?: string;

  lastMessage?: string;
  lastMessageAt?: string | null;

  messageCount: number;
  unreadCount: number;

  status?: string;
};

export type AdminUserMessagesResponse = {
  items: AdminUserMessageSummary[];
  conversations?: AdminUserMessageSummary[];

  total: number;
  page: number;
  limit: number;
  pages?: number;
};

export type AdminUserStatusUpdatePayload = {
  status: "active" | "inactive" | "suspended" | "locked";
  reason?: string;
};

export type AdminUserRoleUpdatePayload = {
  role: AdminUserRole;
  reason?: string;
};

export type AdminUserVerificationUpdatePayload = {
  verified: boolean;
  reason?: string;
};

export type AdminUserPremiumUpdatePayload = {
  premium: boolean;
  subscriptionType?: string;
  subscriptionExpiresAt?: string | null;
  reason?: string;
};

export type AdminUserSellerUpdatePayload = {
  sellerApproved: boolean;
  reason?: string;
};

export type AdminUserPermissionUpdatePayload = {
  permissions: string[];
};

export type AdminUserPasswordResetPayload = {
  newPassword?: string;
  forceChange: boolean;
};

export type AdminUserBulkAction =
  | "activate"
  | "deactivate"
  | "suspend"
  | "unlock"
  | "verify"
  | "unverify"
  | "delete";

export type AdminUserBulkActionPayload = {
  userIds: string[];
  action: AdminUserBulkAction;
  reason?: string;
};

export type AdminUserBulkActionResponse = {
  success: boolean;
  affected: number;
  failed: number;
  message?: string;
  errors?: Array<{
    userId: string;
    message: string;
  }>;
};

export type AdminUserAction =
  | "view"
  | "edit"
  | "activate"
  | "deactivate"
  | "suspend"
  | "unsuspend"
  | "lock"
  | "unlock"
  | "verify"
  | "unverify"
  | "reset_password"
  | "force_password_change"
  | "manage_role"
  | "manage_permissions"
  | "manage_premium"
  | "manage_seller"
  | "view_bookings"
  | "view_payments"
  | "view_reports"
  | "view_messages"
  | "view_activity"
  | "delete";

export type AdminUserPermission =
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  | "users.suspend"
  | "users.activate"
  | "users.verify"
  | "users.security"
  | "users.password.reset"
  | "users.roles.manage"
  | "users.permissions.manage"
  | "users.payments.view"
  | "users.bookings.view"
  | "users.reports.view"
  | "users.messages.view"
  | "users.activity.view";

export type UserActionMenuItem = {
  action: AdminUserAction;
  label: string;
  description?: string;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export type UserSearchResult = {
  id: string;
  username: string;
  displayName: string;
  email: string;

  fockisId?: string;
  publicFockisId?: string;

  profilePicture?: string;

  countryCode?: string;
  callingCode?: string;

  verified: boolean;
  isActive: boolean;
  online: boolean;

  role: AdminUserRole;
  accountType: AdminUserAccountType;
};

export type AdminUserDetailResponse = AdminUser;

export type AdminUserQuery = AdminUserListFilters;

export type AdminUserDateRange = {
  from?: string;
  to?: string;
};

export type AdminUserPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type AdminUserApiError = {
  message: string;
  statusCode?: number;
  error?: string;
};

export function getAdminUserId(user: AdminUser): string {
  return String(user.id || user._id || "");
}

export function getAdminUserDisplayName(user: AdminUser): string {
  const displayName = String(user.displayName || "").trim();

  if (displayName) {
    return displayName;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  return user.username || user.email;
}

export function getAdminUserStatus(user: AdminUser): AdminUserStatus {
  if (user.lockedUntil) {
    const lockedUntil = new Date(user.lockedUntil).getTime();

    if (Number.isFinite(lockedUntil) && lockedUntil > Date.now()) {
      return "locked";
    }
  }

  if (!user.isActive) {
    return "inactive";
  }

  return "active";
}

export function getAdminUserFockisIdStatus(user: AdminUser): AdminUserFockisIdStatus {
  if (!user.fockisId) {
    return "not_assigned";
  }

  return user.fockisIdAccessPaid ? "paid" : "unpaid";
}

export function getAdminUserVerificationStatus(
  user: AdminUser,
): AdminUserVerificationStatus {
  return user.verified ? "verified" : "unverified";
}

export function getAdminUserPremiumStatus(user: AdminUser): AdminUserPremiumStatus {
  return user.premium ? "premium" : "standard";
}

export function normalizeAdminUser(
  input: Partial<AdminUser> & Record<string, unknown>,
): AdminUser {
  const id = String(input.id ?? input._id ?? "");
  const firstName = String(input.firstName ?? "");
  const lastName = String(input.lastName ?? "");
  const username = String(input.username ?? "");
  const email = String(input.email ?? "");

  const explicitDisplayName = String(input.displayName ?? "").trim();
  const joinedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const displayName = explicitDisplayName || joinedName || username || email;

  return {
    id,
    _id: input._id ? String(input._id) : id,

    username,
    email,

    firstName,
    lastName,
    displayName,

    bio: input.bio !== undefined ? String(input.bio) : "",
    location: input.location !== undefined ? String(input.location) : "",
    website: input.website !== undefined ? String(input.website) : "",
    phone: input.phone !== undefined ? String(input.phone) : "",

    profilePicture:
      input.profilePicture !== undefined ? String(input.profilePicture) : "",
    coverPhoto: input.coverPhoto !== undefined ? String(input.coverPhoto) : "",

    gender: input.gender !== undefined ? String(input.gender) : "",
    birthDate: input.birthDate !== undefined ? String(input.birthDate) : "",

    countryCode: input.countryCode !== undefined ? String(input.countryCode) : undefined,
    callingCode: input.callingCode !== undefined ? String(input.callingCode) : undefined,

    fockisId: input.fockisId !== undefined ? String(input.fockisId) : undefined,
    publicFockisId:
      input.publicFockisId !== undefined ? String(input.publicFockisId) : undefined,

    fockisIdAccessPaid: Boolean(input.fockisIdAccessPaid),

    fockisIdAccessPaidAt: input.fockisIdAccessPaidAt
      ? String(input.fockisIdAccessPaidAt)
      : null,

    fockisIdAccessPaymentId: input.fockisIdAccessPaymentId
      ? String(input.fockisIdAccessPaymentId)
      : null,

    role: isAdminUserRole(input.role) ? input.role : "user",

    permissions: Array.isArray(input.permissions)
      ? input.permissions.map(String)
      : [],

    accountType: isAdminUserAccountType(input.accountType)
      ? input.accountType
      : "user",

    verified: Boolean(input.verified),

    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,

    isPrivate: Boolean(input.isPrivate),

    sellerApproved: Boolean(input.sellerApproved),

    storeName: input.storeName !== undefined ? String(input.storeName) : "",
    storeDescription:
      input.storeDescription !== undefined ? String(input.storeDescription) : "",

    premium: Boolean(input.premium),

    subscriptionType:
      input.subscriptionType !== undefined ? String(input.subscriptionType) : "",
    subscriptionExpiresAt: input.subscriptionExpiresAt
      ? String(input.subscriptionExpiresAt)
      : null,

    online: Boolean(input.online),

    lastSeen: input.lastSeen ? String(input.lastSeen) : null,
    lastActiveAt: input.lastActiveAt ? String(input.lastActiveAt) : null,

    lastLoginAt: input.lastLoginAt ? String(input.lastLoginAt) : null,
    lastLoginIp: input.lastLoginIp ? String(input.lastLoginIp) : null,
    lastLoginUserAgent: input.lastLoginUserAgent
      ? String(input.lastLoginUserAgent)
      : null,

    failedLoginAttempts: Number(input.failedLoginAttempts ?? 0),

    lastFailedLoginAt: input.lastFailedLoginAt
      ? String(input.lastFailedLoginAt)
      : null,

    lockedUntil: input.lockedUntil ? String(input.lockedUntil) : null,

    lockoutCount: Number(input.lockoutCount ?? 0),

    mustChangePassword: Boolean(input.mustChangePassword),

    passwordChangedAt: input.passwordChangedAt
      ? String(input.passwordChangedAt)
      : null,

    passwordResetByAdmin: Boolean(input.passwordResetByAdmin),

    followersCount: Number(input.followersCount ?? 0),
    followingCount: Number(input.followingCount ?? 0),
    friendsCount: Number(input.friendsCount ?? 0),

    postsCount: Number(input.postsCount ?? 0),
    likesReceived: Number(input.likesReceived ?? 0),

    createdAt: input.createdAt ? String(input.createdAt) : "",
    updatedAt: input.updatedAt ? String(input.updatedAt) : "",
  };
}

export function isAdminUserRole(value: unknown): value is AdminUserRole {
  return (
    value === "user" ||
    value === "moderator" ||
    value === "admin" ||
    value === "super_admin"
  );
}

export function isAdminUserAccountType(value: unknown): value is AdminUserAccountType {
  return value === "user" || value === "seller" || value === "business";
}

export function isAdminUserStatus(value: unknown): value is AdminUserStatus {
  return (
    value === "active" ||
    value === "inactive" ||
    value === "suspended" ||
    value === "locked" ||
    value === "deleted"
  );
}

export function isAdminUserPermission(value: unknown): value is AdminUserPermission {
  if (typeof value !== "string") {
    return false;
  }

  const permissions: AdminUserPermission[] = [
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "users.suspend",
    "users.activate",
    "users.verify",
    "users.security",
    "users.password.reset",
    "users.roles.manage",
    "users.permissions.manage",
    "users.payments.view",
    "users.bookings.view",
    "users.reports.view",
    "users.messages.view",
    "users.activity.view",
  ];

  return permissions.includes(value as AdminUserPermission);
}