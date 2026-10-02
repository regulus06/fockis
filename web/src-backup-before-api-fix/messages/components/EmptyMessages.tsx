import { Sparkles } from 'lucide-react';

interface EmptyMessagesProps {
  name: string;
}

export default function EmptyMessages({ name }: EmptyMessagesProps) {
  return (
    <div className="empty-state empty-state--messages">
      <div className="empty-state__icon">
        <Sparkles size={32} />
      </div>
      <h3>Say hello to {name}</h3>
      <p>No messages yet. Send the first one to start the conversation.</p>
    </div>
  );
}
