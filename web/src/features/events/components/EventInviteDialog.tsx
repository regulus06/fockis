import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";

import fockisFriendsApi from "../../gifts/fockisprofile/service/fockisFriendsApi";
import { eventsApi } from "../services/eventsApi";
import EventAvatar from "./EventAvatar";

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

function toFriend(raw: any): Friend | null {
  const user = raw?.user ?? raw?.friend ?? raw;
  const id = String(user?._id ?? user?.id ?? user?.userId ?? "");

  if (!/^[a-f0-9]{24}$/i.test(id)) return null;

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.name || user?.username || "Friend";

  return {
    id,
    name: String(name),
    username: String(user?.username ?? ""),
    avatar: String(user?.profilePicture ?? user?.avatar ?? ""),
  };
}

interface Props {
  eventId: string;
  onClose: () => void;
  onInvited?: (count: number) => void;
}

/** Organizer-only: invite friends (grants access to private events). */
export default function EventInviteDialog({ eventId, onClose, onInvited }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    fockisFriendsApi
      .getMyFriends()
      .then((list) => {
        if (!alive) return;

        const unique = new Map<string, Friend>();

        list.map(toFriend).forEach((friend) => {
          if (friend) unique.set(friend.id, friend);
        });

        setFriends(Array.from(unique.values()));
      })
      .catch((caught) => {
        if (alive) setError(caught instanceof Error ? caught.message : "Could not load your friends.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    dialog.current?.focus();

    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return q ? friends.filter((friend) => `${friend.name} ${friend.username}`.toLowerCase().includes(q)) : friends;
  }, [friends, search]);

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  async function send() {
    if (!selected.size || sending) return;

    setSending(true);
    setError("");

    try {
      const result = await eventsApi.invite(eventId, Array.from(selected));

      setDone(`Invited ${result.invited.length} ${result.invited.length === 1 ? "person" : "people"}.`);
      setSelected(new Set());
      onInvited?.(result.invited.length);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send invites.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fke-modal" role="presentation" onClick={onClose}>
      <div
        className="fke-modal__dialog fk-social-scope"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fke-invite-title"
        tabIndex={-1}
        ref={dialog}
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <header className="fke-modal__header">
          <h2 id="fke-invite-title">Invite friends</h2>
          <button type="button" className="fke-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <input
          type="search"
          className="fke-input"
          placeholder="Search friends"
          value={search}
          onChange={(changeEvent) => setSearch(changeEvent.target.value)}
          aria-label="Search friends"
        />

        {loading && <p className="fke-muted">Loading friends…</p>}
        {!loading && !error && friends.length === 0 && <p className="fke-muted">You don't have any friends to invite yet.</p>}
        {error && <p className="fke-error-text" role="alert">{error}</p>}
        {done && <p className="fke-success-text" role="status">{done}</p>}

        <ul className="fke-invite-list">
          {filtered.map((friend) => {
            const checked = selected.has(friend.id);

            return (
              <li key={friend.id}>
                <label className={`fke-invite-row ${checked ? "is-checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(friend.id)} />
                  <EventAvatar name={friend.name} src={friend.avatar} size={36} />
                  <span className="fke-truncate">
                    <strong>{friend.name}</strong>
                    {friend.username && <small>@{friend.username}</small>}
                  </span>
                  <span className="fke-invite-row__check" aria-hidden="true">
                    {checked && <Check size={15} />}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <footer className="fke-modal__footer">
          <button type="button" className="fke-btn fke-btn--ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="fke-btn fke-btn--primary" disabled={!selected.size || sending} onClick={send}>
            {sending ? "Sending…" : `Invite${selected.size ? ` ${selected.size}` : ""}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
