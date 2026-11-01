
import { useState } from 'react';
import type { FormEvent } from 'react';
import '../styles/CompanyLocations.scss';

export type CompanyLocation = {
  id: string;
  name: string;
  address: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  locationType: 'headquarters' | 'office' | 'branch' | 'remote';
  isHeadquarters: boolean;
  isActive: boolean;
  phone?: string | null;
  email?: string | null;
};

export type CompanyLocationInput = Omit<CompanyLocation, 'id'>;

export type CompanyLocationsProps = {
  locations: CompanyLocation[];
  loading?: boolean;
  saving?: boolean;
  deletingLocationId?: string | null;
  error?: string | null;
  successMessage?: string | null;
  readOnly?: boolean;
  disabled?: boolean;
  onRetry?: () => void;
  onAdd?: (location: CompanyLocationInput) => void | Promise<void>;
  onUpdate?: (
    id: string,
    location: CompanyLocationInput,
  ) => void | Promise<void>;
  onDelete?: (location: CompanyLocation) => void | Promise<void>;
  onSetHeadquarters?: (
    location: CompanyLocation,
  ) => void | Promise<void>;
};

const EMPTY_LOCATION: CompanyLocationInput = {
  name: '',
  address: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  country: 'United States',
  locationType: 'office',
  isHeadquarters: false,
  isActive: true,
  phone: '',
  email: '',
};

const LOCATION_TYPES: {
  value: CompanyLocation['locationType'];
  label: string;
}[] = [
  { value: 'headquarters', label: 'Headquarters' },
  { value: 'office', label: 'Office' },
  { value: 'branch', label: 'Branch' },
  { value: 'remote', label: 'Remote location' },
];

function formatAddress(location: CompanyLocation): string {
  return [
    location.address,
    location.city,
    location.stateProvince,
    location.postalCode,
    location.country,
  ]
    .filter(Boolean)
    .join(', ');
}

function getLocationTypeLabel(
  type: CompanyLocation['locationType'],
): string {
  return (
    LOCATION_TYPES.find((item) => item.value === type)?.label ??
    'Office'
  );
}

