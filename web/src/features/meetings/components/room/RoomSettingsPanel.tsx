import { Check, Copy, Mic, MicOff, RefreshCw, Video, VideoOff } from "lucide-react";

import { DeviceSelect } from "../lobby/DeviceSelect";
import { useMediaDevices } from "../../hooks/useMediaDevices";
import { useRoomStore } from "../../store/roomStore";

interface RoomSettingsPanelProps {
  meetingId: string;
  copiedField: "id" | "link" | null;
  onCopyMeetingId: () => void;
  onCopyInviteLink: () => void;
}

/**
 * In-room settings. Device choices go to the room store, and VideoGrid
 * applies them to the live LiveKit room with switchActiveDevice().
 */
export function RoomSettingsPanel({
  meetingId,
  copiedField,
  onCopyMeetingId,
  onCopyInviteLink,
}: RoomSettingsPanelProps) {
  const { microphones, speakers, cameras, permissionState, refresh } = useMediaDevices();

  const micOn = useRoomStore((state) => state.micOn);
  const cameraOn = useRoomStore((state) => state.cameraOn);
  const toggleMic = useRoomStore((state) => state.toggleMic);
  const toggleCamera = useRoomStore((state) => state.toggleCamera);
  const audioInputId = useRoomStore((state) => state.audioInputId);
  const videoInputId = useRoomStore((state) => state.videoInputId);
  const audioOutputId = useRoomStore((state) => state.audioOutputId);
  const setMediaDevice = useRoomStore((state) => state.setMediaDevice);

  // Some browsers (Safari, Firefox) cannot route audio to a chosen speaker.
  const canPickSpeaker =
    typeof HTMLMediaElement !== "undefined" &&
    "setSinkId" in HTMLMediaElement.prototype;

  return (
    <div className="fm-settings">
      <section className="fm-settings__section">
        <h3 className="fm-settings__heading">Your audio and video</h3>

        <div className="fm-settings__toggles">
          <button
            type="button"
            className={`fm-settings__toggle${micOn ? "" : " fm-settings__toggle--off"}`}
            onClick={toggleMic}
            aria-pressed={!micOn}
          >
            {micOn ? <Mic size={17} /> : <MicOff size={17} />}
            <span>{micOn ? "Microphone on" : "Microphone muted"}</span>
          </button>
          <button
            type="button"
            className={`fm-settings__toggle${cameraOn ? "" : " fm-settings__toggle--off"}`}
            onClick={toggleCamera}
            aria-pressed={!cameraOn}
          >
            {cameraOn ? <Video size={17} /> : <VideoOff size={17} />}
            <span>{cameraOn ? "Camera on" : "Camera off"}</span>
          </button>
        </div>

        <DeviceSelect
          label="Microphone"
          options={microphones}
          emptyLabel="No microphone found"
          value={audioInputId || microphones[0]?.deviceId || ""}
          onChange={(deviceId) => setMediaDevice("audioinput", deviceId)}
        />

        <DeviceSelect
          label="Camera"
          options={cameras}
          emptyLabel="No camera found"
          value={videoInputId || cameras[0]?.deviceId || ""}
          onChange={(deviceId) => setMediaDevice("videoinput", deviceId)}
        />

        {canPickSpeaker && (
          <DeviceSelect
            label="Speaker"
            options={speakers}
            emptyLabel="System default speaker"
            value={audioOutputId || speakers[0]?.deviceId || ""}
            onChange={(deviceId) => setMediaDevice("audiooutput", deviceId)}
          />
        )}

        {permissionState !== "granted" && (
          <p className="fm-settings__hint">
            Device names appear after you allow camera and microphone access.
          </p>
        )}

        <button type="button" className="fm-settings__refresh" onClick={() => void refresh()}>
          <RefreshCw size={15} />
          Refresh device list
        </button>
      </section>

      <section className="fm-settings__section">
        <h3 className="fm-settings__heading">Meeting</h3>

        <div className="fm-settings__row">
          <span>
            <small>Meeting ID</small>
            <strong className="mono">{meetingId}</strong>
          </span>
          <button type="button" onClick={onCopyMeetingId} aria-label="Copy meeting ID">
            {copiedField === "id" ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <div className="fm-settings__row">
          <span>
            <small>Invite link</small>
            <strong>Copy a link people can use to join</strong>
          </span>
          <button type="button" onClick={onCopyInviteLink} aria-label="Copy invite link">
            {copiedField === "link" ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </section>
    </div>
  );
}

export default RoomSettingsPanel;
