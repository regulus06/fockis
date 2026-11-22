/**
 * AdminDashboard.tsx — My media organizations (/news/admin) and the newsroom
 * dashboard (/news/admin/:outletId). All figures come from database records.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CalendarClock, Eye, FileCheck2, FilePen, FileText, HandHeart, Inbox, Plus, Radio as RadioIcon, Target, Users, UserCheck, Video } from "lucide-react";

import NewsShell from "../NewsShell";
import { Empty, OutletLogo, Skeleton, Verified, loginPath, signedIn } from "../NewsParts";
import { MEDIA_TYPE_LABELS, compact, fmtDate, money, newsApi, newsError, timeAgo, type Dashboard, type MyOutlet } from "../newsApi";
import { PageTitle, useAdmin } from "./AdminShell";

export function MyOutletsPage() {
  const [items, setItems] = useState<MyOutlet[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!signedIn()) return;
    newsApi
      .mine()
      .then((r) => setItems(r.items))
      .catch((err) => setError(newsError(err)));
  }, []);
  if (!signedIn())
    return (
      <NewsShell compactHeader>
        <Empty title="Sign in to manage your media" action={<Link to={loginPath()} className="nm-btn nm-btn--primary">Sign in</Link>} />
      </NewsShell>
    );
  return (
    <NewsShell compactHeader>
      <header className="nm-pagehead nm-pagehead--split">
        <div>
          <h1>My Media Organizations</h1>
          <p>Newsrooms you own or work for.</p>
        </div>
        <Link to="/news/create" className="nm-btn nm-btn--red">
          <Plus /> Create a Media
        </Link>
      </header>
      {error && <p className="nm-form-error">{error}</p>}
      {!items && !error && <Skeleton h={160} />}
      {items && items.length === 0 && <Empty title="You're not part of a newsroom yet" text="Create a media organization, or ask a newsroom administrator to add you to their team." action={<Link to="/news/create" className="nm-btn nm-btn--primary">Create a Media</Link>} />}
      <div className="nm-grid3">
        {items?.map((o) => (
          <Link key={o.id} to={`/news/admin/${o.id}`} className="nm-card nma-pick">
            <OutletLogo outlet={o} size={56} />
            <span>
              <b>
                {o.name} {o.verified && <Verified size={15} />}
              </b>
              <small>
                {MEDIA_TYPE_LABELS[o.mediaType]} · {o.roleLabel}
              </small>
              <small>{compact(o.followerCount)} followers</small>
            </span>
            <ArrowRight />
          </Link>
        ))}
      </div>
    </NewsShell>
  );
}

export function Stat({ icon: Icon, label, value, sub, to, tone = "blue" }: { icon: typeof FileText; label: string; value: string | number; sub?: string; to?: string; tone?: "blue" | "red" | "green" | "amber" | "navy" }) {
  const body = (
    <>
      <span className={`nma-stat__icon nma-stat__icon--${tone}`}>
        <Icon />
      </span>
      <span>
        <small>{label}</small>
        <b>{value}</b>
        {sub && <em>{sub}</em>}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className="nma-stat">
      {body}
    </Link>
  ) : (
    <div className="nma-stat">{body}</div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  outlet_created: "Media created",
  article_created: "Article created",
  article_submit: "Submitted for review",
  article_publish: "Published",
  article_schedule: "Scheduled",
  article_approve: "Approved",
  article_request_changes: "Changes requested",
  article_reject: "Rejected",
  article_archive: "Archived",
  donation_received: "Donation received",
  request_updated: "Request updated",
  member_added: "Team member added",
  live_updated: "Live status changed",
  settings_updated: "Settings updated",
};

export default function AdminDashboard() {
  const { outlet, can } = useAdmin();
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    newsApi
      .dashboard(outlet.id)
      .then(setD)
      .catch((err) => setError(newsError(err)));
  }, [outlet.id]);
  const base = `/news/admin/${outlet.id}`;
  const max = Math.max(1, ...(d?.viewsByDay.map((x) => x.views) ?? [1]));
  return (
    <>
      <PageTitle
        title="Dashboard"
        sub={`Welcome back to the ${outlet.name} newsroom.`}
        actions={
          can("write_articles") && (
            <Link to={`${base}/articles/new`} className="nm-btn nm-btn--red">
              <FilePen /> Write News
            </Link>
          )
        }
      />
      {error && <p className="nm-form-error">{error}</p>}
      {!d && !error && <Skeleton h={300} />}
      {d && (
        <>
          <div className="nma-stats">
            <Stat icon={FileText} label="Total articles" value={compact(d.stats.totalArticles)} to={`${base}/articles`} />
            <Stat icon={FileCheck2} label="Published" value={compact(d.stats.published)} tone="green" to={`${base}/articles?status=published`} />
            <Stat icon={FilePen} label="Drafts" value={compact(d.stats.drafts)} tone="navy" to={`${base}/articles?status=draft`} />
            <Stat icon={UserCheck} label="Pending reviews" value={compact(d.stats.pendingReview)} tone="amber" to={`${base}/review`} />
            <Stat icon={CalendarClock} label="Scheduled" value={compact(d.stats.scheduled)} to={`${base}/scheduled`} />
            <Stat icon={Eye} label="Total views" value={compact(d.stats.totalViews)} />
            <Stat icon={Users} label="Unique visitors (30 days)" value={compact(d.stats.uniqueVisitors30)} />
            <Stat icon={Users} label="Media followers" value={compact(d.stats.followers)} tone="green" to={`${base}/subscribers`} />
            {d.stats.donations && <Stat icon={HandHeart} label="Donations received" value={d.stats.donations.length ? d.stats.donations.map((x) => money(x.total, x.currency)).join(" · ") : money(0)} sub={`${d.stats.donations.reduce((a, x) => a + x.count, 0)} gifts`} tone="red" to={`${base}/donations`} />}
            <Stat icon={Target} label="Active campaigns" value={d.stats.activeCampaigns} tone="red" to={`${base}/donations`} />
            {d.stats.pendingRequests !== null && <Stat icon={Inbox} label="Pending requests" value={d.stats.pendingRequests} tone="amber" to={`${base}/requests`} />}
            <Stat icon={Video} label="Video views" value={compact(d.stats.videoViews)} to={`${base}/videos`} />
            <Stat icon={RadioIcon} label="Live now" value={d.stats.liveNow ? "On air" : "Off air"} tone={d.stats.liveNow ? "red" : "navy"} to={`${base}/live-tv`} />
          </div>
          <div className="nma-two">
            <section className="nm-card">
              <h2 className="nm-card__title">
                <BarChart3 /> Article views — last 14 days
              </h2>
              {d.viewsByDay.every((x) => x.views === 0) ? (
                <p className="nm-muted">No views recorded yet. Views are counted once per reader per day.</p>
              ) : (
                <div className="nma-bars" role="img" aria-label="Views per day">
                  {d.viewsByDay.map((x) => (
                    <span key={x.day} title={`${fmtDate(x.day)}: ${x.views} views`}>
                      <i style={{ height: `${Math.max(2, Math.round((x.views / max) * 100))}%` }} />
                      <small>{new Date(`${x.day}T00:00:00`).getDate()}</small>
                    </span>
                  ))}
                </div>
              )}
              <p className="nm-muted nm-small">Live audience and subscription revenue are not tracked yet.</p>
            </section>
            <section className="nm-card">
              <h2 className="nm-card__title">Recent activity</h2>
              {d.recent.length === 0 && <p className="nm-muted">No activity yet.</p>}
              <ul className="nma-activity">
                {d.recent.map((r) => (
                  <li key={r.id}>
                    <b>{ACTION_LABELS[r.action] ?? r.action.replace(/_/g, " ")}</b>
                    <span>{r.detail}</span>
                    <small>
                      {r.actorName} · {timeAgo(r.at)}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}
