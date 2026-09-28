import { MessageCircle } from 'lucide-react';

export default function EmptyConversation() {
  return (
    <div className="empty-state empty-state--conversation">
      <div className="empty-state__icon">
        <MessageCircle size={40} />
      </div>
      <h2>Fockis Messages</h2>
      <p>Start a conversation with someone and stay connected.</p>
    </div>
  );
}
