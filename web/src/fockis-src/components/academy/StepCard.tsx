export default function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="step-card">
      <div className="step-num">{step}</div>
      <h4>{title}</h4>
      {desc && <p>{desc}</p>}
    </div>
  );
}
