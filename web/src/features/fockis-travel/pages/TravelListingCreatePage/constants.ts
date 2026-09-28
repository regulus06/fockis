import type { InventorySettings, ListingForm } from './types';

/* ============================================================================
   CATEGORIES
============================================================================ */

export const CATEGORIES = [
  { icon: '🏨', label: 'Hotels & Stays' },
  { icon: '🍽️', label: 'Restaurants' },
  { icon: '🚗', label: 'Car Rental' },
  { icon: '🏝️', label: 'Experiences' },
  { icon: '💼', label: 'Meeting Spaces' },
  { icon: '🚐', label: 'Transportation' },
  { icon: '🎉', label: 'Events' },
  { icon: '🏠', label: 'Vacation Rentals' },
];

/* ============================================================================
   VACATION RENTAL OPTIONS
============================================================================ */

export const PROPERTY_TYPES = [
  'Entire home',
  'Entire apartment',
  'Entire condo',
  'Entire townhouse',
  'Entire villa',
  'Entire cabin',
  'Entire cottage',
  'Entire guesthouse',
  'Private room',
  'Shared room',
];

export const CANCELLATION_POLICIES = [
  {
    value: 'flexible',
    label: 'Flexible',
    description: 'Guests can cancel for a full refund up to 24 hours before check-in.',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Guests can cancel for a full refund up to 5 days before check-in.',
  },
  {
    value: 'firm',
    label: 'Firm',
    description: 'More restrictive cancellation terms for hosts.',
  },
  {
    value: 'strict',
    label: 'Strict',
    description: 'Strict cancellation terms with limited refunds.',
  },
];

export const COMMON_AMENITIES = [
  'Wi-Fi',
  'Free parking',
  'Air conditioning',
  'Heating',
  'Kitchen',
  'Washer',
  'Dryer',
  'TV',
  'Pool',
  'Hot tub',
  'Fireplace',
  'BBQ grill',
  'Patio',
  'Balcony',
  'Garden',
  'Beach access',
  'Gym',
  'Elevator',
  'Workspace',
  'Breakfast',
  'Pet friendly',
  'Wheelchair accessible',
  'Smoke alarm',
  'Carbon monoxide alarm',
];

export const HOUSE_RULES = [
  'No smoking',
  'No parties or events',
  'Pets allowed',
  'Children welcome',
  'Quiet hours',
  'No commercial photography',
  'No unregistered guests',
];

/* ============================================================================
   EMPTY FORM
============================================================================ */

export const EMPTY_FORM: ListingForm = {
  title: '',
  category: 'Hotels & Stays',
  description: '',

  price: '',
  priceUnit: 'night',

  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',

  phone: '',
  website: '',

  capacity: '',
  bedrooms: '',
  bathrooms: '',
  beds: '',

  amenities: [],
  images: [],

  propertyType: 'Entire home',
  rentalType: 'Entire place',

  checkInTime: '15:00',
  checkOutTime: '11:00',

  minimumStay: '1',
  maximumStay: '',

  cleaningFee: '',
  securityDeposit: '',

  cancellationPolicy: 'flexible',

  instantBooking: false,

  houseRules: [],

  hostName: '',
  hostDescription: '',

  status: 'draft',
};

/* ============================================================================
   EMPTY INVENTORY
============================================================================ */

export const EMPTY_INVENTORY: InventorySettings = {
  total: '10',
  available: '10',
  reserved: '0',
  lowStockThreshold: '2',
  allowReservations: true,
};
