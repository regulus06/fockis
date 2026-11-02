import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";

import { useFockisTheme } from "../../context/ThemeContext";
import ChatView, { NoChatSelected } from "./components/ChatView";
import ConversationList from "./components/ConversationList";
import { NewChatDialog } from "./components/Dialogs";
import NavRail, { MobileTabs } from "./components/NavRail";
import { BlockedView, CallsView, ContactsView, SettingsView, StarredView } from "./components/Views";
import { ensureConversation, openConversation, startDirect } from "./inboxActions";
import { useInbox } from "./inboxStore";
import { useInboxSocket } from "./useInboxSocket";
import { useHideBottomNav } from "../../components/fockis/FockisBottomNav";
import "./inbox.scss";

/* ============================================================================
   FOCKIS MESSAGES
   Desktop:  [nav rail] [list / section] [chat]
   Tablet:   [icon rail] [list] [chat]
   Phone:    list screen with bottom tabs  →  full-screen chat (no tabs)
============================================================================ */

export default function MessagesApp() {
  useInboxSocket();
  const { theme } = useFockisTheme();
  const [params, setParams] = useSearchParams();
  const view = useInbox((s) => s.view);
  const active = useInbox((s) => (s.activeId ? s.conversations[s.activeId] : undefined));
  const setActive = useInbox((s) => s.setActive);
  const setView = useInbox((s) => s.setView);
  const toasts = useInbox((s) => s.toasts);
  const dismiss = useInbox((s) => s.dismissToast);
  const [newChat, setNewChat] = useState<null | "chat" | "group">(null);

  // An open chat is full screen on phones: no main bottom navigation.
  useHideBottomNav(Boolean(active));

  // Deep links: /messages?with=<userId>  ·  /messages?c=<conversationId>
  useEffect(() => {
    const withUser = params.get("with")?.trim();
    const conversationId = params.get("c")?.trim();
    if (!withUser && !conversationId) return;
    const next = new URLSearchParams(params);
    next.delete("with");
    next.delete("c");
    setParams(next, { replace: true });
    if (withUser) void startDirect(withUser);
    else if (conversationId)
      void ensureConversation(conversationId).then((c) => {
        if (c) {
          setView(c.request ? "requests" : c.archived ? "archived" : "messages");
          void openConversation(c.id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving the page clears the open chat so unread counts keep working.
  useEffect(() => () => setActive(null), [setActive]);

  const open = useCallback((id: string) => void openConversation(id), []);
  const back = useCallback(() => setActive(null), [setActive]);

  const listMode = view === "archived" || view === "requests" ? view : "messages";
  const showsList = view === "messages" || view === "archived" || view === "requests";

  return (
    <div className={`fki-app ${active ? "has-chat" : ""}`} data-fki-theme={theme}>
      <NavRail />

      <div className="fki-app__list">
        {showsList ? (
          <ConversationList mode={listMode} onOpen={open} onNewChat={() => setNewChat("chat")} onNewGroup={() => setNewChat("group")} />
        ) : view === "calls" ? (
          <CallsView />
        ) : view === "contacts" ? (
          <ContactsView />
        ) : view === "blocked" ? (
          <BlockedView />
        ) : view === "starred" ? (
          <StarredView
            onOpen={(conversationId, messageId) => {
              void openConversation(conversationId).then(() =>
                window.setTimeout(() => window.dispatchEvent(new CustomEvent("fki-jump", { detail: { conversationId, messageId } })), 250),
              );
            }}
          />
        ) : (
          <SettingsView />
        )}
        <MobileTabs />
      </div>

      <main className="fki-app__chat">{active ? <ChatView key={active.id} conversation={active} onBack={back} /> : <NoChatSelected />}</main>

      {newChat && <NewChatDialog group={newChat === "group"} onClose={() => setNewChat(null)} />}

      <div className="fki-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`fki-toast is-${t.tone}`}>
            <span>{t.text}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className="fki-toast__x" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
