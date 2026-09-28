import styles from "../styles/ApplicationStepper.module.scss";

const APPLICATION_STEPS: string[] = [
  "Personal",
  "Resume",
  "Education",
  "Experience",
  "Skills",
  "Cover Letter",
  "Eligibility",
  "Review",
  "Submit",
];

interface ApplicationStepperProps {
  currentStep: number;
}

export function ApplicationStepper({
  currentStep,
}: ApplicationStepperProps) {
  return (
    <div className={styles.stepper}>
      {APPLICATION_STEPS.map(
        (label, index) => {
          const state =
            index < currentStep
              ? styles.done
              : index === currentStep
                ? styles.current
                : "";

          return (
            <div
              className={styles.stepWrap}
              key={label}
            >
              <div
                className={`${styles.step} ${state}`}
              >
                <div className={styles.dot}>
                  {index < currentStep
                    ? "✓"
                    : index + 1}
                </div>

                <div className={styles.label}>
                  {label}
                </div>
              </div>

              {index <
                APPLICATION_STEPS.length - 1 && (
                <div className={styles.line} />
              )}
            </div>
          );
        },
      )}
    </div>
  );
}