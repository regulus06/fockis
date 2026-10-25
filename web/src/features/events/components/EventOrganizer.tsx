import { useEffect, useState } from "react";
import { BadgeCheck, UserCheck, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

import fockisFollowApi from "../../gifts/fockisprofile/service/fockisFollowApi";
import type { EventPerson } from "../types/event.types";
import EventAvatar from "./EventAvatar";

interface Props {
  organizer: EventPerson | null;
  creatorId: string;
  isOwner: boolean;
}

/** Organizer row with Follow, using the existing follows API. */
export default function EventOrganizer({ organizer, creatorId, isOwner }: Props) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = organizer?.name || organizer?.username || "Organizer";

  useEffect(() => {
    let alive = true;

    if (isOwner || !creatorId) return;

    fockisFollowApi
      .getStatus(creatorId)
      .then((status) => {
        if (alive) setFollowing(Boolean(status.isFollowing));
      })
      .catch(() => {
        if (alive) setFollowing(null);
      });

    return () => {
      alive = false;
    };
  }, [creatorId, isOwner]);

  async function toggle() {
    if (busy || following === null) return;

    const previous = following;

    setBusy(true);
    setError("");
    setFollowing(!previous);

    try {
      if (previous) await fockisFollowApi.unfollow(creatorId);
      else await fockisFollowApi.follow(creatorId);
    } catch (caught) {
      setFollowing(previous);
      setError(caught instanceof Error ? caught.message : "Could not update follow.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fke-organizer">
      <Link to={`/profile/${creatorId}`} className="fke-organizer__link">
        <EventAvatar name={name} src={organizer?.avatar} size={48} />
        <span>
          <small>Hosted by</small>
          <strong>
            {name}
            {organizer?.verified && <BadgeCheck size={16} className="fke-verified" aria-label="Verified" />}
          </strong>
          {organizer?.username && organizer.username !== name && <em>@{organizer.username}</em>}
        </span>
      </Link>

      {!isOwner && following !== null && (
        <button
          type="button"
          className={`fke-btn ${following ? "fke-btn--ghost" : "fke-btn--outline"}`}
          onClick={toggle}
          disabled={busy}
          aria-pressed={following}
        >
          {following ? <UserCheck size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
          {following ? "Following" : "Follow"}
        </button>
      )}

      {error && (
        <small className="fke-error-text" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
