export default function AdminStatusBadge({ status }: { status: string }) {
  const cls = status.toLowerCase().replace(/\s+/g, '_');
  return <span className={`admin-badge b-${cls}`}>{status.replace(/_/g, ' ')}</span>;
}
