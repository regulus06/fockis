
import '../styles/CompanyBenefits.scss';

export type CompanyBenefitCategory =
  | 'health'
  | 'financial'
  | 'time_off'
  | 'workplace'
  | 'career'
  | 'family'
  | 'wellness'
  | 'other';

export type CompanyBenefit = {
  id: string;
  title: string;
  description?: string | null;
  category: CompanyBenefitCategory;
  available?: boolean;
};

export type CompanyBenefitsProps = {
  benefits: CompanyBenefit[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEdit?: () => void;
  readOnly?: boolean;
  disabled?: boolean;
  emptyMessage?: string;
};

const CATEGORY_LABELS: Record<CompanyBenefitCategory, string> = {
  health: 'Health and insurance',
  financial: 'Financial benefits',
  time_off: 'Time off',
  workplace: 'Workplace flexibility',
  career: 'Career development',
  family: 'Family benefits',
  wellness: 'Health and wellness',
  other: 'Other benefits',
};

const CATEGORY_ICONS: Record<CompanyBenefitCategory, string> = {
  health: '✚',
  financial: '$',
  time_off: '◷',
  workplace: '⌂',
  career: '↗',
  family: '♡',
  wellness: '✦',
  other: '✓',
};

const CATEGORY_ORDER: CompanyBenefitCategory[] = [
  'health',
  'financial',
  'time_off',
  'workplace',
  'career',
  'family',
  'wellness',
  'other',
];

function CompanyBenefitsSkeleton() {
  return (
    <div
      className="company-benefits__skeleton"
      aria-label="Loading company benefits"
      aria-busy="true"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="company-benefits__skeleton-card"
          key={index}
        >
          <span />
          <div>
            <span />
            <span />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CompanyBenefits({
  benefits,
  loading = false,
  error = null,
  onRetry,
  onEdit,
  readOnly = false,
  disabled = false,
  emptyMessage = 'No company benefits have been added yet.',
}: CompanyBenefitsProps) {
  const availableBenefits = benefits.filter(
    (benefit) => benefit.available !== false,
  );

  const groupedBenefits = CATEGORY_ORDER.map((category) => ({
    category,
    items: availableBenefits.filter(
      (benefit) => benefit.category === category,
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <section
      className="company-benefits"
      aria-label="Company benefits"
      aria-busy={loading}
    >
      <header className="company-benefits__header">
        <div>
          <span className="company-benefits__eyebrow">
            EMPLOYEE EXPERIENCE
          </span>

          <h2>Company benefits</h2>

          <p>
            Share the benefits and workplace advantages your company
            offers to employees.
          </p>
        </div>

        {!readOnly && onEdit && (
          <button
            type="button"
            className="company-benefits__edit-button"
            onClick={onEdit}
            disabled={disabled || loading}
          >
            Edit benefits
          </button>
        )}
      </header>

      {loading ? (
        <CompanyBenefitsSkeleton />
      ) : error ? (
        <div
          className="company-benefits__message company-benefits__message--error"
          role="alert"
        >
          <h3>Unable to load company benefits</h3>
          <p>{error}</p>

          {onRetry && (
            <button
              type="button"
              className="company-benefits__retry-button"
              onClick={onRetry}
              disabled={disabled}
            >
              Try again
            </button>
          )}
        </div>
      ) : availableBenefits.length === 0 ? (
        <div className="company-benefits__empty">
          <span
            className="company-benefits__empty-icon"
            aria-hidden="true"
          >
            ✦
          </span>

          <h3>Highlight what makes your workplace special</h3>

          <p>{emptyMessage}</p>

          {!readOnly && onEdit && (
            <button
              type="button"
              className="company-benefits__primary-button"
              onClick={onEdit}
              disabled={disabled}
            >
              Add company benefits
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="company-benefits__summary">
            <div className="company-benefits__summary-icon">
              <span aria-hidden="true">✓</span>
            </div>

            <div>
              <strong>
                {availableBenefits.length}{' '}
                {availableBenefits.length === 1 ? 'benefit' : 'benefits'}
              </strong>
              <span>Available to employees</span>
            </div>
          </div>

          <div className="company-benefits__groups">
            {groupedBenefits.map(({ category, items }) => (
              <section
                className="company-benefits__group"
                key={category}
                aria-label={CATEGORY_LABELS[category]}
              >
                <div className="company-benefits__group-heading">
                  <span
                    className={`company-benefits__category-icon company-benefits__category-icon--${category}`}
                    aria-hidden="true"
                  >
                    {CATEGORY_ICONS[category]}
                  </span>

                  <h3>{CATEGORY_LABELS[category]}</h3>

                  <span className="company-benefits__group-count">
                    {items.length}
                  </span>
                </div>

                <div className="company-benefits__grid">
                  {items.map((benefit) => (
                    <article
                      className="company-benefits__benefit"
                      key={benefit.id}
                    >
                      <span
                        className="company-benefits__check"
                        aria-hidden="true"
                      >
                        ✓
                      </span>

                      <div>
                        <h4>{benefit.title}</h4>

                        {benefit.description && (
                          <p>{benefit.description}</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <footer className="company-benefits__footer">
        <p>
          Benefits may vary by role, location, employment type, and
          eligibility. Confirm applicable benefits in each job posting.
        </p>
      </footer>
    </section>
  );
}

export default CompanyBenefits;
