import { Package } from 'lucide-react';

import { FormCard } from './FormCard';
import { ToggleSwitch } from './ToggleSwitch';
import type { InventorySettings, InventoryStatus } from './types';

interface InventorySectionProps {
  inventory: InventorySettings;
  totalInventory: number;
  availableInventory: number;
  reservedInventory: number;
  inventoryStatus: InventoryStatus;
  updateInventoryField: (field: keyof InventorySettings, value: string | boolean) => void;
  handleTotalInventoryChange: (value: string) => void;
  handleAvailableInventoryChange: (value: string) => void;
  handleReservedInventoryChange: (value: string) => void;
}

const STATUS_BORDER: Record<InventoryStatus, string> = {
  available: '1px solid #b8dfc1',
  low: '1px solid #ecd39b',
  'sold-out': '1px solid #efb8b8',
  disabled: '1px solid rgba(15,27,43,0.12)',
};

const STATUS_BACKGROUND: Record<InventoryStatus, string> = {
  available: '#edf9f0',
  low: '#fff9e9',
  'sold-out': '#fff4f4',
  disabled: '#f5f7f8',
};

const STATUS_DOT_COLOR: Record<InventoryStatus, string> = {
  available: '#2e8b57',
  low: '#d19a00',
  'sold-out': '#c62828',
  disabled: '#7a8791',
};

const STATUS_LABEL: Record<InventoryStatus, string> = {
  available: 'Available',
  low: 'Low inventory',
  'sold-out': 'Sold out',
  disabled: 'Reservations disabled',
};

// The status bar only ever used three colors in the original markup —
// "sold-out" and "disabled" both fall through to the same red.
const STATUS_BAR_COLOR: Record<InventoryStatus, string> = {
  available: '#2e8b57',
  low: '#d19a00',
  'sold-out': '#c62828',
  disabled: '#c62828',
};

export function InventorySection({
  inventory,
  totalInventory,
  availableInventory,
  reservedInventory,
  inventoryStatus,
  updateInventoryField,
  handleTotalInventoryChange,
  handleAvailableInventoryChange,
  handleReservedInventoryChange,
}: InventorySectionProps) {
  const availablePercent =
    totalInventory > 0
      ? Math.min(100, Math.max(0, (availableInventory / totalInventory) * 100))
      : 0;

  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <Package size={20} />
        <h2 style={{ margin: 0 }}>Inventory & availability</h2>
      </div>

      <p style={{ marginTop: 0, color: 'var(--slate, #5B6B76)', fontSize: 14, lineHeight: 1.6 }}>
        Control how many units, seats, vehicles, rooms, tickets, or reservations are available
        for this listing.
      </p>

      {/* INVENTORY NUMBERS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
          marginTop: 18,
        }}
      >
        <div className="ft-field">
          <label htmlFor="inventory-total">Total inventory</label>

          <input
            id="inventory-total"
            type="number"
            min="0"
            step="1"
            value={inventory.total}
            onChange={(event) => handleTotalInventoryChange(event.target.value)}
          />

          <small
            style={{ display: 'block', marginTop: 5, color: 'var(--slate, #5B6B76)', fontSize: 12 }}
          >
            Example: 10 rooms or 10 cars
          </small>
        </div>

        <div className="ft-field">
          <label htmlFor="inventory-available">Available</label>

          <input
            id="inventory-available"
            type="number"
            min="0"
            step="1"
            value={inventory.available}
            onChange={(event) => handleAvailableInventoryChange(event.target.value)}
          />

          <small style={{ display: 'block', marginTop: 5, color: '#236b35', fontSize: 12 }}>
            Currently available
          </small>
        </div>

        <div className="ft-field">
          <label htmlFor="inventory-reserved">Reserved</label>

          <input
            id="inventory-reserved"
            type="number"
            min="0"
            step="1"
            value={inventory.reserved}
            onChange={(event) => handleReservedInventoryChange(event.target.value)}
          />

          <small
            style={{ display: 'block', marginTop: 5, color: 'var(--slate, #5B6B76)', fontSize: 12 }}
          >
            Already reserved
          </small>
        </div>
      </div>

      {/* LOW STOCK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, marginTop: 8 }}>
        <div className="ft-field">
          <label htmlFor="inventory-threshold">Low inventory alert threshold</label>

          <input
            id="inventory-threshold"
            type="number"
            min="0"
            step="1"
            value={inventory.lowStockThreshold}
            onChange={(event) => updateInventoryField('lowStockThreshold', event.target.value)}
            placeholder="2"
          />

          <small
            style={{ display: 'block', marginTop: 5, color: 'var(--slate, #5B6B76)', fontSize: 12 }}
          >
            When available inventory reaches this number, the listing will show low availability.
          </small>
        </div>
      </div>

      {/* RESERVATIONS TOGGLE */}
      <div
        style={{
          marginTop: 12,
          padding: '15px 16px',
          borderRadius: 12,
          border: '1px solid rgba(15,27,43,0.10)',
          background: 'rgba(15,27,43,0.025)',
        }}
      >
        <ToggleSwitch
          checked={inventory.allowReservations}
          onChange={() =>
            updateInventoryField('allowReservations', !inventory.allowReservations)
          }
          label="Allow reservations"
          description="When enabled, customers can reserve available inventory."
        />
      </div>

      {/* INVENTORY STATUS */}
      <div
        style={{
          marginTop: 16,
          padding: 18,
          borderRadius: 14,
          border: STATUS_BORDER[inventoryStatus],
          background: STATUS_BACKGROUND[inventoryStatus],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 15,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: STATUS_DOT_COLOR[inventoryStatus],
              }}
            />

            <strong>{STATUS_LABEL[inventoryStatus]}</strong>
          </div>

          <strong style={{ fontSize: 20 }}>{availableInventory} available</strong>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--slate, #5B6B76)' }}>
          {reservedInventory} reserved of {totalInventory} total
        </div>

        {/* Inventory bar */}
        <div
          style={{
            height: 8,
            background: 'rgba(15,27,43,0.10)',
            borderRadius: 999,
            overflow: 'hidden',
            marginTop: 12,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${availablePercent}%`,
              background: STATUS_BAR_COLOR[inventoryStatus],
              transition: 'width .2s ease',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            fontSize: 12,
            color: 'var(--slate, #5B6B76)',
          }}
        >
          <span>Available</span>

          <span>
            {totalInventory > 0 ? Math.round((availableInventory / totalInventory) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* FUTURE BACKEND NOTE */}
      <div
        style={{
          marginTop: 14,
          padding: 13,
          borderRadius: 10,
          background: 'rgba(232,163,61,0.08)',
          border: '1px solid rgba(232,163,61,0.22)',
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        <strong>Reservation behavior</strong>

        <div style={{ marginTop: 4, color: 'var(--slate, #5B6B76)' }}>
          Example: if you have 10 units and a traveler reserves 1, the backend should change
          available inventory from 10 to 9 and reserved inventory from 0 to 1.
        </div>
      </div>
    </FormCard>
  );
}
