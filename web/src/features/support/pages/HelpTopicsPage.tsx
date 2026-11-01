import { Link, useParams } from "react-router-dom";
import { BookOpen, ChevronRight, CircleHelp, Layers, MessageCircleMore, SearchX } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { HelpEmpty } from "../components/HelpStates";
import { TOPIC_ICONS } from "../components/helpIcons";
import { useHelpContent } from "../hooks/useHelpContent";
import { HELP_TOPICS, topicById } from "../data/helpTopics";

/** /help/topics — all help topics. */
export function HelpTopicsPage() {
  const { articles: HELP_ARTICLES } = useHelpContent();
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader title="All Help Topics" description="Pick a topic to see its guides and common questions." icon={<Layers size={30} />} />
        <div className="fk-help-topic-grid">
          {HELP_TOPICS.map((topic) => {
            const Icon = TOPIC_ICONS[topic.id];
            const count = HELP_ARTICLES.filter((a) => a.topic === topic.id).length;
            return (
              <Link key={topic.id} to={`/help/topics/${topic.id}`} className="fk-help-topic">
                <span className="fk-help-topic__icon"><Icon size={24} /></span>
                <span className="fk-help-topic__text">
                  <strong>{topic.title}</strong>
                  <span>{topic.description}</span>
                  <span>{count} article{count === 1 ? "" : "s"}</span>
                </span>
                <ChevronRight className="fk-help-chevron" size={20} />
              </Link>
            );
          })}
        </div>
      </div>
    </HelpShell>
  );
}

/** /help/topics/:topicId — one topic's articles and FAQs. */
export function HelpTopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const content = useHelpContent();
  const topic = topicById(topicId);

  if (!topic) {
    return (
      <HelpShell>
        <div className="fk-help-page">
          <HelpPageHeader title="Topic not found" crumbs={[{ label: "All topics", to: "/help/topics" }]} />
          <div className="fk-help-card">
            <HelpEmpty icon={<SearchX size={24} />} title="We couldn't find that topic" text="Browse all help topics instead." action={<Link to="/help/topics" className="fk-help-btn fk-help-btn--primary">All topics</Link>} />
          </div>
        </div>
      </HelpShell>
    );
  }

  const Icon = TOPIC_ICONS[topic.id];
  const articles = content.articles.filter((a) => a.topic === topic.id);
  const faqs = content.faqs.filter((f) => f.topic === topic.id);

  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title={topic.title}
          description={topic.description}
          crumbs={[{ label: "All topics", to: "/help/topics" }]}
          icon={<Icon size={28} />}
          actions={
            <Link to={`/help/contact?topic=${topic.id}`} className="fk-help-btn fk-help-btn--primary">
              <MessageCircleMore size={16} /> Contact Support
            </Link>
          }
        />
        <div className="fk-help-two">
          <div className="fk-help-card">
            <h2 className="fk-help-section-title">Guides ({articles.length})</h2>
            <ul className="fk-help-rows">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link to={`/help/articles/${a.id}`} className="fk-help-row">
                    <span className="fk-help-row__icon"><BookOpen size={18} /></span>
                    <span className="fk-help-row__main">
                      <span className="fk-help-row__title">{a.title}</span>
                      <span className="fk-help-row__sub">{a.summary}</span>
                    </span>
                    <ChevronRight className="fk-help-chevron" size={18} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="fk-help-card">
            <h2 className="fk-help-section-title">Common questions</h2>
            {faqs.length === 0 ? (
              <p style={{ color: "var(--help-text-2)" }}>No quick answers for this topic yet.</p>
            ) : (
              <ul className="fk-help-rows">
                {faqs.map((f) => (
                  <li key={f.id}>
                    <Link to={`/help/faq#${f.id}`} className="fk-help-row">
                      <span className="fk-help-row__icon"><CircleHelp size={18} /></span>
                      <span className="fk-help-row__main">
                        <span className="fk-help-row__title" style={{ fontSize: 14.5 }}>{f.question}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </HelpShell>
  );
}
