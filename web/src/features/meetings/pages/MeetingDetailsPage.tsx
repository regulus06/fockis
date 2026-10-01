import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import { useState } from "react";
import {
  useParams,
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  Copy,
  UserPlus,
  Pencil,
  XCircle,
  Sparkles,
  Search,
  Check,
  X,
  Loader2,
  MessageCircle,
  Share2,
  Send,
  Music2,
  Link2,
} from "lucide-react";

import { useMeetingsStore } from "../store/meetingsStore";
import { meetingsApi } from "../services/meetingsApi";

import { InfoRow } from "../components/details/InfoRow";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { EmptyState } from "../components/common/EmptyState";
import { Avatar } from "../components/common/Avatar";

import { MEETING_ROUTES } from "../constants";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/details.scss";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL;

/* ============================================================================
 * TYPES
 * ========================================================================== */

interface FockisUser {
  id: string;
  _id?: string;
  name?: string;
  displayName?: string;
  username?: string;
  email?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
}

interface InviteModalProps {
  meetingId: string;
  meetingTopic: string;
  meetingJoinLink: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

/* ============================================================================
 * AUTH
 * ========================================================================== */

function getToken(): string | null {
  return localStorage.getItem("token");
}

function getHeaders(): HeadersInit {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

/* ============================================================================
 * FACEBOOK ICON
 *
 * lucide-react does not provide a Facebook brand icon.
 * Use a simple branded "f" instead of importing Facebook from lucide-react.
 * ========================================================================== */

function FacebookIcon({
  size = 17,
}: {
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size,
        lineHeight: 1,
        fontWeight: 800,
        fontFamily:
          "Arial, Helvetica, sans-serif",
        color: "#1877F2",
      }}
    >
      f
    </span>
  );
}

/* ============================================================================
 * INVITE MODAL
 * ========================================================================== */

