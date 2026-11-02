import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Bell,
  Laptop,
  MessageCircle,
  Moon,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  RefreshCw,
  Search,
  Smartphone,
  Star,
  Sun,
  Trash2,
  UserRound,
  Video,
} from "lucide-react";

import { useFockisTheme } from "../../../context/ThemeContext";
import { startCall } from "../../calls/callSession";
import { callsService, devicesService, messagesService, peopleService, type CallView, type InboxMessage, type InboxUser } from "../inboxApi";
import { previewText, startDirect, unblockUser } from "../inboxActions";
import { useInbox } from "../inboxStore";
import { Avatar, Confirm, Empty, Skeleton, conversationTitle, listTime } from "../ui";

/* ============================================================================
   SECONDARY VIEWS: Calls, Contacts, Blocked, Starred, Settings
============================================================================ */

function Pane({ title, children, tools }: { title: string; children: React.ReactNode; tools?: React.ReactNode }) {
  return (
    <section className="fki-list fki-pane">
      <header className="fki-list__head">
        <h1>{title}</h1>
        {tools}
      </header>
      {children}
    </section>
  );
}

/* ---------------------------------------------------------------- CALLS */

const STATUS_TEXT: Record<string, string> = {
  ended: "",
  missed: "Missed",
  rejected: "Declined",
  canceled: "Canceled",
  busy: "Busy",
  failed: "Failed",
  ringing: "Ringing",
  accepted: "In progress",
};

function duration(sec: number) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  return m ? `${m} min ${sec % 60 ? `${sec % 60} s` : ""}`.trim() : `${sec} s`;
}

