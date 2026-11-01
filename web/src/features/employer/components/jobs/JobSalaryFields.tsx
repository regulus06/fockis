
import { useMemo, useState } from 'react';
import '../styles/JobSalaryFields.scss';

export type JobSalaryPeriod =
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

export type JobSalaryValues = {
  salaryMin: string;
  salaryMax: string;
  currency: string;
  salaryPeriod: JobSalaryPeriod;
  salaryType: 'paid' | 'unpaid' | 'negotiable';
  showSalary: boolean;
};

export type JobSalaryFieldsProps = {
  value: JobSalaryValues;
  onChange: (value: JobSalaryValues) => void;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  successMessage?: string | null;
  required?: boolean;
  showSalaryVisibility?: boolean;
  showSalaryType?: boolean;
  showDescription?: boolean;
  minSalary?: number;
  maxSalary?: number;
  currencies?: string[];
  periods?: JobSalaryPeriod[];
};

const DEFAULT_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'MXN',
  'HTG',
  'DOP',
];

const DEFAULT_PERIODS: {
  value: JobSalaryPeriod;
  label: string;
}[] = [
  { value: 'hour', label: 'Per hour' },
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
  { value: 'year', label: 'Per year' },
];

function SalarySkeleton() {
  return (
    <section
      className="job-salary-fields job-salary-fields--skeleton"
      aria-label="Loading salary fields"
      aria-busy="true"
    >
      <span />
      <span />
      <span />
      <span />
    </section>
  );
}

