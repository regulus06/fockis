interface Props { status: string }
export function EmployerStatusBadge({ status }: Props) { return <span data-status={status.toLowerCase().replace(/[^a-z0-9_-]/g, '')}>{status.replace(/_/g, ' ')}</span>; }
