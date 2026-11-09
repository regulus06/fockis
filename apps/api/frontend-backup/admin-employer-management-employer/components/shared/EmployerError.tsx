interface Props { message: string; onRetry?: () => void }
export function EmployerError({ message, onRetry }: Props) { return <div role="alert"><p>{message}</p>{onRetry && <button type="button" onClick={onRetry}>Try again</button>}</div>; }
