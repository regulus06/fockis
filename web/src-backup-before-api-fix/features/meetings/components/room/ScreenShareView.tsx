import { MonitorPlay } from 'lucide-react';
import '../../styles/components/room.scss';

export function ScreenShareView({ presenterName }: { presenterName: string }) {
  return (
    <div className="fm-screen-share-view">
      <MonitorPlay size={36} />
      <p>{presenterName} is presenting their screen</p>
    </div>
  );
}
