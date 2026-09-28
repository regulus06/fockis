export type Currency = "USD" | "EUR" | "CAD" | "GBP" | string;

export type FinanceStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CANCELLED"
  | "PAST_DUE";

export type TransactionType =
  | "SHOP_PAYMENT"
  | "SELLER_PAYOUT"
  | "FOCKIS_FEE"
  | "REFUND"
  | "SUBSCRIPTION"
  | "COIN_PURCHASE"
  | "GIFT_PURCHASE"
  | "TRAVEL_PAYMENT"
  | "REAL_ESTATE_FEE"
  | "AI_CREDIT_PURCHASE"
  | "AD_PAYMENT"
  | "ADJUSTMENT";

export interface Money {
  amount: number;
  currency: Currency;
}

export interface FinanceOverview {
  grossRevenue: Money;
  netRevenue: Money;
  platformFees: Money;
  totalPayments: Money;
  totalPayouts: Money;
  totalRefunds: Money;
  pendingPayouts: Money;
  activeSubscriptions: number;
  transactionCount: number;
  period: string;
}

export interface ShopOrderFinance {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  sellerId: string;
  sellerName: string;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  paymentStatus: FinanceStatus;
  paymentId: string;
  sellerPayoutId: string;
  fockisFee: Money;
  sellerPayout: Money;
  createdAt: string;
}

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  referenceId?: string;
  referenceNumber?: string;
  userId?: string;
  userName?: string;
  merchantId?: string;
  merchantName?: string;
  amount: Money;
  status: FinanceStatus;
  description: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  provider: string;
  providerPaymentId?: string;
  amount: Money;
  status: FinanceStatus;
  method?: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  sellerId?: string;
  sellerName?: string;
  orderId?: string;
  orderNumber?: string;
  grossAmount: Money;
  fockisFee: Money;
  netAmount: Money;
  status: FinanceStatus;
  scheduledAt?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Refund {
  id: string;
  paymentId?: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  amount: Money;
  reason?: string;
  status: FinanceStatus;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  plan: string;
  amount: Money;
  status: "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELLED";
  renewsAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  source: "SHOP" | "SUBSCRIPTION" | "ADS" | "TRAVEL" | "AI" | "OTHER";
  amount: Money;
  status: "DRAFT" | "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE";
  dueAt?: string;
  paidAt?: string;
  createdAt: string;
}

export interface RevenuePoint {
  date: string;
  gross: Money;
  fees: Money;
  refunds: Money;
  net: Money;
}

export interface FeeSummary {
  source: string;
  transactionCount: number;
  gross: Money;
  fees: Money;
  net: Money;
}

export interface Wallet {
  id: string;
  ownerId: string;
  ownerName: string;
  type: "USER" | "SELLER" | "CREATOR" | "BUSINESS";
  available: Money;
  pending: Money;
  lifetimeIn: Money;
  lifetimeOut: Money;
  status: "ACTIVE" | "LOCKED" | "SUSPENDED";
}

export interface CoinBalance {
  userId: string;
  userName: string;
  balance: number;
  purchased: number;
  spent: number;
  gifted: number;
  updatedAt: string;
}

export interface FinancialReport {
  id: string;
  name: string;
  period: string;
  gross: Money;
  fees: Money;
  refunds: Money;
  payouts: Money;
  net: Money;
  createdAt: string;
}
