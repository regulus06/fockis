import { useEffect, useRef, useState } from 'react';
import { Crown, Hand, Mic, MicOff, MoreVertical, Video, VideoOff } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { ParticipantContextMenu } from '../host/ParticipantContextMenu';
import type { RoomParticipant } from '../../types';
import '../../styles/components/participants.scss';

interface ParticipantListItemProps {
  participant: RoomParticipant;
  /** The viewer is the meeting host. */
  isHost: boolean;
  /** This row is the viewer themself. */
  isSelf?: boolean;
  /** Only used on the viewer's own row: toggles their own media. */
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
}

export function ParticipantListItem({
  participant,
  isHost,
  isSelf = false,
  onToggleMic,
  onToggleCamera,
}: ParticipantListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { user, micOn, cameraOn, handRaised, role, isSpeaking } = participant;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const roleLabel = role === 'host' ? 'Host' : role === 'co-host' ? 'Co-host' : 'Participant';
  const name = isSelf ? `You${role === 'participant' ? '' : ` (${roleLabel})`}` : user.displayName;
  const canManage = isHost && !isSelf && role !== 'host';

  const micClass = `fm-participant-item__media${micOn ? ' fm-participant-item__media--on' : ' fm-participant-item__media--off'}`;
  const camClass = `fm-participant-item__media${cameraOn ? '' : ' fm-participant-item__media--off'}`;

  return (
    <div className={`fm-participant-item${isSpeaking ? ' fm-participant-item--speaking' : ''}`}>
      <span className="fm-participant-item__avatar">
        <Avatar name={user.displayName || '?'} size="lg" imageUrl={user.avatarUrl} />
      </span>

      <div className="fm-participant-item__info">
        <span className="fm-participant-item__name">
          <span className="fm-participant-item__name-text">{name}</span>
          {role === 'host' && <Crown size={15} className="fm-participant-item__crown" aria-label="Host" />}
          {handRaised && <Hand size={14} className="fm-participant-item__hand" aria-label="Hand raised" />}
        </span>
        <span className="fm-participant-item__role">{roleLabel}</span>
      </div>

      <div className="fm-participant-item__actions">
        {isSelf && onToggleMic ? (
          <button
            type="button"
            className={micClass}
            onClick={onToggleMic}
            aria-label={micOn ? 'Mute yourself' : 'Unmute yourself'}
            title={micOn ? 'Mute' : 'Unmute'}
          >
            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
        ) : (
          <span className={micClass} role="img" aria-label={micOn ? 'Microphone on' : 'Microphone muted'}>
            {micOn ? <Mic size={16} /> : <MicOff size={16} />}
          </span>
        )}

        {isSelf && onToggleCamera ? (
          <button
            type="button"
            className={camClass}
            onClick={onToggleCamera}
            aria-label={cameraOn ? 'Turn off your camera' : 'Turn on your camera'}
            title={cameraOn ? 'Stop video' : 'Start video'}
          >
            {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
          </button>
        ) : (
          <span className={camClass} role="img" aria-label={cameraOn ? 'Camera on' : 'Camera off'}>
            {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
          </span>
        )}

        {canManage && (
          <div className="fm-participant-item__menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="fm-participant-item__more"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`Options for ${user.displayName}`}
              aria-expanded={menuOpen}
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <ParticipantContextMenu
                participantName={user.displayName}
                isCoHost={role === 'co-host'}
                onClose={() => setMenuOpen(false)}
                onMute={() => {}}
                onRemove={() => {}}
                onMakeCoHost={() => {}}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
