import { useEffect, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronRight, CircleHelp, Search, SearchX } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { HelpContentGate, HelpEmpty } from "../components/HelpStates";
import { useHelpContent } from "../hooks/useHelpContent";
import { HELP_TOPICS } from "../data/helpTopics";

/** /help/faq — searchable questions and answers (?q=, ?topic=, #id opens one). */
export default function FaqPage() {
  const content = useHelpContent();
  const FAQS = content.faqs;
  const [params, setParams] = useSearchParams();
  const { hash } = useLocation();
  const q = params.get("q") ?? "";
  const topic = params.get("topic") ?? "";
  const openId = hash.slice(1);

  const items = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return FAQS.filter((f) => {
      if (topic && f.topic !== topic) return false;
      if (f.id === openId) return true;
      const hay = `${f.question} ${f.answer}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [q, topic, openId, FAQS]);

  useEffect(() => {
    if (openId) document.getElementById(openId)?.scrollIntoView({ block: "center" });
  }, [openId]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader title="Frequently Asked Questions" description="Quick answers to common questions." icon={<CircleHelp size={30} />} />

        <label className="fk-help-search">
          <Search className="fk-help-search__icon" size={20} aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => update("q", e.target.value)} placeholder="Search questions…" aria-label="Search questions" maxLength={120} />
        </label>

        <div className="fk-help-chips" role="group" aria-label="Filter by topic">
          <button type="button" className="fk-help-chip" aria-pressed={!topic} onClick={() => update("topic", "")}>All</button>
          {HELP_TOPICS.filter((t) => FAQS.some((f) => f.topic === t.id)).map((t) => (
            <button key={t.id} type="button" className="fk-help-chip" aria-pressed={topic === t.id} onClick={() => update("topic", t.id)}>
              {t.title}
            </button>
          ))}
        </div>

        <HelpContentGate status={content.status} error={content.error} onRetry={() => void content.load(true)}>
        {items.length === 0 ? (
          <div className="fk-help-card">
            <HelpEmpty
              icon={<SearchX size={24} />}
              title="No questions match"
              text="Try other words, search the Help Center, or ask the support team."
              action={<Link to={`/help/articles?q=${encodeURIComponent(q)}`} className="fk-help-btn fk-help-btn--primary">Search the Help Center</Link>}
            />
          </div>
        ) : (
          <div className="fk-help-faq">
            {items.map((f) => (
              <details key={f.id} id={f.id} className="fk-help-faq__item" open={f.id === openId || undefined}>
                <summary>
                  <CircleHelp size={18} color="var(--help-primary)" style={{ marginLeft: 0 }} />
                  {f.question}
                  <ChevronRight size={18} />
                </summary>
                <div className="fk-help-faq__answer">
                  <p>{f.answer}</p>
                  {f.link && (
                    <Link to={f.link.to} className="fk-help-link">
                      {f.link.label} <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
        </HelpContentGate>

        <p style={{ color: "var(--help-text-2)" }}>
          Didn't find your answer? <Link to="/help/contact" className="fk-help-link">Contact Support</Link>
        </p>
      </div>
    </HelpShell>
  );
}
