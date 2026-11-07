import { Link } from "react-router-dom";
import type { AcademyCourse } from "../../../lib/academyApi";
import { instructorName } from "../../../lib/academyLearnApi";
import { Icon } from "./Icon";
import { KIND_LABEL, formatPrice, mediaUrl, type Kind } from "../../../lib/studioApi";

/**
 * Course card (design board style). Shows only what the backend stores:
 * cover, type, title, creator / brand, lesson count and price (Creator Studio
 * fields; older courses show as free courses). No invented ratings.
 */

const THEMES = ["linear-gradient(135deg,#1d5ee8,#0b2a6b)", "linear-gradient(135deg,#7c3aed,#3b1a7a)", "linear-gradient(135deg,#0ea5a4,#0b4f5e)", "linear-gradient(135deg,#d97706,#7a3d07)", "linear-gradient(135deg,#e11d48,#6b1030)", "linear-gradient(135deg,#16a34a,#0b4d26)"];

export function themeFor(code: string) {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return THEMES[h % THEMES.length];
}

type MarketFields = { kind?: Kind; brandName?: string; teacherName?: string; isFree?: boolean; price?: number; currency?: string; summary?: string; lessons?: unknown[]; startsAt?: string };

export default function FaCourseCard({ course }: { course: AcademyCourse }) {
  const m = course as AcademyCourse & MarketFields;
  const lessons = Array.isArray(m.lessons) && m.lessons.length ? m.lessons.length : Array.isArray(course.modules) ? course.modules.length : 0;
  const cover = mediaUrl(typeof course.coverUrl === "string" ? course.coverUrl : undefined);
  const free = m.isFree !== false || !(Number(m.price) > 0);
  const kind = m.kind && KIND_LABEL[m.kind] ? m.kind : "course";
  const when = m.startsAt && kind !== "course" ? new Date(m.startsAt) : null;
  return (
    <Link className="fa-card fa-ccard" to={`/academy/learn/${encodeURIComponent(course.code)}`}>
      <div className="fa-ccard__thumb" style={cover ? undefined : { background: themeFor(course.code) }}>
        {cover ? <img src={cover} alt="" loading="lazy" /> : <Icon name="book" size={34} stroke={1.5} />}
        <span className="fa-ccard__code">{KIND_LABEL[kind]}</span>
      </div>
      <div className="fa-ccard__body">
        <b>{course.name}</b>
        <small>
          {m.brandName || instructorName(course)}
          {m.teacherName && m.teacherName !== m.brandName ? ` · ${m.teacherName}` : ""}
        </small>
        {when && !Number.isNaN(when.getTime()) && (
          <small className="fa-ccard__when">
            <Icon name="calendar" size={11} /> {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </small>
        )}
        <div className="fa-ccard__foot">
          <span>
            <Icon name="play" size={12} /> {lessons} {lessons === 1 ? "lesson" : "lessons"}
          </span>
          <em className={free ? "is-free" : "is-paid"}>{formatPrice(free, Number(m.price) || 0, m.currency)}</em>
        </div>
      </div>
    </Link>
  );
}
