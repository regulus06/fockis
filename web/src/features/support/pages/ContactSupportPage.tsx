import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, Bug, Lightbulb, MessageCircleMore, MessageSquare } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { SignedInOnly } from "../components/HelpStates";
import TicketForm from "../components/TicketForm";
import { useHelpContent } from "../hooks/useHelpContent";

function SideLinks({ topic }: { topic: string }) {
  const { articles } = useHelpContent();
  const suggestions = articles.filter((a) => !topic || a.topic === topic).slice(0, 4);
  return (
    <div className="fk-help-stack">
      <div className="fk-help-card">
        <h2 className="fk-help-section-title">Need an answer now?</h2>
        <Link to="/help/chat" className="fk-help-btn fk-help-btn--primary fk-help-btn--block">
          <MessageSquare size={16} /> Start Live Chat
        </Link>
      </div>
      <div className="fk-help-card">
        <h2 className="fk-help-section-title">Have an idea?</h2>
        <p style={{ color: "var(--help-text-2)", fontSize: 14, marginBottom: 12 }}>Suggest a feature or tell us what to improve.</p>
        <Link to="/help/feedback" className="fk-help-btn fk-help-btn--secondary fk-help-btn--block">
          <Lightbulb size={16} /> Share feedback
        </Link>
      </div>
      <div className="fk-help-card">
        <h2 className="fk-help-section-title">These guides may help</h2>
        <ul className="fk-help-rows">
          {suggestions.map((a) => (
            <li key={a.id}>
              <Link to={`/help/articles/${a.id}`} className="fk-help-row">
                <span className="fk-help-row__icon"><BookOpen size={16} /></span>
                <span className="fk-help-row__main">
                  <span className="fk-help-row__title" style={{ fontSize: 14.5 }}>{a.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link to="/help/articles" className="fk-help-link" style={{ marginTop: 8 }}>
          All articles <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

/** /help/contact — send a message to the support team (?topic= preselects a topic). */
export function ContactSupportPage() {
  const [params] = useSearchParams();
  const topic = params.get("topic") ?? "";
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title="Contact Support"
          description="Send a message to the Fockis support team. We reply in My Support Tickets and notify you."
          icon={<MessageCircleMore size={30} />}
          tone="green"
        />
        <div className="fk-help-two">
          <SignedInOnly what="contact the support team">{() => <TicketForm kind="question" initialTopic={topic} />}</SignedInOnly>
          <SideLinks topic={topic} />
        </div>
      </div>
    </HelpShell>
  );
}

/** /help/report-problem — report a bug (?topic=, ?page= prefill the form). */
export function ReportProblemPage() {
  const [params] = useSearchParams();
  const topic = params.get("topic") ?? "";
  const page = params.get("page") ?? "";
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title="Report a Problem"
          description="Tell us about bugs, errors, or something that isn't working."
          icon={<Bug size={30} />}
          tone="red"
        />
        <div className="fk-help-two">
          <SignedInOnly what="report a problem">{() => <TicketForm kind="problem" initialTopic={topic} initialPage={page} />}</SignedInOnly>
          <div className="fk-help-stack">
            <div className="fk-help-card">
              <h2 className="fk-help-section-title">Before you report</h2>
              <ul className="fk-help-rows">
                <li><Link to="/help/status" className="fk-help-row"><span className="fk-help-row__main"><span className="fk-help-row__title" style={{ fontSize: 14.5 }}>Check System Status</span><span className="fk-help-row__sub">See whether Fockis is reachable</span></span></Link></li>
                <li><Link to="/help/articles/page-not-loading" className="fk-help-row"><span className="fk-help-row__main"><span className="fk-help-row__title" style={{ fontSize: 14.5 }}>A page won't load</span><span className="fk-help-row__sub">Quick fixes to try first</span></span></Link></li>
                <li><Link to="/help/safety" className="fk-help-row"><span className="fk-help-row__main"><span className="fk-help-row__title" style={{ fontSize: 14.5 }}>Report abuse or a scam</span><span className="fk-help-row__sub">Use Safety & Security instead</span></span></Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </HelpShell>
  );
}
