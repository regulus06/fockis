
import '../styles/CompanyPreview.scss';

export type CompanyPreviewBenefit = {
  id: string;
  title: string;
};

export type CompanyPreviewData = {
  displayName: string;
  legalName?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
  industry?: string | null;
  companySize?: string | null;
  foundedYear?: string | number | null;
  website?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  benefits?: CompanyPreviewBenefit[];
  verified?: boolean;
};

export type CompanyPreviewProps = {
  company: CompanyPreviewData;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEdit?: () => void;
  readOnly?: boolean;
  disabled?: boolean;
  previewLabel?: string;
  maxBenefits?: number;
};

function getWebsiteUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;

  try {
    const candidate = /^https?:\/\//i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`;

    const url = new URL(candidate);

    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:') ||
      !url.hostname.includes('.')
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function formatLocation(company: CompanyPreviewData): string {
  return [
    company.city,
    company.stateProvince,
    company.country,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ');
}

function CompanyPreviewSkeleton() {
  return (
    <div
      className="company-preview__skeleton"
      aria-label="Loading company preview"
      aria-busy="true"
    >
      <div className="company-preview__skeleton-cover" />
      <div className="company-preview__skeleton-content">
        <span />
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function CompanyPreview({
  company,
  loading = false,
  error = null,
  onRetry,
  onEdit,
  readOnly = false,
  disabled = false,
  previewLabel = 'Candidate-facing profile preview',
  maxBenefits = 6,
}: CompanyPreviewProps) {
  const websiteUrl = getWebsiteUrl(company.website);
  const location = formatLocation(company);

  const benefits = (company.benefits ?? [])
    .filter((benefit) => benefit.title?.trim())
    .slice(0, Math.max(0, maxBenefits));

  const remainingBenefits = Math.max(
    0,
    (company.benefits?.length ?? 0) - benefits.length,
  );

  return (
    <section
      className="company-preview"
      aria-label="Company profile preview"
      aria-busy={loading}
    >
      <header className="company-preview__header">
        <div>
          <span className="company-preview__eyebrow">
            EMPLOYER PROFILE
          </span>

          <h2>Company preview</h2>

          <p>
            See how your organization information can appear to
            candidates.
          </p>
        </div>

        <span className="company-preview__preview-badge">
          <span />
          {previewLabel}
        </span>
      </header>

      {loading ? (
        <CompanyPreviewSkeleton />
      ) : error ? (
        <div
          className="company-preview__message company-preview__message--error"
          role="alert"
        >
          <h3>Unable to load company preview</h3>
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
        <>
          <article className="company-preview__profile">
            <div className="company-preview__cover">
              {company.coverImageUrl ? (
                <img
                  src={company.coverImageUrl}
                  alt=""
                  className="company-preview__cover-image"
                />
              ) : (
                <div className="company-preview__cover-placeholder">
                  <span aria-hidden="true">✦</span>
                  <small>Company cover image</small>
                </div>
              )}
            </div>

            <div className="company-preview__identity">
              <div className="company-preview__logo">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={`${company.displayName || 'Company'} logo`}
                  />
                ) : (
                  <span aria-hidden="true">
                    {company.displayName?.trim().charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>

              <div className="company-preview__identity-info">
                <div className="company-preview__company-name">
                  <h3>
                    {company.displayName?.trim() || 'Your company name'}
                  </h3>

                  {company.verified && (
                    <span
                      className="company-preview__verified"
                      title="Company verification confirmed"
                    >
                      <span aria-hidden="true">✓</span>
                      Verified
                    </span>
                  )}
                </div>

                {company.industry && (
                  <span>{company.industry}</span>
                )}

                {location && (
                  <span className="company-preview__location">
                    <span aria-hidden="true">⌖</span>
                    {location}
                  </span>
                )}
              </div>
            </div>

            <div className="company-preview__facts">
              {company.companySize && (
                <div>
                  <span>Company size</span>
                  <strong>{company.companySize}</strong>
                </div>
              )}

              {company.foundedYear && (
                <div>
                  <span>Founded</span>
                  <strong>{company.foundedYear}</strong>
                </div>
              )}

              {company.industry && (
                <div>
                  <span>Industry</span>
                  <strong>{company.industry}</strong>
                </div>
              )}
            </div>

            <section className="company-preview__section">
              <h4>About the company</h4>

              {company.description?.trim() ? (
                <p className="company-preview__description">
                  {company.description}
                </p>
              ) : (
                <p className="company-preview__placeholder-text">
                  Add a company description to introduce your
                  organization to candidates.
                </p>
              )}
            </section>

            {benefits.length > 0 && (
              <section className="company-preview__section">
                <h4>Employee benefits</h4>

                <div className="company-preview__benefits">
                  {benefits.map((benefit) => (
                    <span key={benefit.id}>
                      <span aria-hidden="true">✓</span>
                      {benefit.title}
                    </span>
                  ))}
                </div>

                {remainingBenefits > 0 && (
                  <p className="company-preview__more-benefits">
                    +{remainingBenefits} more benefits
                  </p>
                )}
              </section>
            )}

            {websiteUrl && (
              <section className="company-preview__website">
                <span>Company website</span>

                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {company.website}
                  <span aria-hidden="true">↗</span>
                </a>
              </section>
            )}

            <footer className="company-preview__footer">
              <span>Fockis Employer Profile</span>
              <span>Company information preview</span>
            </footer>
          </article>

          {!company.description?.trim() && (
            <div className="company-preview__completion">
              <span aria-hidden="true">!</span>
              Your company profile could be more informative with
              a company description.
            </div>
          )}

          {!readOnly && onEdit && (
            <div className="company-preview__actions">
              <button
                type="button"
                className="company-preview__edit-button"
                onClick={onEdit}
                disabled={disabled}
              >
                Edit company profile
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default CompanyPreview;
