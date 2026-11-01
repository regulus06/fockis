
import { APPLICATION_STEPS } from '../types';

import styles from '../styles/ApplicationStepper.module.scss';

interface ApplicationStepperProps {
  currentStep: number;
}

export function ApplicationStepper({
  currentStep,
}: ApplicationStepperProps) {
  const steps = APPLICATION_STEPS;

  const safeCurrentStep = Math.min(
    Math.max(currentStep, 0),
    steps.length - 1,
  );

  const progress = steps.length > 1
    ? (safeCurrentStep / (steps.length - 1)) * 100
    : 0;

  return (
    <div
      className={styles.stepper}
      aria-label="Application progress"
    >
      <div
        className={styles.stepWrap}
        style={{
          position: 'relative',
        }}
      >
        {steps.map((label, index) => {
          const isCompleted = index < safeCurrentStep;
          const isCurrent = index === safeCurrentStep;

          const state = isCompleted
            ? styles.done
            : isCurrent
              ? styles.current
              : '';

          return (
            <div
              className={styles.step}
              key={`${label}-${index}`}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`${label}: ${
                isCompleted
                  ? 'completed'
                  : isCurrent
                    ? 'current step'
                    : 'not started'
              }`}
            >
              <div className={`${styles.dot} ${state}`}>
                {isCompleted ? '✓' : index + 1}
              </div>

              <div className={`${styles.label} ${state}`}>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div
        role="progressbar"
        aria-label="Application completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        style={{
          marginTop: 12,
          height: 4,
          width: '100%',
          background: 'rgba(128,128,128,0.2)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'currentColor',
            borderRadius: 10,
            transition: 'width 200ms ease',
          }}
        />
      </div>
    </div>
  );
}
