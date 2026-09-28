export enum ContentType {
  VIDEO = "VIDEO",
  MUSIC = "MUSIC",
}

export enum PaymentMethod {
  COINS = "COINS",
  STRIPE = "STRIPE",
}

export enum PurchaseType {
  STREAM = "STREAM",
  DOWNLOAD = "DOWNLOAD",
  STREAM_AND_DOWNLOAD = "STREAM_AND_DOWNLOAD",
}

export enum EntitlementType {
  STREAM = "STREAM",
  DOWNLOAD = "DOWNLOAD",
}

export enum PurchaseStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}

export enum EntitlementStatus {
  ACTIVE = "ACTIVE",
  REVOKED = "REVOKED",
  REFUNDED = "REFUNDED",
}

export enum ContentPriceCurrency {
  COINS = "COINS",
  USD = "USD",
}

export interface ContentAccessResult {
  contentId: string;
  contentType: ContentType;
  canStream: boolean;
  canDownload: boolean;
  streamPrice?: number;
  downloadPrice?: number;
  currency?: ContentPriceCurrency;
  downloadEnabled: boolean;
}

export interface SecureMediaAccess {
  contentId: string;
  mediaUrl: string;
  expiresAt: Date;
  download: boolean;
}