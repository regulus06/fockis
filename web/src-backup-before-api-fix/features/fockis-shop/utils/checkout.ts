import type { CartLineItem } from '../types/cart.types';
import type {
  CheckoutCartItem,
  CheckoutSellerGroup,
  CountryConfig,
  PaymentMethod,
} from '../types/checkout.types';

// ============================================================================
// COUNTRY HELPERS
// ============================================================================

export function getCountryCode(country: string): string {
  const normalized = country.trim().toLowerCase();

  switch (normalized) {
    case 'united states':
    case 'usa':
    case 'us':
      return 'US';

    case 'canada':
    case 'ca':
      return 'CA';

    case 'dominican republic':
    case 'do':
      return 'DO';

    case 'haiti':
    case 'ht':
      return 'HT';

    case 'mexico':
    case 'mx':
      return 'MX';

    case 'united kingdom':
    case 'uk':
    case 'gb':
      return 'GB';

    case 'france':
    case 'fr':
      return 'FR';

    case 'germany':
    case 'de':
      return 'DE';

    case 'spain':
    case 'es':
      return 'ES';

    case 'italy':
    case 'it':
      return 'IT';

    case 'brazil':
    case 'br':
      return 'BR';

    case 'india':
    case 'in':
      return 'IN';

    case 'japan':
    case 'jp':
      return 'JP';

    case 'china':
    case 'cn':
      return 'CN';

    case 'australia':
    case 'au':
      return 'AU';

    case 'new zealand':
    case 'nz':
      return 'NZ';

    case 'switzerland':
    case 'ch':
      return 'CH';

    default:
      return country.trim().slice(0, 2).toUpperCase();
  }
}

// ============================================================================
// COUNTRY CONFIGURATION
// ============================================================================

export const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    addressStateLabel: 'State',
    cityLabel: 'City',
    postalLabel: 'ZIP code',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    addressStateLabel: 'Province',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'DO',
    name: 'Dominican Republic',
    currency: 'DOP',
    currencySymbol: 'RD$',
    addressStateLabel: 'Province',
    cityLabel: 'City / Municipality',
    postalLabel: 'Postal code',
    postalRequired: false,
    phoneRequired: true,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'HT',
    name: 'Haiti',
    currency: 'HTG',
    currencySymbol: 'G',
    addressStateLabel: 'Department',
    cityLabel: 'Commune / City',
    postalLabel: 'Postal code',
    postalRequired: false,
    phoneRequired: true,
    paymentMethods: [
      'card',
      'moncash',
      'natcash',
      'cash_on_delivery',
    ],
  },

  {
    code: 'MX',
    name: 'Mexico',
    currency: 'MXN',
    currencySymbol: 'MX$',
    addressStateLabel: 'State',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: true,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    addressStateLabel: 'County / Region',
    cityLabel: 'Town / City',
    postalLabel: 'Postcode',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    addressStateLabel: 'Region',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    addressStateLabel: 'State',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'ES',
    name: 'Spain',
    currency: 'EUR',
    currencySymbol: '€',
    addressStateLabel: 'Province',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'IT',
    name: 'Italy',
    currency: 'EUR',
    currencySymbol: '€',
    addressStateLabel: 'Province',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'BR',
    name: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    addressStateLabel: 'State',
    cityLabel: 'City',
    postalLabel: 'CEP',
    postalRequired: true,
    phoneRequired: true,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    addressStateLabel: 'State',
    cityLabel: 'City',
    postalLabel: 'PIN code',
    postalRequired: true,
    phoneRequired: true,
    paymentMethods: ['card'],
  },

  {
    code: 'JP',
    name: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    addressStateLabel: 'Prefecture',
    cityLabel: 'City / Ward',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'CN',
    name: 'China',
    currency: 'CNY',
    currencySymbol: '¥',
    addressStateLabel: 'Province',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: true,
    paymentMethods: ['card'],
  },

  {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    addressStateLabel: 'State / Territory',
    cityLabel: 'Suburb / City',
    postalLabel: 'Postcode',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'NZ',
    name: 'New Zealand',
    currency: 'NZD',
    currencySymbol: 'NZ$',
    addressStateLabel: 'Region',
    cityLabel: 'City',
    postalLabel: 'Postcode',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },

  {
    code: 'CH',
    name: 'Switzerland',
    currency: 'CHF',
    currencySymbol: 'CHF',
    addressStateLabel: 'Canton',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: true,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  },
];

