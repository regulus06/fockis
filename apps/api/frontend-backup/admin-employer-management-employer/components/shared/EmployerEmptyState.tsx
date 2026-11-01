interface Props { title: string; description?: string; action?: React.ReactNode }
export function EmployerEmptyState({ title, description, action }: Props) { return <section><h3>{title}</h3>{description && <p>{description}</p>}{action}</section>; }
