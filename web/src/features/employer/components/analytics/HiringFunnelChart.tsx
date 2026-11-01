
import '../styles/HiringFunnelChart.scss';

export type HiringFunnelStage = {
  id: string;
  label: string;
  count: number;
};

export type HiringFunnelChartProps = {
  stages: HiringFunnelStage[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const STAGE_COLORS = [
  '#246bfd',
  '#397fe9',
  '#568bdc',
  '#7a8ed2',
  '#26a47b',
  '#1c956d',
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function HiringFunnelChart({
  stages,
  loading = false,
  error = null,
  onRetry,
}: HiringFunnelChartProps) {
  const validStages = stages.filter(
    (stage) =>
      Number.isFinite(stage.count) && stage.count >= 0,
  );

  const firstStageCount = validStages[0]?.count ?? 0;

  if (error) {
    return (
      <section
        className="hiring-funnel hiring-funnel--message"
        aria-label="Hiring funnel"
        role="alert"
      >
        <h2>Unable to load hiring funnel</h2>
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
      className="hiring-funnel"
      aria-label="Hiring funnel chart"
      aria-busy={loading}
    >
      <div className="hiring-funnel__header">
        <div>
          <h2>Hiring funnel</h2>
          <p>Track candidates as they move through recruitment.</p>
        </div>

        <span className="hiring-funnel__badge">
          Recruitment pipeline
        </span>
      </div>

      {loading ? (
        <div
          className="hiring-funnel__loading"
          aria-label="Loading hiring funnel"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="hiring-funnel__skeleton" key={index}>
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : validStages.length === 0 ? (
        <div className="hiring-funnel__empty">
          <span aria-hidden="true">◇</span>
          <h3>No recruitment data available</h3>
          <p>
            Your hiring funnel will appear here when candidate activity
            becomes available.
          </p>
        </div>
      ) : (
        <div className="hiring-funnel__content">
          <div className="hiring-funnel__stages">
            {validStages.map((stage, index) => {
              const percentage =
                firstStageCount > 0
                  ? (stage.count / firstStageCount) * 100
                  : 0;

              const previousCount =
                index > 0 ? validStages[index - 1].count : null;

              const stageConversion =
                previousCount !== null && previousCount > 0
                  ? (stage.count / previousCount) * 100
                  : null;

              const width = Math.max(
                stage.count > 0 ? 4 : 0,
                percentage,
              );

              return (
                <div className="hiring-funnel__stage" key={stage.id}>
                  <div className="hiring-funnel__stage-info">
                    <div className="hiring-funnel__stage-name">
                      <span
                        className="hiring-funnel__stage-number"
                        style={{
                          backgroundColor:
                            STAGE_COLORS[index % STAGE_COLORS.length],
                        }}
                      >
                        {index + 1}
                      </span>

                      <span>{stage.label}</span>
                    </div>

                    <div className="hiring-funnel__stage-results">
                      <strong>{formatNumber(stage.count)}</strong>

                      <span>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div
                    className="hiring-funnel__track"
                    role="img"
                    aria-label={`${stage.label}: ${formatNumber(stage.count)} candidates, ${percentage.toFixed(1)} percent of initial stage`}
                  >
                    <div
                      className="hiring-funnel__bar"
                      style={{
                        width: `${width}%`,
                        backgroundColor:
                          STAGE_COLORS[index % STAGE_COLORS.length],
                      }}
                    />
                  </div>

                  {stageConversion !== null && (
                    <div className="hiring-funnel__conversion">
                      <span>
                        {stageConversion.toFixed(1)}% from previous stage
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hiring-funnel__summary">
            <div>
              <span>Initial candidates</span>
              <strong>{formatNumber(firstStageCount)}</strong>
            </div>

            <div>
              <span>Final stage candidates</span>
              <strong>
                {formatNumber(validStages[validStages.length - 1].count)}
              </strong>
            </div>

            <div>
              <span>Overall conversion</span>
              <strong>
                {firstStageCount > 0
                  ? `${(
                      (validStages[validStages.length - 1].count /
                        firstStageCount) *
                      100
                    ).toFixed(1)}%`
                  : '—'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default HiringFunnelChart;
