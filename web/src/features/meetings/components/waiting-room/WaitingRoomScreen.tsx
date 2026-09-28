import { Clock } from 'lucide-react';
import '../../styles/components/waiting-room.scss';

export function WaitingRoomScreen({ topic }: { topic: string }) {
  return (
    <div className="fm-waiting-screen">
      <div className="fm-waiting-screen__icon"><Clock size={28} /></div>
      <h2>Waiting for the host</h2>
      <p className="fm-waiting-screen__topic">{topic}</p>
      <p className="fm-waiting-screen__hint">The host will let you into the meeting soon. You're currently in the waiting room.</p>
    </div>
  );
}
