import type { ReactNode } from "react";
import { cx } from "../utils/format";

interface ReportCardProps {
  label: string;
  value: string;
  detail?: ReactNode;
  benchmark?: { value: number; current: number; higherIsBetter: boolean; label: string };
}

/** Metric tile with an optional comparison against a benchmark. */
export function ReportCard({ label, value, detail, benchmark }: ReportCardProps) {
  let tone: "good" | "bad" | undefined;
  if (benchmark) {
    const better = benchmark.higherIsBetter ? benchmark.current >= benchmark.value : benchmark.current <= benchmark.value;
    tone = better ? "good" : "bad";
  }
  return (
    <div className={cx("fm-reportcard", tone && `is-${tone}`)}>
      <span className="fm-reportcard__label">{label}</span>
      <strong className="fm-reportcard__value">{value}</strong>
      {detail && <span className="fm-reportcard__detail">{detail}</span>}
      {benchmark && <span className="fm-reportcard__bench">{benchmark.label}</span>}
    </div>
  );
}
