
import { useId, useState, type FormEvent } from 'react';
import '../styles/VerificationForm.scss';

export interface EmployerVerificationFormValues {
  legalBusinessName: string;
  tradingName: string;
  businessType: string;
  registrationNumber: string;
  taxId: string;
  country: string;
  stateProvince: string;
  city: string;
  streetAddress: string;
  postalCode: string;
  website: string;
  representativeName: string;
  representativeJobTitle: string;
  representativeEmail: string;
  representativePhone: string;
  confirmationAccepted: boolean;
}

export interface VerificationFormProps {
  value: EmployerVerificationFormValues;
  onChange: (value: EmployerVerificationFormValues) => void;
  onSubmit: (
    value: EmployerVerificationFormValues,
  ) => void | Promise<void>;
  loading?: boolean;
  saving?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  successMessage?: string | null;
  submitLabel?: string;
  showTaxId?: boolean;
  showTradingName?: boolean;
  showWebsite?: boolean;
  title?: string;
  description?: string;
}

const BUSINESS_TYPES = [
  'Corporation',
  'Limited liability company (LLC)',
  'Partnership',
  'Sole proprietorship',
  'Nonprofit organization',
  'Government organization',
  'Other',
];

const REQUIRED_FIELDS: (keyof EmployerVerificationFormValues)[] = [
  'legalBusinessName',
  'businessType',
  'registrationNumber',
  'country',
  'city',
  'streetAddress',
  'representativeName',
  'representativeEmail',
];

