import { FOCKIS_API_URL } from "../../config/fockisConfig";

import "../styles/chat-header.scss";

import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  Search,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import type { Participant } from "../types";

import {
  formatLastSeen,
} from "../utils/dateHelpers";

import {
  messageSocket,
} from "../services/messageSocket";

import {
  useCallStore,
} from "../store/callStore";

interface ChatHeaderProps {
  title: string;
  avatar?: string;
  participant?: Participant;
  onBack?: () => void;
  onToggleInfo: () => void;
  onSearch: () => void;
}

/*
 * ============================================================================
 * MEDIA URL NORMALIZATION
 * ============================================================================
 *
 * Supports:
 *
 *   /uploads/avatar.jpg
 *   uploads/avatar.jpg
 *   http://localhost:3000/uploads/avatar.jpg
 *   https://...
 *   blob:...
 *   data:...
 */
function normalizeMediaUrl(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const trimmed =
    String(value).trim();

  if (!trimmed) {
    return "";
  }

  /*
   * Already an absolute/browser-supported URL.
   */
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  const apiBase =
    import.meta.env.VITE_API_URL ||
    FOCKIS_API_URL;

  const cleanBase =
    apiBase.replace(/\/+$/, "");

  /*
   * /uploads/...
   */
  if (trimmed.startsWith("/")) {
    return `${cleanBase}${trimmed}`;
  }

  /*
   * uploads/...
   */
  return `${cleanBase}/${trimmed}`;
}

