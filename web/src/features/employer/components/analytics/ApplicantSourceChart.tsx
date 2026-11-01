
import '../styles/ApplicantSourceChart.scss';

export type ApplicantSource = {
  id: string;
  name: string;
  applicants: number;
};

export type ApplicantSourceChartProps = {
  sources: ApplicantSource[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const SOURCE_COLORS = [
  '#246bfd',
  '#26a47b',
  '#8958dc',
  '#e9a23b',
  '#e36b83',
  '#718096',
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function ApplicantSourceChart({
  sources,
  loading = false,
  error = null,
  onRetry,
}: ApplicantSourceChartProps) {
  const validSources = sources.filter(
    (source) =>
      Number.isFinite(source.applicants) && source.applicants >= 0,
  );

  const totalApplicants = validSources.reduce(
    (total, source) => total + source.applicants,
    0,
  );

  const sortedSources = [...validSources].sort(
    (a, b) => b.applicants - a.applicants,
  );

  if (error) {
    return (
      <section
        className="applicant-source-chart applicant-source-chart--message"
        aria-label="Applicant sources"
        role="alert"
      >
        <h2>Unable to load applicant sources</h2>
        <p>{error}</p>

        {onRetry && (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </section>
    );
  }

  return (
    <section
      className="applicant-source-chart"
      aria-label="Applicant source chart"
      aria-busy={loading}
    >
      <div className="applicant-source-chart__header">
        <div>
          <h2>Applicant sources</h2>
          <p>Where your candidates are discovering your jobs.</p>
        </div>

        <span className="applicant-source-chart__total">
          {loading ? '—' : formatNumber(totalApplicants)}
          <small>Total applicants</small>
        </span>
      </div>

      {loading ? (
        <div
          className="applicant-source-chart__loading"
          aria-label="Loading applicant sources"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="applicant-source-chart__skeleton" key={index}>
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : sortedSources.length === 0 || totalApplicants === 0 ? (
        <div className="applicant-source-chart__empty">
          <span aria-hidden="true">◈</span>
          <h3>No source data available</h3>
          <p>
            Applicant source information will appear here when candidates
            begin applying.
          </p>
        </div>
      ) : (
        <>
          <div
            className="applicant-source-chart__visual"
            role="img"
            aria-label={`Applicant sources. ${sortedSources
              .map((source) => {
                const percentage =
                  (source.applicants / totalApplicants) * 100;
                return `${source.name}: ${percentage.toFixed(1)} percent`;
              })
              .join(', ')}`}
          >
            <div className="applicant-source-chart__bar">
              {sortedSources.map((source, index) => {
                const percentage =
                  (source.applicants / totalApplicants) * 100;

                return (
                  <span
                    key={source.id}
                    className="applicant-source-chart__bar-segment"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor:
                        SOURCE_COLORS[index % SOURCE_COLORS.length],
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="applicant-source-chart__legend">
            {sortedSources.map((source, index) => {
              const percentage =
                (source.applicants / totalApplicants) * 100;

              return (
                <div
                  className="applicant-source-chart__source"
                  key={source.id}
                >
                  <div className="applicant-source-chart__source-info">
                    <span
                      className="applicant-source-chart__dot"
                      style={{
                        backgroundColor:
                          SOURCE_COLORS[index % SOURCE_COLORS.length],
                      }}
                    />
                    <span className="applicant-source-chart__name">
                      {source.name}
                    </span>
                  </div>

                  <div className="applicant-source-chart__source-values">
                    <strong>{formatNumber(source.applicants)}</strong>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default ApplicantSourceChart;