function CompanyLocationsSkeleton() {
  return (
    <div
      className="company-locations__skeleton"
      aria-label="Loading company locations"
      aria-busy="true"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export function CompanyLocations({
  locations,
  loading = false,
  saving = false,
  deletingLocationId = null,
  error = null,
  successMessage = null,
  readOnly = false,
  disabled = false,
  onRetry,
  onAdd,
  onUpdate,
  onDelete,
  onSetHeadquarters,
}: CompanyLocationsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState<CompanyLocationInput>({
    ...EMPTY_LOCATION,
  });
  const [validationError, setValidationError] = useState<string | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<CompanyLocation | null>(null);

  const isDisabled = disabled || loading || saving;

  const sortedLocations = [...locations].sort((a, b) => {
    if (a.isHeadquarters !== b.isHeadquarters) {
      return a.isHeadquarters ? -1 : 1;
    }

    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

  const resetForm = () => {
    setForm({ ...EMPTY_LOCATION });
    setEditingLocationId(null);
    setShowForm(false);
    setValidationError(null);
    setFormError(null);
  };

  const updateField = <K extends keyof CompanyLocationInput>(
    field: K,
    value: CompanyLocationInput[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'locationType' && value === 'headquarters'
        ? { isHeadquarters: true }
        : {}),
    }));

    setValidationError(null);
    setFormError(null);
  };

  const startAdd = () => {
    setForm({
      ...EMPTY_LOCATION,
      isHeadquarters: locations.length === 0,
      locationType: locations.length === 0 ? 'headquarters' : 'office',
    });
    setEditingLocationId(null);
    setShowForm(true);
    setValidationError(null);
    setFormError(null);
  };

  const startEdit = (location: CompanyLocation) => {
    const { id: _id, ...locationData } = location;

    setForm({
      ...EMPTY_LOCATION,
      ...locationData,
    });

    setEditingLocationId(location.id);
    setShowForm(true);
    setValidationError(null);
    setFormError(null);
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      setValidationError('Enter a location name.');
      return false;
    }

    if (!form.country.trim()) {
      setValidationError('Enter the country.');
      return false;
    }

    if (
      form.email?.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      setValidationError('Enter a valid contact email.');
      return false;
    }

    if (form.isHeadquarters && !form.isActive) {
      setValidationError('The headquarters location must be active.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDisabled || !validateForm()) return;

    if (editingLocationId && !onUpdate) return;
    if (!editingLocationId && !onAdd) return;

    const payload: CompanyLocationInput = {
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      stateProvince: form.stateProvince.trim(),
      postalCode: form.postalCode.trim(),
      country: form.country.trim(),
      phone: form.phone?.trim() || '',
      email: form.email?.trim() || '',
    };

    try {
      setFormError(null);

      if (editingLocationId) {
        await onUpdate?.(editingLocationId, payload);
      } else {
        await onAdd?.(payload);
      }

      resetForm();
    } catch {
      setFormError(
        'The location could not be saved. Please try again.',
      );
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || !onDelete || isDisabled) return;

    try {
      await onDelete(confirmDelete);
      setConfirmDelete(null);
    } catch {
      setFormError(
        'The location could not be removed. Please try again.',
      );
    }
  };

  const handleSetHeadquarters = async (location: CompanyLocation) => {
    if (!onSetHeadquarters || isDisabled) return;

    try {
      await onSetHeadquarters(location);
    } catch {
      setFormError(
        'The headquarters location could not be updated.',
      );
    }
  };

  return (
    <section
      className="company-locations"
      aria-label="Company locations"
      aria-busy={loading || saving}
    >
      <header className="company-locations__header">
        <div>
          <span className="company-locations__eyebrow">
            COMPANY PROFILE
          </span>

          <h2>Company locations</h2>

          <p>
            Manage your headquarters, offices, branches, and remote
            locations.
          </p>
        </div>

        {!readOnly && onAdd && (
          <button
            type="button"
            className="company-locations__add-button"
            onClick={startAdd}
            disabled={isDisabled}
          >
            <span aria-hidden="true">+</span>
            Add location
          </button>
        )}
      </header>

      {error && (
        <div
          className="company-locations__message company-locations__message--error"
          role="alert"
        >
          {error}
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={disabled}>
              Retry
            </button>
          )}
        </div>
      )}

      {successMessage && (
        <div
          className="company-locations__message company-locations__message--success"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {formError && (
        <div
          className="company-locations__message company-locations__message--error"
          role="alert"
        >
          {formError}
        </div>
      )}

      {loading ? (
        <CompanyLocationsSkeleton />
      ) : (
        <>
          {!showForm && locations.length === 0 ? (
            <div className="company-locations__empty">
              <span
                className="company-locations__empty-icon"
                aria-hidden="true"
              >
                ⌖
              </span>

              <h3>No company locations yet</h3>

              <p>
                Add your headquarters or other office locations to
                help candidates understand where your organization
                operates.
              </p>

              {!readOnly && onAdd && (
                <button
                  type="button"
                  className="company-locations__add-button"
                  onClick={startAdd}
                  disabled={isDisabled}
                >
                  Add your first location
                </button>
              )}
            </div>
          ) : (
            <div className="company-locations__list">
              {sortedLocations.map((location) => (
                <article
                  className={`company-locations__card${!location.isActive ? ' company-locations__card--inactive' : ''}`}
                  key={location.id}
                >
                  <div className="company-locations__card-icon">
                    <span aria-hidden="true">
                      {location.locationType === 'remote' ? '⌂' : '⌖'}
                    </span>
                  </div>

                  <div className="company-locations__card-content">
                    <div className="company-locations__card-title">
                      <h3>{location.name}</h3>

                      {location.isHeadquarters && (
                        <span className="company-locations__headquarters-badge">
                          Headquarters
                        </span>
                      )}

                      {!location.isActive && (
                        <span className="company-locations__inactive-badge">
                          Inactive
                        </span>
                      )}
                    </div>

                    <span className="company-locations__type">
                      {getLocationTypeLabel(location.locationType)}
                    </span>

                    <p className="company-locations__address">
                      {formatAddress(location) || 'Address not provided'}
                    </p>

                    {(location.phone || location.email) && (
                      <div className="company-locations__contact">
                        {location.phone && (
                          <span>{location.phone}</span>
                        )}
                        {location.email && (
                          <span>{location.email}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {!readOnly && (
                    <div className="company-locations__card-actions">
                      {!location.isHeadquarters &&
                        onSetHeadquarters && (
                          <button
                            type="button"
                            onClick={() => handleSetHeadquarters(location)}
                            disabled={isDisabled}
                          >
                            Set headquarters
                          </button>
                        )}

                      {onUpdate && (
                        <button
                          type="button"
                          onClick={() => startEdit(location)}
                          disabled={isDisabled}
                        >
                          Edit
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          className="company-locations__delete-button"
                          onClick={() => setConfirmDelete(location)}
                          disabled={
                            isDisabled ||
                            deletingLocationId === location.id
                          }
                        >
                          {deletingLocationId === location.id
                            ? 'Removing...'
                            : 'Remove'}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {showForm && !readOnly && (
        <div className="company-locations__form-panel">
          <div className="company-locations__form-heading">
            <div>
              <h3>
                {editingLocationId ? 'Edit location' : 'Add a location'}
              </h3>
              <p>Enter the location details below.</p>
            </div>

            <button
              type="button"
              className="company-locations__close-button"
              onClick={resetForm}
              disabled={isDisabled}
              aria-label="Close location form"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="company-locations__form-grid">
              <div className="company-locations__field">
                <label htmlFor="location-name">Location name *</label>
                <input
                  id="location-name"
                  value={form.name}
                  onChange={(event) =>
                    updateField('name', event.target.value)
                  }
                  placeholder="e.g. New York Headquarters"
                  maxLength={120}
                  disabled={isDisabled}
                  required
                />
              </div>

              <div className="company-locations__field">
                <label htmlFor="location-type">Location type *</label>
                <select
                  id="location-type"
                  value={form.locationType}
                  onChange={(event) =>
                    updateField(
                      'locationType',
                      event.target.value as CompanyLocation['locationType'],
                    )
                  }
                  disabled={isDisabled}
                >
                  {LOCATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="company-locations__field company-locations__field--full">
                <label htmlFor="location-address">Street address</label>
                <input
                  id="location-address"
                  value={form.address}
                  onChange={(event) =>
                    updateField('address', event.target.value)
                  }
                  placeholder="Street address"
                  maxLength={200}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-locations__field">
                <label htmlFor="location-city">City</label>
                <input
                  id="location-city"
                  value={form.city}
                  onChange={(event) =>
                    updateField('city', event.target.value)
                  }
                  placeholder="City"
                  maxLength={100}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-locations__field">
                <label htmlFor="location-state">State / Province</label>
                <input
                  id="location-state"
                  value={form.stateProvince}
                  onChange={(event) =>
                    updateField('stateProvince', event.target.value)
                  }
                  placeholder="State or province"
                  maxLength={100}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-locations__field">
                <label htmlFor="location-postal">Postal code</label>
                <input
                  id="location-postal"
                  value={form.postalCode}
                  onChange={(event) =>
                    updateField('postalCode', event.target.value)
                  }
                  placeholder="Postal code"
                  maxLength={30}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-locations__field">
                <label htmlFor="location-country">Country *</label>
                <input
                  id="location-country"
                  value={form.country}
                  onChange={(event) =>
                    updateField('country', event.target.value)
                  }
                  placeholder="Country"
                  maxLength={100}
                  disabled={isDisabled}
                  required
                />
              </div>

              <div className="company-locations__field">
                <label htmlFor="location-phone">Contact phone</label>
                <input
                  id="location-phone"
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(event) =>
                    updateField('phone', event.target.value)
                  }
                  placeholder="Contact phone"
                  maxLength={40}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-locations__field">
                <label htmlFor="location-email">Contact email</label>
                <input
                  id="location-email"
                  type="email"
                  value={form.email ?? ''}
                  onChange={(event) =>
                    updateField('email', event.target.value)
                  }
                  placeholder="office@example.com"
                  maxLength={254}
                  disabled={isDisabled}
                />
              </div>
            </div>

            <div className="company-locations__form-options">
              <label>
                <input
                  type="checkbox"
                  checked={form.isHeadquarters}
                  onChange={(event) =>
                    updateField('isHeadquarters', event.target.checked)
                  }
                  disabled={isDisabled}
                />
                Set as company headquarters
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateField('isActive', event.target.checked)
                  }
                  disabled={isDisabled || form.isHeadquarters}
                />
                Active location
              </label>
            </div>

            {validationError && (
              <div
                className="company-locations__message company-locations__message--error"
                role="alert"
              >
                {validationError}
              </div>
            )}

            <div className="company-locations__form-actions">
              <button
                type="button"
                className="company-locations__cancel-button"
                onClick={resetForm}
                disabled={isDisabled}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="company-locations__save-button"
                disabled={isDisabled}
              >
                {saving
                  ? 'Saving...'
                  : editingLocationId
                    ? 'Save changes'
                    : 'Add location'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div
          className="company-locations__dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmDelete(null);
            }
          }}
        >
          <div
            className="company-locations__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-location-title"
          >
            <h3 id="delete-location-title">Remove this location?</h3>

            <p>
              Are you sure you want to remove{' '}
              <strong>{confirmDelete.name}</strong>?
            </p>

            {confirmDelete.isHeadquarters && (
              <p className="company-locations__dialog-warning">
                This is marked as the company headquarters. Assign a
                new headquarters before removing it.
              </p>
            )}

            <div className="company-locations__form-actions">
              <button
                type="button"
                className="company-locations__cancel-button"
                onClick={() => setConfirmDelete(null)}
                disabled={isDisabled}
              >
                Cancel
              </button>

              <button
                type="button"
                className="company-locations__delete-confirm-button"
                onClick={handleDelete}
                disabled={
                  isDisabled ||
                  (confirmDelete.isHeadquarters &&
                    locations.filter((item) => item.isActive).length > 1)
                }
              >
                Remove location
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="company-locations__security-note">
        Location changes are saved by the employer service. The
        backend must enforce company ownership and headquarters
        assignment rules.
      </p>
    </section>
  );
}

export default CompanyLocations;
