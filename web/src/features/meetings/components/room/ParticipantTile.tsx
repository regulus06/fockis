import {
  Hand,
  MicOff,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { Avatar } from '../common/Avatar';
import type { RoomParticipant } from '../../types';

import '../../styles/components/room.scss';

interface ParticipantTileProps {
  participant: RoomParticipant;
}

export function ParticipantTile({
  participant,
}: ParticipantTileProps) {
  const {
    user,
    micOn,
    cameraOn,
    handRaised,
    isSpeaking,
    connectionQuality,
    role,
  } = participant;

  const connectionIsBad =
    connectionQuality === 'poor' ||
    connectionQuality === 'reconnecting';

  const connectionIsWeak =
    connectionQuality === 'weak';

  return (
    <div
      className={[
        'fm-tile',
        isSpeaking ? 'fm-tile--speaking' : '',
        !cameraOn ? 'fm-tile--camera-off' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="fm-tile__surface">
        {cameraOn ? (
          <div
            className="fm-tile__video-stub"
            aria-label={`${user.displayName} camera`}
          >
            <div className="fm-tile__video-glow" />

            <div className="fm-tile__camera-placeholder">
              <Avatar
                name={user.displayName}
                size="lg"
              />
            </div>

            <div className="fm-tile__camera-shimmer" />
          </div>
        ) : (
          <div className="fm-tile__avatar-wrap">
            <div className="fm-tile__avatar-ring">
              <Avatar
                name={user.displayName}
                size="lg"
              />
            </div>
          </div>
        )}
      </div>

      <div className="fm-tile__top">
        <div className="fm-tile__status-group">
          {handRaised && (
            <span
              className="fm-tile__status fm-tile__hand"
              title="Hand raised"
              aria-label="Hand raised"
            >
              <Hand size={13} />
            </span>
          )}

          {connectionIsBad && (
            <span
              className="fm-tile__status fm-tile__conn fm-tile__conn--bad"
              title="Poor connection"
              aria-label="Poor connection"
            >
              <WifiOff size={12} />
            </span>
          )}

          {connectionIsWeak && (
            <span
              className="fm-tile__status fm-tile__conn fm-tile__conn--weak"
              title="Weak connection"
              aria-label="Weak connection"
            >
              <Wifi size={12} />
            </span>
          )}
        </div>
      </div>

      <div className="fm-tile__bottom">
        <div className="fm-tile__identity">
          <span className="fm-tile__name">
            {user.displayName}
          </span>

          {role === 'host' && (
            <span className="fm-tile__role">
              Host
            </span>
          )}

          {role === 'co-host' && (
            <span className="fm-tile__role">
              Co-host
            </span>
          )}
        </div>

        <div className="fm-tile__audio">
          {!micOn && (
            <MicOff
              size={14}
              className="fm-tile__muted-icon"
            />
          )}

          {micOn && isSpeaking && (
            <span
              className="fm-tile__audio-bars"
              aria-label="Speaking"
            >
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
      </div>

      {isSpeaking && (
        <div
          className="fm-tile__speaking-indicator"
          aria-hidden="true"
        />
      )}
    </div>
  );
}