function parseAmount(value: string): number | null {
  if (!value.trim()) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function JobSalaryFields({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  error = null,
  successMessage = null,
  required = false,
  showSalaryVisibility = true,
  showSalaryType = true,
  showDescription = true,
  minSalary = 0,
  maxSalary = 100000000,
  currencies = DEFAULT_CURRENCIES,
  periods,
}: JobSalaryFieldsProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const availablePeriods = useMemo(() => {
    const selectedPeriods = periods ?? DEFAULT_PERIODS.map(
      (period) => period.value,
    );

    return DEFAULT_PERIODS.filter((period) =>
      selectedPeriods.includes(period.value),
    );
  }, [periods]);

  const canEdit = !disabled && !readOnly;

  const minimum = parseAmount(value.salaryMin);
  const maximum = parseAmount(value.salaryMax);

  const hasInvalidMinimum =
    value.salaryMin.trim() !== '' &&
    (minimum === null || minimum < minSalary || minimum > maxSalary);

  const hasInvalidMaximum =
    value.salaryMax.trim() !== '' &&
    (maximum === null || maximum < minSalary || maximum > maxSalary);

  const hasRangeError =
    minimum !== null &&
    maximum !== null &&
    maximum < minimum;

  const updateValue = <K extends keyof JobSalaryValues>(
    key: K,
    nextValue: JobSalaryValues[K],
  ) => {
    if (!canEdit) return;

    setLocalError(null);
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  const handleAmountChange = (
    key: 'salaryMin' | 'salaryMax',
    nextValue: string,
  ) => {
    if (!canEdit) return;

    // Allow users to enter a decimal amount without accepting
    // signs, exponent notation, or other non-numeric characters.
    if (nextValue && !/^\d*\.?\d*$/.test(nextValue)) return;

    updateValue(key, nextValue);
  };

  const validate = (): boolean => {
    if (value.salaryType === 'unpaid') {
      setLocalError(null);
      return true;
    }

    if (required && !value.salaryMin.trim() && !value.salaryMax.trim()) {
      setLocalError('Enter at least one salary amount.');
      return false;
    }

    if (hasInvalidMinimum) {
      setLocalError('Enter a valid minimum salary amount.');
      return false;
    }

    if (hasInvalidMaximum) {
      setLocalError('Enter a valid maximum salary amount.');
      return false;
    }

    if (hasRangeError) {
      setLocalError(
        'Maximum salary cannot be lower than minimum salary.',
      );
      return false;
    }

    if (
      (value.salaryMin.trim() || value.salaryMax.trim()) &&
      !value.currency
    ) {
      setLocalError('Select a currency for the salary range.');
      return false;
    }

    setLocalError(null);
    return true;
  };

  const formatPreview = (): string => {
    if (value.salaryType === 'unpaid') return 'Unpaid position';
    if (value.salaryType === 'negotiable') return 'Salary negotiable';

    const formatter = (amount: number) => {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: value.currency || 'USD',
          maximumFractionDigits: 2,
        }).format(amount);
      } catch {
        return `${value.currency || 'USD'} ${amount.toLocaleString()}`;
      }
    };

    if (minimum !== null && maximum !== null) {
      if (minimum === maximum) return formatter(minimum);
      return `${formatter(minimum)} – ${formatter(maximum)}`;
    }

    if (minimum !== null) return `${formatter(minimum)}+`;
    if (maximum !== null) return `Up to ${formatter(maximum)}`;

    return 'Salary not specified';
  };

  if (disabled && !value) return <SalarySkeleton />;

  return (
    <section
      className="job-salary-fields"
      aria-label="Job salary and compensation"
      aria-busy={disabled}
    >
      <header className="job-salary-fields__header">
        <div>
          <span className="job-salary-fields__eyebrow">
            COMPENSATION
          </span>
          <h2>Salary and pay</h2>
          {showDescription && (
            <p>
              Provide a clear compensation range so candidates understand
              what this position offers.
            </p>
          )}
        </div>
      </header>

      {showSalaryType && (
        <fieldset
          className="job-salary-fields__type"
          disabled={!canEdit}
        >
          <legend>Compensation type</legend>

          <div className="job-salary-fields__type-options">
            <label
              className={
                value.salaryType === 'paid' ? 'is-selected' : ''
              }
            >
              <input
                type="radio"
                name="job-salary-type"
                value="paid"
                checked={value.salaryType === 'paid'}
                onChange={() => {
                  updateValue('salaryType', 'paid');
                  setLocalError(null);
                }}
              />
              <span>
                <strong>Paid</strong>
                <small>Specify a salary range</small>
              </span>
            </label>

            <label
              className={
                value.salaryType === 'negotiable' ? 'is-selected' : ''
              }
            >
              <input
                type="radio"
                name="job-salary-type"
                value="negotiable"
                checked={value.salaryType === 'negotiable'}
                onChange={() => {
                  updateValue('salaryType', 'negotiable');
                  setLocalError(null);
                }}
              />
              <span>
                <strong>Negotiable</strong>
                <small>Discuss compensation with candidates</small>
              </span>
            </label>

            <label
              className={
                value.salaryType === 'unpaid' ? 'is-selected' : ''
              }
            >
              <input
                type="radio"
                name="job-salary-type"
                value="unpaid"
                checked={value.salaryType === 'unpaid'}
                onChange={() => {
                  updateValue('salaryType', 'unpaid');
                  setLocalError(null);
                }}
              />
              <span>
                <strong>Unpaid</strong>
                <small>No monetary compensation</small>
              </span>
            </label>
          </div>
        </fieldset>
      )}

      {value.salaryType === 'paid' && (
        <>
          <div className="job-salary-fields__grid">
            <div className="job-salary-fields__field">
              <label htmlFor="job-salary-min">
                Minimum salary {required && <span>*</span>}
              </label>
              <input
                id="job-salary-min"
                type="number"
                inputMode="decimal"
                min={minSalary}
                max={maxSalary}
                step="any"
                value={value.salaryMin}
                onChange={(event) =>
                  handleAmountChange('salaryMin', event.target.value)
                }
                placeholder="e.g. 45000"
                disabled={!canEdit}
                aria-invalid={hasInvalidMinimum}
              />
              {hasInvalidMinimum && (
                <small className="job-salary-fields__field-error">
                  Enter an amount between {minSalary.toLocaleString()} and{' '}
                  {maxSalary.toLocaleString()}.
                </small>
              )}
            </div>

            <div className="job-salary-fields__field">
              <label htmlFor="job-salary-max">Maximum salary</label>
              <input
                id="job-salary-max"
                type="number"
                inputMode="decimal"
                min={minSalary}
                max={maxSalary}
                step="any"
                value={value.salaryMax}
                onChange={(event) =>
                  handleAmountChange('salaryMax', event.target.value)
                }
                placeholder="e.g. 65000"
                disabled={!canEdit}
                aria-invalid={hasInvalidMaximum}
              />
              {hasInvalidMaximum && (
                <small className="job-salary-fields__field-error">
                  Enter a valid maximum amount.
                </small>
              )}
            </div>

            <div className="job-salary-fields__field">
              <label htmlFor="job-salary-currency">Currency</label>
              <select
                id="job-salary-currency"
                value={value.currency}
                onChange={(event) =>
                  updateValue('currency', event.target.value)
                }
                disabled={!canEdit}
              >
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="job-salary-fields__field">
              <label htmlFor="job-salary-period">Pay frequency</label>
              <select
                id="job-salary-period"
                value={value.salaryPeriod}
                onChange={(event) =>
                  updateValue(
                    'salaryPeriod',
                    event.target.value as JobSalaryPeriod,
                  )
                }
                disabled={!canEdit}
              >
                {availablePeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasRangeError && (
            <p className="job-salary-fields__field-error" role="alert">
              Maximum salary cannot be lower than minimum salary.
            </p>
          )}
        </>
      )}

      {value.salaryType !== 'paid' && (
        <div className="job-salary-fields__alternative">
          <span aria-hidden="true">
            {value.salaryType === 'unpaid' ? '◇' : '↔'}
          </span>
          <div>
            <strong>
              {value.salaryType === 'unpaid'
                ? 'Unpaid position'
                : 'Compensation is negotiable'}
            </strong>
            <p>
              {value.salaryType === 'unpaid'
                ? 'Make sure the position is legally permitted to be unpaid in the applicable location.'
                : 'Candidates will be informed that compensation is discussed during the hiring process.'}
            </p>
          </div>
        </div>
      )}

      {showSalaryVisibility && (
        <label className="job-salary-fields__visibility">
          <input
            type="checkbox"
            checked={value.showSalary}
            onChange={(event) =>
              updateValue('showSalary', event.target.checked)
            }
            disabled={!canEdit}
          />
          <span>
            <strong>Display compensation to candidates</strong>
            <small>
              When enabled, the salary information can appear on the
              public job listing.
            </small>
          </span>
        </label>
      )}

      <div className="job-salary-fields__preview">
        <span>Compensation preview</span>
        <strong>
          {value.showSalary ? formatPreview() : 'Hidden from candidates'}
        </strong>
        {value.salaryType === 'paid' && (
          <small>
            {DEFAULT_PERIODS.find(
              (period) => period.value === value.salaryPeriod,
            )?.label ?? formatLabel(value.salaryPeriod)}
          </small>
        )}
      </div>

      {(localError || error) && (
        <div className="job-salary-fields__error" role="alert">
          {localError || error}
        </div>
      )}

      {successMessage && (
        <div className="job-salary-fields__success" role="status">
          {successMessage}
        </div>
      )}

      {readOnly && (
        <p className="job-salary-fields__readonly">
          Compensation details are read-only.
        </p>
      )}
    </section>
  );
}

function formatLabel(value: string): string {
  return value.replace(/[_-]/g, ' ');
}

export default JobSalaryFields;
