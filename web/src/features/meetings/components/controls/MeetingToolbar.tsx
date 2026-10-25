import { useEffect, useRef, useState, type ReactNode } from 'react';

import {
  ChevronDown,
  Clock3,
  Hand,
  MessageCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  Phone,
  ScreenShare,
  ScreenShareOff,
  Settings,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';

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
  /** Shown as a badge on the Participants control. */
  participantCount?: number;

  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleHand: () => void;
  onToggleScreenShare: () => void;

  onSetPanel: (panel: RightPanelTab | null) => void;

  onOpenHostMenu: () => void;
  onLeave: () => void;
  onReact: (emoji: string) => void;
  /** Non-hosts can tell the host they are running late. */
  onRunningLate?: () => void;
}

interface ControlProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  expanded?: boolean;
  onClick: () => void;
}

function Control({ icon, label, active, danger, badge, expanded, onClick }: ControlProps) {
  return (
    <button
      type="button"
      className={[
        'fm-control',
        active ? 'fm-control--active' : '',
        danger ? 'fm-control--danger' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={expanded === undefined ? active : undefined}
      aria-expanded={expanded}
      title={label}
      onClick={onClick}
    >
      <span className="fm-control__icon">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="fm-control__badge" aria-hidden="true">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="fm-control__label">{label}</span>
    </button>
  );
}

/** Closes a popover when clicking outside it or pressing Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return ref;
}

export function MeetingToolbar({
  micOn,
  cameraOn,
  handRaised,
  screenSharing,
  isHost,
  activePanel,
  participantCount,
  onToggleMic,
  onToggleCamera,
  onToggleHand,
  onToggleScreenShare,
  onSetPanel,
  onOpenHostMenu,
  onLeave,
  onReact,
  onRunningLate,
}: MeetingToolbarProps) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const reactionsRef = useDismiss(reactionsOpen, () => setReactionsOpen(false));
  const moreRef = useDismiss(moreOpen, () => setMoreOpen(false));

  const togglePanel = (panel: RightPanelTab) =>
    onSetPanel(activePanel === panel ? null : panel);

  const openSettings = () => onSetPanel('settings');

  const runFromMenu = (action: () => void) => () => {
    setMoreOpen(false);
    action();
  };

  return (
    <div className="fm-toolbar" role="toolbar" aria-label="Meeting controls">
      <div className="fm-toolbar__split">
        <Control
          icon={micOn ? <Mic /> : <MicOff />}
          label={micOn ? 'Mute' : 'Unmute'}
          active={!micOn}
          danger={!micOn}
          onClick={onToggleMic}
        />
        <button
          type="button"
          className="fm-toolbar__caret"
          aria-label="Audio settings"
          title="Audio settings"
          onClick={openSettings}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <div className="fm-toolbar__split">
        <Control
          icon={cameraOn ? <Video /> : <VideoOff />}
          label={cameraOn ? 'Stop video' : 'Start video'}
          active={!cameraOn}
          danger={!cameraOn}
          onClick={onToggleCamera}
        />
        <button
          type="button"
          className="fm-toolbar__caret"
          aria-label="Video settings"
          title="Video settings"
          onClick={openSettings}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <Control
        icon={<Users />}
        label="Participants"
        active={activePanel === 'participants'}
        badge={participantCount}
        onClick={() => togglePanel('participants')}
      />

      <Control
        icon={<MessageCircle />}
        label="Chat"
        active={activePanel === 'chat'}
        onClick={() => togglePanel('chat')}
      />

      <Control
        icon={screenSharing ? <ScreenShareOff /> : <ScreenShare />}
        label={screenSharing ? 'Stop sharing' : 'Share screen'}
        active={screenSharing}
        onClick={onToggleScreenShare}
      />

      <div className="fm-toolbar__popover-wrap" ref={reactionsRef}>
        <Control
          icon={<Smile />}
          label="Reactions"
          active={reactionsOpen}
          expanded={reactionsOpen}
          onClick={() => {
            setMoreOpen(false);
            setReactionsOpen((value) => !value);
          }}
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

      <div className="fm-toolbar__popover-wrap" ref={moreRef}>
        <Control
          icon={<MoreHorizontal />}
          label="More"
          active={moreOpen || handRaised || activePanel === 'secretary'}
          expanded={moreOpen}
          onClick={() => {
            setReactionsOpen(false);
            setMoreOpen((value) => !value);
          }}
        />

        {moreOpen && (
          <div className="fm-toolbar__menu" role="menu">
            <button type="button" role="menuitem" onClick={runFromMenu(onToggleHand)}>
              <Hand size={16} />
              <span>{handRaised ? 'Lower hand' : 'Raise hand'}</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={runFromMenu(() => togglePanel('secretary'))}
            >
              <Sparkles size={16} />
              <span>AI Secretary</span>
            </button>

            <button type="button" role="menuitem" onClick={runFromMenu(openSettings)}>
              <Settings size={16} />
              <span>Settings</span>
            </button>

            {isHost && (
              <button type="button" role="menuitem" onClick={runFromMenu(onOpenHostMenu)}>
                <ShieldCheck size={16} />
                <span>Host controls</span>
              </button>
            )}

            {!isHost && onRunningLate && (
              <button type="button" role="menuitem" onClick={runFromMenu(onRunningLate)}>
                <Clock3 size={16} />
                <span>Running late?</span>
              </button>
            )}
          </div>
        )}
      </div>

      <span className="fm-toolbar__divider" role="separator" aria-orientation="vertical" />

      <button type="button" className="fm-leave-btn" onClick={onLeave}>
        <Phone size={19} className="fm-hangup-icon" aria-hidden="true" />
        <span>Leave</span>
      </button>
    </div>
  );
}
