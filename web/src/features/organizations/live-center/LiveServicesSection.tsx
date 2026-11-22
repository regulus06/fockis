/**
 * LiveServicesSection.tsx — "Live Services" on the public organization page.
 * -----------------------------------------------------------------------------
 * Uses GET …/live/public: live and upcoming livestreams the organizer chose to
 * show (public ones in full, members-only ones as a locked preview when
 * allowed; private and group livestreams never), plus public recordings.
 * Renders nothing when there is nothing to show. Works for every
 * organization type.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Film, Lock, PlayCircle, Radio } from "lucide-react";

import { liveApi, type Livestream } from "./liveApi";
import { streamWhen, Thumb } from "./liveParts";
import "./liveCenter.scss";

function useCountdown(target?: string): string | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0 || ms > 7 * 86400e3) return null;
  const d = Math.floor(ms / 86400e3);
  const h = Math.floor((ms % 86400e3) / 3600e3);
  const m = Math.max(1, Math.floor((ms % 3600e3) / 60e3));
  return d ? `in ${d}d ${h}h` : h ? `in ${h}h ${m}m` : `in ${m} min`;
}

export default function LiveServicesSection({ organizationId, title = "Live Services" }: { organizationId: string; title?: string }) {
  const [data, setData] = useState<{ live: Livestream[]; upcoming: Livestream[]; past: Livestream[] } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      liveApi
        .publicListing(organizationId, true, controller.signal)
        .then(setData)
        .catch(() => undefined); // The section simply stays hidden.
    void load();
    const t = window.setInterval(load, 60000);
    return () => {
      controller.abort();
      window.clearInterval(t);
    };
  }, [organizationId]);

  const next = data?.upcoming[0];
  const countdown = useCountdown(next?.scheduledStart);
  if (!data || (!data.live.length && !data.upcoming.length && !data.past.length)) return null;

  const href = (s: Livestream) => `/organizations/${encodeURIComponent(organizationId)}/live/${encodeURIComponent(s.id)}`;

  return (
    <section className="cw-card lvp" id="live" aria-labelledby="lvp-title">
      <div className="cw-head">
        <h2 id="lvp-title">
          <Radio aria-hidden="true" /> {title}
        </h2>
        <Link to={`/organizations/${encodeURIComponent(organizationId)}/live`} className="cw-more">
          View All <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      {data.live.map((s) => (
        <Link key={s.id} to={href(s)} className="lvp-live">
          <Thumb stream={s} className="lvp-live__img" />
          <span className="lvp-live__body">
            <span className="lvp-live__badge">
              <i aria-hidden="true" /> Live Now
            </span>
            <strong>{s.title}</strong>
            {s.description && <small>{s.description}</small>}
          </span>
          <span className="lvp-live__cta">
            {s.visibility === "public" ? <PlayCircle aria-hidden="true" /> : <Lock aria-hidden="true" />}
            {s.visibility === "public" ? "Watch Live" : "Members Only"}
          </span>
        </Link>
      ))}

      {data.upcoming.length > 0 && (
        <ul className="lvp-list">
          {data.upcoming.slice(0, 4).map((s, i) => {
            const when = streamWhen(s);
            return (
              <li key={s.id}>
                <Link to={href(s)} className="lvp-item">
                  <Thumb stream={s} className="lvp-item__img" />
                  <span className="lvp-item__body">
                    <strong>
                      {s.title}
                      {s.visibility !== "public" && (
                        <span className="lvp-lock">
                          <Lock aria-hidden="true" /> Members only
                        </span>
                      )}
                    </strong>
                    <small>
                      <CalendarDays aria-hidden="true" /> {when.date} · {when.time}
                    </small>
                    {i === 0 && countdown && <small className="lvp-count">Starts {countdown}</small>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {data.past.length > 0 && (
        <>
          <h3 className="lvp-sub">
            <Film aria-hidden="true" /> Recent recordings
          </h3>
          <ul className="lvp-list">
            {data.past.slice(0, 3).map((s) => (
              <li key={s.id}>
                <Link to={`${href(s)}?replay=1`} className="lvp-item">
                  <Thumb stream={s} className="lvp-item__img" />
                  <span className="lvp-item__body">
                    <strong>{s.title}</strong>
                    <small>{streamWhen(s).date}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
