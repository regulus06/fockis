export default function WhyCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card why-card" style={{ background: 'rgba(255,255,255,.04)', borderColor: 'var(--line-dark)' }}>
      <h3 style={{ color: '#fff' }}>{title}</h3>
      <p style={{ color: '#B9C4CF' }}>{desc}</p>
    </div>
  );
}
