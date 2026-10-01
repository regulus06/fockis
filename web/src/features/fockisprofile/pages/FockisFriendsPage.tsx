import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import React, { useState } from "react";

import {
  Users,
  UserPlus,
  Sparkles,
  MapPin,
} from "lucide-react";

import { Link } from "react-router-dom";

import {
  useFockisFriends,
} from "../hooks/useFockisFriends";

import {
  useFockisFriendSuggestions,
} from "../hooks/useFockisFriendSuggestions";

import FockisFriendSearch from "../components/FockisFriendSearch";
import FockisProfileFriends from "../components/FockisProfileFriends";
import FockisFriendButton from "../components/FockisFriendButton";

import "../../../styles/FockisFriendsPage.scss";

type TabKey =
  | "friends"
  | "requests"
  | "suggestions";

interface Props {
  initialTab?: TabKey;
}

function getUser(value: any): any | null {
  if (!value) {
    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  return value;
}

function getUserId(value: any): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return value?._id || value?.id || "";
}

function getName(user: any): string {
  if (!user) {
    return "Unknown User";
  }

  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.fullName ||
    user.username ||
    "Unknown User"
  );
}

function getAvatar(user: any): string | null {
  return (
    user?.avatar ||
    user?.profileImage ||
    user?.profilePicture ||
    null
  );
}

function getImageUrl(src: string | null): string | null {
  if (!src) {
    return null;
  }

  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL ||
    FOCKIS_API_URL;

  if (src.startsWith("/")) {
    return `${apiUrl}${src}`;
  }

  return `${apiUrl}/${src}`;
}

function getInitial(user: any): string {
  return getName(user)
    .charAt(0)
    .toUpperCase();
}