export function VerificationForm({
  value,
  onChange,
  onSubmit,
  loading = false,
  saving = false,
  disabled = false,
  readOnly = false,
  error = null,
  successMessage = null,
  submitLabel = 'Submit for verification',
  showTaxId = true,
  showTradingName = true,
  showWebsite = true,
  title = 'Business verification',
  description = 'Provide your official business information so Fockis can verify your employer account.',
}: VerificationFormProps) {
  const formId = useId();
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = loading || saving || submitting;
  const isDisabled = disabled || readOnly || busy;

  const updateField = <K extends keyof EmployerVerificationFormValues>(
    field: K,
    nextValue: EmployerVerificationFormValues[K],
  ) => {
    onChange({
      ...value,
      [field]: nextValue,
    });
    setLocalError(null);
  };

  const validate = (): boolean => {
    for (const field of REQUIRED_FIELDS) {
      if (
        typeof value[field] === 'string' &&
        !value[field].trim()
      ) {
        setLocalError('Please complete all required fields.');
        return false;
      }
    }

    const email = value.representativeEmail.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Enter a valid representative email address.');
      return false;
    }

    if (value.website.trim()) {
      try {
        const url = new URL(value.website.trim());
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          throw new Error('Invalid protocol');
        }
      } catch {
        setLocalError('Enter a valid website URL, including https://.');
        return false;
      }
    }

    if (!value.confirmationAccepted) {
      setLocalError('Confirm that the information provided is accurate.');
      return false;
    }

    setLocalError(null);
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDisabled || !validate()) return;

    setSubmitting(true);

    try {
      await onSubmit({
        ...value,
        legalBusinessName: value.legalBusinessName.trim(),
        tradingName: value.tradingName.trim(),
        registrationNumber: value.registrationNumber.trim(),
        taxId: value.taxId.trim(),
        country: value.country.trim(),
        stateProvince: value.stateProvince.trim(),
        city: value.city.trim(),
        streetAddress: value.streetAddress.trim(),
        postalCode: value.postalCode.trim(),
        website: value.website.trim(),
        representativeName: value.representativeName.trim(),
        representativeJobTitle: value.representativeJobTitle.trim(),
        representativeEmail: value.representativeEmail.trim().toLowerCase(),
        representativePhone: value.representativePhone.trim(),
      });
    } catch (exception) {
      setLocalError(
        exception instanceof Error
          ? exception.message
          : 'Your verification information could not be submitted.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section
        className="verification-form verification-form--loading"
        aria-label={title}
        aria-busy="true"
      >
        <div className="verification-form__skeleton verification-form__skeleton--heading" />
        <div className="verification-form__skeleton verification-form__skeleton--field" />
        <div className="verification-form__skeleton verification-form__skeleton--field" />
        <div className="verification-form__skeleton verification-form__skeleton--field" />
        <span className="verification-form__sr-only">
          Loading verification form
        </span>
      </section>
    );
  }

  return (
    <section className="verification-form" aria-labelledby={`${formId}-title`}>
      <header className="verification-form__header">
        <div>
          <h2 id={`${formId}-title`}>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="verification-form__required-note">
          * Required fields
        </span>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={isDisabled}>
          <legend>Business information</legend>

          <div className="verification-form__grid">
            <div className="verification-form__field verification-form__field--full">
              <label htmlFor={`${formId}-legal-name`}>
                Legal business name <span>*</span>
              </label>
              <input
                id={`${formId}-legal-name`}
                value={value.legalBusinessName}
                onChange={(event) =>
                  updateField('legalBusinessName', event.target.value)
                }
                maxLength={200}
                autoComplete="organization"
                required
                placeholder="Registered legal business name"
              />
            </div>

            {showTradingName && (
              <div className="verification-form__field verification-form__field--full">
                <label htmlFor={`${formId}-trading-name`}>
                  Trading name
                </label>
                <input
                  id={`${formId}-trading-name`}
                  value={value.tradingName}
                  onChange={(event) =>
                    updateField('tradingName', event.target.value)
                  }
                  maxLength={200}
                  placeholder="Public-facing company name, if different"
                />
              </div>
            )}

            <div className="verification-form__field">
              <label htmlFor={`${formId}-business-type`}>
                Business type <span>*</span>
              </label>
              <select
                id={`${formId}-business-type`}
                value={value.businessType}
                onChange={(event) =>
                  updateField('businessType', event.target.value)
                }
                required
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="verification-form__field">
              <label htmlFor={`${formId}-registration`}>
                Registration number <span>*</span>
              </label>
              <input
                id={`${formId}-registration`}
                value={value.registrationNumber}
                onChange={(event) =>
                  updateField('registrationNumber', event.target.value)
                }
                maxLength={100}
                required
                placeholder="Business registration number"
              />
            </div>

            {showTaxId && (
              <div className="verification-form__field verification-form__field--full">
                <label htmlFor={`${formId}-tax-id`}>
                  Tax identification number
                </label>
                <input
                  id={`${formId}-tax-id`}
                  value={value.taxId}
                  onChange={(event) =>
                    updateField('taxId', event.target.value)
                  }
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Enter tax ID if required"
                />
                <small>
                  Only provide this if it is required for your verification.
                </small>
              </div>
            )}

            {showWebsite && (
              <div className="verification-form__field verification-form__field--full">
                <label htmlFor={`${formId}-website`}>
                  Company website
                </label>
                <input
                  id={`${formId}-website`}
                  type="url"
                  value={value.website}
                  onChange={(event) =>
                    updateField('website', event.target.value)
                  }
                  maxLength={500}
                  autoComplete="url"
                  placeholder="https://www.example.com"
                />
              </div>
            )}
          </div>

          <div className="verification-form__section-heading">
            <h3>Registered business address</h3>
            <p>Use the address shown on your official business records.</p>
          </div>

          <div className="verification-form__grid">
            <div className="verification-form__field verification-form__field--full">
              <label htmlFor={`${formId}-address`}>
                Street address <span>*</span>
              </label>
              <input
                id={`${formId}-address`}
                value={value.streetAddress}
                onChange={(event) =>
                  updateField('streetAddress', event.target.value)
                }
                maxLength={250}
                autoComplete="street-address"
                required
                placeholder="Street address"
              />
            </div>

            <div className="verification-form__field">
              <label htmlFor={`${formId}-city`}>
                City <span>*</span>
              </label>
              <input
                id={`${formId}-city`}
                value={value.city}
                onChange={(event) => updateField('city', event.target.value)}
                maxLength={100}
                autoComplete="address-level2"
                required
              />
            </div>

            <div className="verification-form__field">
              <label htmlFor={`${formId}-state`}>
                State / Province
              </label>
              <input
                id={`${formId}-state`}
                value={value.stateProvince}
                onChange={(event) =>
                  updateField('stateProvince', event.target.value)
                }
                maxLength={100}
                autoComplete="address-level1"
              />
            </div>

            <div className="verification-form__field">
              <label htmlFor={`${formId}-postal`}>
                Postal code
              </label>
              <input
                id={`${formId}-postal`}
                value={value.postalCode}
                onChange={(event) =>
                  updateField('postalCode', event.target.value)
                }
                maxLength={30}
                autoComplete="postal-code"
              />
            </div>

            <div className="verification-form__field">
              <label htmlFor={`${formId}-country`}>
                Country <span>*</span>
              </label>
              <input
                id={`${formId}-country`}
                value={value.country}
                onChange={(event) =>
                  updateField('country', event.target.value)
                }
                maxLength={100}
                autoComplete="country-name"
                required
                placeholder="Country"
              />
            </div>
          </div>

          <div className="verification-form__section-heading">
            <h3>Authorized representative</h3>
            <p>Provide the contact details of the person responsible for this submission.</p>
          </div>

          <div className="verification-form__grid">
            <div className="verification-form__field">
              <label htmlFor={`${formId}-representative`}>
                Full name <span>*</span>
              </label>
              <input
                id={`${formId}-representative`}
                value={value.representativeName}
                onChange={(event) =>
                  updateField('representativeName', event.target.value)
                }
                maxLength={150}
                autoComplete="name"
                required
              />
            </div>

            <div className="verification-form__field">
              <label htmlFor={`${formId}-job-title`}>
                Job title
              </label>
              <input
                id={`${formId}-job-title`}
                value={value.representativeJobTitle}
                onChange={(event) =>
                  updateField('representativeJobTitle', event.target.value)
                }
                maxLength={120}
                autoComplete="organization-title"
                placeholder="e.g. Business owner"
              />
            </div>

            <div className="verification-form__field">
              <label htmlFor={`${formId}-email`}>
                Work email <span>*</span>
              </label>
              <input
                id={`${formId}-email`}
                type="email"
                value={value.representativeEmail}
                onChange={(event) =>
                  updateField('representativeEmail', event.target.value)
                }
                maxLength={254}
                autoComplete="email"
                required
              />
            </div>

            <div className="verification-form__field">
              <label htmlFor={`${formId}-phone`}>
                Phone number
              </label>
              <input
                id={`${formId}-phone`}
                type="tel"
                value={value.representativePhone}
                onChange={(event) =>
                  updateField('representativePhone', event.target.value)
                }
                maxLength={40}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="verification-form__confirmation">
            <label htmlFor={`${formId}-confirmation`}>
              <input
                id={`${formId}-confirmation`}
                type="checkbox"
                checked={value.confirmationAccepted}
                onChange={(event) =>
                  updateField('confirmationAccepted', event.target.checked)
                }
                required
              />
              <span>
                I confirm that the information submitted is accurate and
                that I am authorized to provide it on behalf of this business.
                <strong> *</strong>
              </span>
            </label>
          </div>
        </fieldset>

        {(localError || error) && (
          <div className="verification-form__message verification-form__message--error" role="alert">
            {localError || error}
          </div>
        )}

        {successMessage && (
          <div className="verification-form__message verification-form__message--success" role="status">
            {successMessage}
          </div>
        )}

        {!readOnly && (
          <footer className="verification-form__footer">
            <p>
              Your information will be reviewed by the Fockis verification
              team.
            </p>
            <button type="submit" disabled={isDisabled}>
              {busy ? 'Submitting…' : submitLabel}
            </button>
          </footer>
        )}
      </form>
    </section>
  );
}

export default VerificationForm;