// ============================================================================
// FALLBACK COUNTRY CONFIG
// ============================================================================

export function createFallbackCountryConfig(
  countryName: string,
  countryCode: string,
): CountryConfig {
  return {
    code: countryCode || getCountryCode(countryName),
    name: countryName || 'International',
    currency: 'USD',
    currencySymbol: '$',
    addressStateLabel: 'State / Province / Region',
    cityLabel: 'City',
    postalLabel: 'Postal code',
    postalRequired: false,
    phoneRequired: false,
    paymentMethods: ['card', 'paypal'],
  };
}

// ============================================================================
// COUNTRY CONFIG LOOKUP
// ============================================================================

export function getCountryConfig(
  country: string,
  countryCode?: string,
): CountryConfig {
  const code = countryCode || getCountryCode(country);

  const found = COUNTRY_CONFIGS.find(
    (config) => config.code === code,
  );

  return (
    found ??
    createFallbackCountryConfig(country, code)
  );
}

// ============================================================================
// SELLER / PRODUCT HELPERS
// ============================================================================

export function getSellerId(
  group: CheckoutSellerGroup,
): string {
  return group.storeId;
}

export function getSellerName(
  group: CheckoutSellerGroup,
): string {
  return group.storeName;
}

export function getProductId(
  item: CheckoutCartItem,
): string {
  return item.productId;
}

export function getProductName(
  item: CheckoutCartItem,
): string {
  return item.productName;
}

export function getStoreName(
  item: CheckoutCartItem,
): string {
  return item.storeName;
}

export function getProductPrice(
  item: CheckoutCartItem,
): number {
  return Number(item.unitPrice) || 0;
}

// ============================================================================
// NORMALIZE CHECKOUT ITEM
// ============================================================================
//
// CheckoutCartItem may come from checkout-specific data that does not contain
// every field required by CartLineItem.
//
// We normalize it into the complete CartLineItem shape.
//
// IMPORTANT:
// CartLineItem does NOT contain checkout-selection state.
//
// Selection is maintained separately in cartStore.ts:
//
//   selectedLineIds: string[]
//
// Therefore this function must never add:
//
//   selected: true
//
// or:
//
//   selected: false
//
// ============================================================================

export function normalizeCartItem(
  item: CheckoutCartItem,
  index: number,
): CartLineItem {
  return {
    id:
      item.id ||
      `${item.storeId}-${item.productId}-${index}`,

    productId: item.productId,

    productName: item.productName,

    // Compatibility aliases
    name: item.productName,
    title: item.productName,

    productSlug:
      item.productSlug ||
      item.productId,

    storeId: item.storeId,

    storeName: item.storeName,

    storeSlug:
      item.storeSlug ||
      item.storeId,

    quantity: Math.max(
      1,
      Number(item.quantity) || 1,
    ),

    unitPrice:
      Number(item.unitPrice) || 0,

    // Compatibility alias
    price:
      Number(item.unitPrice) || 0,

    maxQuantity:
      item.maxQuantity ??
      Math.max(
        1,
        Number(item.quantity) || 1,
      ),

    addedAt:
      item.addedAt ||
      new Date().toISOString(),
  };
}

// ============================================================================
// PAYMENT METHOD LABEL
// ============================================================================

export function getPaymentMethodLabel(
  method: PaymentMethod,
): string {
  switch (method) {
    case 'card':
      return 'Credit / Debit Card';

    case 'paypal':
      return 'PayPal';

    case 'cash_on_delivery':
      return 'Cash on Delivery';

    case 'moncash':
      return 'MonCash';

    case 'natcash':
      return 'NatCash';

    default:
      return method;
  }
}