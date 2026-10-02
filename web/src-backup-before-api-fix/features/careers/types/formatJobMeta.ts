import type { Job } from "./Job";

export function formatSalary(job: Job): string {
  if (!job.salaryMin && !job.salaryMax) {
    return "Salary not listed";
  }

  const unit = job.salaryUnit === "hr" ? "/hr" : "/yr";

  const fmt = (n: number) =>
    job.salaryUnit === "yr"
      ? `$${Math.round(n / 1000)}k`
      : `$${n}`;

  if (job.salaryMin && job.salaryMax) {
    return `${fmt(job.salaryMin)}–${fmt(job.salaryMax)}${unit}`;
  }

  return `${fmt(job.salaryMin ?? job.salaryMax ?? 0)}${unit}`;
}

export function formatPostedAt(isoDate: string): string {
  const posted = new Date(isoDate);

  const days = Math.floor(
    (Date.now() - posted.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  const weeks = Math.floor(days / 7);

  return weeks === 1
    ? "1 week ago"
    : `${weeks} weeks ago`;
}

export function jobTypeBadge(
  job: Job
): {
  variant: "internship" | "coop" | "fulltime";
  label: string;
} | null {
  if (job.jobType === "internship") {
    return {
      variant: "internship",
      label: "INTERNSHIP",
    };
  }

  if (job.jobType === "co-op") {
    return {
      variant: "coop",
      label: "CO-OP",
    };
  }

  if (job.jobType === "full-time") {
    return {
      variant: "fulltime",
      label: "FULL-TIME",
    };
  }

  return null;
}