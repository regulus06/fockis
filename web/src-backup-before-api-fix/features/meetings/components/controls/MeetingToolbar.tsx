import { useState } from 'react';

import {
  ChevronUp,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  ScreenShare,
  Settings,
  Smile,
  Sparkles,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';

import { IconButton } from '../common/IconButton';
import { ReactionsTray } from '../reactions/ReactionsTray';

import type { RightPanelTab } from '../../constants';

import '../../styles/components/controls.scss';

interface MeetingToolbarProps {
  micOn: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  screenSharing: boolean;
  isHost: boolean;
  activePanel: RightPanelTab | null;

  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleHand: () => void;
  onToggleScreenShare: () => void;

  onSetPanel: (
    panel: RightPanelTab | null,
  ) => void;

  onOpenHostMenu: () => void;
  onLeave: () => void;
  onReact: (emoji: string) => void;
}

export function MeetingToolbar({
  micOn,
  cameraOn,
  handRaised,
  screenSharing,
  isHost,
  activePanel,
  onToggleMic,
  onToggleCamera,
  onToggleHand,
  onToggleScreenShare,
  onSetPanel,
  onOpenHostMenu,
  onLeave,
  onReact,
}: MeetingToolbarProps) {
  const [reactionsOpen, setReactionsOpen] =
    useState(false);

  const [moreOpen, setMoreOpen] =
    useState(false);

  return (
    <div className="fm-toolbar">
      <div className="fm-toolbar__main">

        {/* =====================================================
            MICROPHONE + CAMERA
            ===================================================== */}

        <div className="fm-toolbar__group fm-toolbar__group--media">

          <div className="fm-toolbar__split">
            <IconButton
              icon={
                micOn ? <Mic /> : <MicOff />
              }
              label={
                micOn ? 'Mute' : 'Unmute'
              }
              active={!micOn}
              danger={!micOn}
              showLabelBelow
              onClick={onToggleMic}
            />

            <button
              type="button"
              className="fm-toolbar__tiny-arrow"
              aria-label="Microphone settings"
              title="Microphone settings"
            >
              <ChevronUp size={12} />
            </button>
          </div>

          <div className="fm-toolbar__split">
            <IconButton
              icon={
                cameraOn ? (
                  <Video />
                ) : (
                  <VideoOff />
                )
              }
              label={
                cameraOn
                  ? 'Stop video'
                  : 'Start video'
              }
              active={!cameraOn}
              danger={!cameraOn}
              showLabelBelow
              onClick={onToggleCamera}
            />

            <button
              type="button"
              className="fm-toolbar__tiny-arrow"
              aria-label="Camera settings"
              title="Camera settings"
            >
              <ChevronUp size={12} />
            </button>
          </div>

        </div>

        {/* =====================================================
            MAIN MEETING CONTROLS
            ===================================================== */}

        <div className="fm-toolbar__group fm-toolbar__group--meeting">

          {/* Participants */}

          <IconButton
            icon={<Users />}
            label="Participants"
            active={
              activePanel === 'participants'
            }
            showLabelBelow
            onClick={() =>
              onSetPanel(
                activePanel === 'participants'
                  ? null
                  : 'participants',
              )
            }
          />

          {/* Chat */}

          <IconButton
            icon={<MessageSquare />}
            label="Chat"
            active={
              activePanel === 'chat'
            }
            showLabelBelow
            onClick={() =>
              onSetPanel(
                activePanel === 'chat'
                  ? null
                  : 'chat',
              )
            }
          />

          {/* Screen sharing */}

          <IconButton
            icon={<ScreenShare />}
            label={
              screenSharing
                ? 'Stop sharing'
                : 'Share screen'
            }
            active={screenSharing}
            showLabelBelow
            onClick={onToggleScreenShare}
          />

          {/* Raise hand */}

          <IconButton
            icon={<Hand />}
            label={
              handRaised
                ? 'Lower hand'
                : 'Raise hand'
            }
            active={handRaised}
            showLabelBelow
            onClick={onToggleHand}
          />

          {/* =================================================
              REACTIONS
              ================================================= */}

          <div className="fm-toolbar__reactions-wrap">

            <IconButton
              icon={<Smile />}
              label="Reactions"
              active={reactionsOpen}
              showLabelBelow
              onClick={() =>
                setReactionsOpen(
                  (value) => !value,
                )
              }
            />

            {reactionsOpen && (
              <ReactionsTray
                onSelect={(emoji) => {
                  onReact(emoji);
                  setReactionsOpen(false);
                }}
              />
            )}

          </div>

          {/* =================================================
              FOCKIS SECRETARY
              ================================================= */}

          <IconButton
            icon={<Sparkles />}
            label="Secretary"
            active={
              activePanel === 'secretary'
            }
            showLabelBelow
            onClick={() =>
              onSetPanel(
                activePanel === 'secretary'
                  ? null
                  : 'secretary',
              )
            }
          />

        </div>

        {/* =====================================================
            HOST + MORE
            ===================================================== */}

        <div className="fm-toolbar__group fm-toolbar__group--actions">

          {isHost && (
            <IconButton
              icon={<ChevronUp />}
              label="Host controls"
              showLabelBelow
              onClick={onOpenHostMenu}
            />
          )}

          {/* More menu */}

          <div className="fm-toolbar__more-wrap">

            <IconButton
              icon={<MoreHorizontal />}
              label="More"
              active={moreOpen}
              showLabelBelow
              onClick={() =>
                setMoreOpen(
                  (value) => !value,
                )
              }
            />

            {moreOpen && (
              <div className="fm-toolbar__more-menu">

                <button
                  type="button"
                  onClick={() =>
                    setMoreOpen(false)
                  }
                >
                  <Settings size={15} />
                  <span>
                    Meeting settings
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMoreOpen(false)
                  }
                >
                  <Sparkles size={15} />
                  <span>
                    AI meeting tools
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setMoreOpen(false)
                  }
                >
                  <Hand size={15} />
                  <span>
                    Accessibility
                  </span>
                </button>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* =======================================================
          LEAVE MEETING
          ======================================================= */}

      <button
        type="button"
        className="fm-leave-btn"
        onClick={onLeave}
      >
        <PhoneOff size={17} />

        <span>Leave</span>
      </button>

    </div>
  );
}