function InviteModal({
  meetingId,
  meetingTopic,
  meetingJoinLink,
  onClose,
  onSuccess,
}: InviteModalProps) {
  const [search, setSearch] =
    useState("");

  const [users, setUsers] =
    useState<FockisUser[]>([]);

  const [selectedUsers, setSelectedUsers] =
    useState<FockisUser[]>([]);

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [searched, setSearched] =
    useState(false);

  /* --------------------------------------------------------------------------
   * INVITATION MESSAGE
   * ------------------------------------------------------------------------ */

  const invitationMessage =
    `You're invited to a Fockis meeting!\n\n` +
    `Meeting: ${meetingTopic}\n\n` +
    `Join the meeting:\n${meetingJoinLink}\n\n` +
    `You can join from the Fockis Meetings app.`;

  /* --------------------------------------------------------------------------
   * SEARCH USERS
   * ------------------------------------------------------------------------ */

  const searchUsers = async () => {
    const value = search.trim();

    if (!value) {
      setUsers([]);
      setSearched(false);
      return;
    }

    setLoadingUsers(true);
    setError(null);
    setSearched(true);

    try {
      const token = getToken();

      if (!token) {
        setError(
          "You are not authenticated. Please sign in again.",
        );
        return;
      }

      let response = await fetch(
        `${API_BASE_URL}/users/search?q=${encodeURIComponent(
          value,
        )}`,
        {
          method: "GET",
          headers: getHeaders(),
          credentials: "include",
        },
      );

      if (!response.ok) {
        response = await fetch(
          `${API_BASE_URL}/users?search=${encodeURIComponent(
            value,
          )}`,
          {
            method: "GET",
            headers: getHeaders(),
            credentials: "include",
          },
        );
      }

      const contentType =
        response.headers.get(
          "content-type",
        ) || "";

      const data =
        contentType.includes(
          "application/json",
        )
          ? await response.json()
          : await response.text();

      if (!response.ok) {
        if (response.status === 401) {
          setError(
            "Your session has expired. Please sign in again.",
          );
        } else {
          setError(
            typeof data === "object" &&
              data !== null &&
              "message" in data
              ? String(
                  (
                    data as {
                      message?: unknown;
                    }
                  ).message ??
                    "Unable to search users.",
                )
              : "Unable to search users.",
          );
        }

        setUsers([]);
        return;
      }

      let results: unknown = data;

      if (
        typeof data === "object" &&
        data !== null &&
        "users" in data
      ) {
        results = (
          data as {
            users?: unknown;
          }
        ).users;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "data" in data
      ) {
        results = (
          data as {
            data?: unknown;
          }
        ).data;
      }

      if (!Array.isArray(results)) {
        results = [];
      }

      const normalizedUsers: FockisUser[] =
        (
          results as FockisUser[]
        ).filter(
          (user) =>
            user &&
            typeof user.id === "string",
        );

      setUsers(normalizedUsers);
    } catch (requestError) {
      console.error(
        "[Meeting Invite] User search failed:",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to search users.",
      );

      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  /* --------------------------------------------------------------------------
   * SELECT USER
   * ------------------------------------------------------------------------ */

  const toggleUser = (
    user: FockisUser,
  ) => {
    setSelectedUsers((current) => {
      const alreadySelected =
        current.some(
          (item) =>
            item.id === user.id,
        );

      if (alreadySelected) {
        return current.filter(
          (item) =>
            item.id !== user.id,
        );
      }

      return [...current, user];
    });
  };

  /* --------------------------------------------------------------------------
   * SEND FOCKIS INVITATIONS
   * ------------------------------------------------------------------------ */

  const sendInvitations = async () => {
    if (
      !meetingId ||
      selectedUsers.length === 0 ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const token = getToken();

      if (!token) {
        setError(
          "You are not authenticated. Please sign in again.",
        );
        return;
      }

      const results = await Promise.all(
        selectedUsers.map(
          async (user) => {
            let response =
              await fetch(
                `${API_BASE_URL}/meetings/${encodeURIComponent(
                  meetingId,
                )}/invite`,
                {
                  method: "POST",
                  headers: getHeaders(),
                  credentials: "include",
                  body: JSON.stringify({
                    userId: user.id,
                  }),
                },
              );

            if (!response.ok) {
              response =
                await fetch(
                  `${API_BASE_URL}/meetings/${encodeURIComponent(
                    meetingId,
                  )}/invitations`,
                  {
                    method: "POST",
                    headers: getHeaders(),
                    credentials: "include",
                    body: JSON.stringify({
                      userId: user.id,
                    }),
                  },
                );
            }

            return response;
          },
        ),
      );

      const failed =
        results.filter(
          (response) =>
            !response.ok,
        );

      if (failed.length > 0) {
        const unauthorized =
          failed.some(
            (response) =>
              response.status === 401,
          );

        if (unauthorized) {
          setError(
            "Your session has expired. Please sign in again.",
          );
        } else {
          setError(
            "Some invitations could not be sent.",
          );
        }

        return;
      }

      onSuccess(
        `${selectedUsers.length} Fockis invitation${
          selectedUsers.length === 1
            ? ""
            : "s"
        } sent successfully.`,
      );

      onClose();
    } catch (requestError) {
      console.error(
        "[Meeting Invite] Send failed:",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send invitations.",
      );
    } finally {
      setSending(false);
    }
  };

  /* --------------------------------------------------------------------------
   * COPY INVITATION
   * ------------------------------------------------------------------------ */

  const copyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(
        invitationMessage,
      );

      onSuccess(
        "Invitation copied. You can paste it anywhere.",
      );

      onClose();
    } catch {
      setError(
        "Unable to copy invitation.",
      );
    }
  };

  /* --------------------------------------------------------------------------
   * WHATSAPP
   * ------------------------------------------------------------------------ */

  const shareToWhatsApp = () => {
    const url =
      `https://wa.me/?text=${encodeURIComponent(
        invitationMessage,
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer",
    );
  };

  /* --------------------------------------------------------------------------
   * FACEBOOK
   * ------------------------------------------------------------------------ */

  const shareToFacebook = () => {
    const url =
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        meetingJoinLink,
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer,width=700,height=600",
    );
  };

  /* --------------------------------------------------------------------------
   * MESSENGER
   * ------------------------------------------------------------------------ */

  const shareToMessenger = async () => {
    /*
     * Messenger's web share/dialog flow requires a Facebook App ID.
     * Rather than using a fake YOUR_FACEBOOK_APP_ID value, copy the
     * invitation so the user can paste it directly into Messenger.
     */

    try {
      await navigator.clipboard.writeText(
        invitationMessage,
      );

      window.open(
        "https://www.messenger.com/",
        "_blank",
        "noopener,noreferrer",
      );

      onSuccess(
        "Invitation copied. Paste it into Messenger.",
      );

      onClose();
    } catch {
      setError(
        "Unable to prepare the Messenger invitation.",
      );
    }
  };

  /* --------------------------------------------------------------------------
   * TIKTOK
   * ------------------------------------------------------------------------ */

  const shareToTikTok = async () => {
    try {
      await navigator.clipboard.writeText(
        invitationMessage,
      );

      onSuccess(
        "Invitation copied. Paste it into TikTok messages or a TikTok post.",
      );

      onClose();
    } catch {
      setError(
        "Unable to copy invitation for TikTok.",
      );
    }
  };

  /* --------------------------------------------------------------------------
   * NATIVE SHARE
   * ------------------------------------------------------------------------ */

  const nativeShare = async () => {
    if (
      typeof navigator.share !==
      "function"
    ) {
      await copyInvitation();
      return;
    }

    try {
      await navigator.share({
        title: `Fockis Meeting: ${meetingTopic}`,
        text: invitationMessage,
        url: meetingJoinLink,
      });

      onSuccess(
        "Meeting invitation shared successfully.",
      );

      onClose();
    } catch (shareError) {
      if (
        shareError instanceof Error &&
        shareError.name === "AbortError"
      ) {
        return;
      }

      setError(
        "Unable to open the share menu.",
      );
    }
  };

  /* --------------------------------------------------------------------------
   * USER DISPLAY
   * ------------------------------------------------------------------------ */

  const getUserName = (
    user: FockisUser,
  ) =>
    user.displayName ||
    user.name ||
    user.username ||
    user.email ||
    "Fockis User";

  const getUserAvatar = (
    user: FockisUser,
  ) =>
    user.avatarUrl ||
    user.avatar ||
    undefined;

  return (
    <div
      className="fm-invite-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fm-invite-title"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="fm-invite-modal">

        {/* HEADER */}

        <div className="fm-invite-modal__header">
          <div>
            <h2 id="fm-invite-title">
              Invite people
            </h2>

            <p>
              Invite Fockis friends or share
              this meeting through another app.
            </p>
          </div>

          <button
            type="button"
            className="fm-invite-modal__close"
            onClick={onClose}
            aria-label="Close invitation window"
          >
            <X size={19} />
          </button>
        </div>

        {/* SOCIAL SHARING */}

        <div
          style={{
            padding: "18px 24px 8px",
          }}
        >
          <div
            style={{
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 700,
              color: "#6b7280",
            }}
          >
            SHARE MEETING
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >

            {/* WHATSAPP */}

            <button
              type="button"
              onClick={shareToWhatsApp}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minHeight: 42,
                border:
                  "1px solid #e3e6eb",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                color: "#303541",
              }}
            >
              <MessageCircle
                size={17}
              />
              WhatsApp
            </button>

            {/* FACEBOOK */}

            <button
              type="button"
              onClick={shareToFacebook}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minHeight: 42,
                border:
                  "1px solid #e3e6eb",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                color: "#303541",
              }}
            >
              <FacebookIcon size={17} />
              Facebook
            </button>

            {/* MESSENGER */}

            <button
              type="button"
              onClick={() => {
                void shareToMessenger();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minHeight: 42,
                border:
                  "1px solid #e3e6eb",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                color: "#303541",
              }}
            >
              <Send size={17} />
              Messenger
            </button>

            {/* TIKTOK */}

            <button
              type="button"
              onClick={() => {
                void shareToTikTok();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minHeight: 42,
                border:
                  "1px solid #e3e6eb",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                color: "#303541",
              }}
            >
              <Music2 size={17} />
              TikTok
            </button>

            {/* NATIVE SHARE */}

            <button
              type="button"
              onClick={() => {
                void nativeShare();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minHeight: 42,
                border:
                  "1px solid #e3e6eb",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                color: "#303541",
              }}
            >
              <Share2 size={17} />
              Share
            </button>

            {/* COPY */}

            <button
              type="button"
              onClick={() => {
                void copyInvitation();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minHeight: 42,
                border:
                  "1px solid #e3e6eb",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                color: "#303541",
              }}
            >
              <Link2 size={17} />
              Copy
            </button>

          </div>
        </div>

        {/* DIVIDER */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 24px",
            color: "#9ca3af",
            fontSize: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "#eef0f4",
            }}
          />

          <span>
            OR INVITE FOCKIS FRIENDS
          </span>

          <div
            style={{
              flex: 1,
              height: 1,
              background: "#eef0f4",
            }}
          />
        </div>

        {/* SEARCH */}

        <div className="fm-invite-search">
          <Search size={17} />

          <input
            type="text"
            value={search}
            placeholder="Search Fockis friends by name, username, or email"
            autoFocus
            onChange={(event) => {
              setSearch(
                event.target.value,
              );
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchUsers();
              }
            }}
          />

          <button
            type="button"
            onClick={() => {
              void searchUsers();
            }}
            disabled={
              loadingUsers ||
              !search.trim()
            }
          >
            {loadingUsers ? (
              <Loader2
                size={15}
                className="fm-spin"
              />
            ) : (
              "Search"
            )}
          </button>
        </div>

        {/* SELECTED USERS */}

        {selectedUsers.length > 0 && (
          <div className="fm-invite-selected">
            <div className="fm-invite-selected__label">
              Selected ({selectedUsers.length})
            </div>

            <div className="fm-invite-selected__list">
              {selectedUsers.map(
                (user) => (
                  <button
                    type="button"
                    key={user.id}
                    className="fm-invite-selected__user"
                    onClick={() =>
                      toggleUser(user)
                    }
                  >
                    <Avatar
                      name={getUserName(user)}
                      imageUrl={getUserAvatar(
                        user,
                      )}
                      size="sm"
                    />

                    <span>
                      {getUserName(user)}
                    </span>

                    <X size={13} />
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="fm-form-error">
            {error}
          </div>
        )}

        {/* RESULTS */}

        <div className="fm-invite-results">

          {loadingUsers && (
            <div className="fm-invite-empty">
              <Loader2
                size={24}
                className="fm-spin"
              />

              <span>
                Searching Fockis users...
              </span>
            </div>
          )}

          {!loadingUsers &&
            searched &&
            users.length === 0 && (
              <div className="fm-invite-empty">
                <UsersIconFallback />

                <strong>
                  No users found
                </strong>

                <span>
                  Try another name, username,
                  or email address.
                </span>
              </div>
            )}

          {!loadingUsers &&
            users.length > 0 && (
              <div className="fm-invite-user-list">

                {users.map((user) => {
                  const selected =
                    selectedUsers.some(
                      (item) =>
                        item.id ===
                        user.id,
                    );

                  return (
                    <button
                      type="button"
                      key={user.id}
                      className={`fm-invite-user ${
                        selected
                          ? "fm-invite-user--selected"
                          : ""
                      }`}
                      onClick={() =>
                        toggleUser(user)
                      }
                    >
                      <Avatar
                        name={getUserName(
                          user,
                        )}
                        imageUrl={getUserAvatar(
                          user,
                        )}
                        size="md"
                      />

                      <span className="fm-invite-user__info">

                        <strong>
                          {getUserName(user)}
                        </strong>

                        {user.username && (
                          <small>
                            @{user.username}
                          </small>
                        )}

                        {user.email && (
                          <small>
                            {user.email}
                          </small>
                        )}

                      </span>

                      <span
                        className={`fm-invite-user__check ${
                          selected
                            ? "fm-invite-user__check--active"
                            : ""
                        }`}
                      >
                        {selected && (
                          <Check size={15} />
                        )}
                      </span>
                    </button>
                  );
                })}

              </div>
            )}

        </div>

        {/* FOOTER */}

        <div className="fm-invite-modal__footer">

          <Button
            variant="secondary"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            icon={
              sending ? (
                <Loader2
                  size={15}
                  className="fm-spin"
                />
              ) : (
                <UserPlus size={15} />
              )
            }
            onClick={() => {
              void sendInvitations();
            }}
            disabled={
              sending ||
              selectedUsers.length === 0
            }
          >
            {sending
              ? "Sending..."
              : `Invite ${
                  selectedUsers.length > 0
                    ? `(${selectedUsers.length})`
                    : ""
                }`}
          </Button>

        </div>

      </div>
    </div>
  );
}

/* ============================================================================
 * FALLBACK ICON
 * ========================================================================== */

function UsersIconFallback() {
  return (
    <div className="fm-invite-empty__icon">
      <UserPlus size={24} />
    </div>
  );
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export function MeetingDetailsPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate = useNavigate();

  const meeting =
    useMeetingsStore((s) =>
      s.getById(id ?? ""),
    );

  const [message, setMessage] =
    useState<string | null>(null);

  const [cancelling, setCancelling] =
    useState(false);

  const [inviteOpen, setInviteOpen] =
    useState(false);

  if (!meeting) {
    return (
      <div className="fockis-meetings-root fm-page fm-page--light">
        <div className="fm-subpage">
          <EmptyState
            title="Meeting not found"
            description="This meeting may have been cancelled or the link is incorrect."
          />
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
   * NORMALIZE OPTIONAL DATA
   * ------------------------------------------------------------------------ */

  const agenda = Array.isArray(
    meeting.agenda,
  )
    ? meeting.agenda
    : [];

  const secretary =
    meeting.secretary ?? {
      enabled: false,
    };

  const participantCount =
    typeof meeting.participantCount ===
    "number"
      ? meeting.participantCount
      : Array.isArray(
          meeting.participants,
        )
        ? meeting.participants.length
        : 0;

  const start = new Date(
    meeting.startTime,
  );

  const end = meeting.endTime
    ? new Date(meeting.endTime)
    : new Date(
        start.getTime() +
          (meeting.durationMinutes ??
            0) *
            60 *
            1000,
      );

  const timeRange =
    `${start.toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    })} · ${start.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })} – ${end.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;

  /* --------------------------------------------------------------------------
   * COPY LINK
   * ------------------------------------------------------------------------ */

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        meeting.joinLink,
      );

      setMessage(
        "Meeting link copied.",
      );

      window.setTimeout(() => {
        setMessage(null);
      }, 2000);
    } catch {
      setMessage(
        "Unable to copy meeting link.",
      );
    }
  };

  /* --------------------------------------------------------------------------
   * CANCEL
   * ------------------------------------------------------------------------ */

  const cancelMeeting = async () => {
    if (!id || cancelling) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to cancel this meeting?",
      );

    if (!confirmed) {
      return;
    }

    setCancelling(true);

    try {
      const result =
        await meetingsApi.cancel(id);

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      navigate(
        MEETING_ROUTES.root,
      );
    } catch {
      setMessage(
        "Unable to cancel the meeting.",
      );
    } finally {
      setCancelling(false);
    }
  };

  /* --------------------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------------------ */

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">
      <div className="fm-subpage">

        {/* BACK */}

        <Link
          to={MEETING_ROUTES.root}
          className="fm-back-link"
        >
          <ArrowLeft size={14} />
          Back to Meetings
        </Link>

        {/* HERO */}

        <div className="fm-details-hero">

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <h1>
              {meeting.topic}
            </h1>

            {meeting.status ===
              "live" && (
              <Badge
                tone="live"
                dot
              >
                Live
              </Badge>
            )}
          </div>

          <div className="fm-details-hero__time">
            {timeRange}
          </div>

        </div>

        {/* MESSAGE */}

        {message && (
          <div className="fm-dashboard-error">
            {message}
          </div>
        )}

        {/* ACTIONS */}

        <div className="fm-details-actions">

          {/* JOIN */}

          <Link
            to={
              meeting.status ===
              "live"
                ? MEETING_ROUTES.room(
                    meeting.id,
                  )
                : MEETING_ROUTES.lobby(
                    meeting.id,
                  )
            }
          >
            <Button variant="primary">
              Join
            </Button>
          </Link>

          {/* EDIT */}

          <Link
            to={`${MEETING_ROUTES.details(
              meeting.id,
            )}/edit`}
          >
            <Button
              variant="secondary"
              icon={
                <Pencil size={15} />
              }
            >
              Edit
            </Button>
          </Link>

          {/* COPY LINK */}

          <Button
            variant="secondary"
            icon={
              <Copy size={15} />
            }
            onClick={() => {
              void copyLink();
            }}
          >
            Copy link
          </Button>

          {/* INVITE */}

          <Button
            variant="secondary"
            icon={
              <UserPlus size={15} />
            }
            onClick={() =>
              setInviteOpen(true)
            }
          >
            Invite
          </Button>

          {/* CANCEL */}

          {meeting.status !==
            "cancelled" &&
            meeting.status !==
              "ended" && (
              <Button
                variant="ghost"
                icon={
                  <XCircle size={15} />
                }
                onClick={
                  cancelMeeting
                }
                disabled={
                  cancelling
                }
              >
                {cancelling
                  ? "Cancelling..."
                  : "Cancel"}
              </Button>
            )}

        </div>

        {/* DETAILS CARD */}

        <div className="fm-details-card">

          <InfoRow
            label="Host"
            value={
              meeting.hostName
            }
          />

          <InfoRow
            label="Meeting ID"
            value={
              <span className="mono">
                {
                  meeting.meetingCode
                }
              </span>
            }
          />

          <InfoRow
            label="Passcode"
            value={
              <span className="mono">
                {meeting.passcode
                  ? "••••••"
                  : "None"}
              </span>
            }
          />

          <InfoRow
            label="Join link"
            value={
              <span className="mono">
                {meeting.joinLink}
              </span>
            }
          />

          <InfoRow
            label="Participants"
            value={`${participantCount} invited`}
          />

          <InfoRow
            label="AI Secretary"
            value={
              secretary.enabled ? (
                <span
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: 6,
                  }}
                >
                  <Sparkles
                    size={14}
                  />
                  Enabled
                </span>
              ) : (
                "Disabled"
              )
            }
          />

        </div>

        {/* DESCRIPTION */}

        {meeting.description && (
          <div className="fm-details-card">

            <p
              style={{
                padding:
                  "14px 0",
                color: "#2b2e42",
              }}
            >
              {
                meeting.description
              }
            </p>

          </div>
        )}

        {/* AGENDA */}

        {agenda.length > 0 && (
          <div className="fm-details-card">

            <h3
              style={{
                padding:
                  "14px 0 4px",
                fontSize: 15,
              }}
            >
              Agenda
            </h3>

            <ol className="fm-agenda-view">

              {agenda.map(
                (
                  item,
                  index,
                ) => (
                  <li
                    key={
                      item.id ??
                      `${meeting.id}-agenda-${index}`
                    }
                  >
                    <span className="fm-agenda-view__num">
                      {index + 1}
                    </span>

                    {
                      item.title
                    }
                  </li>
                ),
              )}

            </ol>

          </div>
        )}

      </div>

      {/* INVITE MODAL */}

      {inviteOpen &&
        id && (
          <InviteModal
            meetingId={id}
            meetingTopic={
              meeting.topic
            }
            meetingJoinLink={
              meeting.joinLink
            }
            onClose={() =>
              setInviteOpen(false)
            }
            onSuccess={(
              successMessage,
            ) => {
              setInviteOpen(false);

              setMessage(
                successMessage,
              );

              window.setTimeout(
                () => {
                  setMessage(
                    null,
                  );
                },
                3000,
              );
            }}
          />
        )}

    </div>
  );
}

export default MeetingDetailsPage;