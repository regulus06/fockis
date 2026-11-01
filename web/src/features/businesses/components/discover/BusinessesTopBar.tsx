import { useState, type FormEvent } from "react";
import { ChevronDown, MessageCircle, Plus, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { FOCKIS_API_URL } from "../../../../config/fockisConfig";
import NotificationBell from "../../../notifications/components/NotificationBell";
import { useFockisProfile } from "../../../gifts/fockisprofile/hooks/useFockisProfile";
import { CREATE_BUSINESS_ROUTE } from "../../utils/businessUtils";

interface ProfileUser {
  avatar?: string;
  profilePicture?: string;
  username?: string;
  fullName?: string;
  name?: string;
}

/**
 * Top bar: Fockis search (searches businesses — the directory this section
 * owns), Add a business, the real NotificationBell, Messages and avatar.
 */
export default function BusinessesTopBar({ onSearch }: { onSearch?: (query: string) => void }) {
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
    else navigate(text ? `/businesses?q=${encodeURIComponent(text)}` : "/businesses");
  };

  return (
    <div className="fkbd-topbar">
      <form className="fkbd-topbar__search" role="search" onSubmit={submit}>
        <Search size={20} aria-hidden="true" />
        <label className="fkb-visually-hidden" htmlFor="fkbd-global-search">
          Search Fockis businesses
        </label>
        <input
          id="fkbd-global-search"
          type="search"
          value={query}
          onChange={(changeEvent) => setQuery(changeEvent.target.value)}
          placeholder="Search Fockis (people, businesses, events, and more)..."
        />
      </form>

      <div className="fkbd-topbar__actions">
        <Link to={CREATE_BUSINESS_ROUTE} className="fkbd-topbar__create" aria-label="Add a business" title="Add a business">
          <Plus size={22} strokeWidth={2.6} aria-hidden="true" />
        </Link>

        <div className="fkbd-topbar__icon">
          <NotificationBell />
        </div>

        <Link to="/messages" className="fkbd-topbar__icon" aria-label="Messages" title="Messages">
          <MessageCircle size={23} aria-hidden="true" />
        </Link>

        <Link to="/profile" className="fkbd-topbar__me" aria-label={name ? `Your profile, ${name}` : "Your profile"}>
          <span className="fkbd-topbar__avatar">
            {avatar ? <img src={avatar} alt="" /> : <span>{(name.charAt(0) || "F").toUpperCase()}</span>}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
