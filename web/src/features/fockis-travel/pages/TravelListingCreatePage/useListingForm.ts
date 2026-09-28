import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { travelApi } from '../../services/travelApi';

import { CATEGORIES, EMPTY_FORM, EMPTY_INVENTORY } from './constants';

import type { InventorySettings, InventoryStatus, ListingForm } from './types';

/**
 * Owns every piece of state, derived value, and handler used by
 * TravelListingCreatePage. Pulled out of the page component so the JSX in
 * index.tsx can stay focused on layout/composition.
 */
export function useListingForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState<ListingForm>(EMPTY_FORM);
  const [inventory, setInventory] = useState<InventorySettings>(EMPTY_INVENTORY);
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  /* --------------------------------------------------------------------------
     CATEGORY
  -------------------------------------------------------------------------- */

  const selectedCategory = useMemo(
    () => CATEGORIES.find((category) => category.label === form.category),
    [form.category],
  );

  const isVacationRental = form.category === 'Vacation Rentals';

  /* --------------------------------------------------------------------------
     INVENTORY CALCULATIONS
  -------------------------------------------------------------------------- */

  const totalInventory = Math.max(0, Number(inventory.total) || 0);
  const availableInventory = Math.max(0, Number(inventory.available) || 0);
  const reservedInventory = Math.max(0, Number(inventory.reserved) || 0);
  const lowStockThreshold = Math.max(0, Number(inventory.lowStockThreshold) || 0);

  const inventoryStatus: InventoryStatus = !inventory.allowReservations
    ? 'disabled'
    : availableInventory <= 0
      ? 'sold-out'
      : availableInventory <= lowStockThreshold
        ? 'low'
        : 'available';

  /* --------------------------------------------------------------------------
     INVENTORY FIELD UPDATE
  -------------------------------------------------------------------------- */

  function updateInventoryField(field: keyof InventorySettings, value: string | boolean) {
    setInventory((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  /* --------------------------------------------------------------------------
     TOTAL INVENTORY
  -------------------------------------------------------------------------- */

  function handleTotalInventoryChange(value: string) {
    const normalized = value.replace(/\D/g, '');
    const total = Math.max(0, Number(normalized) || 0);

    setInventory((previous) => {
      const previousTotal = Number(previous.total) || 0;
      const previousAvailable = Number(previous.available) || 0;
      const previousReserved = Number(previous.reserved) || 0;

      /*
       * When the owner changes total inventory, preserve existing
       * reservations where possible.
       *
       * Example:
       *
       * total 10
       * reserved 1
       * available 9
       *
       * Change total to 15:
       * reserved 1
       * available 14
       */
      const wasConsistent = previousTotal === previousAvailable + previousReserved;

      if (wasConsistent) {
        const nextAvailable = Math.max(0, total - previousReserved);

        return {
          ...previous,
          total: String(total),
          available: String(nextAvailable),
        };
      }

      return {
        ...previous,
        total: String(total),
        available: String(Math.max(0, total - previousReserved)),
      };
    });
  }

  /* --------------------------------------------------------------------------
     AVAILABLE INVENTORY
  -------------------------------------------------------------------------- */

  function handleAvailableInventoryChange(value: string) {
    const normalized = value.replace(/\D/g, '');
    const requested = Math.max(0, Number(normalized) || 0);

    setInventory((previous) => {
      const total = Number(previous.total) || 0;
      const reserved = Number(previous.reserved) || 0;
      const maxAvailable = Math.max(0, total - reserved);

      return {
        ...previous,
        available: String(Math.min(requested, maxAvailable)),
      };
    });
  }

  /* --------------------------------------------------------------------------
     RESERVED INVENTORY
  -------------------------------------------------------------------------- */

  function handleReservedInventoryChange(value: string) {
    const parsed = Math.max(0, Number(value) || 0);

    setInventory((previous) => {
      const total = Number(previous.total) || 0;

      return {
        ...previous,
        reserved: String(Math.min(parsed, total)),
      };
    });
  }

  /* --------------------------------------------------------------------------
     AMENITIES
  -------------------------------------------------------------------------- */

  function toggleAmenity(amenity: string) {
    setForm((previous) => ({
      ...previous,
      amenities: previous.amenities.includes(amenity)
        ? previous.amenities.filter((item) => item !== amenity)
        : [...previous.amenities, amenity],
    }));
  }

  /* --------------------------------------------------------------------------
     HOUSE RULES
  -------------------------------------------------------------------------- */

  function toggleHouseRule(rule: string) {
    setForm((previous) => ({
      ...previous,
      houseRules: previous.houseRules.includes(rule)
        ? previous.houseRules.filter((item) => item !== rule)
        : [...previous.houseRules, rule],
    }));
  }

  /* --------------------------------------------------------------------------
     IMAGES
  -------------------------------------------------------------------------- */

  function addImage() {
    const url = imageUrl.trim();

    if (!url) {
      return;
    }

    if (form.images.includes(url)) {
      setImageUrl('');
      return;
    }

    setForm((previous) => ({
      ...previous,
      images: [...previous.images, url],
    }));

    setImageUrl('');
  }

  function removeImage(url: string) {
    setForm((previous) => ({
      ...previous,
      images: previous.images.filter((image) => image !== url),
    }));
  }

  /* --------------------------------------------------------------------------
     CATEGORY CHANGE
  -------------------------------------------------------------------------- */

  function handleCategoryChange(category: string) {
    setForm((previous) => ({
      ...previous,
      category,
      priceUnit: category === 'Vacation Rentals' ? 'night' : previous.priceUnit,
    }));
  }

  /* --------------------------------------------------------------------------
     SUBMIT
  -------------------------------------------------------------------------- */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    /* ----------------------------------------------------------------------
       INVENTORY VALIDATION
    ---------------------------------------------------------------------- */

    const total = Number(inventory.total);
    const available = Number(inventory.available);
    const reserved = Number(inventory.reserved);
    const threshold = Number(inventory.lowStockThreshold);

    if (!Number.isFinite(total) || total < 0) {
      setError('Inventory total must be 0 or greater.');
      setSaving(false);
      return;
    }

    if (!Number.isFinite(available) || available < 0) {
      setError('Available inventory must be 0 or greater.');
      setSaving(false);
      return;
    }

    if (!Number.isFinite(reserved) || reserved < 0) {
      setError('Reserved inventory must be 0 or greater.');
      setSaving(false);
      return;
    }

    if (available + reserved !== total) {
      setError(
        `Inventory must balance. Total (${total}) must equal available (${available}) + reserved (${reserved}).`,
      );
      setSaving(false);
      return;
    }

    if (!Number.isFinite(threshold) || threshold < 0) {
      setError('Low inventory threshold must be 0 or greater.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title: form.title.trim(),
        name: form.title.trim(),
        category: form.category,
        description: form.description.trim() || undefined,

        price: form.price ? Number(form.price) : undefined,
        priceUnit: form.priceUnit,

        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        country: form.country.trim() || undefined,

        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,

        capacity: form.capacity ? Number(form.capacity) : undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        beds: form.beds ? Number(form.beds) : undefined,

        amenities: form.amenities,
        images: form.images,

        /* --------------------------------------------------------------------
           INVENTORY
        -------------------------------------------------------------------- */

        inventory: {
          total,
          available,
          reserved,
          lowStockThreshold: threshold,
          allowReservations: inventory.allowReservations,
        },

        /*
         * These aliases make it easier to connect an existing backend later
         * if your API expects top-level inventory fields.
         */
        inventoryTotal: total,
        inventoryAvailable: available,
        inventoryReserved: reserved,
        inventoryLowStockThreshold: threshold,
        allowReservations: inventory.allowReservations,

        /* --------------------------------------------------------------------
           VACATION RENTAL
        -------------------------------------------------------------------- */

        propertyType: isVacationRental ? form.propertyType : undefined,
        rentalType: isVacationRental ? form.rentalType : undefined,
        checkInTime: isVacationRental ? form.checkInTime : undefined,
        checkOutTime: isVacationRental ? form.checkOutTime : undefined,

        minimumStay: isVacationRental && form.minimumStay ? Number(form.minimumStay) : undefined,
        maximumStay: isVacationRental && form.maximumStay ? Number(form.maximumStay) : undefined,

        cleaningFee: isVacationRental && form.cleaningFee ? Number(form.cleaningFee) : undefined,
        securityDeposit:
          isVacationRental && form.securityDeposit ? Number(form.securityDeposit) : undefined,

        cancellationPolicy: isVacationRental ? form.cancellationPolicy : undefined,
        instantBooking: isVacationRental ? form.instantBooking : undefined,
        houseRules: isVacationRental ? form.houseRules : undefined,

        hostName: form.hostName.trim() || undefined,
        hostDescription: form.hostDescription.trim() || undefined,

        status: 'draft' as const,
      };

      await travelApi.post('/travel/listings', payload);

      setSuccess(true);

      window.setTimeout(() => {
        navigate('/travel/management');
      }, 900);
    } catch (err) {
      console.error('Unable to create travel listing:', err);

      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
        setError(err.message);
      } else {
        setError('Unable to create the listing. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    setForm,
    inventory,
    imageUrl,
    setImageUrl,
    saving,
    error,
    success,

    selectedCategory,
    isVacationRental,

    totalInventory,
    availableInventory,
    reservedInventory,
    inventoryStatus,

    updateInventoryField,
    handleTotalInventoryChange,
    handleAvailableInventoryChange,
    handleReservedInventoryChange,
    toggleAmenity,
    toggleHouseRule,
    addImage,
    removeImage,
    handleCategoryChange,
    handleSubmit,
  };
}
