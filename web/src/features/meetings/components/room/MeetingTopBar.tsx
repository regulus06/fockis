import {
  ChevronDown,
  Info,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { RecordingIndicator } from '../recording/RecordingIndicator';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { useElapsedTimer } from '../../hooks/useElapsedTimer';

import '../../styles/components/room.scss';

interface MeetingTopBarProps {
  topic: string;
  startedAt: string;
  recording: boolean;
  connectionState:
    | 'connected'
    | 'reconnecting'
    | 'disconnected';
  participantCount?: number;
  onShowInfo: () => void;
}

export function MeetingTopBar({
  topic,
  startedAt,
  recording,
  connectionState,
  participantCount = 0,
  onShowInfo,
}: MeetingTopBarProps) {
  const elapsed = useElapsedTimer(startedAt);

  return (
    <header className="fm-top-bar">
      <div className="fm-top-bar__left">
        <div className="fm-top-bar__brand">
          <span className="fm-top-bar__brand-mark">
            F
          </span>

          <span className="fm-top-bar__brand-name">
            Fockis
          </span>
        </div>

        <div className="fm-top-bar__divider" />

        <button
          type="button"
          className="fm-top-bar__title"
          aria-label="Meeting options"
        >
          <span>{topic}</span>
          <ChevronDown size={15} />
        </button>
      </div>

      <div className="fm-top-bar__right">
        {recording && (
          <div className="fm-top-bar__recording">
            <RecordingIndicator />
          </div>
        )}

        <div className="fm-top-bar__secure">
          <ShieldCheck size={14} />
          <span>Secure</span>
        </div>

        <div className="fm-top-bar__participants">
          <Users size={14} />
          <span>{participantCount}</span>
        </div>

        <ConnectionStatusBadge
          state={connectionState}
        />

        <span className="fm-top-bar__timer mono">
          {elapsed}
        </span>

        <button
          type="button"
          className="fm-top-bar__info"
          onClick={onShowInfo}
          aria-label="Meeting information"
          title="Meeting information"
        >
          <Info size={17} />
        </button>
      </div>
    </header>
  );
}