export * from "./Job";
export * from "./Application";
export * from "./Company";
export * from "./SavedJob";
export * from "./CareerResource";

/* ============================================================
   APPLICATION STEPS
============================================================ */

export const APPLICATION_STEPS = [
  "Job Details",
  "Application",
  "Review",
  "Submitted",
] as const;

export type ApplicationStep =
  (typeof APPLICATION_STEPS)[number];