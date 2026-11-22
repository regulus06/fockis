/**
 * LivestreamsHub.tsx — an organization's livestreams for viewers.
 * Route: /organizations/:organizationId/live  (and /church/organizations/:id/live)
 * -----------------------------------------------------------------------------
 * Signed in: GET …/live/mine — Live Now, Upcoming, My Invitations, Past
 * Recordings (only what this person may see; locked cards for members-only
 * previews). Visitors: GET …/live/public. Each card opens the watch page,
 * which checks access again before anyone can join.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Film, Hourglass, Inbox, Lock, LogIn, Play, Radio, Users } from "lucide-react";

import { getAuthToken } from "../api/organizationApi";
import { errorMessage } from "../ui/orgUi";
import { DENY_LABEL, liveApi, type Livestream, type MyLivestreams } from "./liveApi";
import { StatusBadge, streamWhen, Thumb, VisibilityBadge } from "./liveParts";
import "./liveCenter.scss";

function actionOf(s: Livestream): { label: string; locked: boolean } {
  if (!s.currentUserHasAccess) {
    if (s.accessReason === "sign_in") return { label: "Sign in to watch", locked: true };
    if (s.accessReason === "invitation_required") return { label: s.settings.allowAccessRequests ? "Request Access" : "Invitation Required", locked: true };
    return { label: s.accessReason ? DENY_LABEL[s.accessReason] : "Restricted", locked: true };
  }
  switch (s.status) {
    case "live":
      return { label: s.visibility === "public" ? "Watch Live" : "Join Live", locked: false };
    case "waiting":
      return { label: "Waiting for Host", locked: false };
    case "completed":
      return { label: "View Recording", locked: false };
    default:
      return { label: "View details", locked: false };
  }
}

function Card({ s, organizationId }: { s: Livestream; organizationId: string }) {
  const when = streamWhen(s);
  const a = actionOf(s);
  return (
    <Link className="lv-hubcard" to={`/organizations/${encodeURIComponent(organizationId)}/live/${encodeURIComponent(s.id)}`}>
      <div className="lv-hubcard__img">
        <Thumb stream={s} />
        <StatusBadge value={s.status} />
        <VisibilityBadge value={s.visibility} />
      </div>
      <div className="lv-hubcard__body">
        <strong>{s.title}</strong>
        <small>
          {when.date} · {when.time}
        </small>
        {s.status === "live" && s.viewerCount > 0 && (
          <small>
            <Users size={13} aria-hidden="true" /> {s.viewerCount.toLocaleString()} watching
          </small>
        )}
        <span className={`lv-hubcard__action${a.locked ? " is-locked" : ""}`}>
          {a.locked ? <Lock aria-hidden="true" /> : s.status === "completed" ? <Film aria-hidden="true" /> : s.status === "waiting" ? <Hourglass aria-hidden="true" /> : <Play aria-hidden="true" />}
          {a.label}
        </span>
      </div>
    </Link>
  );
}

function Section({ title, icon: Icon, items, organizationId, empty }: { title: string; icon: typeof Radio; items: Livestream[]; organizationId: string; empty?: string }) {
  if (!items.length && !empty) return null;
  return (
    <section className="lv-hubsection">
      <h2 className="lv-section-title">
        <Icon aria-hidden="true" /> {title}
      </h2>
      {items.length ? (
        <div className="lv-hub">
          {items.map((s) => (
            <Card key={s.id} s={s} organizationId={organizationId} />
          ))}
        </div>
      ) : (
        <p className="lv-empty">{empty}</p>
      )}
    </section>
  );
}

export default function LivestreamsHub() {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const signedIn = Boolean(getAuthToken());
  const [data, setData] = useState<MyLivestreams | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const controller = new AbortController();
    const load = () =>
      (signedIn
        ? liveApi.mine(organizationId, controller.signal)
        : liveApi.publicListing(organizationId, true, controller.signal).then((r) => ({ isMember: false, live: r.live, upcoming: r.upcoming, past: r.past, invitations: [] }))
      )
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "Livestreams could not be loaded.")));
    void load();
    const t = window.setInterval(load, 60000);
    return () => {
      controller.abort();
      window.clearInterval(t);
    };
  }, [organizationId, signedIn]);

  const [busy, setBusy] = useState<string | null>(null);
  async function respond(invitationId: string, accept: boolean) {
    setBusy(invitationId);
    try {
      if (accept) await liveApi.acceptMine(organizationId, invitationId);
      else await liveApi.decline(organizationId, invitationId);
      setData(await liveApi.mine(organizationId));
    } catch (err) {
      setError(errorMessage(err, "That didn't work. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  const back = `/organizations/${encodeURIComponent(organizationId)}`;
  const pendingInvites = (data?.invitations ?? []).filter((i) => i.status === "pending");
  const acceptedInvites = (data?.invitations ?? []).filter((i) => i.status === "accepted").map((i) => i.livestream);

  return (
    <div className="lv-watch">
      <Link to={back} className="lv-watch__back">
        <ArrowLeft aria-hidden="true" /> Organization page
      </Link>
      <header className="lv-hero">
        <span className="lv-hero__icon" aria-hidden="true">
          <Radio />
        </span>
        <div className="lv-hero__text">
          <h1>Livestreams</h1>
          <p>{data?.isMember ? "Live services and broadcasts for you and your organization." : "Live services and broadcasts."}</p>
        </div>
      </header>

      {!signedIn && (
        <div className="lv-alert">
          Members: <Link to={`/login?redirect=${encodeURIComponent(`/organizations/${organizationId}/live`)}`}>sign in</Link> to see members-only services and your invitations.{" "}
          <LogIn size={14} aria-hidden="true" />
        </div>
      )}

      {error ? (
        <div className="lv-alert lv-alert--error">{error}</div>
      ) : !data ? (
        <div className="lv-hub">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="lv-skeleton" style={{ height: 240 }} />
          ))}
        </div>
      ) : (
        <>
          {pendingInvites.length > 0 && (
            <section className="lv-hubsection">
              <h2 className="lv-section-title">
                <Inbox aria-hidden="true" /> My Invitations
              </h2>
              <ul className="lv-invlist">
                {pendingInvites.map((i) => (
                  <li key={i.id}>
                    <div>
                      <strong>{i.livestream.title}</strong>
                      <small>
                        {streamWhen(i.livestream).date} · {streamWhen(i.livestream).time}
                        {i.expiresAt ? ` · Invitation expires ${new Date(i.expiresAt).toLocaleDateString()}` : ""}
                      </small>
                    </div>
                    <div className="lv-actions">
                      <button type="button" className="lv-btn lv-btn--primary lv-btn--sm" disabled={busy === i.id} onClick={() => respond(i.id, true)}>
                        Accept
                      </button>
                      <button type="button" className="lv-btn lv-btn--ghost lv-btn--sm" disabled={busy === i.id} onClick={() => respond(i.id, false)}>
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Section title="Live Now" icon={Radio} items={data.live} organizationId={organizationId} />
          <Section title="Upcoming Livestreams" icon={CalendarDays} items={[...data.upcoming, ...acceptedInvites.filter((s) => !data.upcoming.some((u) => u.id === s.id) && s.status !== "completed" && s.status !== "live")]} organizationId={organizationId} empty="Nothing scheduled right now." />
          <Section title="Past Recordings" icon={Film} items={data.past} organizationId={organizationId} />
        </>
      )}
    </div>
  );
}