export function CallsView() {
  const [filter, setFilter] = useState<"all" | "missed">("all");
  const [items, setItems] = useState<CallView[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const setMissedCalls = useInbox((s) => s.setMissedCalls);

  const load = useCallback(
    async (more = false) => {
      setError("");
      try {
        const page = await callsService.history(filter, more ? cursor ?? undefined : undefined);
        setItems((current) => (more && current ? [...current, ...page.items] : page.items));
        setCursor(page.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load calls.");
        setItems((current) => current ?? []);
      }
    },
    [filter, cursor],
  );

  useEffect(() => {
    setItems(null);
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    callsService
      .markMissedSeen()
      .then(() => setMissedCalls(0))
      .catch(() => undefined);
  }, [setMissedCalls]);

  return (
    <Pane
      title="Calls"
      tools={
        <button type="button" className="fki-icon-btn" onClick={() => void load(false)} aria-label="Refresh">
          <RefreshCw size={20} />
        </button>
      }
    >
      <div className="fki-chips">
        <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>
          All
        </button>
        <button type="button" className={filter === "missed" ? "is-active" : ""} onClick={() => setFilter("missed")}>
          Missed
        </button>
      </div>
      <div className="fki-list__scroll">
        {items === null ? (
          <Skeleton rows={7} />
        ) : error && !items.length ? (
          <Empty icon={<Phone size={26} />} title="Couldn't load calls" text={error} action={<button type="button" className="fki-btn fki-btn--primary" onClick={() => void load(false)}>Try again</button>} />
        ) : !items.length ? (
          <Empty icon={<Phone size={26} />} title={filter === "missed" ? "No missed calls" : "No calls yet"} text="Start a voice or video call from any chat." />
        ) : (
          <ul className="fki-rows">
            {items.map((call) => {
              const missed = call.missed || (call.direction === "incoming" && call.status === "rejected");
              const Icon = missed ? PhoneMissed : call.direction === "outgoing" ? PhoneOutgoing : PhoneIncoming;
              const peer = call.peer;
              return (
                <li key={call.callId}>
                  <div className="fki-row fki-row--call">
                    <Avatar name={peer?.name ?? "Fockis user"} src={peer?.avatar} size={52} />
                    <span className="fki-row__body">
                      <span className="fki-row__top">
                        <strong className={`fki-row__name ${missed ? "is-missed" : ""}`}>{peer?.name ?? "Fockis user"}</strong>
                        <time className="fki-row__time">{listTime(call.createdAt)}</time>
                      </span>
                      <span className="fki-row__bottom">
                        <span className={`fki-row__preview fki-callmeta ${missed ? "is-missed" : ""}`}>
                          <Icon size={15} />
                          {call.type === "video" ? "Video" : "Voice"}
                          {STATUS_TEXT[call.status] ? ` · ${STATUS_TEXT[call.status]}` : ""}
                          {call.durationSec ? ` · ${duration(call.durationSec)}` : ""}
                        </span>
                        {peer && (
                          <span className="fki-row__meta">
                            <button type="button" className="fki-icon-btn" onClick={() => void startCall(peer, "voice")} aria-label={`Voice call ${peer.name}`}>
                              <Phone size={19} />
                            </button>
                            <button type="button" className="fki-icon-btn" onClick={() => void startCall(peer, "video")} aria-label={`Video call ${peer.name}`}>
                              <Video size={19} />
                            </button>
                          </span>
                        )}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
            {cursor && (
              <li className="fki-pad">
                <button type="button" className="fki-btn fki-btn--ghost fki-btn--block" onClick={() => void load(true)}>
                  Load more
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </Pane>
  );
}

/* ---------------------------------------------------------------- CONTACTS */

export function ContactsView() {
  const [friends, setFriends] = useState<InboxUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InboxUser[]>([]);
  const presence = useInbox((s) => s.presence);

  useEffect(() => {
    peopleService
      .friends()
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setResults([]);
    const t = window.setTimeout(() => peopleService.search(q).then(setResults).catch(() => setResults([])), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const list = useMemo(() => {
    const base = query.trim().length >= 2 ? results : friends ?? [];
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [friends, results, query]);

  return (
    <Pane title="Contacts">
      <label className="fki-search">
        <Search size={19} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search friends or people on Fockis" aria-label="Search contacts" />
      </label>
      <div className="fki-list__scroll">
        {friends === null ? (
          <Skeleton rows={7} />
        ) : !list.length ? (
          <Empty icon={<UserRound size={26} />} title={query ? "No one found" : "No friends yet"} text={query ? "Try a different name." : "Search for people to message, or add friends on Fockis."} />
        ) : (
          <ul className="fki-rows">
            {list.map((u) => {
              const online = (presence[u.id]?.presence ?? u.presence) === "online";
              return (
                <li key={u.id}>
                  <div className="fki-row fki-row--contact">
                    <Avatar name={u.name} src={u.avatar} size={52} online={online} />
                    <span className="fki-row__body">
                      <span className="fki-row__top">
                        <strong className="fki-row__name">{u.name}</strong>
                      </span>
                      <span className="fki-row__bottom">
                        <span className="fki-row__preview">{u.username ? `@${u.username}` : online ? "Online" : ""}</span>
                        <span className="fki-row__meta">
                          <button type="button" className="fki-icon-btn" onClick={() => void startDirect(u.id)} aria-label={`Message ${u.name}`}>
                            <MessageCircle size={19} />
                          </button>
                          <button type="button" className="fki-icon-btn" onClick={() => void startCall(u, "voice")} aria-label={`Call ${u.name}`}>
                            <Phone size={19} />
                          </button>
                          <button type="button" className="fki-icon-btn" onClick={() => void startCall(u, "video")} aria-label={`Video call ${u.name}`}>
                            <Video size={19} />
                          </button>
                        </span>
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Pane>
  );
}

/* ---------------------------------------------------------------- BLOCKED */

export function BlockedView() {
  const [list, setList] = useState<InboxUser[] | null>(null);
  const [confirm, setConfirm] = useState<InboxUser | null>(null);
  const load = () =>
    peopleService
      .blocked()
      .then(setList)
      .catch(() => setList([]));
  useEffect(() => {
    void load();
  }, []);
  return (
    <Pane title="Blocked">
      <p className="fki-list__hint">Blocked people can't message or call you. They aren't notified when you block or unblock them.</p>
      <div className="fki-list__scroll">
        {list === null ? (
          <Skeleton rows={4} />
        ) : !list.length ? (
          <Empty icon={<Ban size={26} />} title="No one is blocked" />
        ) : (
          <ul className="fki-rows">
            {list.map((u) => (
              <li key={u.id}>
                <div className="fki-row fki-row--contact">
                  <Avatar name={u.name} src={u.avatar} size={48} />
                  <span className="fki-row__body">
                    <span className="fki-row__top">
                      <strong className="fki-row__name">{u.name}</strong>
                    </span>
                    <span className="fki-row__bottom">
                      <span className="fki-row__preview">{u.username ? `@${u.username}` : ""}</span>
                      <button type="button" className="fki-btn fki-btn--ghost fki-btn--sm" onClick={() => setConfirm(u)}>
                        Unblock
                      </button>
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {confirm && (
        <Confirm
          title={`Unblock ${confirm.name}?`}
          body={<p>They'll be able to message and call you again.</p>}
          confirmLabel="Unblock"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            if (await unblockUser(confirm.id, confirm.name)) setList((l) => (l ?? []).filter((x) => x.id !== confirm.id));
          }}
        />
      )}
    </Pane>
  );
}

/* ---------------------------------------------------------------- STARRED */

export function StarredView({ onOpen }: { onOpen: (conversationId: string, messageId: string) => void }) {
  const [list, setList] = useState<InboxMessage[] | null>(null);
  const conversations = useInbox((s) => s.conversations);
  useEffect(() => {
    messagesService
      .starred()
      .then(setList)
      .catch(() => setList([]));
  }, []);
  return (
    <Pane title="Starred">
      <div className="fki-list__scroll">
        {list === null ? (
          <Skeleton rows={5} />
        ) : !list.length ? (
          <Empty icon={<Star size={26} />} title="No starred messages" text="Star important messages to find them quickly here." />
        ) : (
          <ul className="fki-rows">
            {list.map((m) => {
              const c = conversations[m.conversationId];
              return (
                <li key={m.id}>
                  <button type="button" className="fki-row" onClick={() => onOpen(m.conversationId, m.id)}>
                    <Avatar name={c ? conversationTitle(c) : "Chat"} src={c?.isGroup ? c.groupAvatar : c?.otherUser?.avatar} group={c?.isGroup} size={48} />
                    <span className="fki-row__body">
                      <span className="fki-row__top">
                        <strong className="fki-row__name">{c ? conversationTitle(c) : "Chat"}</strong>
                        <time className="fki-row__time">{listTime(m.createdAt)}</time>
                      </span>
                      <span className="fki-row__bottom">
                        <span className="fki-row__preview">{previewText(m)}</span>
                        <Star size={15} className="fki-star" />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Pane>
  );
}

/* ---------------------------------------------------------------- SETTINGS */

export function SettingsView() {
  const { theme, setTheme } = useFockisTheme();
  const setView = useInbox((s) => s.setView);
  const [permission, setPermission] = useState(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof devicesService.list>> | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadDevices = () =>
    devicesService
      .list()
      .then(setDevices)
      .catch(() => setDevices([]));
  useEffect(() => {
    void loadDevices();
  }, []);

  return (
    <Pane title="Settings">
      <div className="fki-list__scroll fki-settings">
        <section>
          <h4>Appearance</h4>
          <div className="fki-segment" role="radiogroup" aria-label="Theme">
            <button type="button" role="radio" aria-checked={theme === "light"} className={theme === "light" ? "is-active" : ""} onClick={() => setTheme("light")}>
              <Sun size={17} /> Light
            </button>
            <button type="button" role="radio" aria-checked={theme === "dark"} className={theme === "dark" ? "is-active" : ""} onClick={() => setTheme("dark")}>
              <Moon size={17} /> Dark
            </button>
          </div>
        </section>

        <section>
          <h4>Notifications on this browser</h4>
          {permission === "granted" ? (
            <p className="fki-muted">
              <Bell size={15} /> You'll get notifications for new messages while Fockis is in the background. Incoming calls ring in any open Fockis tab.
            </p>
          ) : permission === "unsupported" ? (
            <p className="fki-muted">This browser doesn't support notifications.</p>
          ) : (
            <>
              <p className="fki-muted">{permission === "denied" ? "Notifications are blocked. Allow them in your browser's site settings." : "Get notified about new messages while Fockis is in the background."}</p>
              {permission === "default" && (
                <button type="button" className="fki-btn fki-btn--primary" onClick={() => void Notification.requestPermission().then(setPermission)}>
                  Turn on notifications
                </button>
              )}
            </>
          )}
          <p className="fki-muted fki-small">To have your phone ring when Fockis is closed or locked, sign in to the Fockis app on that phone.</p>
        </section>

        <section>
          <h4>Phones that ring for calls</h4>
          {devices === null ? (
            <Skeleton rows={2} />
          ) : !devices.length ? (
            <p className="fki-muted">No phones yet. Sign in to the Fockis app on Android or iPhone and allow notifications.</p>
          ) : (
            <ul className="fki-devices">
              {devices.map((d) => (
                <li key={d.deviceId}>
                  {d.platform === "web" ? <Laptop size={20} /> : <Smartphone size={20} />}
                  <span>
                    <strong>{d.deviceName || (d.platform === "ios" ? "iPhone" : d.platform === "android" ? "Android phone" : "Browser")}</strong>
                    <small>
                      {d.platform === "ios" ? "iOS" : d.platform === "android" ? "Android" : "Web"}
                      {d.appVersion ? ` · v${d.appVersion}` : ""}
                      {d.lastSeenAt ? ` · active ${listTime(d.lastSeenAt)}` : ""}
                      {!d.pushEnabled ? " · notifications off" : ""}
                    </small>
                  </span>
                  <button type="button" className="fki-icon-btn is-danger" onClick={() => setRemoving(d.deviceId)} aria-label="Remove device">
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h4>Privacy</h4>
          <div className="fki-settings__links">
            <button type="button" onClick={() => setView("blocked")}>
              <Ban size={18} /> Blocked accounts
            </button>
            <button type="button" onClick={() => setView("requests")}>
              <MessageCircle size={18} /> Message requests
            </button>
            <button type="button" onClick={() => setView("starred")}>
              <Star size={18} /> Starred messages
            </button>
            <a href="/settings/policy/privacy">Who can message and call me →</a>
          </div>
        </section>
      </div>
      {removing && (
        <Confirm
          title="Remove this phone?"
          body={<p>It will stop ringing for Fockis calls until you sign in to the app on it again.</p>}
          confirmLabel="Remove"
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await devicesService.remove(removing).catch(() => useInbox.getState().toast("Couldn't remove the device.", "error"));
            await loadDevices();
          }}
        />
      )}
    </Pane>
  );
}
