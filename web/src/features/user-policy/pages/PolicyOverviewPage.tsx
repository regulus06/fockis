import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  Clock3,
  Database,
  Download,
  FileText,
  Flag,
  Lock,
  Scale,
  ShieldCheck,
  SquareCheckBig,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { HelpError, HelpLoading, SignedInOnly } from "../../support/components/HelpStates";
import { policyCenterApi, type Activity } from "../api/policyCenterApi";
import PolicyShell from "../components/PolicyShell";
import { Card, policyIcon } from "../components/PolicyUi";
import { fmtDate, fmtTime, useLoad } from "../components/policyUtils";

const ACTIONS: { to: string; title: string; text: string; icon: LucideIcon; tone: string }[] = [
  { to: "/settings/policy/guidelines", title: "Read Policies", text: "View and understand Fockis policies, terms and guidelines.", icon: FileText, tone: "blue" },
  { to: "/settings/policy/privacy", title: "Privacy Controls", text: "Manage who can see your information and how your content is used.", icon: ShieldCheck, tone: "purple" },
  { to: "/settings/policy/data", title: "My Data", text: "Download, view, correct or request deletion of your personal information.", icon: Database, tone: "amber" },
  { to: "/settings/policy/consent", title: "Manage Consent", text: "Control cookies, marketing emails and optional data preferences.", icon: SquareCheckBig, tone: "violet" },
  { to: "/settings/policy/safety", title: "Safety Center", text: "Report content, manage blocked users and keep your account secure.", icon: Flag, tone: "red" },
  { to: "/settings/policy/appeals", title: "Appeals", text: "Review moderation decisions, submit an appeal, and track the status.", icon: Scale, tone: "sky" },
];

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  privacy_updated: CircleCheck,
  policy_accepted: FileText,
  data_export_requested: Download,
  data_export_ready: Download,
  correction_requested: UserRound,
  consent_changed: BadgeCheck,
  appeal_submitted: Scale,
  security_check: ShieldCheck,
  account_muted: Lock,
};

