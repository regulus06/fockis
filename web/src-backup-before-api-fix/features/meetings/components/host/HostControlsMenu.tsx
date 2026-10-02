import { Lock, Unlock, MicOff, ShieldCheck, ScreenShareOff, Users, LogOut } from 'lucide-react';
import '../../styles/components/host.scss';

interface HostControlsMenuProps {
  locked: boolean;
  waitingRoomEnabled: boolean;
  onClose: () => void;
  onMuteAll: () => void;
  onToggleLock: () => void;
  onToggleWaitingRoom: () => void;
  onStopAllScreenShare: () => void;
  onEndMeeting: () => void;
}

export function HostControlsMenu({
  locked, waitingRoomEnabled, onClose, onMuteAll, onToggleLock,
  onToggleWaitingRoom, onStopAllScreenShare, onEndMeeting,
}: HostControlsMenuProps) {
  return (
    <div className="fm-host-menu" role="menu">
      <div className="fm-host-menu__header">Host controls</div>
      <button className="fm-host-menu__item" onClick={() => { onMuteAll(); onClose(); }}>
        <MicOff size={15} /> Mute all participants
      </button>
      <button className="fm-host-menu__item" onClick={() => { onToggleWaitingRoom(); onClose(); }}>
        <Users size={15} /> {waitingRoomEnabled ? 'Disable' : 'Enable'} waiting room
      </button>
      <button className="fm-host-menu__item" onClick={() => { onToggleLock(); onClose(); }}>
        {locked ? <Unlock size={15} /> : <Lock size={15} />} {locked ? 'Unlock meeting' : 'Lock meeting'}
      </button>
      <button className="fm-host-menu__item" onClick={() => { onStopAllScreenShare(); onClose(); }}>
        <ScreenShareOff size={15} /> Stop all screen sharing
      </button>
      <button className="fm-host-menu__item" onClick={onClose}>
        <ShieldCheck size={15} /> Security settings
      </button>
      <div className="fm-host-menu__divider" />
      <button className="fm-host-menu__item fm-host-menu__item--danger" onClick={() => { onEndMeeting(); onClose(); }}>
        <LogOut size={15} /> End meeting for all
      </button>
    </div>
  );
}
