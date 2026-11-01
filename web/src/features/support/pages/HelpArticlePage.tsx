import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, MessageCircleMore, SearchX } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { HelpEmpty, HelpError, HelpLoading } from "../components/HelpStates";
import { TOPIC_ICONS } from "../components/helpIcons";
import { useHelpContent } from "../hooks/useHelpContent";
import { buildFockisUploadUrl } from "../../../config/fockisConfig";
import { topicById } from "../data/helpTopics";

/** /help/articles/:articleId */
export default function HelpArticlePage({ articleId: fixedId }: { articleId?: string }) {
  const params = useParams<{ articleId: string }>();
  const content = useHelpContent();
  const slug = fixedId ?? params.articleId;
  const article = content.articles.find((a) => a.id === slug);

  if (!article && (content.status === "idle" || content.status === "loading")) {
    return (
      <HelpShell>
        <div className="fk-help-page"><div className="fk-help-card"><HelpLoading label="Loading article…" /></div></div>
      </HelpShell>
    );
  }
  if (!article && content.status === "error") {
    return (
      <HelpShell>
        <div className="fk-help-page"><div className="fk-help-card"><HelpError message={content.error ?? "The Help Center couldn't be loaded."} onRetry={() => void content.load(true)} /></div></div>
      </HelpShell>
    );
  }

  if (!article) {
    return (
      <HelpShell>
        <div className="fk-help-page">
          <HelpPageHeader title="Article not found" crumbs={[{ label: "Help Center", to: "/help/articles" }]} />
          <div className="fk-help-card">
            <HelpEmpty
              icon={<SearchX size={24} />}
              title="We couldn't find that article"
              text="It may have moved. Search the Help Center or browse the topics."
              action={<Link to="/help/articles" className="fk-help-btn fk-help-btn--primary">Open Help Center</Link>}
            />
          </div>
        </div>
      </HelpShell>
    );
  }

  const topic = topicById(article.topic);
  const TopicIcon = TOPIC_ICONS[article.topic];
  const related = content.articles.filter((a) => a.topic === article.topic && a.id !== article.id).slice(0, 4);

  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title={article.title}
          description={article.summary}
          crumbs={[
            { label: "Help Center", to: "/help/articles" },
            ...(topic ? [{ label: topic.title, to: `/help/topics/${topic.id}` }] : []),
          ]}
          icon={<BookOpen size={28} />}
        />

        <div className="fk-help-two">
          <div className="fk-help-card fk-help-article">
            {article.body.map((block, index) => (
              <div key={index}>
                {block.heading && <h2>{block.heading}</h2>}
                {block.text && <p>{block.text}</p>}
                {block.steps && block.steps.length > 0 && (
                  <ol>
                    {block.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                )}
                {block.imageUrl && <img className="fk-help-article__img" src={buildFockisUploadUrl(block.imageUrl)} alt={block.heading || article.title} loading="lazy" />}
              </div>
            ))}

            {article.links && article.links.length > 0 && (
              <div className="fk-help-links">
                {article.links.map((link) => (
                  <Link key={link.to} to={link.to} className="fk-help-btn fk-help-btn--secondary fk-help-btn--sm">
                    {link.label} <ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            )}

            <div className="fk-help-feedback">
              <span>Didn't solve it?</span>
              <Link to={`/help/contact?topic=${article.topic}`} className="fk-help-btn fk-help-btn--primary fk-help-btn--sm">
                <MessageCircleMore size={15} /> Contact Support
              </Link>
              <Link to={`/help/report-problem?topic=${article.topic}`} className="fk-help-btn fk-help-btn--ghost fk-help-btn--sm">
                Report a Problem
              </Link>
            </div>
          </div>

          <div className="fk-help-stack">
            {topic && (
              <Link to={`/help/topics/${topic.id}`} className="fk-help-topic">
                <span className="fk-help-topic__icon"><TopicIcon size={22} /></span>
                <span className="fk-help-topic__text">
                  <strong>{topic.title}</strong>
                  <span>{topic.description}</span>
                </span>
              </Link>
            )}
            {related.length > 0 && (
              <div className="fk-help-card">
                <h2 className="fk-help-section-title">Related articles</h2>
                <ul className="fk-help-rows">
                  {related.map((a) => (
                    <li key={a.id}>
                      <Link to={`/help/articles/${a.id}`} className="fk-help-row">
                        <span className="fk-help-row__main">
                          <span className="fk-help-row__title">{a.title}</span>
                          <span className="fk-help-row__sub">{a.summary}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </HelpShell>
  );
}
