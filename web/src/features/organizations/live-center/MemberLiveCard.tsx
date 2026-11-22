/**
 * MemberLiveCard.tsx — Member Portal: live now / next livestream / invitations.
 * Hidden when there is nothing to show. Data: GET …/live/mine (only what this
 * member may see). "Join Live Service" opens the watch page, which asks the
 * server again before anyone gets the stream or the meeting link.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Inbox, Lock, PlayCircle, Radio } from "lucide-react";

import { liveApi, type MyLivestreams } from "./liveApi";
import { streamWhen, Thumb } from "./liveParts";
import "./liveCenter.scss";

export default function MemberLiveCard({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<MyLivestreams | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      liveApi
        .mine(organizationId, controller.signal)
        .then(setData)
        .catch(() => undefined);
    void load();
    const t = window.setInterval(load, 60000);
    return () => {
      controller.abort();
      window.clearInterval(t);
    };
  }, [organizationId]);

  if (!data) return null;
  const live = data.live[0];
  const next = data.upcoming[0];
  const pending = data.invitations.filter((i) => i.status === "pending").length;
  if (!live && !next && !pending) return null;
  const hub = `/organizations/${encodeURIComponent(organizationId)}/live`;
  const s = live ?? next!;
  const when = s ? streamWhen(s) : null;

  return (
    <section className="fo-card lvm" aria-labelledby="lvm-title">
      <div className="fo-card__head">
        <h2 id="lvm-title">
          <Radio size={18} aria-hidden="true" /> My Livestreams
        </h2>
        <Link to={hub} className="fo-btn fo-btn--ghost fo-btn--sm">
          All livestreams
        </Link>
      </div>
      {s && when && (
        <Link to={`${hub}/${encodeURIComponent(s.id)}`} className={`lvm-item${live ? " is-live" : ""}`}>
          <Thumb stream={s} className="lvm-item__img" />
          <span className="lvm-item__body">
            {live ? <span className="lvp-live__badge"><i aria-hidden="true" /> Live Now</span> : <small><CalendarDays size={13} aria-hidden="true" /> Next livestream</small>}
            <strong>{s.title}</strong>
            <small>
              {when.date} · {when.time}
            </small>
          </span>
          <span className="lvm-item__cta">
            {!s.currentUserHasAccess ? <Lock aria-hidden="true" /> : <PlayCircle aria-hidden="true" />}
            {!s.currentUserHasAccess ? "Restricted" : live ? "Join Live Service" : "Details"}
          </span>
        </Link>
      )}
      {pending > 0 && (
        <Link to={hub} className="lvm-invites">
          <Inbox size={16} aria-hidden="true" /> {pending} livestream invitation{pending === 1 ? "" : "s"} waiting for your answer
        </Link>
      )}
    </section>
  );
}
