import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Headset, MessagesSquare } from "lucide-react";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Avatar, Card, SmEmpty, SmError, SmLoading, StatusPill, timeAgo, useAdminQuery } from "../components/SmParts";
import { adminError, supportAdminApi } from "../supportAdminApi";
import { useSupportMod } from "../layout/SupportModLayout";
import TicketDetailPage from "./TicketDetailPage";

const P = PERMISSIONS;

/**
 * Live Support. Availability is the staff-controlled switch stored on the
 * server: users only see "Online" while it's on. Conversations are support
 * records of kind "chat", so history, notes and assignment work the same.
 */
export default function LiveSupportPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { refreshCounts } = useSupportMod();
  const [view, setView] = useState<"active" | "closed">("active");

  const settings = useAdminQuery(() => supportAdminApi.settings(), []);
  const chats = useAdminQuery(
    () => supportAdminApi.tickets({ kind: "chat", status: view === "active" ? "active" : "closed", page: 1 }),
    [view],
  );
  const { refetch } = chats;

  useEffect(() => {
    const timer = window.setInterval(() => void refetch(), 10_000);
    return () => window.clearInterval(timer);
  }, [refetch]);

  const [toggling, setToggling] = useState(false);
  const online = settings.data?.liveChatOnline ?? false;

  const toggle = async () => {
    setToggling(true);
    try {
      settings.setData(await supportAdminApi.setLiveChat(!online));
      toast("success", !online ? "Live chat is now online for users." : "Live chat is offline. Users are offered a support request instead.");
      refreshCounts();
    } catch (error) {
      toast("error", adminError(error));
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <Card
        title="Live Support"
        icon={<Headset size={20} />}
        action={
          settings.data ? (
            <label className="fksm-switch">
              <input type="checkbox" checked={online} disabled={!can([P.SUPPORT_SETTINGS]) || toggling} onChange={() => void toggle()} />
              <span className="fksm-switch__track" aria-hidden="true" />
              <span className={`fksm-online fksm-online--${online ? "on" : "off"}`}>
                <i aria-hidden="true" />
                {online ? "Online" : "Offline"}
              </span>
            </label>
          ) : null
        }
      >
        <p className="fksm-muted" style={{ fontSize: 13 }}>
          {online
            ? "Users can start a live chat from the Help Center. Turn this off when no one is available to answer."
            : "Live chat is offline. Users see that it's unavailable and can send a support request instead."}
          {!can([P.SUPPORT_SETTINGS]) && " Only staff with live chat settings permission can change this."}
        </p>
      </Card>

      <div className="fksm-live">
        <Card title="Conversations" icon={<MessagesSquare size={18} />}>
          <div className="fksm-tabs" role="tablist" aria-label="Chats">
            <button type="button" role="tab" aria-selected={view === "active"} className={view === "active" ? "is-active" : ""} onClick={() => setView("active")}>
              Active
            </button>
            <button type="button" role="tab" aria-selected={view === "closed"} className={view === "closed" ? "is-active" : ""} onClick={() => setView("closed")}>
              Ended
            </button>
          </div>
          {chats.loading && !chats.data ? (
            <SmLoading />
          ) : chats.error ? (
            <SmError message={chats.error} onRetry={chats.refetch} />
          ) : !chats.data?.items.length ? (
            <SmEmpty icon={<MessagesSquare size={22} />} title={view === "active" ? "No active chats" : "No ended chats"} />
          ) : (
            <ul className="fksm-chatlist">
              {chats.data.items.map((c) => (
                <li key={c.id}>
                  <button type="button" className={chatId === c.id ? "is-active" : ""} onClick={() => navigate(`/admin/support/live/${c.id}`)}>
                    <Avatar person={c.user} size={34} />
                    <span className="fksm-chatlist__body">
                      <strong>{c.user.username || c.user.name || "User"}</strong>
                      <span>{c.lastMessage ? `${c.lastMessage.author === "agent" ? "You: " : ""}${c.lastMessage.preview}` : c.subject}</span>
                      <span>
                        {c.assignedTo ? `With ${c.assignedTo.username || c.assignedTo.name}` : "Waiting for an agent"} · {timeAgo(c.lastMessageAt)}
                      </span>
                    </span>
                    {c.unread ? <span className="fksm-chatlist__dot" aria-label="New message" /> : <StatusPill status={c.status} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="fksm-stack">
          {chatId ? (
            <TicketDetailPage key={chatId} embedded ticketId={chatId} onChanged={() => void refetch()} />
          ) : (
            <Card>
              <SmEmpty icon={<Headset size={24} />} title="Pick a conversation" text="Open a chat to reply. Replying or choosing “Assign to me” takes the chat; use the assignment menu to transfer it." />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
