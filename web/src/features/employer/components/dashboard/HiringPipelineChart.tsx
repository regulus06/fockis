
import { useMemo } from 'react';
import '../styles/HiringPipelineChart.scss';

export type HiringPipelineStage = {
  id: string;
  label: string;
  count: number;
  description?: string | null;
};

export type HiringPipelineChartProps = {
  stages: HiringPipelineStage[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  showConversion?: boolean;
  showStageDescriptions?: boolean;
  onStageClick?: (stage: HiringPipelineStage) => void;
};

type NormalizedStage = HiringPipelineStage & {
  safeCount: number;
  percentage: number;
  previousConversion: number | null;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatPercentage(value: number): string {
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function HiringPipelineSkeleton() {
  return (
    <div
      className="hiring-pipeline-chart__skeleton"
      aria-label="Loading hiring pipeline"
      aria-busy="true"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="hiring-pipeline-chart__skeleton-row"
          key={index}
        >
          <span />
          <div>
            <span />
            <span />
          </div>
          <span />
        </div>
      ))}
    </div>
  );
}

export function HiringPipelineChart({
  stages,
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  title = 'Hiring pipeline',
  description = 'See how candidates progress through your recruitment process.',
  emptyMessage = 'Hiring pipeline data will appear here when candidate activity is available.',
  showConversion = true,
  showStageDescriptions = true,
  onStageClick,
}: HiringPipelineChartProps) {
  const normalizedStages = useMemo<NormalizedStage[]>(() => {
    const validStages = stages.map((stage) => ({
      ...stage,
      safeCount: normalizeCount(stage.count),
    }));

    const firstStageCount = validStages[0]?.safeCount ?? 0;

    return validStages.map((stage, index) => {
      const previousCount =
        index > 0 ? validStages[index - 1].safeCount : null;

      const percentage =
        firstStageCount > 0
          ? (stage.safeCount / firstStageCount) * 100
          : 0;

      const previousConversion =
        previousCount !== null && previousCount > 0
          ? (stage.safeCount / previousCount) * 100
          : null;

      return {
        ...stage,
        percentage: Math.min(100, Math.max(0, percentage)),
        previousConversion:
          previousConversion !== null &&
          Number.isFinite(previousConversion)
            ? previousConversion
            : null,
      };
    });
  }, [stages]);

  const totalCandidates = normalizedStages[0]?.safeCount ?? 0;
  const finalStage = normalizedStages[normalizedStages.length - 1];
  const finalCount = finalStage?.safeCount ?? 0;

  const overallConversion =
    totalCandidates > 0
      ? (finalCount / totalCandidates) * 100
      : null;

  const hasActivity = normalizedStages.some(
    (stage) => stage.safeCount > 0,
  );

  return (
    <section
      className="hiring-pipeline-chart"
      aria-label="Hiring pipeline chart"
      aria-busy={loading}
    >
      <header className="hiring-pipeline-chart__header">
        <div>
          <span className="hiring-pipeline-chart__eyebrow">
            RECRUITMENT OVERVIEW
          </span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        {!loading && !error && hasActivity && (
          <div className="hiring-pipeline-chart__summary">
            <span>Total at first stage</span>
            <strong>{formatNumber(totalCandidates)}</strong>
          </div>
        )}
      </header>

      {loading ? (
        <HiringPipelineSkeleton />
      ) : error ? (
        <div
          className="hiring-pipeline-chart__error"
          role="alert"
        >
          <div>
            <strong>Unable to load hiring pipeline</strong>
            <p>{error}</p>
          </div>

          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={disabled}
            >
              Retry
            </button>
          )}
        </div>
      ) : normalizedStages.length === 0 || !hasActivity ? (
        <div className="hiring-pipeline-chart__empty">
          <span aria-hidden="true">⇩</span>
          <h3>No pipeline activity yet</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="hiring-pipeline-chart__stages">
            {normalizedStages.map((stage, index) => {
              const isClickable = Boolean(onStageClick) && !disabled;

              const stageContent = (
                <>
                  <div className="hiring-pipeline-chart__stage-heading">
                    <div className="hiring-pipeline-chart__stage-identity">
                      <span className="hiring-pipeline-chart__stage-number">
                        {index + 1}
                      </span>

                      <div>
                        <strong>{stage.label}</strong>

                        {showStageDescriptions &&
                          stage.description && (
                            <small>{stage.description}</small>
                          )}
                      </div>
                    </div>

                    <div className="hiring-pipeline-chart__stage-count">
                      <strong>{formatNumber(stage.safeCount)}</strong>
                      <span>candidates</span>
                    </div>
                  </div>

                  <div
                    className="hiring-pipeline-chart__progress-track"
                    role="progressbar"
                    aria-label={`${stage.label} as a percentage of the first stage`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(stage.percentage * 10) / 10}
                  >
                    <span
                      className="hiring-pipeline-chart__progress-fill"
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>

                  <div className="hiring-pipeline-chart__stage-footer">
                    <span>
                      {formatPercentage(stage.percentage)} of initial candidates
                    </span>

                    {showConversion &&
                      stage.previousConversion !== null && (
                        <span className="hiring-pipeline-chart__conversion">
                          {formatPercentage(stage.previousConversion)} from previous stage
                        </span>
                      )}
                  </div>
                </>
              );

              return (
                <div
                  className="hiring-pipeline-chart__stage"
                  key={stage.id}
                >
                  {isClickable ? (
                    <button
                      type="button"
                      className="hiring-pipeline-chart__stage-button"
                      onClick={() => onStageClick(stage)}
                      disabled={!isClickable}
                      aria-label={`View ${formatNumber(stage.safeCount)} candidates at ${stage.label}`}
                    >
                      {stageContent}
                    </button>
                  ) : (
                    <div className="hiring-pipeline-chart__stage-content">
                      {stageContent}
                    </div>
                  )}

                  {index < normalizedStages.length - 1 && (
                    <div
                      className="hiring-pipeline-chart__connector"
                      aria-hidden="true"
                    >
                      <span />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {showConversion && (
            <footer className="hiring-pipeline-chart__footer">
              <div>
                <span className="hiring-pipeline-chart__footer-label">
                  Overall conversion
                </span>
                <strong>
                  {overallConversion === null
                    ? '—'
                    : formatPercentage(overallConversion)}
                </strong>
                <small>
                  First stage to {finalStage?.label || 'final stage'}
                </small>
              </div>

              <div>
                <span className="hiring-pipeline-chart__footer-label">
                  Final stage
                </span>
                <strong>{formatNumber(finalCount)}</strong>
                <small>{finalStage?.label || 'Completed'}</small>
              </div>
            </footer>
          )}
        </>
      )}
    </section>
  );
}

export default HiringPipelineChart;
