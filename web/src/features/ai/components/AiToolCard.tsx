import { Link } from "react-router-dom";

interface Props {
  title: string;
  description: string;
  icon?: string;
  href: string;
  badge?: string;
}

export default function AiToolCard({ title, description, icon = "✦", href, badge }: Props) {
  return (
    <Link className="fockis-ai-tool-card" to={href}>
      <div className="fockis-ai-tool-card__icon">{icon}</div>
      <div className="fockis-ai-tool-card__body">
        <div className="fockis-ai-tool-card__title-row">
          <h3>{title}</h3>
          {badge && <span>{badge}</span>}
        </div>
        <p>{description}</p>
      </div>
      <strong aria-hidden="true">→</strong>
    </Link>
  );
}
