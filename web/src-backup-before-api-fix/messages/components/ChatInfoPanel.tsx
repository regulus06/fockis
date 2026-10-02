import { useMemo, useState } from 'react';
import {
  X,
  Bell,
  BellOff,
  Star,
  Shield,
  Flag,
  ChevronRight,
  Copy,
  Check,
  Camera,
  Image as ImageIcon,
  Video,
  FileText,
  Link as LinkIcon,
  Play,
} from 'lucide-react';

import type {
  Conversation,
  Message,
  Participant,
} from '../types';

import { formatLastSeen } from '../utils/dateHelpers';

import SharedMedia from './SharedMedia';

import {
  useConversationsStore,
} from '../store/conversationsStore';

import "../styles/chat-info.scss";

/* ============================================================================
   FOCKIS MESSAGES PROFILE
   ----------------------------------------------------------------------------
   This is intentionally separate from the main Fockis social profile.

   It still belongs to the same authenticated Fockis user / participant.
   ============================================================================ */

export interface MessagesProfileData {
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  bio?: string | null;
  fockisId?: string | null;

  /*
   * Optional story/media information.
   *
   * Stories themselves are displayed on the main Fockis Messages page.
   * This panel only gives the contact a profile/media view.
   */
  stories?: MessagesProfileStory[];

  /*
   * Optional profile media preview.
   * These can later be populated directly from the backend.
   */
  media?: MessagesProfileMedia[];
}


export interface MessagesProfileStory {
  id: string;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string | null;
  text?: string | null;
  createdAt?: string;
  expiresAt?: string;
  seen?: boolean;
}


export interface MessagesProfileMedia {
  id: string;
  type: 'image' | 'video' | 'file' | 'link';
  url?: string | null;
  thumbnailUrl?: string | null;
  name?: string | null;
}


/* ============================================================================
   PROPS
   ============================================================================ */

interface ChatInfoPanelProps {
  conversation: Conversation;
  participant?: Participant;

  title: string;
  avatar?: string;

  messages: Message[];

  onClose: () => void;

  onOpenImage: (
    attachments: NonNullable<Message['attachments']>,
    index: number,
  ) => void;

  /*
   * Optional Fockis Messages-specific profile.
   *
   * Existing callers do not have to provide this yet.
   */
  messagesProfile?: MessagesProfileData | null;

  /*
   * Optional callback for opening a story.
   *
   * Stories remain on the main Messages page, but this allows
   * the profile panel to open a story later if desired.
   */
  onOpenStory?: (
    story: MessagesProfileStory,
  ) => void;
}


/* ============================================================================
   COMPONENT
   ============================================================================ */

