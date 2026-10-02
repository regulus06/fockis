import { Search, UserPlus } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { ParticipantListItem } from './ParticipantListItem';
import { PanelHeader } from '../common/PanelHeader';
import '../../styles/components/participants.scss';

export function ParticipantsPanel({ isHost, onClose }: { isHost: boolean; onClose: () => void }) {
  const participants = useRoomStore((s) => s.participants);

  return (
    <div className="fm-panel">
      <PanelHeader title={`Participants (${participants.length})`} onClose={onClose} />
      <div className="fm-panel__search">
        <Search size={14} />
        <input placeholder="Search participants" />
      </div>
      <div className="fm-panel__scroll">
        {participants.map((p) => (
          <ParticipantListItem key={p.id} participant={p} isHost={isHost} />
        ))}
      </div>
      {isHost && (
        <div className="fm-panel__footer">
          <button className="fm-panel__footer-btn"><UserPlus size={14} /> Invite participants</button>
        </div>
      )}
    </div>
  );
}
