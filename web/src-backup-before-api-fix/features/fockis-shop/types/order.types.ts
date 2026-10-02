export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  productEmoji?: string;
  variantLabel?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  countryCode: string;
  phone?: string;
}

/** One seller's slice of a customer order — orders always split by store. */
export interface SellerOrderGroup {
  id: string; // sub-order id
  orderId: string; // parent order id
  storeId: string;
  storeName: string;
  storeSlug: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  shippingMethod: string;
  trackingNumber?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;

  sellerGroups: SellerOrderGroup[];

  shippingAddress: OrderShippingAddress;
  paymentStatus: PaymentStatus;
  paymentMethod: string;

  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  currency: string;

  placedAt: string;
  updatedAt: string;
}
