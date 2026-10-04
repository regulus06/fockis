/*
 * ============================================================================
 * FOCKIS PROFILE CARD
 * ============================================================================
 *
 * Main visual profile card for the Fockis profile page.
 *
 * IMPORTANT:
 * - Friendship / follow controls are handled by FockisProfilePage.
 * - Cover photo, avatar, display name, and username are handled by
 *   FockisProfileHeader.
 * - This component displays:
 *     • Bio
 *     • Profile statistics
 *     • Location
 *     • Website
 *     • Joined date
 *     • Edit Profile button for the owner
 * ============================================================================
 */

import React from "react";

import type {
  FockisProfile,
  FockisUser,
} from "../types/fockisprofiletypes";

export interface FockisProfileCardProps {
  profile: FockisProfile;
  canEdit?: boolean;
  onEditProfile?: () => void;
}

function formatNumber(value?: number): string {
  if (value === undefined || value === null) {
    return "0";
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(
      value >= 10_000_000 ? 0 : 1,
    )}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(
      value >= 10_000 ? 0 : 1,
    )}K`;
  }

  return value.toLocaleString();
}

function normalizeWebsiteUrl(website: string): string {
  const trimmed = website.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function FockisProfileCard({
  profile,
  canEdit = false,
  onEditProfile,
}: FockisProfileCardProps) {
  const user: FockisUser = profile.user;
  const stats = profile.stats;

  /*
   * Followers/following are now supplied by the follow collection through
   * useFockisProfile. The card deliberately does not calculate these from
   * friends or posts.
   */
  const postsCount = Number(stats?.posts ?? 0);
  const friendsCount = Number(stats?.friends ?? 0);
  const followersCount = Number(stats?.followers ?? 0);

  return (
    <section className="fk-profile-card">
      <div className="fk-profile-card__body">
        {user.bio && (
          <div className="fk-profile-card__bio">
            <p className="fk-profile-card__bio-title">
              About
            </p>

            <p className="fk-profile-card__bio-text">
              {user.bio}
            </p>
          </div>
        )}

        <div className="fk-profile-card__stats fk-profile-card__stats--inline">
          <span className="fk-profile-card__stat-inline">
            <span className="fk-profile-card__stat-number">
              {formatNumber(postsCount)}
            </span>{" "}
            <span className="fk-profile-card__stat-label">
              Posts
            </span>
          </span>

          <span
            className="fk-profile-card__stat-dot"
            aria-hidden="true"
          >
            {"\u00A0\u00B7\u00A0"}
          </span>

          <span className="fk-profile-card__stat-inline">
            <span className="fk-profile-card__stat-number">
              {formatNumber(friendsCount)}
            </span>{" "}
            <span className="fk-profile-card__stat-label">
              Friends
            </span>
          </span>

          <span
            className="fk-profile-card__stat-dot"
            aria-hidden="true"
          >
            {"\u00A0\u00B7\u00A0"}
          </span>

          <span className="fk-profile-card__stat-inline">
            <span className="fk-profile-card__stat-number">
              {formatNumber(followersCount)}
            </span>{" "}
            <span className="fk-profile-card__stat-label">
              Followers
            </span>
          </span>
        </div>

        {(user.location ||
          user.website ||
          user.joinedDate) && (
          <div className="fk-profile-card__meta">
            {user.location && (
              <span className="fk-profile-card__meta-item">
                📍 {user.location}
              </span>
            )}

            {user.website && (
              <a
                href={normalizeWebsiteUrl(user.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="fk-profile-card__meta-item"
              >
                🔗 Website
              </a>
            )}

            {user.joinedDate && (
              <span className="fk-profile-card__meta-item">
                Joined{" "}
                {new Date(user.joinedDate).toLocaleDateString(
                  undefined,
                  {
                    month: "long",
                    year: "numeric",
                  },
                )}
              </span>
            )}
          </div>
        )}

        {canEdit && onEditProfile && (
          <div className="fk-profile-card__actions">
            <button
              type="button"
              className="fk-profile-card__button fk-profile-card__button--primary"
              onClick={onEditProfile}
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
