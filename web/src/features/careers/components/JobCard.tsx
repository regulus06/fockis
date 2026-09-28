import { CareersBadge } from "./CareersBadge";
import { useSavedJobs } from "../hooks/useSavedJobs";
import styles from "../styles/JobCard.module.scss";

interface JobCardSkill {
  id: string;
  label: string;
}

interface JobCardCompany {
  name: string;
  initials: string;
  verified?: boolean;
}

interface JobCardData {
  id: string;
  title: string;
  description: string;
  location: string;
  arrangement: string;
  term?: string;
  postedAt: string;
  isPaid?: boolean;
  company: JobCardCompany;
  skills: JobCardSkill[];
  jobType?: string;
  type?: string;
  salaryMin?: number;
  salaryMax?: number;
  salary?: number;
  payMin?: number;
  payMax?: number;
}

interface JobCardProps<T extends JobCardData> {
  job: T;
  layout?: "grid" | "list";
  onOpen: (job: T) => void;
  onEasyApply: (job: T) => void;
}

/* ============================================================
   JOB METADATA HELPERS
============================================================ */

function formatSalary(
  job: JobCardData,
): string {
  const min =
    job.salaryMin ??
    job.payMin ??
    job.salary;

  const max =
    job.salaryMax ??
    job.payMax;

  if (
    min != null &&
    max != null
  ) {
    return `$${Math.round(
      min,
    ).toLocaleString()}–$${Math.round(
      max,
    ).toLocaleString()}`;
  }

  if (min != null) {
    return `$${Math.round(
      min,
    ).toLocaleString()}+`;
  }

  return "Salary not listed";
}

function formatPostedAt(
  value: string,
): string {
  if (!value) {
    return "Recently";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Recently";
  }

  const now =
    new Date();

  const diffMs =
    now.getTime() -
    date.getTime();

  const diffMinutes =
    Math.floor(
      diffMs / 60000,
    );

  const diffHours =
    Math.floor(
      diffMinutes / 60,
    );

  const diffDays =
    Math.floor(
      diffHours / 24,
    );

  if (diffMinutes < 60) {
    return `${Math.max(
      diffMinutes,
      1,
    )}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString();
}

function getJobType(
  job: JobCardData,
): {
  variant:
    | "internship"
    | "coop"
    | "paid"
    | "remote";
  label: string;
} | null {
  const type =
    String(
      job.jobType ??
        job.type ??
        "",
    ).toLowerCase();

  if (
    type.includes(
      "intern",
    )
  ) {
    return {
      variant:
        "internship",
      label: "INTERNSHIP",
    };
  }

  if (
    type.includes(
      "co-op",
    ) ||
    type.includes(
      "coop",
    )
  ) {
    return {
      variant: "coop",
      label: "CO-OP",
    };
  }

  if (job.isPaid) {
    return {
      variant: "paid",
      label: "PAID",
    };
  }

  return null;
}

/* ============================================================
   JOB CARD
============================================================ */

export function JobCard<
  T extends JobCardData,
>({
  job,
  layout = "grid",
  onOpen,
  onEasyApply,
}: JobCardProps<T>) {
  const isSaved =
    useSavedJobs(
      (state) =>
        state.isSaved(
          job.id,
        ),
    );

  const toggleSave =
    useSavedJobs(
      (state) =>
        state.toggleSave,
    );

  const typeBadge =
    getJobType(job);

  const handleToggleSave =
    async (
      event: React.MouseEvent<
        HTMLButtonElement
      >,
    ) => {
      event.stopPropagation();

      try {
        await toggleSave(
          job.id,
        );
      } catch (error) {
        console.error(
          "Failed to update saved job:",
          error,
        );
      }
    };

  return (
    <div
      className={`${styles.card} ${
        layout === "list"
          ? styles.list
          : ""
      }`}
      onClick={() =>
        onOpen(job)
      }
      role="button"
      tabIndex={0}
      onKeyDown={(
        event,
      ) => {
        if (
          event.key ===
            "Enter" ||
          event.key ===
            " "
        ) {
          event.preventDefault();

          onOpen(job);
        }
      }}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className={
          styles.top
        }
      >
        <div
          className={
            styles.logo
          }
        >
          {
            job.company
              .initials
          }
        </div>

        <div
          className={
            styles.headline
          }
        >
          <div
            className={
              styles.title
            }
          >
            {job.title}
          </div>

          <div
            className={
              styles.company
            }
          >
            {
              job.company
                .name
            }

            {job.company
              .verified && (
              <span
                className={
                  styles.verified
                }
              >
                ✔
              </span>
            )}
          </div>

          <div
            className={
              styles.location
            }
          >
            {job.location}
          </div>
        </div>

        {/* ==================================================
            SAVE BUTTON
        ================================================== */}

        <button
          type="button"
          className={`${
            styles.saveBtn
          } ${
            isSaved
              ? styles.saved
              : ""
          }`}
          onClick={
            handleToggleSave
          }
          aria-label={
            isSaved
              ? "Unsave job"
              : "Save job"
          }
          aria-pressed={
            isSaved
          }
        >
          {isSaved
            ? "♥"
            : "♡"}
        </button>
      </div>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <div
        className={
          styles.main
        }
      >
        <div
          className={
            styles.badgeRow
          }
        >
          {typeBadge && (
            <CareersBadge
              variant={
                typeBadge.variant
              }
              label={
                typeBadge.label
              }
            />
          )}

          <CareersBadge
            variant="remote"
            label={String(
              job.arrangement,
            ).toUpperCase()}
          />

          {job.term && (
            <CareersBadge
              variant="paid"
              label={String(
                job.term,
              ).toUpperCase()}
            />
          )}
        </div>

        <p
          className={
            styles.desc
          }
        >
          {
            job.description
          }
        </p>

        <div
          className={
            styles.skills
          }
        >
          {job.skills
            .slice(0, 4)
            .map(
              (skill) => (
                <span
                  key={
                    skill.id
                  }
                  className={
                    styles.skillTag
                  }
                >
                  {
                    skill.label
                  }
                </span>
              ),
            )}
        </div>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div
          className={
            styles.footer
          }
        >
          <div>
            <div
              className={
                styles.pay
              }
            >
              {formatSalary(
                job,
              )}
            </div>

            <div
              className={
                styles.posted
              }
            >
              Posted{" "}
              {formatPostedAt(
                job.postedAt,
              )}
            </div>
          </div>

          <div
            className={
              styles.actions
            }
          >
            <button
              type="button"
              className={
                styles.detailsBtn
              }
              onClick={(
                event,
              ) => {
                event.stopPropagation();

                onOpen(job);
              }}
            >
              Details
            </button>

            <button
              type="button"
              className={
                styles.applyBtn
              }
              onClick={(
                event,
              ) => {
                event.stopPropagation();

                onEasyApply(
                  job,
                );
              }}
            >
              Easy Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}