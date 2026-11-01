import { useState, type FormEvent } from "react";
import { ChevronDown, MessageCircle, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { FOCKIS_API_URL } from "../../../../config/fockisConfig";
import NotificationBell from "../../../notifications/components/NotificationBell";
import { useFockisProfile } from "../../../gifts/fockisprofile/hooks/useFockisProfile";

interface ProfileUser {
  avatar?: string;
  profilePicture?: string;
  username?: string;
  fullName?: string;
  name?: string;
}

/**
 * Top bar for the Events section: global Fockis search (sent to the
 * Events search, the only search this section owns), Create, the real
 * NotificationBell, Messages and the viewer's avatar.
 */
export default function EventsTopBar({ onSearch }: { onSearch?: (query: string) => void }) {
  const navigate = useNavigate();
  const { profile } = useFockisProfile();
  const user = (profile as unknown as { user?: ProfileUser } | null | undefined)?.user;
  const [query, setQuery] = useState("");
  const name = user?.fullName || user?.name || user?.username || "";
  const rawAvatar = user?.avatar || user?.profilePicture || "";
  // Same resolution as the sidebar profile card.
  const avatar = !rawAvatar
    ? ""
    : /^(https?:|blob:|data:)/.test(rawAvatar)
      ? rawAvatar
      : `${FOCKIS_API_URL}${rawAvatar.startsWith("/") ? "" : "/"}${rawAvatar}`;

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();

    const text = query.trim();

    if (onSearch) onSearch(text);
    else navigate(text ? `/events?q=${encodeURIComponent(text)}` : "/events");
  };

  return (
    <div className="fkd-topbar">
      <form className="fkd-topbar__search" role="search" onSubmit={submit}>
        <Search size={20} aria-hidden="true" />
        <label className="fke-sr-only" htmlFor="fkd-global-search">
          Search Fockis
        </label>
        <input
          id="fkd-global-search"
          type="search"
          value={query}
          onChange={(changeEvent) => setQuery(changeEvent.target.value)}
          placeholder="Search Fockis (people, events, groups, and more)..."
        />
      </form>

      <div className="fkd-topbar__actions">
        <Link to="/events/create" className="fkd-topbar__create" aria-label="Create event" title="Create event">
          <Plus size={22} strokeWidth={2.6} aria-hidden="true" />
        </Link>

        <div className="fkd-topbar__icon fkd-topbar__bell">
          <NotificationBell />
        </div>

        <Link to="/messages" className="fkd-topbar__icon" aria-label="Messages" title="Messages">
          <MessageCircle size={23} aria-hidden="true" />
        </Link>

        <Link to="/profile" className="fkd-topbar__me" aria-label={name ? `Your profile, ${name}` : "Your profile"}>
          <span className="fkd-topbar__avatar">
            {avatar ? <img src={avatar} alt="" /> : <span>{(name.charAt(0) || "F").toUpperCase()}</span>}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
