import {
  Globe,
  Lock,
  Radio,
  Square,
  UsersRound,
} from "lucide-react";

import type {
  DeviceState,
  Phase,
  StreamInfo,
  Visibility,
} from "../types";

import { Button } from "./ui/Primitives";

const VISIBILITY_ICON: Record<
  Visibility,
  typeof Globe
> = {
  public: Globe,
  followers: UsersRound,
  private: Lock,
};

const VISIBILITY_LABEL: Record<
  Visibility,
  string
> = {
  public: "Public",
  followers: "Followers only",
  private: "Private",
};

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
  const VisibilityIcon =
    VISIBILITY_ICON[
      streamInfo.visibility
    ];

  const isLive =
    phase === "live";

  const isStarting =
    phase === "starting";

  const isEnding =
    phase === "ending";

  // ==========================================================================
  // NOTE:
  //
  // This button's job is only to OPEN the Go Live modal. It intentionally
  // does NOT gate on camera/mic readiness (`devices.camera === "connected"`,
  // etc.) — that check already lives inside <GoLiveModal>, which shows a
  // real checklist (Camera / Microphone / Internet) and disables its own
  // "Go live" confirm button until everything is actually ready.
  //
  // Blocking the button here as well meant people could never even SEE
  // why they couldn't go live. The modal is the right place for that gate,
  // since it can explain itself; this button just needs to not be clickable
  // mid-transition (while a stream is starting or ending).
  // ==========================================================================

  const canOpenModal =
    !isLive &&
    !isStarting &&
    !isEnding;

  return (
    <div className="action-bar">
      <div className="action-bar__summary">
        <p className="action-bar__title">
          {streamInfo.title}
        </p>

        <div className="action-bar__meta">
          <span className="meta-chip">
            {streamInfo.category}
          </span>

          <span className="meta-chip">
            <VisibilityIcon
              size={11}
            />

            {
              VISIBILITY_LABEL[
                streamInfo.visibility
              ]
            }
          </span>
        </div>
      </div>

      {isLive ? (
        <Button
          variant="danger"
          size="lg"
          icon={
            <Square
              size={16}
              fill="currentColor"
            />
          }
          onClick={
            openEndLiveModal
          }
        >
          End live
        </Button>
      ) : (
        <Button
          variant="live"
          size="lg"
          icon={
            <Radio size={17} />
          }
          onClick={
            openGoLiveModal
          }
          disabled={!canOpenModal}
        >
          {isStarting
            ? "Connecting…"
            : isEnding
              ? "Ending…"
              : "Go live"}
        </Button>
      )}
    </div>
  );
}