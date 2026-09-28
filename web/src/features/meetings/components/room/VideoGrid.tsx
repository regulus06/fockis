import type { RoomParticipant } from '../../types';
import { ParticipantTile } from './ParticipantTile';

import '../../styles/components/room.scss';

interface VideoGridProps {
  participants: RoomParticipant[];
}

export function VideoGrid({
  participants,
}: VideoGridProps) {
  const count = participants.length;

  const columns =
    count <= 1
      ? 1
      : count <= 4
        ? 2
        : count <= 9
          ? 3
          : 4;

  if (count === 0) {
    return (
      <div className="fm-video-grid fm-video-grid--empty">
        <div className="fm-video-grid__empty">
          <div className="fm-video-grid__empty-icon">
            F
          </div>

          <h2>Waiting for participants</h2>

          <p>
            Your meeting is ready. Participants will
            appear here when they join.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fm-video-grid fm-video-grid--count-${count}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {participants.map((participant) => (
        <ParticipantTile
          key={participant.id}
          participant={participant}
        />
      ))}
    </div>
  );
}