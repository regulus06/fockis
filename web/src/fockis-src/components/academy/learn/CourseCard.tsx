import { Link } from "react-router-dom";
import type { AcademyCourse } from "../../../lib/academyApi";
import { instructorName } from "../../../lib/academyLearnApi";
import LearnIcon from "./LearnIcon";

/**
 * Course card for the learning marketplace. Shows only what the backend
 * actually stores for a course: name, code, instructor, module count.
 * (No invented ratings or prices — those appear once the backend has them.)
 */

const THUMB_THEMES = ["t-blue", "t-violet", "t-teal", "t-navy", "t-indigo", "t-green"];

function themeFor(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return THUMB_THEMES[h % THUMB_THEMES.length];
}

export default function CourseCard({ course }: { course: AcademyCourse }) {
  const modules = Array.isArray(course.modules) ? course.modules.length : 0;
  const cover = typeof course.coverUrl === "string" ? course.coverUrl : undefined;

  return (
    <Link className="lr-course-card" to={`/academy/learn/${encodeURIComponent(course.code)}`}>
      <div className={`lr-course-thumb ${themeFor(course.code)}`}>
        {cover ? (
          <img src={cover} alt="" loading="lazy" />
        ) : (
          <div className="lr-thumb-fallback">
            <LearnIcon name="book" size={40} />
          </div>
        )}
        <span className="lr-type-pill">{course.code}</span>
      </div>
      <div className="lr-course-body">
        <h3>{course.name}</h3>
        <small>{instructorName(course)}</small>
        <div className="lr-course-foot">
          <span className="lr-rating">
            <LearnIcon name="book" size={14} /> <em>{modules} {modules === 1 ? "module" : "modules"}</em>
          </span>
          <span className="lr-view">
            View <LearnIcon name="arrowRight" size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function LoadState({
  status,
  error,
  empty,
  onRetry,
}: {
  status: "loading" | "error" | "empty";
  error?: string;
  empty?: string;
  onRetry?: () => void;
}) {
  if (status === "loading")
    return (
      <div className="lr-state" aria-busy="true">
        <span className="lr-spinner" /> Loading…
      </div>
    );
  if (status === "empty") return <div className="lr-state">{empty ?? "Nothing here yet."}</div>;
  return (
    <div className="lr-state lr-state-error" role="alert">
      Couldn&apos;t load this right now. <span className="lr-state-detail">{error}</span>
      {onRetry && (
        <button type="button" className="lr-link-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