export function ActivityList({ items, empty = "No activity yet." }: { items: Activity[]; empty?: string }) {
  if (!items.length) return <p className="fk-pol-muted fk-pol-pad">{empty}</p>;
  return (
    <ul className="fk-pol-activity">
      {items.map((a) => {
        const Icon = ACTIVITY_ICON[a.type] ?? Clock3;
        return (
          <li key={a.id}>
            <span className={`fk-pol-activity__icon${a.type === "privacy_updated" ? " is-done" : ""}`}>
              <Icon size={20} aria-hidden />
            </span>
            <div className="fk-pol-activity__text">
              <strong>{a.title}</strong>
              {a.description && <span>{a.description}</span>}
            </div>
            <time dateTime={a.at}>
              {fmtDate(a.at)} <i>•</i> {fmtTime(a.at)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

function OverviewContent() {
  const overview = useLoad(() => policyCenterApi.overview());
  const policies = useLoad(() => policyCenterApi.myPolicies());

  if (overview.loading && !overview.data) return <div className="fk-pol-card"><HelpLoading label="Loading your overview…" /></div>;
  if (overview.error && !overview.data) return <div className="fk-pol-card"><HelpError message={overview.error} onRetry={() => void overview.reload()} /></div>;
  const o = overview.data!;
  const allAccepted = o.policies.required > 0 && o.policies.accepted === o.policies.required;
  const list = policies.data ?? [];

  return (
    <>
      {o.policies.actionNeeded.length > 0 && (
        <div className="fk-pol-alert" role="status">
          <CircleAlert size={20} aria-hidden />
          <span>
            {o.policies.actionNeeded.length === 1 ? `${o.policies.actionNeeded[0].title} was updated.` : `${o.policies.actionNeeded.length} policies were updated.`} Please review and accept the latest version.
          </span>
          <Link to="/settings/policy/history" className="fk-pol-btn fk-pol-btn--primary fk-pol-btn--sm">
            Review updates
          </Link>
        </div>
      )}

      <div className="fk-pol-stats">
        <div className="fk-pol-stat">
          <span className="fk-pol-stat__icon fk-pol-tone--blue"><ShieldCheck size={28} aria-hidden /></span>
          <div>
            <strong>Policies Accepted</strong>
            <span className={allAccepted ? "fk-pol-ok" : "fk-pol-warn"}>
              {o.policies.accepted} of {o.policies.required}
              {allAccepted ? <CircleCheck size={18} className="fk-pol-ok-badge" aria-label="All accepted" /> : null}
            </span>
          </div>
        </div>
        <div className="fk-pol-stat">
          <span className="fk-pol-stat__icon fk-pol-tone--blue"><UserRound size={28} aria-hidden /></span>
          <div>
            <strong>Privacy Status</strong>
            {o.privacy.configured ? <span className="fk-pol-chip fk-pol-chip--green">Configured</span> : <span className="fk-pol-chip fk-pol-chip--amber">Not set up</span>}
          </div>
        </div>
        <div className="fk-pol-stat">
          <span className="fk-pol-stat__icon fk-pol-tone--blue"><Database size={28} aria-hidden /></span>
          <div>
            <strong>Data Requests</strong>
            <span>{o.dataRequests.active ? `${o.dataRequests.active} active request${o.dataRequests.active === 1 ? "" : "s"}` : "No active requests"}</span>
          </div>
        </div>
        <div className="fk-pol-stat">
          <span className="fk-pol-stat__icon fk-pol-tone--purple"><Scale size={28} aria-hidden /></span>
          <div>
            <strong>Appeals</strong>
            <span>{o.appeals.open} open appeal{o.appeals.open === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <div className="fk-pol-actions">
        {ACTIONS.map(({ to, title, text, icon: Icon, tone }) => (
          <Link key={to} to={to} className={`fk-pol-action fk-pol-action--${tone}`}>
            <span className={`fk-pol-action__icon fk-pol-tone--${tone}`}><Icon size={34} strokeWidth={1.9} aria-hidden /></span>
            <span className="fk-pol-action__text">
              <strong>{title}</strong>
              <span>{text}</span>
            </span>
            <ArrowRight className="fk-pol-action__arrow" size={20} aria-hidden />
          </Link>
        ))}
      </div>

      <div className="fk-pol-split">
        <Card
          title="Fockis Policies & Guidelines"
          icon={<FileText size={24} />}
          action={
            <Link to="/settings/policy/guidelines" className="fk-pol-link">
              View All Policies <ArrowRight size={17} aria-hidden />
            </Link>
          }
        >
          {policies.loading && !policies.data ? (
            <HelpLoading label="Loading policies…" />
          ) : policies.error ? (
            <HelpError message={policies.error} onRetry={() => void policies.reload()} />
          ) : !list.length ? (
            <p className="fk-pol-muted fk-pol-pad">No policies have been published yet.</p>
          ) : (
            <ul className="fk-pol-plist">
              {list.slice(0, 5).map((p) => {
                const Icon = policyIcon(p.slug, p.category);
                return (
                  <li key={p.id}>
                    <span className="fk-pol-plist__icon"><Icon size={20} aria-hidden /></span>
                    <div className="fk-pol-plist__text">
                      <strong>{p.title}</strong>
                      <span>{p.description}</span>
                    </div>
                    <span className="fk-pol-version">v{p.version}</span>
                    <Link to={`/settings/policy/guidelines/${p.slug}`} className="fk-pol-btn fk-pol-btn--outline fk-pol-btn--sm" aria-label={`Read ${p.title}`}>
                      Read
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Recent Activity"
          icon={<Clock3 size={24} />}
          action={
            <Link to="/settings/policy/history#activity" className="fk-pol-link">
              View All <ArrowRight size={17} aria-hidden />
            </Link>
          }
        >
          <ActivityList items={o.recent.slice(0, 4)} empty="Changes you make here — accepting a policy, updating privacy settings or requesting your data — will show up here." />
        </Card>
      </div>
    </>
  );
}

export default function PolicyOverviewPage() {
  return (
    <PolicyShell>
      <SignedInOnly what="see your policies, privacy settings and data">{() => <OverviewContent />}</SignedInOnly>
    </PolicyShell>
  );
}
