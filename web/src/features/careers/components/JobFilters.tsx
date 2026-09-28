import { useJobFilters } from "../hooks/useJobFilters";
import type {
  JobType,
  WorkArrangement,
  ExperienceLevel,
} from "../types";
import styles from "../styles/JobFilters.module.scss";

const JOB_TYPES: {
  value: JobType;
  label: string;
}[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "co-op", label: "Co-op" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
];

const ARRANGEMENTS: {
  value: WorkArrangement;
  label: string;
}[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
];

const LEVELS: {
  value: ExperienceLevel;
  label: string;
}[] = [
  { value: "student", label: "Student" },
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
];

const INDUSTRIES: string[] = [
  "Technology",
  "Cybersecurity",
  "Healthcare",
  "Business",
  "Engineering",
];

const DATE_POSTED = [
  {
    value: "24h" as const,
    label: "Past 24 hours",
  },
  {
    value: "week" as const,
    label: "Past week",
  },
  {
    value: "month" as const,
    label: "Past month",
  },
];

export function JobFilters() {
  const filters = useJobFilters(
    (state) => state.filters
  );

  const toggleJobType = useJobFilters(
    (state) => state.toggleJobType
  );

  const toggleArrangement = useJobFilters(
    (state) => state.toggleArrangement
  );

  const toggleExperienceLevel = useJobFilters(
    (state) => state.toggleExperienceLevel
  );

  const toggleIndustry = useJobFilters(
    (state) => state.toggleIndustry
  );

  const setMinSalary = useJobFilters(
    (state) => state.setMinSalary
  );

  const setDatePosted = useJobFilters(
    (state) => state.setDatePosted
  );

  const reset = useJobFilters(
    (state) => state.reset
  );

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <h3>Filters</h3>

        <button
          type="button"
          className={styles.clearBtn}
          onClick={reset}
        >
          Clear all
        </button>
      </div>

      <div className={styles.group}>
        <h4>Job type</h4>

        {JOB_TYPES.map((type) => (
          <label
            key={type.value}
            className={styles.checkRow}
          >
            <input
              type="checkbox"
              checked={filters.jobTypes.includes(
                type.value
              )}
              onChange={() =>
                toggleJobType(type.value)
              }
            />

            <span>{type.label}</span>
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <h4>Work arrangement</h4>

        {ARRANGEMENTS.map((arrangement) => (
          <label
            key={arrangement.value}
            className={styles.checkRow}
          >
            <input
              type="checkbox"
              checked={filters.arrangements.includes(
                arrangement.value
              )}
              onChange={() =>
                toggleArrangement(
                  arrangement.value
                )
              }
            />

            <span>{arrangement.label}</span>
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <h4>Salary (min)</h4>

        <input
          type="range"
          min={0}
          max={200000}
          step={5000}
          value={filters.minSalary ?? 0}
          onChange={(event) =>
            setMinSalary(
              Number(event.target.value)
            )
          }
        />

        <div className={styles.rangeHint}>
          <span>$0</span>

          <span>
            $
            {Math.round(
              (filters.minSalary ?? 0) / 1000
            )}
            k+
          </span>

          <span>$200k</span>
        </div>
      </div>

      <div className={styles.group}>
        <h4>Experience level</h4>

        {LEVELS.map((level) => (
          <label
            key={level.value}
            className={styles.checkRow}
          >
            <input
              type="checkbox"
              checked={filters.experienceLevels.includes(
                level.value
              )}
              onChange={() =>
                toggleExperienceLevel(
                  level.value
                )
              }
            />

            <span>{level.label}</span>
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <h4>Industry</h4>

        {INDUSTRIES.map((industry) => (
          <label
            key={industry}
            className={styles.checkRow}
          >
            <input
              type="checkbox"
              checked={filters.industries.includes(
                industry
              )}
              onChange={() =>
                toggleIndustry(industry)
              }
            />

            <span>{industry}</span>
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <h4>Date posted</h4>

        {DATE_POSTED.map((date) => (
          <label
            key={date.value}
            className={styles.checkRow}
          >
            <input
              type="radio"
              name="datePosted"
              checked={
                filters.datePosted === date.value
              }
              onChange={() =>
                setDatePosted(date.value)
              }
            />

            <span>{date.label}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}