export default function ChatInfoPanel({
  conversation,
  participant,
  title,
  avatar,
  messages,
  onClose,
  onOpenImage,
  messagesProfile,
  onOpenStory,
}: ChatInfoPanelProps) {

  const toggleMute =
    useConversationsStore(
      (state) => state.toggleMute,
    );


  /* --------------------------------------------------------------------------
     LOCAL UI STATE
     -------------------------------------------------------------------------- */

  const [blocked, setBlocked] =
    useState(false);

  const [showStarred, setShowStarred] =
    useState(false);

  const [copiedFockisId, setCopiedFockisId] =
    useState(false);

  const [showStories, setShowStories] =
    useState(false);


  /* --------------------------------------------------------------------------
     STARRED MESSAGES
     -------------------------------------------------------------------------- */

  const starredMessages =
    messages.filter(
      (message) => message.starred,
    );


  /* --------------------------------------------------------------------------
     FOCKIS MESSAGES PROFILE
     -------------------------------------------------------------------------- */

  const messagesName =
    messagesProfile?.name?.trim() ||
    title;

  const messagesUsername =
    messagesProfile?.username?.trim() ||
    participant?.username?.trim() ||
    '';

  const messagesAvatar =
    messagesProfile?.avatar?.trim() ||
    avatar ||
    participant?.avatar ||
    participant?.profilePicture ||
    '';


  /*
   * Fockis ID is still the public Fockis identity.
   *
   * Never display participant.id.
   */
  const fockisId =
    messagesProfile?.fockisId?.trim() ||
    participant?.fockisId?.trim() ||
    '';


  const messagesBio =
    messagesProfile?.bio?.trim() ||
    '';


  /* --------------------------------------------------------------------------
     STORIES
     -------------------------------------------------------------------------- */

  const activeStories = useMemo(() => {

    const now = Date.now();

    return (
      messagesProfile?.stories?.filter(
        (story) => {

          if (!story.expiresAt) {
            return true;
          }

          const expiresAt =
            new Date(
              story.expiresAt,
            ).getTime();

          return (
            Number.isNaN(expiresAt) ||
            expiresAt > now
          );
        },
      ) ?? []
    );

  }, [
    messagesProfile?.stories,
  ]);


  /* --------------------------------------------------------------------------
     PROFILE MEDIA
     -------------------------------------------------------------------------- */

  const profileMedia =
    messagesProfile?.media ?? [];


  /* --------------------------------------------------------------------------
     COPY FOCKIS ID
     -------------------------------------------------------------------------- */

  const handleCopyFockisId =
    async () => {

      if (!fockisId) {
        return;
      }

      try {

        await navigator.clipboard.writeText(
          fockisId,
        );

        setCopiedFockisId(true);

        window.setTimeout(() => {
          setCopiedFockisId(false);
        }, 1800);

      } catch (error) {

        console.error(
          '[FOCKIS MESSAGES] Failed to copy Fockis ID:',
          error,
        );
      }
    };


  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="chat-info-panel">


      {/* ======================================================================
          HEADER
      ====================================================================== */}

      <div className="chat-info-panel__header">

        <div className="chat-info-panel__header-title">

          <span>
            Fockis Messages
          </span>

        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Fockis Messages profile"
          title="Close"
        >
          <X size={18} />
        </button>

      </div>


      {/* ======================================================================
          PROFILE
      ====================================================================== */}

      <section className="chat-info-panel__profile">

        {/* PROFILE AVATAR */}

        <div className="chat-info-panel__profile-avatar">

          {messagesAvatar ? (
            <img
              src={messagesAvatar}
              alt={messagesName}
            />
          ) : (
            <div
              className="chat-info-panel__profile-avatar-placeholder"
              aria-label="No profile photo"
            >
              <Camera size={28} />
            </div>
          )}


          {participant?.presence === 'online' && (
            <span
              className="chat-info-panel__profile-online"
              aria-label="Online"
            />
          )}

        </div>


        {/* NAME */}

        <h2>
          {messagesName}
        </h2>


        {/* PRESENCE */}

        {participant && (
          <p>
            {formatLastSeen(
              participant.lastSeen,
              participant.presence === 'online',
            )}
          </p>
        )}


        {/* USERNAME */}

        {messagesUsername && (
          <span className="chat-info-panel__username">
            @{messagesUsername}
          </span>
        )}


        {/* BIO */}

        {messagesBio && (
          <p className="chat-info-panel__messages-bio">
            {messagesBio}
          </p>
        )}


        {/* ====================================================================
            FOCKIS ID
        ==================================================================== */}

        {fockisId ? (
          <div className="chat-info-panel__fockis-id">

            <div className="chat-info-panel__fockis-id-content">

              <span className="chat-info-panel__fockis-id-label">
                Fockis ID
              </span>

              <strong>
                {fockisId}
              </strong>

            </div>


            <button
              type="button"
              className="chat-info-panel__copy-btn"
              onClick={handleCopyFockisId}
              aria-label={
                copiedFockisId
                  ? 'Fockis ID copied'
                  : 'Copy Fockis ID'
              }
              title={
                copiedFockisId
                  ? 'Copied'
                  : 'Copy Fockis ID'
              }
            >

              {copiedFockisId ? (
                <Check size={17} />
              ) : (
                <Copy size={17} />
              )}

            </button>

          </div>
        ) : (
          <span className="chat-info-panel__fockis-id-missing">
            Fockis ID unavailable
          </span>
        )}

      </section>


      {/* ======================================================================
          STORIES
          ----------------------------------------------------------------------
          Stories are still primarily displayed on the main Messages page.
          This section only gives access to this contact's active stories
          from the profile panel when story data is available.
      ====================================================================== */}

      {activeStories.length > 0 && (
        <section className="chat-info-panel__section">

          <button
            type="button"
            className="chat-info-panel__section-heading-button"
            onClick={() =>
              setShowStories(
                (value) => !value,
              )
            }
          >

            <div className="chat-info-panel__section-heading">

              <Camera size={17} />

              <span>
                Stories
              </span>

              <span className="chat-info-panel__row-count">
                {activeStories.length}
              </span>

            </div>


            <ChevronRight
              size={16}
              className={[
                'chat-info-panel__chevron',
                showStories
                  ? 'is-open'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            />

          </button>


          {showStories && (
            <div className="chat-info-panel__stories">

              {activeStories.map(
                (story) => (

                  <button
                    type="button"
                    key={story.id}
                    className={[
                      'chat-info-panel__story',
                      story.seen === false
                        ? 'is-unseen'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {

                      if (onOpenStory) {
                        onOpenStory(story);
                      }

                    }}
                  >

                    <div className="chat-info-panel__story-media">

                      {story.type === 'image' &&
                        story.mediaUrl && (
                          <img
                            src={story.mediaUrl}
                            alt=""
                          />
                        )}


                      {story.type === 'video' && (
                        <>
                          {story.mediaUrl ? (
                            <video
                              src={story.mediaUrl}
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <Video size={24} />
                          )}

                          <span className="chat-info-panel__story-play">
                            <Play size={12} fill="currentColor" />
                          </span>
                        </>
                      )}


                      {story.type === 'text' && (
                        <div className="chat-info-panel__story-text">
                          {story.text || 'Story'}
                        </div>
                      )}

                    </div>

                  </button>

                ),
              )}

            </div>
          )}

        </section>
      )}


      {/* ======================================================================
          PROFILE MEDIA
      ====================================================================== */}

      {profileMedia.length > 0 && (
        <section className="chat-info-panel__section">

          <div className="chat-info-panel__section-heading">

            <ImageIcon size={17} />

            <span>
              Media
            </span>

            <span className="chat-info-panel__row-count">
              {profileMedia.length}
            </span>

          </div>


          <div className="chat-info-panel__profile-media">

            {profileMedia
              .slice(0, 12)
              .map(
                (item) => (

                  <button
                    type="button"
                    key={item.id}
                    className="chat-info-panel__profile-media-item"
                    onClick={() => {

                      if (
                        item.type === 'image' &&
                        item.url
                      ) {

                        /*
                         * SharedMedia remains the authoritative
                         * conversation-media viewer.
                         *
                         * Profile media can later receive its
                         * own viewer callback.
                         */
                        window.open(
                          item.url,
                          '_blank',
                          'noopener,noreferrer',
                        );
                      }

                    }}
                  >

                    {item.type === 'image' && (
                      item.thumbnailUrl ||
                      item.url ? (
                        <img
                          src={
                            item.thumbnailUrl ||
                            item.url ||
                            ''
                          }
                          alt={
                            item.name ||
                            'Shared media'
                          }
                        />
                      ) : (
                        <ImageIcon size={20} />
                      )
                    )}


                    {item.type === 'video' && (
                      <div className="chat-info-panel__profile-media-video">

                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                          />
                        ) : (
                          <Video size={22} />
                        )}

                        <span>
                          <Play
                            size={11}
                            fill="currentColor"
                          />
                        </span>

                      </div>
                    )}


                    {item.type === 'file' && (
                      <FileText size={22} />
                    )}


                    {item.type === 'link' && (
                      <LinkIcon size={22} />
                    )}

                  </button>

                ),
              )}

          </div>

        </section>
      )}


      {/* ======================================================================
          CHAT SETTINGS
      ====================================================================== */}

      <section className="chat-info-panel__section">

        {/* MUTE */}

        <button
          type="button"
          className="chat-info-panel__row"
          onClick={() =>
            toggleMute(conversation.id)
          }
        >

          {conversation.muted ? (
            <BellOff size={18} />
          ) : (
            <Bell size={18} />
          )}

          <span>
            {conversation.muted
              ? 'Unmute notifications'
              : 'Mute notifications'}
          </span>

        </button>


        {/* STARRED */}

        <button
          type="button"
          className="chat-info-panel__row"
          onClick={() =>
            setShowStarred(
              (value) => !value,
            )
          }
        >

          <Star size={18} />

          <span>
            Starred messages
          </span>

          <span className="chat-info-panel__row-count">
            {starredMessages.length}
          </span>

          <ChevronRight
            size={16}
            className={[
              'chat-info-panel__chevron',
              showStarred
                ? 'is-open'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />

        </button>


        {/* STARRED MESSAGE LIST */}

        {showStarred && (
          <div className="chat-info-panel__starred-list">

            {starredMessages.length === 0 && (
              <p>
                No starred messages yet
              </p>
            )}


            {starredMessages.map(
              (message) => (

                <div
                  key={message.id}
                  className="chat-info-panel__starred-item"
                >
                  {message.text ??
                    `${message.type} message`}
                </div>

              ),
            )}

          </div>
        )}

      </section>


      {/* ======================================================================
          SHARED CONVERSATION MEDIA
      ====================================================================== */}

      <section className="chat-info-panel__section">

        <SharedMedia
          messages={messages}
          onOpenImage={onOpenImage}
        />

      </section>


      {/* ======================================================================
          PRIVACY / SAFETY
      ====================================================================== */}

      <section className="chat-info-panel__section chat-info-panel__danger">

        {/* BLOCK */}

        <button
          type="button"
          className="chat-info-panel__row"
          onClick={() =>
            setBlocked(
              (value) => !value,
            )
          }
        >

          <Shield size={18} />

          <span>
            {blocked
              ? `Unblock ${messagesName}`
              : `Block ${messagesName}`}
          </span>

        </button>


        {/* REPORT */}

        <button
          type="button"
          className="chat-info-panel__row"
        >

          <Flag size={18} />

          <span>
            Report conversation
          </span>

        </button>

      </section>


    </div>
  );
}