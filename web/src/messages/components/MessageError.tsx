import { AlertTriangle } from 'lucide-react';

interface MessageErrorProps {
  message?: string;
  onRetry: () => void;
}

export default function MessageError({ message = 'Something went wrong while loading messages.', onRetry }: MessageErrorProps) {
  return (
    <div className="message-error">
      <AlertTriangle size={28} />
      <p>{message}</p>
      <button type="button" onClick={onRetry}>Try Again</button>
    </div>
  );
}
