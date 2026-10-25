import {
  Loader2,
  PhoneOff,
  Radio,
} from "lucide-react";

import type {
  DeviceState,
  Phase,
  StreamInfo,
} from "../types";

/**
 * Primary broadcast action.
 *
 * Not live  → opens the existing Go Live modal (which runs the camera /
 *             microphone / title checklist and starts the session).
 * Live      → opens the existing End Live confirmation. Nothing is ended
 *             until the creator confirms there.
 */
export function ActionBar({
  streamInfo,
  phase,
  openGoLiveModal,
  openEndLiveModal,
  devices: _devices,
}: {
  streamInfo: StreamInfo;
  phase: Phase;
  openGoLiveModal: () => void;
  openEndLiveModal: () => void;
  devices: DeviceState;
}) {
  const isLive = phase === "live";
  const isStarting = phase === "starting";
  const isEnding = phase === "ending";
  const busy = isStarting || isEnding;

  return (
    <div className="action-bar">
      {!isLive && !busy && (
        <p className="action-bar__hint">
          {streamInfo.title.trim()
            ? <>Ready to go live with <strong>{streamInfo.title}</strong></>
            : "Add a title in the next step, then go live."}
        </p>
      )}

      {isLive ? (
        <button
          type="button"
          className="end-live-btn"
          onClick={openEndLiveModal}
        >
          <PhoneOff size={22} aria-hidden="true" />
          End live session
        </button>
      ) : (
        <button
          type="button"
          className="end-live-btn end-live-btn--go"
          onClick={openGoLiveModal}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? (
            <Loader2 size={20} className="spin" aria-hidden="true" />
          ) : (
            <Radio size={20} aria-hidden="true" />
          )}
          {isStarting ? "Connecting…" : isEnding ? "Ending…" : "Go live"}
        </button>
      )}
    </div>
  );
}
