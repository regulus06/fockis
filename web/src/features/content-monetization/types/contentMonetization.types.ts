export type MonetizedContentType =
  | "video"
  | "music";

export type ContentPaymentMethod =
  | "coins"
  | "stripe";

export type ContentPurchaseType =
  | "watch"
  | "listen"
  | "download";

/**
 * Who can access the creator's content.
 *
 * everyone:
 *   Content is free for everyone.
 *
 * subscribers:
 *   Only users subscribed to the creator can access it.
 *
 * pay_to_unlock:
 *   User must purchase access.
 */
export type ContentAccessType =
  | "everyone"
  | "subscribers"
  | "pay_to_unlock";

/**
 * Creator-side monetization settings.
 */
export interface ContentMonetization {
  /**
   * Whether monetization is enabled.
   */
  enabled: boolean;

  /**
   * Who can access the content.
   */
  accessType: ContentAccessType;

  /**
   * Creator chooses how the user pays
   * when accessType is pay_to_unlock.
   */
  paymentMethod: ContentPaymentMethod;

  /**
   * Price to watch a video.
   */
  watchPrice: number;

  /**
   * Price to listen to music.
   */
  listenPrice: number;

  /**
   * Whether downloads are available.
   */
  downloadEnabled: boolean;

  /**
   * Whether download is included
   * with the watch/listen purchase.
   */
  downloadIncluded: boolean;

  /**
   * Separate download price.
   */
  downloadPrice: number;

  /**
   * Whether users can see a preview
   * before unlocking.
   */
  previewEnabled: boolean;

  /**
   * Optional preview duration in seconds.
   */
  previewDuration: number;
}

/**
 * Content object used by the consumer-side
 * monetization components.
 */
export interface MonetizedContent {
  id: string;

  type: MonetizedContentType;

  title: string;

  description?: string;

  mediaUrl: string;

  thumbnailUrl?: string;

  creatorId: string;

  creatorName?: string;

  monetization: ContentMonetization;

  duration?: number;

  mimeType?: string;

  createdAt?: string;
}

export interface ContentAccess {
  contentId: string;

  watchUnlocked: boolean;

  listenUnlocked: boolean;

  downloadUnlocked: boolean;

  purchasedWatch: boolean;

  purchasedListen: boolean;

  purchasedDownload: boolean;

  /**
   * True when the user has an active
   * subscription to the creator.
   */
  subscriberUnlocked?: boolean;
}

export interface ContentPurchase {
  id: string;

  contentId: string;

  userId?: string;

  purchaseType: ContentPurchaseType;

  paymentMethod: ContentPaymentMethod;

  amount: number;

  status:
    | "pending"
    | "completed"
    | "failed";

  createdAt: string;
}

export interface ContentPurchaseRequest {
  contentId: string;

  purchaseType: ContentPurchaseType;
}

export interface ContentDownloadResponse {
  contentId: string;

  downloadUrl: string;

  expiresAt?: string;
}

export interface ContentUnlockResult {
  success: boolean;

  contentId: string;

  purchaseType: ContentPurchaseType;

  paymentMethod: ContentPaymentMethod;

  amount: number;
}