export interface MessageAdminStats {
  totalUsers: number;
  usersWithFockisId: number;
  activeConversations: number;
  totalMessages: number;
  messagesToday: number;
  activeCalls: number;
  reportedMessages: number;
}

export interface MessageAdminUser {
  id: string;
  username?: string;
  displayName?: string;
  email?: string;
  fockisId?: string | null;
  isActive?: boolean;
  isBlocked?: boolean;
  createdAt?: string;
  lastSeenAt?: string | null;
}

/**
 * Fockis ID pricing is managed by the administrator
 * and stored in the FockisIdSettings collection.
 *
 * The price is NOT stored on the User document.
 */
export interface FockisIdPricing {
  /**
   * Price configured by the administrator.
   *
   * null means the price has not been configured yet.
   */
  price: number | null;

  /**
   * ISO 4217 currency code, for example USD.
   */
  currency: string;

  /**
   * Whether the Fockis ID is charged as a one-time payment.
   */
  oneTime: boolean;

  /**
   * Whether the Fockis ID uses recurring billing.
   *
   * Recurring billing requires corresponding
   * subscription/webhook handling on the backend.
   */
  recurring: boolean;

  /**
   * Whether payment is required before Fockis ID
   * access is granted.
   */
  requirePayment: boolean;
}

export interface FockisIdSettings {
  enabled: boolean;
  minLength: number;
  maxLength: number;
  allowLetters: boolean;
  allowNumbers: boolean;
  allowUnderscore: boolean;
  allowHyphen: boolean;
}

export interface MessageSettings {
  messagingEnabled: boolean;
  maxMessageLength: number;
  maxAttachmentsPerMessage: number;
  messageEditEnabled: boolean;
  messageDeleteEnabled: boolean;
  reactionsEnabled: boolean;
  repliesEnabled: boolean;
  forwardingEnabled: boolean;
}

export interface CallSettings {
  voiceCallsEnabled: boolean;
  videoCallsEnabled: boolean;
  groupCallsEnabled: boolean;
  maxParticipants: number;
  callRecordingEnabled: boolean;
}

export interface AttachmentSettings {
  attachmentsEnabled: boolean;
  maxFileSizeMb: number;
  maxImagesPerMessage: number;
  maxVideosPerMessage: number;
  maxDocumentsPerMessage: number;
  maxVoiceMessageMinutes: number;
}

export interface MessageReport {
  id: string;
  reporterId?: string;
  reporterName?: string;
  messageId?: string;
  conversationId?: string;
  reason: string;
  description?: string;
  status:
    | 'pending'
    | 'reviewed'
    | 'resolved'
    | 'dismissed';
  createdAt?: string;
}