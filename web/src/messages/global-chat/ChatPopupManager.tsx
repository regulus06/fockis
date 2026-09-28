import { useChatWindowsStore } from '../store/chatWindowsStore';
import ChatBubbleLauncher from './ChatBubbleLauncher';
import ChatPopup from './ChatPopup';

/** Mounted once near the app root. Renders the floating launcher and any open chat popups. */
export default function ChatPopupManager() {
  const windows = useChatWindowsStore((s) => s.windows);
  const expanded = windows.filter((w) => !w.minimized);
  const minimized = windows.filter((w) => w.minimized);

  return (
    <div className="floating-chat-root">
      <div className="floating-chat-root__popups">
        {expanded.map((w) => (
          <ChatPopup key={w.conversationId} conversationId={w.conversationId} minimized={false} unread={w.unread} />
        ))}
      </div>
      <div className="floating-chat-root__minimized">
        {minimized.map((w) => (
          <ChatPopup key={w.conversationId} conversationId={w.conversationId} minimized unread={w.unread} />
        ))}
      </div>
      <ChatBubbleLauncher />
    </div>
  );
}
