
import { useEffect, useState, type FormEvent } from 'react';
import '../styles/CompanyProfileForm.scss';

export type CompanyProfileFormData = {
  displayName: string;
  legalName: string;
  industry: string;
  companySize: string;
  foundedYear: string;
  website: string;
  email: string;
  phone: string;
  country: string;
  stateProvince: string;
  city: string;
  address: string;
  postalCode: string;
  description: string;
};

export type CompanyProfileFormProps = {
  value: CompanyProfileFormData;
  onSave: (profile: CompanyProfileFormData) => void | Promise<void>;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  successMessage?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  maxDescriptionLength?: number;
};

type FormErrors = Partial<Record<keyof CompanyProfileFormData, string>>;

const EMPTY_PROFILE: CompanyProfileFormData = {
  displayName: '',
  legalName: '',
  industry: '',
  companySize: '',
  foundedYear: '',
  website: '',
  email: '',
  phone: '',
  country: 'United States',
  stateProvince: '',
  city: '',
  address: '',
  postalCode: '',
  description: '',
};

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Construction',
  'Hospitality',
  'Transportation',
  'Media and Entertainment',
  'Professional Services',
  'Other',
];

const COMPANY_SIZES = [
  '1–10 employees',
  '11–50 employees',
  '51–200 employees',
  '201–500 employees',
  '501–1,000 employees',
  '1,001–5,000 employees',
  '5,001–10,000 employees',
  '10,000+ employees',
];

function validateWebsite(value: string): boolean {
  if (!value.trim()) return true;

  try {
    const candidate = /^https?:\/\//i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`;

    const url = new URL(candidate);

    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.hostname.includes('.')
    );
  } catch {
    return false;
  }
}

function validateEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateProfile(
  profile: CompanyProfileFormData,
  maxDescriptionLength: number,
): FormErrors {
  const errors: FormErrors = {};

  if (!profile.displayName.trim()) {
    errors.displayName = 'Enter your company display name.';
  } else if (profile.displayName.trim().length > 120) {
    errors.displayName = 'Company name must be 120 characters or fewer.';
  }

  if (profile.legalName.length > 160) {
    errors.legalName = 'Legal name must be 160 characters or fewer.';
  }

  if (!validateWebsite(profile.website)) {
    errors.website = 'Enter a valid website URL.';
  }

  if (!validateEmail(profile.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (
    profile.foundedYear.trim() &&
    (!/^\d{4}$/.test(profile.foundedYear.trim()) ||
      Number(profile.foundedYear) < 1800 ||
      Number(profile.foundedYear) > new Date().getFullYear())
  ) {
    errors.foundedYear = 'Enter a valid founded year.';
  }

  if (profile.description.length > maxDescriptionLength) {
    errors.description = `Description must be ${maxDescriptionLength} characters or fewer.`;
  }

  return errors;
}

export function CompanyProfileForm({
  value,
  onSave,
  loading = false,
  saving = false,
  error = null,
  successMessage = null,
  disabled = false,
  readOnly = false,
  onRetry,
  onCancel,
  maxDescriptionLength = 3000,
}: CompanyProfileFormProps) {
  const [form, setForm] = useState<CompanyProfileFormData>({
    ...EMPTY_PROFILE,
    ...value,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    setForm({ ...EMPTY_PROFILE, ...value });
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
  }, [value]);

  const isDisabled = disabled || loading || saving || readOnly;

  const updateField = (
    field: keyof CompanyProfileFormData,
    nextValue: string,
  ) => {
    setForm((current) => ({ ...current, [field]: nextValue }));

    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDisabled) return;

    const nextErrors = validateProfile(form, maxDescriptionLength);
    setErrors(nextErrors);
    setSubmitError(null);
    setSubmitSuccess(false);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidField = Object.keys(nextErrors)[0];
      document
        .getElementById(`company-profile-${firstInvalidField}`)
        ?.focus();
      return;
    }

    const normalized: CompanyProfileFormData = {
      ...form,
      displayName: form.displayName.trim(),
      legalName: form.legalName.trim(),
      industry: form.industry.trim(),
      companySize: form.companySize.trim(),
      foundedYear: form.foundedYear.trim(),
      website: form.website.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country.trim(),
      stateProvince: form.stateProvince.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      postalCode: form.postalCode.trim(),
      description: form.description.trim(),
    };

    try {
      await onSave(normalized);
      setSubmitSuccess(true);
    } catch (saveError) {
      setSubmitError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save your company profile. Please try again.',
      );
    }
  };

  if (loading) {
    return (
      <section
        className="company-profile-form company-profile-form--loading"
        aria-busy="true"
        aria-label="Loading company profile"
      >
        <div className="company-profile-form__skeleton-heading" />
        <div className="company-profile-form__skeleton-field" />
        <div className="company-profile-form__skeleton-field" />
        <div className="company-profile-form__skeleton-field" />
        <div className="company-profile-form__skeleton-field company-profile-form__skeleton-field--large" />
      </section>
    );
  }

  return (
    <section className="company-profile-form">
      <header className="company-profile-form__header">
        <div>
          <span className="company-profile-form__eyebrow">
            EMPLOYER CENTER
          </span>
          <h2>Company information</h2>
          <p>
            Keep your organization details accurate so candidates can
            learn about your company.
          </p>
        </div>

        <span className="company-profile-form__private-label">
          <span aria-hidden="true">●</span>
          Employer account
        </span>
      </header>

      {error && (
        <div
          className="company-profile-form__alert company-profile-form__alert--error"
          role="alert"
        >
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled || saving}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {submitError && (
        <div
          className="company-profile-form__alert company-profile-form__alert--error"
          role="alert"
        >
          {submitError}
        </div>
      )}

      {(successMessage || submitSuccess) && (
        <div
          className="company-profile-form__alert company-profile-form__alert--success"
          role="status"
        >
          {successMessage || 'Company profile saved successfully.'}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isDisabled}>
          <legend className="company-profile-form__legend">
            Basic information
          </legend>

          <div className="company-profile-form__grid">
            <div className="company-profile-form__field">
              <label htmlFor="company-profile-displayName">
                Company display name <span>*</span>
              </label>
              <input
                id="company-profile-displayName"
                value={form.displayName}
                onChange={(event) =>
                  updateField('displayName', event.target.value)
                }
                maxLength={120}
                placeholder="e.g. Fockis Technologies"
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={
                  errors.displayName ? 'company-profile-displayName-error' : undefined
                }
                required
              />
              {errors.displayName && (
                <small
                  id="company-profile-displayName-error"
                  className="company-profile-form__field-error"
                >
                  {errors.displayName}
                </small>
              )}
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-legalName">
                Legal company name
              </label>
              <input
                id="company-profile-legalName"
                value={form.legalName}
                onChange={(event) =>
                  updateField('legalName', event.target.value)
                }
                maxLength={160}
                placeholder="Registered legal business name"
                aria-invalid={Boolean(errors.legalName)}
              />
              {errors.legalName && (
                <small className="company-profile-form__field-error">
                  {errors.legalName}
                </small>
              )}
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-industry">Industry</label>
              <select
                id="company-profile-industry"
                value={form.industry}
                onChange={(event) =>
                  updateField('industry', event.target.value)
                }
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-companySize">
                Company size
              </label>
              <select
                id="company-profile-companySize"
                value={form.companySize}
                onChange={(event) =>
                  updateField('companySize', event.target.value)
                }
              >
                <option value="">Select company size</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-foundedYear">
                Founded year
              </label>
              <input
                id="company-profile-foundedYear"
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={form.foundedYear}
                onChange={(event) =>
                  updateField('foundedYear', event.target.value)
                }
                placeholder="e.g. 2020"
                aria-invalid={Boolean(errors.foundedYear)}
              />
              {errors.foundedYear && (
                <small className="company-profile-form__field-error">
                  {errors.foundedYear}
                </small>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset disabled={isDisabled}>
          <legend className="company-profile-form__legend">
            Contact information
          </legend>

          <div className="company-profile-form__grid">
            <div className="company-profile-form__field">
              <label htmlFor="company-profile-website">
                Company website
              </label>
              <input
                id="company-profile-website"
                type="url"
                value={form.website}
                onChange={(event) =>
                  updateField('website', event.target.value)
                }
                placeholder="https://example.com"
                aria-invalid={Boolean(errors.website)}
              />
              {errors.website && (
                <small className="company-profile-form__field-error">
                  {errors.website}
                </small>
              )}
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-email">
                Business email
              </label>
              <input
                id="company-profile-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) =>
                  updateField('email', event.target.value)
                }
                placeholder="contact@example.com"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && (
                <small className="company-profile-form__field-error">
                  {errors.email}
                </small>
              )}
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-phone">
                Business phone
              </label>
              <input
                id="company-profile-phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) =>
                  updateField('phone', event.target.value)
                }
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </fieldset>

        <fieldset disabled={isDisabled}>
          <legend className="company-profile-form__legend">
            Company location
          </legend>

          <div className="company-profile-form__grid">
            <div className="company-profile-form__field">
              <label htmlFor="company-profile-country">Country</label>
              <input
                id="company-profile-country"
                autoComplete="country-name"
                value={form.country}
                onChange={(event) =>
                  updateField('country', event.target.value)
                }
                placeholder="United States"
              />
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-stateProvince">
                State / Province
              </label>
              <input
                id="company-profile-stateProvince"
                autoComplete="address-level1"
                value={form.stateProvince}
                onChange={(event) =>
                  updateField('stateProvince', event.target.value)
                }
                placeholder="Ohio"
              />
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-city">City</label>
              <input
                id="company-profile-city"
                autoComplete="address-level2"
                value={form.city}
                onChange={(event) =>
                  updateField('city', event.target.value)
                }
                placeholder="Columbus"
              />
            </div>

            <div className="company-profile-form__field">
              <label htmlFor="company-profile-postalCode">
                Postal code
              </label>
              <input
                id="company-profile-postalCode"
                autoComplete="postal-code"
                value={form.postalCode}
                onChange={(event) =>
                  updateField('postalCode', event.target.value)
                }
                placeholder="Postal code"
              />
            </div>

            <div className="company-profile-form__field company-profile-form__field--full">
              <label htmlFor="company-profile-address">
                Street address
              </label>
              <input
                id="company-profile-address"
                autoComplete="street-address"
                value={form.address}
                onChange={(event) =>
                  updateField('address', event.target.value)
                }
                placeholder="Street address (optional)"
              />
            </div>
          </div>
        </fieldset>

        <fieldset disabled={isDisabled}>
          <legend className="company-profile-form__legend">
            About your company
          </legend>

          <div className="company-profile-form__field">
            <label htmlFor="company-profile-description">
              Company description
            </label>
            <textarea
              id="company-profile-description"
              rows={6}
              maxLength={maxDescriptionLength}
              value={form.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              placeholder="Tell candidates about your organization, mission, culture, and what makes your workplace unique."
              aria-invalid={Boolean(errors.description)}
            />
            <div className="company-profile-form__character-count">
              {form.description.length} / {maxDescriptionLength}
            </div>
            {errors.description && (
              <small className="company-profile-form__field-error">
                {errors.description}
              </small>
            )}
          </div>
        </fieldset>

        {!readOnly && (
          <div className="company-profile-form__footer">
            {onCancel && (
              <button
                type="button"
                className="company-profile-form__cancel"
                onClick={onCancel}
                disabled={saving || disabled}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="company-profile-form__submit"
              disabled={isDisabled}
            >
              {saving ? 'Saving changes…' : 'Save company profile'}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}

export default CompanyProfileForm;
