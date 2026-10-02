import type { ReactNode } from 'react';

export interface PlannerStep {
  emoji: string;
  label: string;
  sub?: string;
}

export interface TripPlannerProps {
  steps: PlannerStep[];
  activeIndex?: number;
}

/**
 * Fockis Travel — Trip Planner
 *
 * Displays a vertical sequence of trip-planning steps.
 * Used by the homepage and TravelTripPlannerPage.
 */
export default function TripPlanner({
  steps,
  activeIndex,
}: TripPlannerProps): ReactNode {
  return (
    <div className="planner-flow">
      {steps.map((step, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            className="planner-flow-item"
            key={`${step.label}-${index}`}
          >
            <div className="planner-step">
              <div
                className={`node${isActive ? ' active' : ''}`}
                aria-hidden="true"
              >
                {step.emoji}
              </div>

              <div className="planner-step-content">
                <div
                  className="label"
                  style={
                    isActive
                      ? {
                          color:
                            'var(--travel-primary, #0E6E67)',
                        }
                      : undefined
                  }
                >
                  {step.label}
                </div>

                {step.sub ? (
                  <div className="sub">
                    {step.sub}
                  </div>
                ) : null}
              </div>
            </div>

            {index < steps.length - 1 ? (
              <div
                className="planner-connector"
                aria-hidden="true"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}