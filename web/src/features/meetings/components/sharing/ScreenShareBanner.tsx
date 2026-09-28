import { ScreenShare } from 'lucide-react';
import { Button } from '../common/Button';
import '../../styles/components/sharing.scss';

export function ScreenShareBanner({ onStop }: { onStop: () => void }) {
  return (
    <div className="fm-share-banner">
      <span className="fm-share-banner__text"><ScreenShare size={15} /> You are sharing your screen</span>
      <Button size="sm" variant="danger" onClick={onStop}>Stop sharing</Button>
    </div>
  );
}
