import type { ReactNode } from "react";

import {
  AtSign,
  CalendarDays,
  Link2,
  Lock,
  MapPin,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import type { FockisUser } from "../types/fockisprofiletypes";

import "../../../../styles/FockisProfileAbout.scss";

interface Props {
  user: FockisUser;
}

function formatJoined(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="fk-profile-about__item">
      <span className="fk-profile-about__icon">
        <Icon size={17} aria-hidden={true} />
      </span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

/**
 * Only fields the backend returns for a public profile are shown
 * (GET /users/:id never includes email, phone or birth date).
 */
export default function FockisProfileAbout({ user }: Props) {
  const name = user.name || user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ");
  const joined = formatJoined(user.joinedDate || user.createdAt);
  const website = user.website?.trim();

  return (
    <section className="fk-profile-about" aria-labelledby="fk-profile-about-title">
      <div className="fk-profile-about__card">
        <h3 id="fk-profile-about-title">About</h3>
        {user.bio ? (
          <p className="fk-profile-about__bio">{user.bio}</p>
        ) : (
          <p className="fk-profile-about__bio is-empty">No bio added yet.</p>
        )}
      </div>

      <div className="fk-profile-about__card">
        <h3>Details</h3>
        <dl className="fk-profile-about__list">
          <Row icon={UserRound} label="Name">
            {name || "Not provided"}
          </Row>

          {user.username && (
            <Row icon={AtSign} label="Username">
              @{user.username}
            </Row>
          )}

          {user.location && (
            <Row icon={MapPin} label="Location">
              {user.location}
            </Row>
          )}

          {website && (
            <Row icon={Link2} label="Website">
              <a
                href={/^https?:\/\//i.test(website) ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {website.replace(/^https?:\/\//i, "")}
              </a>
            </Row>
          )}

          {joined && (
            <Row icon={CalendarDays} label="Joined">
              {joined}
            </Row>
          )}

          {user.isPrivate && (
            <Row icon={Lock} label="Visibility">
              Private profile
            </Row>
          )}
        </dl>
      </div>
    </section>
  );
}
