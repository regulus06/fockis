import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Headset, Info, MessageSquare } from "lucide-react";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { HelpError, HelpLoading, SignedInOnly } from "../components/HelpStates";
import { Composer, MessageList } from "../components/TicketThread";
import { HELP_TOPICS } from "../data/helpTopics";
import { helpDisplayName, type HelpUser } from "../hooks/useHelpUser";
import { useHelpQuery } from "../hooks/useHelpQuery";
import { useHelpToast } from "../hooks/useHelpToast";
import { supportApi, supportErrorMessage } from "../services/supportApi";
import type { SupportAttachment, SupportCategory, SupportTicket } from "../types";
import { STATUS_LABELS } from "../utils/helpFormat";

const POLL_MS = 8000;

function ChatWindow({ user }: { user: HelpUser }) {
  const notify = useHelpToast();
  const overview = useHelpQuery(() => supportApi.overview(), []);
  const initial = useHelpQuery(() => supportApi.activeChat(), []);
  const [chat, setChat] = useState<SupportTicket | null>(null);
  const [category, setCategory] = useState<SupportCategory>("other");
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (initial.data !== undefined) setChat(initial.data);
  }, [initial.data]);

  // While the chat is open and the tab is visible, check for agent replies.
  useEffect(() => {
    if (!chat) return undefined;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const latest = await supportApi.activeChat();
        if (latest) setChat(latest);
      } catch {
        /* keep the current conversation on screen */
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [chat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const online = Boolean(overview.data?.liveChatOnline);

  const send = async (body: string, attachments: SupportAttachment[]) => {
    try {
      const updated = chat
        ? await supportApi.reply(chat.id, body, attachments)
        : await supportApi.createTicket({
            kind: "chat",
            category,
            subject: category === "other" ? "Live chat" : `Live chat: ${HELP_TOPICS.find((t) => t.id === category)?.title ?? ""}`,
            message: body || "(attachment)",
            attachments,
          });
      setChat(updated);
      return true;
    } catch (error) {
      notify(supportErrorMessage(error, "Your message wasn't sent."), "error");
      return false;
    }
  };

  const end = async () => {
    if (!chat) return;
    setEnding(true);
    try {
      await supportApi.close(chat.id);
      notify(`Chat ended. It's saved as ${chat.number} in My Support Tickets.`);
      setChat(null);
    } catch (error) {
      notify(supportErrorMessage(error, "Couldn't end the chat."), "error");
    } finally {
      setEnding(false);
    }
  };

  if (initial.loading) return <div className="fk-help-card"><HelpLoading label="Opening chat…" /></div>;
  if (initial.error) return <div className="fk-help-card"><HelpError message={initial.error} onRetry={initial.refetch} /></div>;

  return (
    <div className="fk-help-two">
      <div className="fk-help-card fk-help-chatbox">
        <div className="fk-help-chatbox__head">
          <span className="fk-help-panel__glyph"><Headset size={24} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>Fockis Support</strong>
            <span>{online ? "An agent is online and will reply here." : "Agents are away — we'll reply here and notify you."}</span>
          </div>
          <span className={`fk-help-pill ${online ? "fk-help-pill--green" : "fk-help-pill--gray"}`}>
            <i aria-hidden="true" />
            {online ? "Online now" : "Offline"}
          </span>
          {chat && (
            <button type="button" className="fk-help-btn fk-help-btn--secondary fk-help-btn--sm" onClick={() => void end()} disabled={ending}>
              {ending ? "Ending…" : "End chat"}
            </button>
          )}
        </div>
        <div className="fk-help-chatbox__body">
          {chat ? (
            <MessageList messages={chat.messages} userName={helpDisplayName(user) || "You"} resolveFile={(key) => supportApi.ticketFile(chat.id, key)} />
          ) : (
            <div className="fk-help-msg fk-help-msg--agent">
              <div className="fk-help-msg__bubble">
                Hi{user.firstName ? ` ${user.firstName}` : ""}! Tell us what you need help with and a member of the Fockis support team will answer here.
              </div>
              <span className="fk-help-msg__meta">Fockis Support</span>
            </div>
          )}
        </div>
        <div className="fk-help-chatbox__foot">
          {!chat && (
            <div className="fk-help-field" style={{ marginBottom: 10 }}>
              <label htmlFor="chat-topic" className="fk-help-label">Topic</label>
              <select id="chat-topic" className="fk-help-select" value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)}>
                <option value="other">Choose a topic (optional)</option>
                {HELP_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          )}
          <Composer onSend={send} placeholder="Type your message…" />
        </div>
      </div>

      <div className="fk-help-stack">
        <div className="fk-help-card">
          <h2 className="fk-help-section-title">About live chat</h2>
          <p className="fk-help-notice">
            <Info size={16} />
            <span>
              Your chat is saved as a support request{chat ? ` (${chat.number}, ${STATUS_LABELS[chat.status].toLowerCase()})` : ""}, so you can come back
              to it any time from My Support Tickets.
            </span>
          </p>
          <div className="fk-help-links" style={{ marginTop: 12 }}>
            {chat && <Link to={`/help/tickets/${chat.id}`} className="fk-help-btn fk-help-btn--secondary fk-help-btn--sm">Open as ticket</Link>}
            <Link to="/help/tickets" className="fk-help-btn fk-help-btn--ghost fk-help-btn--sm">My Support Tickets</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** /help/chat — live chat with Fockis Support (a "chat" support request with polling). */
export default function LiveChatPage() {
  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader title="Live Chat Support" description="Chat with a Fockis support agent." icon={<MessageSquare size={28} />} />
        <SignedInOnly what="chat with Fockis Support">{(user) => <ChatWindow user={user} />}</SignedInOnly>
      </div>
    </HelpShell>
  );
}
