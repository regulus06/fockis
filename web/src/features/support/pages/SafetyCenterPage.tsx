import { Link } from "react-router-dom";
import { ArrowRight, Ban, Baby, ChevronRight, Flag, Gavel, MessageCircleMore, ShieldAlert, ShieldCheck, TriangleAlert, Users } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { HelpEmpty, HelpError, HelpLoading } from "../components/HelpStates";
import { useHelpQuery } from "../hooks/useHelpQuery";
import { useHelpUser } from "../hooks/useHelpUser";
import { getMyDecisions, getMyReports } from "../../reports/services/reportsApi";
import { formatDateTime } from "../utils/helpFormat";

const ACTIONS = [
  {
    icon: Flag,
    title: "Report a post or account",
    text: "Open the menu on the post or profile and choose Report. The person isn't told who reported them.",
    to: "/help/articles/report-post",
    cta: "How reporting works",
  },
  {
    icon: Ban,
    title: "Block someone",
    text: "Stop someone from contacting you. Manage everyone you've blocked in one place.",
    to: "/friends/blocked",
    cta: "Blocked people",
  },
  {
    icon: TriangleAlert,
    title: "Scams and fraud",
    text: "Never pay or share codes outside Fockis. Report the listing or account, then tell Support what happened.",
    to: "/help/contact?topic=privacy",
    cta: "Tell Support",
  },
  {
    icon: ShieldAlert,
    title: "Hacked account",
    text: "Change your password right away and check your email address is still yours.",
    to: "/help/articles/hacked-account",
    cta: "Secure your account",
  },
];

const POLICIES = [
  { icon: Users, label: "Community Guidelines", to: "/community-guidelines" },
  { icon: Baby, label: "Child Safety", to: "/child-safety" },
  { icon: ShieldCheck, label: "Privacy Policy", to: "/privacy" },
  { icon: Gavel, label: "Terms of Service", to: "/terms" },
];

function MyReports() {
  const { user, status } = useHelpUser();
  const reports = useHelpQuery(() => getMyReports(1), [user?.username], { enabled: Boolean(user) });
  const decisions = useHelpQuery(() => getMyDecisions(), [user?.username], { enabled: Boolean(user) });

  if (status === "loading") return <HelpLoading label="Loading…" />;
  if (!user) {
    return (
      <p style={{ color: "var(--help-text-2)" }}>
        <Link to="/login" className="fk-help-link">Sign in</Link> to see your reports and any moderation decisions.
      </p>
    );
  }
  if (reports.loading) return <HelpLoading label="Loading your reports…" />;
  if (reports.error) return <HelpError message={reports.error} onRetry={reports.refetch} />;

  const items = reports.data?.items ?? [];
  const openDecisions = (decisions.data?.items ?? []).filter((d) => !d.reversed).length;

  return (
    <>
      {openDecisions > 0 && (
        <p className="fk-help-notice fk-help-notice--error" style={{ marginBottom: 12 }}>
          <ShieldAlert size={16} />
          <span>
            You have {openDecisions} moderation decision{openDecisions === 1 ? "" : "s"} on your account.{" "}
            <Link to="/moderation" className="fk-help-link">Review or appeal</Link>
          </span>
        </p>
      )}
      {items.length === 0 ? (
        <HelpEmpty icon={<Flag size={22} />} title="No reports yet" text="Reports you send about posts or accounts appear here." />
      ) : (
        <ul className="fk-help-rows">
          {items.slice(0, 5).map((r) => (
            <li key={r.id} className="fk-help-row">
              <span className="fk-help-row__icon"><Flag size={16} /></span>
              <span className="fk-help-row__main">
                <span className="fk-help-row__title" style={{ fontSize: 14.5 }}>{r.reasonLabel}</span>
                <span className="fk-help-row__sub">{r.targetLabel} · {formatDateTime(r.createdAt)}</span>
              </span>
              <span className={`fk-help-pill ${r.status === "reviewed" ? "fk-help-pill--green" : "fk-help-pill--blue"}`}>
                {r.status === "reviewed" ? "Reviewed" : "Received"}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/moderation" className="fk-help-link" style={{ marginTop: 10 }}>
        All reports &amp; decisions <ArrowRight size={15} />
      </Link>
    </>
  );
}

/** /help/safety — reporting center built on the existing reports & moderation features. */
export default function SafetyCenterPage() {
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title="Safety & Security"
          description="Report abuse, scams, or policy violations, and keep your account safe."
          icon={<ShieldCheck size={30} />}
          tone="amber"
        />

        <p className="fk-help-notice fk-help-notice--error">
          <TriangleAlert size={16} />
          <span>If someone is in immediate danger, contact your local emergency services first.</span>
        </p>

        <div className="fk-help-cards">
          {ACTIONS.map((a) => (
            <Link key={a.title} to={a.to} className="fk-help-card-link" style={{ alignItems: "flex-start" }}>
              <span className="fk-help-icon fk-help-icon--amber fk-help-icon--lg"><a.icon size={26} /></span>
              <span className="fk-help-card-link__text">
                <strong style={{ fontSize: 17 }}>{a.title}</strong>
                <span>{a.text}</span>
                <span className="fk-help-link" style={{ marginTop: 8 }}>{a.cta} <ArrowRight size={14} /></span>
              </span>
            </Link>
          ))}
        </div>

        <div className="fk-help-two">
          <div className="fk-help-card">
            <h2 className="fk-help-section-title">My reports</h2>
            <MyReports />
          </div>
          <div className="fk-help-stack">
            <div className="fk-help-card">
              <h2 className="fk-help-section-title">Policies</h2>
              <ul className="fk-help-rows">
                {POLICIES.map((p) => (
                  <li key={p.to}>
                    <Link to={p.to} className="fk-help-row">
                      <span className="fk-help-row__icon"><p.icon size={16} /></span>
                      <span className="fk-help-row__main"><span className="fk-help-row__title" style={{ fontSize: 14.5 }}>{p.label}</span></span>
                      <ChevronRight className="fk-help-chevron" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <Link to="/help/contact?topic=privacy" className="fk-help-btn fk-help-btn--primary fk-help-btn--block">
              <MessageCircleMore size={16} /> Contact the safety team
            </Link>
          </div>
        </div>
      </div>
    </HelpShell>
  );
}
