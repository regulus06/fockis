import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadState } from "../../../components/academy/learn/CourseCard";
import { CyberArt } from "../../../components/academy/market/Art";
import { Icon } from "../../../components/academy/market/Icon";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademyToast } from "../../../lib/academyToastStore";
import { getEvent, type AcademyEvent } from "../../../lib/academyApi";
import { shortDate } from "../../../lib/academyLearnApi";

/**
 * /academy/events/:id — Seminar Details & Registration (design board screen 8),
 * from GET /academy/events/:id. "Register" uses the event's registrationUrl
 * when the admin set one; otherwise it goes to Admissions. Paid seminar
 * checkout will reuse the existing Fockis payment flow once connected.
 */

type Tab = "Overview" | "Details";

function icsFor(e: AcademyEvent) {
  const start = new Date(`${(e.startDate || e.date || "").slice(0, 10)}T${e.startTime || "09:00"}`);
  const end = e.endDate || e.endTime ? new Date(`${(e.endDate || e.startDate || e.date || "").slice(0, 10)}T${e.endTime || e.startTime || "10:00"}`) : new Date(start.getTime() + 3600000);
  const fmt = (d: Date) => (Number.isNaN(d.getTime()) ? "" : d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fockis Academy//EN", "BEGIN:VEVENT", `UID:${e._id || e.id || e.title}@fockis-academy`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, `SUMMARY:${e.title}`, `LOCATION:${(e.location || (e.loc as string | undefined)) || "Online"}`, `DESCRIPTION:${(e.description || "").replace(/\n/g, "\\n")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

export default function EventDetails() {
  const { id = "" } = useParams();
  const { state, reload } = useAcademyLoad(() => getEvent(id), [id]);
  const [tab, setTab] = useState<Tab>("Overview");
  const toast = useAcademyToast((s: { showToast: (message: string) => void }) => s.showToast);

  if (state.status !== "ready")
    return (
      <div className="fa-root fa-page">
        <div className="fa-container fa-section">{state.status === "loading" ? <LoadState status="loading" /> : <LoadState status="error" error={state.error} onRetry={reload} />}</div>
      </div>
    );

  const e = state.data;
  const when = shortDate(e.startDate || e.date);
  const time = [e.startTime, e.endTime].filter(Boolean).join(" – ");
  const isOnline = /online|virtual|zoom|live/i.test((e.location || (e.loc as string | undefined)) || "");
  const past = (() => {
    const t = new Date(e.endDate || e.startDate || e.date || "").getTime();
    return !Number.isNaN(t) && t < Date.now() - 86400000;
  })();

  function addToCalendar() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([icsFor(e)], { type: "text/calendar" }));
    a.download = `${e.title.replace(/[^\w]+/g, "-").toLowerCase()}.ics`;
    a.click();
    toast("Calendar file downloaded");
  }

  return (
    <div className="fa-root fa-page">
      <div className="fa-container">
        <div className="fa-crumbs fa-crumbs--top">
          <Link to="/academy/calendar">Seminars & Events</Link> / <span>{e.title}</span>
        </div>
        <section className="fa-detail">
          <div className="fa-detail__media">{e.imageUrl ? <img src={e.imageUrl} alt="" /> : <CyberArt />}</div>
          <div className="fa-detail__info">
            <span className="fa-live-tag">• {e.category || (isOnline ? "Live Seminar" : "Seminar")}</span>
            <h1>{e.title}</h1>
            <div className="fa-meta fa-meta--wrap">
              <span className="fa-chip">
                <Icon name="calendar" size={12} /> {when || "Date to be announced"}
                {time ? ` · ${time}` : ""}
              </span>
              {(e.location || (e.loc as string | undefined)) && (
                <span className="fa-chip">
                  <Icon name={isOnline ? "monitor" : "building"} size={12} /> {(e.location || (e.loc as string | undefined))}
                </span>
              )}
            </div>
            <div className="fa-detail__btns">
              {past ? (
                <button className="fa-btn fa-btn--primary" disabled>
                  This seminar has ended
                </button>
              ) : e.registrationUrl ? (
                <a className="fa-btn fa-btn--primary" href={e.registrationUrl} target="_blank" rel="noreferrer">
                  Register Now
                </a>
              ) : (
                <Link className="fa-btn fa-btn--primary" to="/academy/admissions">
                  Register Now
                </Link>
              )}
              <button className="fa-btn fa-btn--outline" onClick={addToCalendar}>
                <Icon name="calendar" size={15} /> Add to Calendar
              </button>
            </div>
          </div>
        </section>

        <nav className="fa-tabs" role="tablist">
          {(["Overview", "Details"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </nav>
        <section className="fa-section">
          {tab === "Overview" && <p className="fa-muted fa-pre">{e.description || "The organizer hasn't added a description yet."}</p>}
          {tab === "Details" && (
            <dl className="fa-review">
              <div>
                <dt>Date</dt>
                <dd>{when || "TBA"}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{time || "TBA"}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{(e.location || (e.loc as string | undefined)) || "TBA"}</dd>
              </div>
              {e.category && (
                <div>
                  <dt>Category</dt>
                  <dd>{e.category}</dd>
                </div>
              )}
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}
