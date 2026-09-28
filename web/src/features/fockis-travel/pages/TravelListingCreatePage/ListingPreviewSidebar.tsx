import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Home,
  Loader2,
  MapPin,
  Package,
  Save,
  Users,
} from 'lucide-react';

import type { ListingForm } from './types';

interface ListingPreviewSidebarProps {
  form: ListingForm;
  isVacationRental: boolean;
  selectedCategoryIcon?: string;
  totalInventory: number;
  availableInventory: number;
  reservedInventory: number;
  saving: boolean;
}

export function ListingPreviewSidebar({
  form,
  isVacationRental,
  selectedCategoryIcon,
  totalInventory,
  availableInventory,
  reservedInventory,
  saving,
}: ListingPreviewSidebarProps) {
  return (
    <aside style={{ position: 'sticky', top: 90, display: 'grid', gap: 15 }}>
      {/* PREVIEW */}
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--line, rgba(15,27,43,0.12))',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 15 }}>
          <Building2 size={18} />
          <strong>Listing preview</strong>
        </div>

        <div style={{ fontSize: 36, marginBottom: 8 }}>{selectedCategoryIcon}</div>

        <h3 style={{ margin: '0 0 5px' }}>{form.title || 'Your listing name'}</h3>

        <div style={{ fontSize: 13, color: 'var(--slate, #5B6B76)' }}>{form.category}</div>

        {isVacationRental && form.propertyType && (
          <div style={{ marginTop: 8, fontSize: 13 }}>{form.propertyType}</div>
        )}

        {(form.city || form.country) && (
          <div
            style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 12, fontSize: 13 }}
          >
            <MapPin size={13} />
            {[form.city, form.state, form.country].filter(Boolean).join(', ')}
          </div>
        )}

        {form.price && (
          <div style={{ marginTop: 18, fontWeight: 700, fontSize: 20 }}>
            ${form.price}
            <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>
              / {form.priceUnit}
            </span>
          </div>
        )}

        {/* INVENTORY MINI SUMMARY */}
        <div style={{ marginTop: 18, paddingTop: 15, borderTop: '1px solid rgba(15,27,43,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Package size={15} />
            <strong style={{ fontSize: 13 }}>Availability</strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <div
              style={{ padding: '9px 5px', borderRadius: 9, background: '#f5f7f8', textAlign: 'center' }}
            >
              <strong style={{ display: 'block', fontSize: 18 }}>{totalInventory}</strong>
              <span style={{ fontSize: 10, color: 'var(--slate, #5B6B76)' }}>Total</span>
            </div>

            <div
              style={{ padding: '9px 5px', borderRadius: 9, background: '#edf9f0', textAlign: 'center' }}
            >
              <strong style={{ display: 'block', fontSize: 18, color: '#236b35' }}>
                {availableInventory}
              </strong>
              <span style={{ fontSize: 10, color: 'var(--slate, #5B6B76)' }}>Available</span>
            </div>

            <div
              style={{ padding: '9px 5px', borderRadius: 9, background: '#fff4f4', textAlign: 'center' }}
            >
              <strong style={{ display: 'block', fontSize: 18, color: '#9b2226' }}>
                {reservedInventory}
              </strong>
              <span style={{ fontSize: 10, color: 'var(--slate, #5B6B76)' }}>Reserved</span>
            </div>
          </div>
        </div>

        {isVacationRental && (form.capacity || form.bedrooms || form.beds || form.bathrooms) && (
          <div
            style={{
              display: 'grid',
              gap: 7,
              marginTop: 15,
              paddingTop: 15,
              borderTop: '1px solid rgba(15,27,43,0.08)',
              fontSize: 13,
            }}
          >
            {form.capacity && (
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Users size={14} />
                {form.capacity} guests
              </div>
            )}

            {form.bedrooms && (
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Home size={14} />
                {form.bedrooms} bedrooms
              </div>
            )}

            {form.beds && (
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <BedDouble size={14} />
                {form.beds} beds
              </div>
            )}

            {form.bathrooms && (
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Bath size={14} />
                {form.bathrooms} bathrooms
              </div>
            )}
          </div>
        )}
      </div>

      {/* INVENTORY RULE */}
      <div
        style={{
          background: 'rgba(232,163,61,0.09)',
          border: '1px solid rgba(232,163,61,0.25)',
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Package size={17} />
          <strong>Reservation inventory</strong>
        </div>

        <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--slate, #5B6B76)' }}>
          Every successful reservation should decrease the available quantity by the number
          reserved.
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            background: '#fff',
            border: '1px solid rgba(15,27,43,0.08)',
            fontSize: 13,
          }}
        >
          <strong>Example</strong>

          <div style={{ marginTop: 5 }}>
            10 available
            <ArrowRight size={13} style={{ verticalAlign: 'middle', margin: '0 5px' }} />
            1 reserved
            <ArrowRight size={13} style={{ verticalAlign: 'middle', margin: '0 5px' }} />
            9 available
          </div>

          <div style={{ marginTop: 4, color: 'var(--slate, #5B6B76)' }}>
            If that reservation is cancelled, it can return to 10 available.
          </div>
        </div>
      </div>

      {/* HOSTING CHECKLIST */}
      <div
        style={{
          background: 'rgba(232,163,61,0.09)',
          border: '1px solid rgba(232,163,61,0.25)',
          borderRadius: 16,
          padding: 18,
        }}
      >
        <strong>Before you publish</strong>

        <ul style={{ margin: '10px 0 0', paddingLeft: 19, fontSize: 13, lineHeight: 1.7 }}>
          <li>Use accurate property information.</li>
          <li>Add high-quality photos.</li>
          <li>Set an accurate starting price.</li>
          <li>Make sure your location is correct.</li>
          <li>Set the correct inventory quantity.</li>
          <li>Confirm available inventory equals total minus reserved.</li>

          {isVacationRental && (
            <>
              <li>Provide accurate guest capacity.</li>
              <li>Set your check-in and check-out times.</li>
              <li>Clearly state your house rules.</li>
              <li>Select a cancellation policy.</li>
            </>
          )}
        </ul>
      </div>

      {/* CREATE BUTTON */}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={saving}
        style={{
          width: '100%',
          justifyContent: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '13px 18px',
        }}
      >
        {saving ? (
          <>
            <Loader2 size={16} className="spin" />
            Creating listing...
          </>
        ) : (
          <>
            <Save size={16} />
            Create listing
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </aside>
  );
}
