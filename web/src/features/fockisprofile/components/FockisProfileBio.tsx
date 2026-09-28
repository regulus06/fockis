import type { FockisUser } from "../types/fockisprofiletypes";
import "../../../styles/FockisProfileBio.scss";

interface Props {
  user?: FockisUser;
}

export default function FockisProfileBio({ user }: Props) {
  if (!user) {
    return null;
  }

  return (
    <div className="fk-profile-bio">
      {user.bio ? (
        <p>{user.bio}</p>
      ) : (
        <p className="fk-profile-bio__empty">
          No bio added yet.
        </p>
      )}

      <div className="fk-profile-bio__details">
        {user.website && (
          <span>
            🌐 {user.website}
          </span>
        )}

        {user.location && (
          <span>
            📍 {user.location}
          </span>
        )}

        {user.joinedDate && (
          <span>
            📅 Joined {user.joinedDate}
          </span>
        )}
      </div>
    </div>
  );
}