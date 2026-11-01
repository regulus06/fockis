
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import '../styles/CompanyInformation.scss';

export type CompanyInformationData = {
  legalName: string;
  displayName: string;
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

export type CompanyInformationProps = {
  company: CompanyInformationData;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  successMessage?: string | null;
  readOnly?: boolean;
  disabled?: boolean;
  onRetry?: () => void;
  onSave: (company: CompanyInformationData) => void | Promise<void>;
};

const EMPTY_COMPANY: CompanyInformationData = {
  legalName: '',
  displayName: '',
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

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Construction',
  'Transportation and Logistics',
  'Hospitality',
  'Media and Entertainment',
  'Professional Services',
  'Nonprofit',
  'Government',
  'Other',
];

const CURRENT_YEAR = new Date().getFullYear();

function normalizeWebsite(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return '';

  return /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

function isValidWebsite(value: string): boolean {
  if (!value.trim()) return true;

  try {
    const url = new URL(normalizeWebsite(value));

    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      Boolean(url.hostname.includes('.'))
    );
  } catch {
    return false;
  }
}

function CompanyInformationSkeleton() {
  return (
    <div
      className="company-information__skeleton"
      aria-label="Loading company information"
      aria-busy="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index}>
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export function CompanyInformation({
  company,
  loading = false,
  saving = false,
  error = null,
  successMessage = null,
  readOnly = false,
  disabled = false,
  onRetry,
  onSave,
}: CompanyInformationProps) {
  const [form, setForm] = useState<CompanyInformationData>({
    ...EMPTY_COMPANY,
    ...company,
  });

  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof CompanyInformationData, string>>
  >({});

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      ...EMPTY_COMPANY,
      ...company,
    });
    setValidationErrors({});
    setSubmitError(null);
  }, [company]);

  const isDisabled = disabled || loading || saving || readOnly;

  const updateField = <K extends keyof CompanyInformationData>(
    field: K,
    value: CompanyInformationData[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setValidationErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setSubmitError(null);
  };

  const validate = (): boolean => {
    const nextErrors: Partial<
      Record<keyof CompanyInformationData, string>
    > = {};

    if (!form.legalName.trim()) {
      nextErrors.legalName = 'Enter the registered company name.';
    }

    if (!form.displayName.trim()) {
      nextErrors.displayName = 'Enter the company display name.';
    }

    if (!form.industry.trim()) {
      nextErrors.industry = 'Select your company industry.';
    }

    if (!form.companySize.trim()) {
      nextErrors.companySize = 'Select your company size.';
    }

    if (
      form.foundedYear.trim() &&
      (!/^\d{4}$/.test(form.foundedYear.trim()) ||
        Number(form.foundedYear) < 1800 ||
        Number(form.foundedYear) > CURRENT_YEAR)
    ) {
      nextErrors.foundedYear = `Enter a valid year between 1800 and ${CURRENT_YEAR}.`;
    }

    if (!isValidWebsite(form.website)) {
      nextErrors.website = 'Enter a valid website address.';
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = 'Enter a valid contact email address.';
    }

    if (!form.country.trim()) {
      nextErrors.country = 'Enter the company country.';
    }

    if (form.description.length > 5000) {
      nextErrors.description = 'Description cannot exceed 5,000 characters.';
    }

    setValidationErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDisabled || !validate()) return;

    setSubmitError(null);

    const payload: CompanyInformationData = {
      ...form,
      legalName: form.legalName.trim(),
      displayName: form.displayName.trim(),
      industry: form.industry.trim(),
      website: normalizeWebsite(form.website),
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
      await onSave(payload);
    } catch {
      setSubmitError(
        'Company information could not be saved. Please try again.',
      );
    }
  };

  const fieldError = (field: keyof CompanyInformationData) =>
    validationErrors[field];

  return (
    <section
      className="company-information"
      aria-label="Company information"
      aria-busy={loading || saving}
    >
      <header className="company-information__header">
        <div>
          <span className="company-information__eyebrow">
            COMPANY PROFILE
          </span>

          <h2>Company information</h2>

          <p>
            Keep your company's information accurate and up to date
            for candidates and employer account management.
          </p>
        </div>

        {readOnly && (
          <span className="company-information__readonly-badge">
            Read only
          </span>
        )}
      </header>

      {loading ? (
        <CompanyInformationSkeleton />
      ) : error ? (
        <div
          className="company-information__message company-information__message--error"
          role="alert"
        >
          <h3>Unable to load company information</h3>
          <p>{error}</p>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled}
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <form
          className="company-information__form"
          onSubmit={handleSubmit}
          noValidate
        >
          <section className="company-information__section">
            <div className="company-information__section-heading">
              <span className="company-information__section-number">
                01
              </span>
              <div>
                <h3>Company identity</h3>
                <p>Basic information about your organization.</p>
              </div>
            </div>

            <div className="company-information__grid">
              <div className="company-information__field">
                <label htmlFor="company-legal-name">
                  Legal company name <span>*</span>
                </label>
                <input
                  id="company-legal-name"
                  value={form.legalName}
                  onChange={(event) =>
                    updateField('legalName', event.target.value)
                  }
                  placeholder="Registered company name"
                  maxLength={180}
                  disabled={isDisabled}
                  aria-invalid={Boolean(fieldError('legalName'))}
                  aria-describedby={
                    fieldError('legalName')
                      ? 'company-legal-name-error'
                      : undefined
                  }
                />
                {fieldError('legalName') && (
                  <small id="company-legal-name-error" className="company-information__field-error">
                    {fieldError('legalName')}
                  </small>
                )}
              </div>

              <div className="company-information__field">
                <label htmlFor="company-display-name">
                  Public company name <span>*</span>
                </label>
                <input
                  id="company-display-name"
                  value={form.displayName}
                  onChange={(event) =>
                    updateField('displayName', event.target.value)
                  }
                  placeholder="Name shown to candidates"
                  maxLength={120}
                  disabled={isDisabled}
                  aria-invalid={Boolean(fieldError('displayName'))}
                />
                {fieldError('displayName') && (
                  <small className="company-information__field-error">
                    {fieldError('displayName')}
                  </small>
                )}
              </div>

              <div className="company-information__field">
                <label htmlFor="company-industry">
                  Industry <span>*</span>
                </label>
                <select
                  id="company-industry"
                  value={form.industry}
                  onChange={(event) =>
                    updateField('industry', event.target.value)
                  }
                  disabled={isDisabled}
                  aria-invalid={Boolean(fieldError('industry'))}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
                {fieldError('industry') && (
                  <small className="company-information__field-error">
                    {fieldError('industry')}
                  </small>
                )}
              </div>

              <div className="company-information__field">
                <label htmlFor="company-size">
                  Company size <span>*</span>
                </label>
                <select
                  id="company-size"
                  value={form.companySize}
                  onChange={(event) =>
                    updateField('companySize', event.target.value)
                  }
                  disabled={isDisabled}
                  aria-invalid={Boolean(fieldError('companySize'))}
                >
                  <option value="">Select company size</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {fieldError('companySize') && (
                  <small className="company-information__field-error">
                    {fieldError('companySize')}
                  </small>
                )}
              </div>

              <div className="company-information__field">
                <label htmlFor="company-founded-year">
                  Founded year
                </label>
                <input
                  id="company-founded-year"
                  type="number"
                  inputMode="numeric"
                  min="1800"
                  max={CURRENT_YEAR}
                  value={form.foundedYear}
                  onChange={(event) =>
                    updateField('foundedYear', event.target.value)
                  }
                  placeholder="e.g. 2015"
                  disabled={isDisabled}
                  aria-invalid={Boolean(fieldError('foundedYear'))}
                />
                {fieldError('foundedYear') && (
                  <small className="company-information__field-error">
                    {fieldError('foundedYear')}
                  </small>
                )}
              </div>

              <div className="company-information__field">
                <label htmlFor="company-website">Company website</label>
                <input
                  id="company-website"
                  type="url"
                  value={form.website}
                  onChange={(event) =>
                    updateField('website', event.target.value)
                  }
                  placeholder="https://www.example.com"
                  maxLength={300}
                  disabled={isDisabled}
                  aria-invalid={Boolean(fieldError('website'))}
                />
                {fieldError('website') && (
                  <small className="company-information__field-error">
                    {fieldError('website')}
                  </small>
                )}
              </div>
            </div>
          </section>

          <section className="company-information__section">
            <div className="company-information__section-heading">
              <span className="company-information__section-number">
                02
              </span>
              <div>
                <h3>Contact information</h3>
                <p>How candidates and business contacts can reach you.</p>
              </div>
            </div>

            <div className="company-information__grid">
              <div className="company-information__field">
                <label htmlFor="company-contact-email">
                  Contact email
                </label>
                <input
                  id="company-contact-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField('email', event.target.value)
                  }
                  placeholder="careers@example.com"
                  maxLength={254}
                  disabled={isDisabled}
                  aria-invalid={Boolean(fieldError('email'))}
                />
                {fieldError('email') && (
                  <small className="company-information__field-error">
                    {fieldError('email')}
                  </small>
                )}
              </div>

              <div className="company-information__field">
                <label htmlFor="company-contact-phone">
                  Contact phone
                </label>
                <input
                  id="company-contact-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField('phone', event.target.value)
                  }
                  placeholder="+1 (555) 000-0000"
                  maxLength={40}
                  disabled={isDisabled}
                />
              </div>
            </div>
          </section>

          <section className="company-information__section">
            <div className="company-information__section-heading">
              <span className="company-information__section-number">
                03
              </span>
              <div>
                <h3>Company location</h3>
                <p>Where your organization is based.</p>
              </div>
            </div>

            <div className="company-information__grid">
              <div className="company-information__field company-information__field--full">
                <label htmlFor="company-address">Street address</label>
                <input
                  id="company-address"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(event) =>
                    updateField('address', event.target.value)
                  }
                  placeholder="Street address"
                  maxLength={200}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-information__field">
                <label htmlFor="company-city">City</label>
                <input
                  id="company-city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(event) =>
                    updateField('city', event.target.value)
                  }
                  placeholder="City"
                  maxLength={100}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-information__field">
                <label htmlFor="company-state">State / Province</label>
                <input
                  id="company-state"
                  autoComplete="address-level1"
                  value={form.stateProvince}
                  onChange={(event) =>
                    updateField('stateProvince', event.target.value)
                  }
                  placeholder="State or province"
                  maxLength={100}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-information__field">
                <label htmlFor="company-postal-code">Postal code</label>
                <input
                  id="company-postal-code"
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={(event) =>
                    updateField('postalCode', event.target.value)
                  }
                  placeholder="Postal code"
                  maxLength={30}
                  disabled={isDisabled}
                />
              </div>

              <div className="company-information__field">
                <label htmlFor="company-country">
                  Country <span>*</span>
                </label>
                <input
                  id="company-country"
                  autoComplete="country-name"
                  value={form.country}
                  onChange={(event) =>
                    updateField('country', event.target.value)
                  }
                  placeholder="Country"
                  maxLength={100}
                  disabled={isDisabled}
                  aria-invalid={Boolean(fieldError('country'))}
                />
                {fieldError('country') && (
                  <small className="company-information__field-error">
                    {fieldError('country')}
                  </small>
                )}
              </div>
            </div>
          </section>

          <section className="company-information__section">
            <div className="company-information__section-heading">
              <span className="company-information__section-number">
                04
              </span>
              <div>
                <h3>About the company</h3>
                <p>Introduce your organization to potential candidates.</p>
              </div>
            </div>

            <div className="company-information__field">
              <label htmlFor="company-description">
                Company description
              </label>

              <textarea
                id="company-description"
                value={form.description}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
                placeholder="Tell candidates about your mission, culture, products, services, and what makes your company a great place to work."
                rows={6}
                maxLength={5000}
                disabled={isDisabled}
                aria-invalid={Boolean(fieldError('description'))}
              />

              <div className="company-information__character-count">
                <span>
                  {fieldError('description') || ''}
                </span>
                <span>{form.description.length}/5000</span>
              </div>
            </div>
          </section>

          {error && (
            <div
              className="company-information__message company-information__message--error"
              role="alert"
            >
              {error}
            </div>
          )}

          {submitError && (
            <div
              className="company-information__message company-information__message--error"
              role="alert"
            >
              {submitError}
            </div>
          )}

          {successMessage && (
            <div
              className="company-information__message company-information__message--success"
              role="status"
            >
              {successMessage}
            </div>
          )}

          {!readOnly && (
            <footer className="company-information__footer">
              <span>
                Fields marked <strong>*</strong> are required.
              </span>

              <button
                type="submit"
                className="company-information__save-button"
                disabled={isDisabled}
              >
                {saving ? 'Saving changes...' : 'Save company information'}
              </button>
            </footer>
          )}
        </form>
      )}
    </section>
  );
}

export default CompanyInformation;
