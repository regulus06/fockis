export type PayoutSchedule =
  | "manual"
  | "daily"
  | "weekly"
  | "monthly";

export type EarningsSource =
  | "live"
  | "post"
  | "video"
  | "photo"
  | "profile"
  | "other";

export type EarningsTransactionType =
  | "gift_received"
  | "withdrawal"
  | "withdrawal_reversed"
  | "adjustment"
  | "refund";

export interface EarningsAccount {
  coinsReceived: number;

  grossEarnings: number;

  pendingBalance: number;

  availableBalance: number;

  totalWithdrawn: number;

  lifetimeEarnings: number;

  currency: string;

  payoutSchedule: PayoutSchedule;

  stripeAccountId:
    | string
    | null;

  stripeOnboardingComplete: boolean;

  payoutsEnabled: boolean;
}

export interface EarningsTransaction {
  _id: string;

  creatorId: string;

  type:
    EarningsTransactionType;

  amount: number;

  coins: number;

  sourceType:
    EarningsSource;

  sourceId?:
    string | null;

  giftId?:
    string | null;

  giftTransactionId?:
    string | null;

  description?:
    string | null;

  currency: string;

  createdAt: string;

  updatedAt?: string;
}

export interface Withdrawal {
  _id: string;

  userId: string;

  amount: number;

  fee: number;

  netAmount: number;

  currency: string;

  status:
    | "pending"
    | "processing"
    | "paid"
    | "failed"
    | "cancelled";

  stripeAccountId?:
    string | null;

  stripeTransferId?:
    string | null;

  stripePayoutId?:
    string | null;

  failureReason?:
    string | null;

  description?:
    string | null;

  createdAt: string;

  updatedAt?: string;
}

export interface EarningsDashboard {
  account:
    EarningsAccount;

  transactions:
    EarningsTransaction[];

  withdrawals:
    Withdrawal[];
}