export default function FockisFriendsPage({
  initialTab = "friends",
}: Props) {
  const [
    activeTab,
    setActiveTab,
  ] = useState<TabKey>(
    initialTab,
  );

  const {
    friends,
    incomingRequests,
    acceptRequest,
    rejectRequest,
  } = useFockisFriends();

  const {
    suggestions,
  } = useFockisFriendSuggestions();

  const tabs: {
    key: TabKey;
    label: string;
    count?: number;
  }[] = [
    {
      key: "friends",
      label: "My Friends",
      count: friends.length,
    },
    {
      key: "requests",
      label: "Friend Requests",
      count: incomingRequests.length,
    },
    {
      key: "suggestions",
      label: "People You May Know",
    },
  ];

  return (
    <div className="fk-friends-page">

      {/* ============================================================ */}
      {/* HEADER                                                       */}
      {/* ============================================================ */}

      <header className="fk-friends-page__header">

        <div className="fk-friends-page__title-area">

          <div className="fk-friends-page__icon">
            <Users size={26} />
          </div>

          <div>
            <h1>
              Friends
            </h1>

            <p>
              Connect with people on Fockis
            </p>
          </div>

        </div>

      </header>

      {/* ============================================================ */}
      {/* SEARCH                                                       */}
      {/* ============================================================ */}

      <FockisFriendSearch />

      {/* ============================================================ */}
      {/* TABS                                                         */}
      {/* ============================================================ */}

      <nav className="fk-friend-tabs">

        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={
              `fk-friend-tabs__tab ${
                activeTab === tab.key
                  ? "fk-friend-tabs__tab--active"
                  : ""
              }`
            }
            onClick={() => {
              setActiveTab(tab.key);
            }}
          >
            {tab.label}

            {typeof tab.count === "number" &&
              tab.count > 0 && (
                <span className="fk-friend-tabs__count">
                  {tab.count}
                </span>
              )}
          </button>
        ))}

      </nav>

      {/* ============================================================ */}
      {/* FRIEND REQUESTS                                              */}
      {/* ============================================================ */}

      {activeTab === "requests" && (
        <section className="fk-friends-section">

          <div className="fk-friends-section__header">

            <div className="fk-friends-section__heading">

              <div className="fk-friends-section__heading-icon">
                <UserPlus size={20} />
              </div>

              <div>

                <h2>
                  Friend Requests
                </h2>

                <p>
                  People who want to connect with you
                </p>

              </div>

            </div>

          </div>

          {incomingRequests.length === 0 ? (

            <div className="fk-friends-empty">

              <h3>
                No friend requests
              </h3>

              <p>
                New friend requests will appear here.
              </p>

            </div>

          ) : (

            <div className="fk-friend-requests-grid">

              {incomingRequests.map((request: any) => {

                /*
                 * CURRENT BACKEND:
                 *
                 * request.requester = populated User
                 *
                 * Compatibility:
                 * requesterId / sender / user
                 */

                const requesterValue =
                  request?.requester ??
                  request?.requesterId ??
                  request?.sender ??
                  request?.user;

                const requester =
                  getUser(requesterValue);

                const userId =
                  getUserId(requesterValue);

                const name =
                  getName(requester);

                const avatar =
                  getImageUrl(
                    getAvatar(requester),
                  );

                const requestId =
                  request?._id ??
                  request?.id ??
                  "";

                const profilePath =
                  userId
                    ? `/profile/${userId}`
                    : "#";

                return (
                  <article
                    key={requestId}
                    className="fk-rail-card fk-rail-card--request"
                  >

                    {/* PROFILE */}

                    <Link
                      to={profilePath}
                      className="fk-rail-card__profile-link"
                      onClick={(event) => {
                        if (!userId) {
                          event.preventDefault();
                        }
                      }}
                    >

                      <div className="fk-rail-card__photo">

                        {avatar ? (

                          <img
                            src={avatar}
                            alt={name}
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";

                              const fallback =
                                event.currentTarget
                                  .parentElement
                                  ?.querySelector(
                                    ".fk-rail-card__initial",
                                  ) as HTMLElement | null;

                              if (fallback) {
                                fallback.style.display =
                                  "flex";
                              }
                            }}
                          />

                        ) : null}

                        <div
                          className="fk-rail-card__initial"
                          style={{
                            display: avatar
                              ? "none"
                              : "flex",
                          }}
                        >
                          {getInitial(requester)}
                        </div>

                      </div>

                      <div className="fk-rail-card__body">

                        <h3>
                          {name}
                        </h3>

                        {requester?.username && (
                          <p className="fk-rail-card__meta">
                            @{requester.username}
                          </p>
                        )}

                        {requester?.location && (
                          <p className="fk-rail-card__meta">
                            <MapPin size={13} />
                            {requester.location}
                          </p>
                        )}

                      </div>

                    </Link>

                    {/* ACTIONS */}

                    <div className="fk-rail-card__actions">

                      <button
                        type="button"
                        className="fk-rail-card__btn fk-rail-card__btn--primary"
                        disabled={!requestId}
                        onClick={() => {
                          if (requestId) {
                            void acceptRequest(
                              requestId,
                            );
                          }
                        }}
                      >
                        Confirm
                      </button>

                      <button
                        type="button"
                        className="fk-rail-card__btn fk-rail-card__btn--ghost"
                        disabled={!requestId}
                        onClick={() => {
                          if (requestId) {
                            void rejectRequest(
                              requestId,
                            );
                          }
                        }}
                      >
                        Delete
                      </button>

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>
      )}

      {/* ============================================================ */}
      {/* MY FRIENDS                                                   */}
      {/* ============================================================ */}

      {activeTab === "friends" && (
        <section className="fk-friends-section">

          <FockisProfileFriends
            friends={friends}
          />

        </section>
      )}

      {/* ============================================================ */}
      {/* SUGGESTIONS                                                  */}
      {/* ============================================================ */}

      {activeTab === "suggestions" && (
        <section className="fk-friends-section">

          <div className="fk-friends-section__header">

            <div className="fk-friends-section__heading">

              <div className="fk-friends-section__heading-icon">
                <Sparkles size={20} />
              </div>

              <div>

                <h2>
                  People You May Know
                </h2>

                <p>
                  Discover people you might want to connect with
                </p>

              </div>

            </div>

          </div>

          {suggestions.length === 0 ? (

            <div className="fk-friends-empty">

              <h3>
                No suggestions right now
              </h3>

              <p>
                Check back later.
              </p>

            </div>

          ) : (

            <div className="fk-friend-requests-grid">

              {suggestions.map((suggestion: any) => {

                const userId =
                  suggestion?.id ??
                  suggestion?._id ??
                  "";

                const name =
                  suggestion?.fullName ||
                  getName(suggestion);

                const avatar =
                  getImageUrl(
                    suggestion?.avatar ||
                    suggestion?.profileImage ||
                    suggestion?.profilePicture ||
                    null,
                  );

                const profilePath =
                  userId
                    ? `/profile/${userId}`
                    : "#";

                return (
                  <article
                    key={userId}
                    className="fk-rail-card fk-rail-card--suggestion"
                  >

                    <Link
                      to={profilePath}
                      className="fk-rail-card__profile-link"
                      onClick={(event) => {
                        if (!userId) {
                          event.preventDefault();
                        }
                      }}
                    >

                      <div className="fk-rail-card__photo">

                        {avatar ? (

                          <img
                            src={avatar}
                            alt={name}
                          />

                        ) : (

                          <div className="fk-rail-card__initial">
                            {name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                        )}

                      </div>

                      <div className="fk-rail-card__body">

                        <h3>
                          {name}
                        </h3>

                        {suggestion?.username && (
                          <p className="fk-rail-card__meta">
                            @{suggestion.username}
                          </p>
                        )}

                      </div>

                    </Link>

                    <div className="fk-rail-card__actions">

                      <FockisFriendButton
                        userId={userId}
                      />

                    </div>

                  </article>
                );
              })}

            </div>

          )}

        </section>
      )}

    </div>
  );
}