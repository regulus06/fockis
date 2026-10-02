export default function AdminStatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="admin-stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
