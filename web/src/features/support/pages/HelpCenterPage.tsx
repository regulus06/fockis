import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, ChevronRight, CircleHelp, Layers, MessageCircleMore, SearchX } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import HelpSearch from "../components/HelpSearch";
import { HelpContentGate, HelpEmpty } from "../components/HelpStates";
import { useHelpContent } from "../hooks/useHelpContent";
import { HELP_TOPICS, CATEGORY_LABELS } from "../data/helpTopics";
import { resultLink, resultTitle, searchHelp } from "../data/searchHelp";

/** /help/articles — every article, filterable by topic and searchable (?q=). */
export default function HelpCenterPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const topic = params.get("topic") ?? "";
  const content = useHelpContent();
  const results = useMemo(() => (q ? searchHelp(q, content).filter((r) => !topic || r.type === "topic" || r.item.topic === topic) : []), [q, topic, content]);
  const articles = useMemo(() => content.articles.filter((a) => !topic || a.topic === topic), [topic, content.articles]);

  const setTopic = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("topic", id);
    else next.delete("topic");
    setParams(next, { replace: true });
  };

  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title="Help Center"
          description="Guides, tutorials, and how-to articles for everything on Fockis."
          icon={<BookOpen size={30} />}
        />

        <HelpSearch key={q} initial={q} />

        <div className="fk-help-chips" role="group" aria-label="Filter by topic">
          <button type="button" className="fk-help-chip" aria-pressed={!topic} onClick={() => setTopic("")}>All topics</button>
          {HELP_TOPICS.map((t) => (
            <button key={t.id} type="button" className="fk-help-chip" aria-pressed={topic === t.id} onClick={() => setTopic(t.id)}>
              {t.title}
            </button>
          ))}
        </div>

        <HelpContentGate status={content.status} error={content.error} onRetry={() => void content.load(true)}>
        <div className="fk-help-card">
          {q ? (
            <>
              <h2 className="fk-help-section-title">
                {results.length} result{results.length === 1 ? "" : "s"} for “{q}”{topic && ` in ${CATEGORY_LABELS[topic as keyof typeof CATEGORY_LABELS] ?? topic}`}
              </h2>
              {results.length === 0 ? (
                <HelpEmpty
                  icon={<SearchX size={24} />}
                  title="No articles match"
                  text="Try different words, browse the topics, or ask the support team."
                  action={<Link to="/help/contact" className="fk-help-btn fk-help-btn--primary"><MessageCircleMore size={16} /> Contact Support</Link>}
                />
              ) : (
                <ul className="fk-help-rows">
                  {results.map((result) => {
                    const Icon = result.type === "article" ? BookOpen : result.type === "faq" ? CircleHelp : Layers;
                    const sub = result.type === "article" ? result.item.summary : result.type === "faq" ? result.item.answer : result.item.description;
                    return (
                      <li key={`${result.type}-${result.item.id}`}>
                        <Link to={resultLink(result)} className="fk-help-row">
                          <span className="fk-help-row__icon"><Icon size={18} /></span>
                          <span className="fk-help-row__main">
                            <span className="fk-help-row__title">{resultTitle(result)}</span>
                            <span className="fk-help-row__sub">{sub}</span>
                          </span>
                          <span className="fk-help-row__end">
                            <span className="fk-help-pill fk-help-pill--blue">{result.type === "article" ? "Article" : result.type === "faq" ? "FAQ" : "Topic"}</span>
                            <ChevronRight className="fk-help-chevron" size={18} />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <>
              <h2 className="fk-help-section-title">{topic ? CATEGORY_LABELS[topic as keyof typeof CATEGORY_LABELS] : "All articles"} ({articles.length})</h2>
              <ul className="fk-help-rows">
                {articles.map((article) => (
                  <li key={article.id}>
                    <Link to={`/help/articles/${article.id}`} className="fk-help-row">
                      <span className="fk-help-row__icon"><BookOpen size={18} /></span>
                      <span className="fk-help-row__main">
                        <span className="fk-help-row__title">{article.title}</span>
                        <span className="fk-help-row__sub">{article.summary}</span>
                      </span>
                      <span className="fk-help-row__end">
                        <span className="fk-help-pill fk-help-pill--gray">{CATEGORY_LABELS[article.topic]}</span>
                        <ChevronRight className="fk-help-chevron" size={18} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        </HelpContentGate>
      </div>
    </HelpShell>
  );
}
