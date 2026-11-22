/**
 * LiveWatchPage.tsx — one organization livestream, for viewers.
 * Route: /organizations/:organizationId/live/:liveId   (?invite=<token>, ?replay=1)
 * -----------------------------------------------------------------------------
 * Shows only what the server returns for this viewer. The Join button asks the
 * server (POST …/join), which checks access and only then returns where to
 * watch: the Fockis Live viewer (which checks again before issuing a video
 * token) or the meeting link. Invitation links are accepted for the signed-in
 * account. Opening this page does not count as attendance; joining does.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock, Copy, Film, Hourglass, Lock, LogIn, MapPin, Play, Radio, Send, Users, Video } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { getAuthToken } from "../api/organizationApi";
import { FOCKIS_API_URL } from "../../../config/fockisConfig";
import { errorMessage } from "../ui/orgUi";
import { DENY_LABEL, liveApi, watchUrl, type JoinResult, type Livestream } from "./liveApi";
import { StatusBadge, streamWhen, VisibilityBadge } from "./liveParts";
import "./liveCenter.scss";

const HEARTBEAT_MS = 60_000;

function useCountdown(target: string | null): string | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400e3);
  const h = Math.floor((ms % 86400e3) / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  const s = Math.floor((ms % 60e3) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export default function LiveWatchPage() {
  const { organizationId = "", liveId = "" } = useParams<{ organizationId: string; liveId: string }>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [stream, setStream] = useState<Livestream | null>(null);
  const [loadError, setLoadError] = useState<{ text: string; notFound: boolean } | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<JoinResult | null>(null);
  const [replayUrl, setReplayUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const viewRef = useRef<string | null>(null);
  const inviteToken = params.get("invite");
  const wantReplay = params.get("replay") === "1";
  const here = `/organizations/${encodeURIComponent(organizationId)}/live/${encodeURIComponent(liveId)}${inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ""}`;

  const load = useCallback(() => setTick((t) => t + 1), []);

  // Accept an invitation link first (signed in only).
  useEffect(() => {
    if (!inviteToken || !organizationId || !liveId) return;
    let cancelled = false;
    liveApi
      .accept(organizationId, liveId, inviteToken)
      .then(() => {
        if (cancelled) return;
        setMessage({ tone: "ok", text: "Invitation accepted. You can join when the livestream starts." });
        params.delete("invite");
        setParams(params, { replace: true });
        load();
      })
      .catch((err) => {
        if (cancelled) return;
        const text = errorMessage(err, "This invitation could not be accepted.");
        // Signed out: keep the token in the URL so it is accepted after signing in.
        setMessage({ tone: /sign in/i.test(text) || /session is missing/i.test(text) ? "info" : "error", text: /session is missing/i.test(text) ? "Sign in to accept this invitation." : text });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, liveId, inviteToken]);

  useEffect(() => {
    if (!organizationId || !liveId) return;
    const controller = new AbortController();
    liveApi
      .get(organizationId, liveId, controller.signal)
      .then((s) => {
        setStream(s);
        setLoadError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const text = errorMessage(err, "This livestream could not be loaded.");
        setLoadError({ text, notFound: /not found/i.test(text) });
      });
    return () => controller.abort();
  }, [organizationId, liveId, tick]);

  // Refresh while waiting for the host / during the broadcast.
  useEffect(() => {
    if (!stream || !["scheduled", "waiting", "live"].includes(stream.status)) return;
    const t = window.setInterval(load, 30000);
    return () => window.clearInterval(t);
  }, [stream, load]);

  // Viewing session heartbeat (meetings and replays watched on this page).
  useEffect(() => {
    const viewId = joined?.viewId;
    if (!viewId) return;
    viewRef.current = viewId;
    const t = window.setInterval(() => void liveApi.heartbeat(organizationId, liveId, viewId).catch(() => undefined), HEARTBEAT_MS);
    const leave = () => {
      if (viewRef.current) void liveApi.leave(organizationId, liveId, viewRef.current).catch(() => undefined);
      viewRef.current = null;
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [joined?.viewId, organizationId, liveId]);

  // Replay requested from the link (?replay=1).
  useEffect(() => {
    if (wantReplay && stream?.status === "completed" && stream.currentUserHasAccess && !replayUrl && !busy) void watchReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantReplay, stream?.status]);

  async function join() {
    if (!stream || busy) return;
    setBusy(true);
    setMessage(null);
    // Open the tab now for meetings (popup blockers), point it at the link once allowed.
    const win = stream.sourceType === "meeting" ? window.open("", "_blank") : null;
    try {
      const res = await liveApi.join(organizationId, liveId);
      setJoined(res);
      if (res.kind === "meeting" && res.url) {
        if (win) {
          win.opener = null;
          win.location.href = res.url;
        } else window.location.assign(res.url);
        setMessage({
          tone: "info",
          text: res.waitingRoom ? "The meeting opened in a new tab. The host admits you from the waiting room." : "The meeting opened in a new tab. Keep this page open to record your attendance.",
        });
      } else if (res.kind === "fockis_live" && res.liveStreamId) {
        navigate(`/live/view/${encodeURIComponent(res.liveStreamId)}`);
      }
    } catch (err) {
      win?.close();
      setMessage({ tone: "error", text: errorMessage(err, "You can't join right now.") });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function watchReplay() {
    if (!stream) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await liveApi.join(organizationId, liveId, true);
      setJoined(res);
      if (res.liveStreamId) {
        const rec = await churchGetRecording(res.liveStreamId);
        if (rec.playbackUrl) setReplayUrl(rec.playbackUrl);
        else setMessage({ tone: "info", text: rec.message || "The recording is not ready yet." });
      }
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, "The recording can't be opened.") });
    } finally {
      setBusy(false);
    }
  }

  async function requestAccess() {
    setBusy(true);
    try {
      const res = await liveApi.requestAccess(organizationId, liveId);
      setMessage({ tone: "ok", text: res.status === "accepted" ? "You already have access." : "Request sent. The organizer will review it." });
      load();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, "The request could not be sent.") });
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = watchUrl(organizationId, liveId);
    try {
      if (navigator.share) await navigator.share({ title: stream?.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage({ tone: "ok", text: "Link copied. It only works for people allowed to watch." });
      }
    } catch {
      /* cancelled */
    }
  }

  const opensAt = stream ? new Date(new Date(stream.scheduledStart).getTime() - (stream.settings.earlyJoinMinutes ?? 15) * 60000).toISOString() : null;
  const countdown = useCountdown(stream && stream.status === "scheduled" ? stream.scheduledStart : null);
  const backTo = `/organizations/${encodeURIComponent(organizationId)}/live`;

  if (loadError) {
    return (
      <div className="lv-watch">
        <Link to={backTo} className="lv-watch__back">
          <ArrowLeft aria-hidden="true" /> Livestreams
        </Link>
        <div className="lv-card lv-empty lv-empty--big">
          <Lock aria-hidden="true" />
          <strong>{loadError.notFound ? "This livestream isn't available" : "This livestream couldn't load"}</strong>
          <span>{loadError.notFound ? "It may be private, finished or removed. If you were invited, open the invitation link while signed in." : loadError.text}</span>
          {loadError.notFound && (
            <Link className="lv-btn lv-btn--primary lv-btn--sm" to={`/login?redirect=${encodeURIComponent(here)}`}>
              <LogIn aria-hidden="true" /> Sign in
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="lv-watch">
        <div className="lv-skeleton" style={{ height: 320, borderRadius: 18 }} />
        <div className="lv-skeleton" style={{ height: 120 }} />
      </div>
    );
  }

  const when = streamWhen(stream);
  const bg = stream.coverUrl || stream.posterUrl;
  const allowed = stream.currentUserHasAccess;
  const reason = stream.accessReason;

  let cta: React.ReactNode = null;
  if (!allowed) {
    if (reason === "sign_in") {
      cta = (
        <Link className="lv-btn lv-btn--primary" to={`/login?redirect=${encodeURIComponent(here)}`}>
          <LogIn aria-hidden="true" /> Sign in to watch
        </Link>
      );
    } else if (stream.accessRequest?.status === "pending") {
      cta = (
        <span className="lv-stage__note">
          <Hourglass aria-hidden="true" /> Access requested — waiting for the organizer
        </span>
      );
    } else if (stream.settings.allowAccessRequests && stream.signedIn) {
      cta = (
        <>
          <span className="lv-stage__note">
            <Lock aria-hidden="true" /> {reason ? DENY_LABEL[reason] : "Restricted"}
          </span>
          <button type="button" className="lv-btn lv-btn--primary" disabled={busy} onClick={requestAccess}>
            <Send aria-hidden="true" /> Request Access
          </button>
        </>
      );
    } else {
      cta = (
        <span className="lv-stage__note">
          <Lock aria-hidden="true" /> {reason ? DENY_LABEL[reason] : "Restricted"}
        </span>
      );
    }
  } else if (stream.status === "live") {
    cta = (
      <button type="button" className="lv-btn lv-btn--primary" disabled={busy} onClick={join}>
        <Play aria-hidden="true" /> {busy ? "Joining…" : stream.isMember ? "Join Live Service" : "Watch Live"}
      </button>
    );
  } else if (stream.status === "waiting" || stream.status === "scheduled") {
    const meetingOpen = stream.sourceType === "meeting" && opensAt && Date.now() >= new Date(opensAt).getTime();
    cta = meetingOpen ? (
      <button type="button" className="lv-btn lv-btn--primary" disabled={busy} onClick={join}>
        <Video aria-hidden="true" /> {busy ? "Opening…" : "Join"}
      </button>
    ) : (
      <span className="lv-stage__note">
        <Hourglass aria-hidden="true" /> {stream.status === "waiting" ? "Waiting for Host" : countdown ? `Starts in ${countdown}` : "Starting soon"}
      </span>
    );
  } else if (stream.status === "completed") {
    cta =
      stream.settings.allowReplay && stream.sourceType === "fockis_live" ? (
        <button type="button" className="lv-btn lv-btn--primary" disabled={busy} onClick={watchReplay}>
          <Film aria-hidden="true" /> {busy ? "Opening…" : "View Recording"}
        </button>
      ) : (
        <span className="lv-stage__note">This livestream has ended.</span>
      );
  } else if (stream.status === "cancelled") {
    cta = <span className="lv-stage__note">This livestream was cancelled.</span>;
  }

  return (
    <div className="lv-watch">
      <Link to={backTo} className="lv-watch__back">
        <ArrowLeft aria-hidden="true" /> All livestreams
      </Link>

      {message && <div className={`lv-alert${message.tone === "error" ? " lv-alert--error" : message.tone === "ok" ? " lv-alert--ok" : ""}`}>{message.text}</div>}

      {replayUrl ? (
        <video className="lv-video" src={replayUrl} controls autoPlay playsInline onEnded={() => joined?.viewId && void liveApi.leave(organizationId, liveId, joined.viewId)} />
      ) : (
        <section className="lv-stage">
          {bg && <div className="lv-stage__bg" style={{ backgroundImage: `url("${(mediaUrl(bg) ?? "").replace(/"/g, "%22")}")` }} aria-hidden="true" />}
          <div className="lv-stage__body">
            <div className="lv-stage__badges">
              <StatusBadge value={stream.status} />
              <VisibilityBadge value={stream.visibility} />
              {stream.status === "live" && stream.viewerCount > 0 && (
                <span className="lv-vis lv-vis--public">
                  <Users aria-hidden="true" /> {stream.viewerCount.toLocaleString()} watching
                </span>
              )}
            </div>
            <h1>{stream.title}</h1>
            {stream.description && <p>{stream.description}</p>}
            <div className="lv-stage__cta">
              {cta}
              {allowed && stream.settings.allowSharing && stream.status !== "cancelled" && (
                <button type="button" className="lv-btn lv-btn--ghost" onClick={share}>
                  <Copy aria-hidden="true" /> Share
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="lv-card">
        <div className="lv-when" style={{ gap: 8 }}>
          <span>
            <CalendarDays aria-hidden="true" /> {when.date}
          </span>
          <span>
            <Clock aria-hidden="true" /> {when.time}
          </span>
          {stream.location && (
            <span>
              <MapPin aria-hidden="true" /> {stream.location}
            </span>
          )}
          <span>
            {stream.sourceType === "meeting" ? <Video aria-hidden="true" /> : <Radio aria-hidden="true" />} {stream.sourceType === "meeting" ? "Online via Fockis Meeting" : "Fockis Live broadcast"}
          </span>
        </div>
        {!allowed && reason === "invitation_required" && (
          <p className="lv-muted" style={{ marginTop: 12 }}>
            This livestream is by invitation. If you received an invitation, open its link while signed in to the invited account.
          </p>
        )}
        {allowed && stream.sourceType === "fockis_live" && stream.status !== "completed" && (
          <p className="lv-muted" style={{ marginTop: 12 }}>
            Fockis Live video needs a Fockis account. Your attendance is recorded while you are in the live room.
          </p>
        )}
      </section>
    </div>
  );
}

/** Signed playback URL of a finished Fockis Live recording (checked by the Fockis Live module). */
async function churchGetRecording(liveStreamId: string): Promise<{ playbackUrl: string; message: string }> {
  const token = getAuthToken();
  const base = String(import.meta.env.VITE_API_URL || FOCKIS_API_URL).replace(/\/+$/, "");
  const res = await fetch(`${base}/live/${encodeURIComponent(liveStreamId)}/org-replay`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await res.json().catch(() => ({}))) as { playbackUrl?: string; message?: string };
  if (!res.ok) throw new Error(body.message || (res.status === 401 ? "Sign in to watch the recording." : "The recording can't be opened."));
  return { playbackUrl: body.playbackUrl ?? "", message: body.message ?? "" };
}
