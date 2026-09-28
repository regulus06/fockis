import { MicOff, UserMinus, ShieldPlus } from 'lucide-react';
import '../../styles/components/host.scss';

interface ParticipantContextMenuProps {
  participantName: string;
  isCoHost: boolean;
  onClose: () => void;
  onMute: () => void;
  onRemove: () => void;
  onMakeCoHost: () => void;
}

export function ParticipantContextMenu({
  participantName, isCoHost, onClose, onMute, onRemove, onMakeCoHost,
}: ParticipantContextMenuProps) {
  return (
    <div className="fm-host-menu fm-host-menu--participant" role="menu">
      <div className="fm-host-menu__header">{participantName}</div>
      <button className="fm-host-menu__item" onClick={() => { onMute(); onClose(); }}>
        <MicOff size={15} /> Mute participant
      </button>
      {!isCoHost && (
        <button className="fm-host-menu__item" onClick={() => { onMakeCoHost(); onClose(); }}>
          <ShieldPlus size={15} /> Make co-host
        </button>
      )}
      <div className="fm-host-menu__divider" />
      <button className="fm-host-menu__item fm-host-menu__item--danger" onClick={() => { onRemove(); onClose(); }}>
        <UserMinus size={15} /> Remove from meeting
      </button>
    </div>
  );
}
