export const PAYMENT_PURPOSE = {
  FOCKIS_ID: 'fockis_id',
  MARKETPLACE_ORDER: 'marketplace_order',
  COIN_PURCHASE: 'coin_purchase',
  TRAVEL_BOOKING: 'travel_booking',
  MUSIC: 'music',
  EVENT: 'event',
  MEETING: 'meeting',
  CHURCH: 'church',
  ADVERTISING: 'advertising',
  SUBSCRIPTION: 'subscription',
  OTHER: 'other',
} as const;

export type PaymentPurpose =
  (typeof PAYMENT_PURPOSE)[keyof typeof PAYMENT_PURPOSE];