import type { FockisUser } from "../types/fockisprofiletypes";
import "../../../styles/FockisProfileAbout.scss";

interface Props {
  user: FockisUser;
}

export default function FockisProfileAbout({ user }: Props) {
  return (
    <section className="fk-profile-about">
      <h3>About</h3>

      <div className="fk-profile-about__list">
        <div className="fk-profile-about__item">
          <strong>Name</strong>
          <span>{user.fullName || "Not provided"}</span>
        </div>

        <div className="fk-profile-about__item">
          <strong>Username</strong>
          <span>@{user.username || "unknown"}</span>
        </div>

        {user.location && (
          <div className="fk-profile-about__item">
            <strong>Location</strong>
            <span>📍 {user.location}</span>
          </div>
        )}

        {user.website && (
          <div className="fk-profile-about__item">
            <strong>Website</strong>
            <a
              href={
                user.website.startsWith("http")
                  ? user.website
                  : `https://${user.website}`
              }
              target="_blank"
              rel="noreferrer"
            >
              {user.website}
            </a>
          </div>
        )}

        {user.joinedDate && (
          <div className="fk-profile-about__item">
            <strong>Joined</strong>
            <span>{user.joinedDate}</span>
          </div>
        )}
      </div>
    </section>
  );
}