/* ============================================================================
   FOCKIS PROFILE HERO
   Layered identity panel: a wide cover band, then a glass identity panel
   that overlaps it, with an information column (avatar frame, name, handle,
   bio, details) and a separate stats + action column.
============================================================================ */

import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BadgeCheck,
  CalendarDays,
  Camera,
  Link2,
  LoaderCircle,
  Lock,
  MapPin,
} from "lucide-react";

import type { FockisUser } from "../types/fockisprofiletypes";

import "../../../../styles/FockisProfileHeader.scss";

export interface FockisProfileHeroStat {
  label: string;
  value: number | null;
  onClick?: () => void;
}

interface Props {
  user?: FockisUser;

  onAvatarChange?: (file: File) => void | Promise<void>;

  /** Stats shown in the action column (posts, followers, following, friends). */
  stats?: FockisProfileHeroStat[];

  /** Relationship / owner actions rendered in the action column. */
  actions?: ReactNode;

  /** Shown under the actions (follow/friend errors). */
  notices?: ReactNode;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString();
}

function websiteHref(website: string): string {
  const trimmed = website.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function formatJoined(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function FockisProfileHeader({
  user,
  onAvatarChange,
  stats,
  actions,
  notices,
}: Props) {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    setAvatarPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setUploadingAvatar(false);
    setAvatarFailed(false);
  }, [user?.avatar]);

  useEffect(() => {
    setCoverFailed(false);
  }, [user?.coverImage]);

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploadingAvatar(true);

    try {
      await onAvatarChange?.(file);
    } catch (error) {
      console.error("Avatar upload failed:", error);
      setAvatarPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (!user) {
    return (
      <section className="fk-profile-hero fk-profile-hero--loading" aria-busy="true">
        <div className="fk-profile-hero__cover" />
      </section>
    );
  }

  const displayName = user.name || user.fullName || user.username || "Fockis User";
  const avatarSrc = avatarPreview || (!avatarFailed ? user.avatar : "") || "";
  const coverSrc = !coverFailed ? user.coverImage || user.coverImageUrl || user.bannerUrl || "" : "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "F";
  const verified = Boolean(user.verified || user.isVerified);
  const joined = formatJoined(user.joinedDate || user.createdAt);

  const avatarContent = avatarSrc ? (
    <img src={avatarSrc} alt="" onError={() => setAvatarFailed(true)} />
  ) : (
    <span className="fk-profile-hero__initial" aria-hidden="true">
      {initial}
    </span>
  );

  return (
    <section className="fk-profile-hero" aria-label={`${displayName}'s profile`}>
      {/* COVER */}
      <div className={`fk-profile-hero__cover${coverSrc ? "" : " is-empty"}`}>
        {coverSrc && <img src={coverSrc} alt="" onError={() => setCoverFailed(true)} />}
        <span className="fk-profile-hero__cover-shade" aria-hidden="true" />
      </div>

      {/* IDENTITY PANEL */}
      <div className="fk-profile-hero__panel">
        <div className="fk-profile-hero__identity">
          <div className="fk-profile-hero__frame">
            {onAvatarChange ? (
              <button
                type="button"
                className="fk-profile-hero__avatar fk-profile-hero__avatar--editable"
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Change profile photo"
                disabled={uploadingAvatar}
              >
                {avatarContent}
                <span className="fk-profile-hero__avatar-edit" aria-hidden="true">
                  {uploadingAvatar ? <LoaderCircle size={15} className="fk-profile-hero__spin" /> : <Camera size={15} />}
                </span>
              </button>
            ) : (
              <div className="fk-profile-hero__avatar">{avatarContent}</div>
            )}

            {onAvatarChange && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => void handleAvatarFileChange(event)}
              />
            )}
          </div>

          <div className="fk-profile-hero__info">
            <h1 className="fk-profile-hero__name">
              <span>{displayName}</span>
              {verified && (
                <BadgeCheck
                  className="fk-profile-hero__verified"
                  size={22}
                  aria-label="Verified account"
                  role="img"
                />
              )}
            </h1>

            <p className="fk-profile-hero__handle">
              {user.username && <span>@{user.username}</span>}
              {user.isPrivate && (
                <span className="fk-profile-hero__private">
                  <Lock size={12} aria-hidden="true" />
                  Private
                </span>
              )}
            </p>

            {user.bio && <p className="fk-profile-hero__bio">{user.bio}</p>}

            {(user.location || user.website || joined) && (
              <ul className="fk-profile-hero__details">
                {user.location && (
                  <li>
                    <MapPin size={14} aria-hidden="true" />
                    {user.location}
                  </li>
                )}
                {user.website && (
                  <li>
                    <Link2 size={14} aria-hidden="true" />
                    <a href={websiteHref(user.website)} target="_blank" rel="noopener noreferrer">
                      {user.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}
                    </a>
                  </li>
                )}
                {joined && (
                  <li>
                    <CalendarDays size={14} aria-hidden="true" />
                    Joined {joined}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="fk-profile-hero__side">
          {stats && stats.length > 0 && (
            <ul className="fk-profile-hero__stats" aria-label="Profile statistics">
              {stats.map((stat) => {
                const value = stat.value === null ? "—" : formatNumber(stat.value);
                const content = (
                  <>
                    <strong className="fk-profile-hero__stat-value">{value}</strong>
                    <span className="fk-profile-hero__stat-label">{stat.label}</span>
                  </>
                );
                return (
                  <li key={stat.label} className="fk-profile-hero__stat">
                    {stat.onClick ? (
                      <button type="button" onClick={stat.onClick} aria-label={`${value} ${stat.label}`}>
                        {content}
                      </button>
                    ) : (
                      <span className="fk-profile-hero__stat-static">{content}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {actions && <div className="fk-profile-hero__actions">{actions}</div>}
          {notices}
        </div>
      </div>
    </section>
  );
}
