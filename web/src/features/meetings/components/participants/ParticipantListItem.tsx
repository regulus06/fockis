import { useState } from 'react';
import { Mic, MicOff, VideoOff, Hand, MoreVertical } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { ParticipantContextMenu } from '../host/ParticipantContextMenu';
import type { RoomParticipant } from '../../types';
import '../../styles/components/participants.scss';

export function ParticipantListItem({
  participant,
  isHost,
}: {
  participant: RoomParticipant;
  isHost: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, micOn, cameraOn, handRaised, role } = participant;

  return (
    <div className="fm-participant-item">
      <Avatar name={user.displayName} size="md" />
      <div className="fm-participant-item__info">
        <span className="fm-participant-item__name">{user.displayName}</span>
        {role !== 'participant' && <span className="fm-participant-item__badge">{role === 'host' ? 'Host' : 'Co-host'}</span>}
      </div>
      <div className="fm-participant-item__status">
        {handRaised && <Hand size={15} className="fm-participant-item__hand" />}
        {!cameraOn && <VideoOff size={15} className="fm-participant-item__muted" />}
        {micOn ? <Mic size={15} /> : <MicOff size={15} className="fm-participant-item__muted" />}
        {isHost && role !== 'host' && (
          <div className="fm-participant-item__menu-wrap">
            <button className="fm-participant-item__more" onClick={() => setMenuOpen((v) => !v)} aria-label="Participant options">
              <MoreVertical size={15} />
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
