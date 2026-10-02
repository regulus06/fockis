interface Props {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

export default function AiStatusCard({
  label,
  value,
  detail,
  tone = "default",
}: Props) {
  return (
    <article className={`ai-stat-card ai-stat-${tone}`}>
      <span className="ai-stat-label">{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