export default function ChatHeader({
  title,
  avatar,
  participant,
  onBack,
  onToggleInfo,
  onSearch,
}: ChatHeaderProps) {
  const navigate =
    useNavigate();

  /*
   * ==========================================================================
   * PROFILE INFORMATION
   * ==========================================================================
   */

  const profileName =
    title ||
    participant?.name ||
    "Fockis user";

  const profileInitial =
    profileName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "F";

  /*
   * ==========================================================================
   * PROFILE PHOTO
   * ==========================================================================
   *
   * The participant is the person we are chatting with.
   */
  const participantAvatar =
    normalizeMediaUrl(
      participant?.avatar,
    );

  const conversationAvatar =
    normalizeMediaUrl(
      avatar,
    );

  const headerAvatar =
    participantAvatar ||
    conversationAvatar ||
    "";

  const isOnline =
    participant?.presence ===
    "online";

  /*
   * ==========================================================================
   * OPEN PARTICIPANT PROFILE
   * ==========================================================================
   */

  function handleOpenProfile(): void {
    if (!participant?.id) {
      console.warn(
        "[FOCKIS PROFILE] Cannot open profile: missing participant id.",
      );

      return;
    }

    const profileUserId =
      String(
        participant.id,
      ).trim();

    if (!profileUserId) {
      return;
    }

    navigate(
      `/messages/profile/${encodeURIComponent(
        profileUserId,
      )}`,
    );
  }

  /*
   * ==========================================================================
   * START OUTGOING CALL
   * ==========================================================================
   */

  async function startOutgoingCall(
    type: "voice" | "video",
  ): Promise<void> {
    if (!participant?.id) {
      console.warn(
        `[FOCKIS CALL] Cannot start ${type} call: missing participant id`,
      );

      return;
    }

    const receiverId =
      String(
        participant.id,
      ).trim();

    if (!receiverId) {
      console.warn(
        `[FOCKIS CALL] Cannot start ${type} call: empty participant id`,
      );

      return;
    }

    try {
      const result =
        await messageSocket.startCall(
          receiverId,
          type,
        );

      console.log(
        "[FOCKIS CALL] Start call result:",
        result,
      );

      if (
        !result?.success ||
        !result.callId
      ) {
        console.error(
          "[FOCKIS CALL] Failed to start call:",
          result?.message ||
            "The call server did not return a callId.",
        );

        return;
      }

      const callId =
        String(
          result.callId,
        ).trim();

      /*
       * Store the REAL backend callId.
       *
       * Never generate the call ID on the frontend.
       */
      useCallStore
        .getState()
        .startOutgoingCall({
          id: callId,

          /*
           * The backend identifies the caller from JWT.
           */
          callerId: "",

          receiverId,

          type,

          createdAt:
            new Date().toISOString(),

          participantName:
            profileName,

          participantAvatar:
            headerAvatar ||
            undefined,
        });
    } catch (error) {
      console.error(
        `[FOCKIS CALL] Failed to start ${type} call:`,
        error,
      );
    }
  }

  /*
   * ==========================================================================
   * VOICE CALL
   * ==========================================================================
   */

  function handleVoiceCall(): void {
    void startOutgoingCall(
      "voice",
    );
  }

  /*
   * ==========================================================================
   * VIDEO CALL
   * ==========================================================================
   */

  function handleVideoCall(): void {
    void startOutgoingCall(
      "video",
    );
  }

  /*
   * ==========================================================================
   * RENDER
   * ==========================================================================
   */

  return (
    <div className="chat-header">
      <div className="chat-header__left">
        {onBack && (
          <button
            type="button"
            className="chat-header__back"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowLeft
              size={20}
            />
          </button>
        )}

        {/* ================================================================
            CLICKABLE FOCKIS PROFILE PHOTO
        ================================================================ */}

        <button
          type="button"
          className="chat-header__avatar chat-header__avatar-button"
          onClick={
            handleOpenProfile
          }
          disabled={
            !participant?.id
          }
          aria-label={`Open ${profileName}'s profile`}
          title={`Open ${profileName}'s profile`}
        >
          {headerAvatar ? (
            <>
              <img
                src={headerAvatar}
                alt={profileName}
                className="chat-header__avatar-image"
                loading="eager"
                onError={(
                  event,
                ) => {
                  console.error(
                    "[FOCKIS PROFILE PHOTO] Failed to load:",
                    headerAvatar,
                  );

                  /*
                   * Hide the broken image.
                   */
                  event.currentTarget.style.display =
                    "none";

                  /*
                   * Display the initial fallback.
                   */
                  const fallback =
                    event.currentTarget
                      .parentElement
                      ?.querySelector(
                        ".chat-header__avatar-fallback",
                      ) as
                      | HTMLElement
                      | null;

                  if (
                    fallback
                  ) {
                    fallback.style.display =
                      "flex";
                  }
                }}
              />

              <span
                className="chat-header__avatar-fallback"
                aria-hidden="true"
                style={{
                  display: "none",
                }}
              >
                {
                  profileInitial
                }
              </span>
            </>
          ) : (
            <span
              className="chat-header__avatar-fallback"
              aria-hidden="true"
            >
              {
                profileInitial
              }
            </span>
          )}

          {isOnline && (
            <span
              className="chat-header__presence-dot"
              aria-label="Online"
            />
          )}
        </button>

        {/* ================================================================
            CLICKABLE PROFILE NAME
        ================================================================ */}

        <div className="chat-header__meta">
          <button
            type="button"
            className="chat-header__name chat-header__name-button"
            onClick={
              handleOpenProfile
            }
            disabled={
              !participant?.id
            }
            title={`Open ${profileName}'s profile`}
          >
            {profileName}
          </button>

          <span className="chat-header__status">
            {isOnline
              ? "Online"
              : participant
                ? formatLastSeen(
                    participant.lastSeen,
                    false,
                  )
                : ""}
          </span>
        </div>
      </div>

      <div className="chat-header__actions">
        {/* ================================================================
            SEARCH
        ================================================================ */}

        <button
          type="button"
          className="chat-header__icon-btn"
          onClick={onSearch}
          aria-label="Search in conversation"
        >
          <Search
            size={19}
          />
        </button>

        {/* ================================================================
            VOICE CALL
        ================================================================ */}

        <button
          type="button"
          className="chat-header__icon-btn"
          onClick={
            handleVoiceCall
          }
          aria-label="Voice call"
          disabled={
            !participant?.id
          }
        >
          <Phone
            size={19}
          />
        </button>

        {/* ================================================================
            VIDEO CALL
        ================================================================ */}

        <button
          type="button"
          className="chat-header__icon-btn"
          onClick={
            handleVideoCall
          }
          aria-label="Video call"
          disabled={
            !participant?.id
          }
        >
          <Video
            size={19}
          />
        </button>

        {/* ================================================================
            CHAT INFO
        ================================================================ */}

        <button
          type="button"
          className="chat-header__icon-btn"
          onClick={
            onToggleInfo
          }
          aria-label="Chat info"
        >
          <Info
            size={19}
          />
        </button>
      </div>
    </div>
  );
}