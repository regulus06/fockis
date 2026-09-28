import { ArrowLeft, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useListingForm } from './useListingForm';

import { BasicInfoSection } from './BasicInfoSection';
import { InventorySection } from './InventorySection';
import { VacationRentalSection } from './VacationRentalSection';
import { PricingSection } from './PricingSection';
import { StayRequirementsSection } from './StayRequirementsSection';
import { LocationSection } from './LocationSection';
import { CapacitySection } from './CapacitySection';
import { AmenitiesSection } from './AmenitiesSection';
import { HouseRulesSection } from './HouseRulesSection';
import { CancellationSection } from './CancellationSection';
import { BookingSettingsSection } from './BookingSettingsSection';
import { HostInfoSection } from './HostInfoSection';
import { ImagesSection } from './ImagesSection';
import { ListingPreviewSidebar } from './ListingPreviewSidebar';

/**
 * Create a hotel, restaurant, transportation service, experience, event, or
 * Airbnb-style vacation rental listing.
 *
 * All state, derived values, and handlers live in ./useListingForm — this
 * file is only layout/composition. Each card in the original page is now
 * its own section component (see the other files in this folder).
 */
export default function TravelListingCreatePage() {
  const {
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
  } = useListingForm();

  return (
    <div className="travel-management-page">
      <section className="tight">
        <div className="wrap">
          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
              marginBottom: 30,
            }}
          >
            <div>
              <Link
                to="/travel/management"
                className="btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 18 }}
              >
                <ArrowLeft size={15} />
                Back to Management
              </Link>

              <div className="eyebrow">Fockis Travel Partner</div>

              <h1>Create a new travel listing</h1>

              <p style={{ maxWidth: 720, color: 'var(--slate, #5B6B76)', marginTop: 8 }}>
                Create a hotel, restaurant, transportation service, experience, event, or
                Airbnb-style vacation rental.
              </p>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div
              role="alert"
              style={{
                maxWidth: 850,
                marginBottom: 20,
                padding: 14,
                borderRadius: 10,
                background: '#fff4f4',
                border: '1px solid #efb8b8',
                color: '#9b2226',
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div
              style={{
                maxWidth: 850,
                marginBottom: 20,
                padding: 15,
                borderRadius: 10,
                background: '#edf9f0',
                border: '1px solid #b8dfc1',
                color: '#236b35',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Check size={18} />
              Listing created successfully. Returning to your management dashboard...
            </div>
          )}

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 300px',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* MAIN FORM */}
            <div style={{ display: 'grid', gap: 20 }}>
              <BasicInfoSection
                form={form}
                setForm={setForm}
                isVacationRental={isVacationRental}
                onCategoryChange={handleCategoryChange}
              />

              <InventorySection
                inventory={inventory}
                totalInventory={totalInventory}
                availableInventory={availableInventory}
                reservedInventory={reservedInventory}
                inventoryStatus={inventoryStatus}
                updateInventoryField={updateInventoryField}
                handleTotalInventoryChange={handleTotalInventoryChange}
                handleAvailableInventoryChange={handleAvailableInventoryChange}
                handleReservedInventoryChange={handleReservedInventoryChange}
              />

              {isVacationRental && <VacationRentalSection form={form} setForm={setForm} />}

              <PricingSection form={form} setForm={setForm} isVacationRental={isVacationRental} />

              {isVacationRental && <StayRequirementsSection form={form} setForm={setForm} />}

              <LocationSection form={form} setForm={setForm} />

              <CapacitySection form={form} setForm={setForm} />

              <AmenitiesSection amenities={form.amenities} onToggle={toggleAmenity} />

              {isVacationRental && (
                <HouseRulesSection houseRules={form.houseRules} onToggle={toggleHouseRule} />
              )}

              {isVacationRental && <CancellationSection form={form} setForm={setForm} />}

              {isVacationRental && <BookingSettingsSection form={form} setForm={setForm} />}

              <HostInfoSection form={form} setForm={setForm} isVacationRental={isVacationRental} />

              <ImagesSection
                images={form.images}
                imageUrl={imageUrl}
                setImageUrl={setImageUrl}
                onAddImage={addImage}
                onRemoveImage={removeImage}
              />
            </div>

            {/* SIDE SUMMARY */}
            <ListingPreviewSidebar
              form={form}
              isVacationRental={isVacationRental}
              selectedCategoryIcon={selectedCategory?.icon}
              totalInventory={totalInventory}
              availableInventory={availableInventory}
              reservedInventory={reservedInventory}
              saving={saving}
            />
          </form>
        </div>
      </section>
    </div>
  );
}
