import type { OrderShippingAddress } from './order.types';
import type { CartLineItem } from './cart.types';

export type PaymentMethod =
  | 'card'
  | 'paypal'
  | 'cash_on_delivery'
  | 'moncash'
  | 'natcash';

export type TipOption =
  | 'none'
  | '5'
  | '10'
  | '15'
  | '20'
  | 'custom';

export type CheckoutCartItem = {
  id: string;

  productId: string;
  productName: string;

  productEmoji?: string;
  productImageUrl?: string;

  quantity: number;
  unitPrice: number;

  storeId: string;
  storeName: string;

  productSlug?: string;
  storeSlug?: string;

  maxQuantity?: number;
  addedAt?: string;

  variant?: {
    variantId: string;
    optionsLabel: string;
  } | null;
};

export type CheckoutSellerGroup = {
  storeId: string;
  storeName: string;
  items: CheckoutCartItem[];
  subtotal: number;
};

export type CountryConfig = {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  addressStateLabel: string;
  cityLabel: string;
  postalLabel: string;
  postalRequired: boolean;
  phoneRequired: boolean;
  paymentMethods: PaymentMethod[];
};

export type CheckoutState = {
  address: OrderShippingAddress;
  paymentMethod: PaymentMethod;
  estimates: import('./shipping.types').ShippingEstimate[] | null;
  shippingSelections: Record<string, string>;
  placing: boolean;
  shippingError: string | null;
  checkoutError: string | null;
  cardComplete: boolean;
  tipOption: TipOption;
  customTip: string;
};

export type CheckoutCartData = {
  checkoutItems: CheckoutCartItem[];
  checkoutSellerGroups: CheckoutSellerGroup[];
  apiCartItems: CartLineItem[];
};