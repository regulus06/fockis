import {
  HelpCircle,
  LogOut,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import type {
  ConnectionQuality,
  Phase,
} from "../types";

import {
  formatCount,
  formatDuration,
} from "../utils";

const CONNECTION_LABEL: Record<
  ConnectionQuality,
  string
> = {
  excellent: "Excellent connection",
  good: "Good connection",
  poor: "Poor connection",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};

export function Header({
  phase,
  connection,
  viewers,
  elapsedSeconds,
  username,
  onOpenSettings,
}: {
  phase: Phase;
  connection: ConnectionQuality;
  viewers: number;
  elapsedSeconds: number;
  username: string;
  onOpenSettings: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isBroadcasting =
    phase === "live" ||
    phase === "ending";

  const handleHelp = () => {
    /*
     * Keep the user inside Fockis.
     *
     * If /help exists in the main application router,
     * this navigates there normally.
     */
    if (location.pathname !== "/help") {
      navigate("/help");
      return;
    }

    /*
     * Already on help.
     */
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleExitStudio = () => {
    /*
     * Do NOT end a LIVE broadcast here.
     *
     * Exit Studio only leaves the studio UI.
     * The actual broadcast is ended by the End Live
     * button/modal.
     */
    navigate("/my-live");
  };

  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__brand-mark">
          F
        </div>

        <div className="header__brand-text">
          <span className="header__brand-name">
            FOCKIS
          </span>

          <span className="header__brand-sub">
            LIVE STUDIO
          </span>
        </div>

        <span className="header__username">
          @{username}
        </span>
      </div>

      <div className="header__center">
        {isBroadcasting ? (
          <div className="live-status">
            <span className="live-badge">
              <span className="live-badge__dot" />
              LIVE
            </span>

            <span className="header__divider" />

            <span className="header__viewers">
              {formatCount(viewers)} viewers
            </span>

            <span className="header__divider" />

            <span className="header__timer">
              {formatDuration(
                elapsedSeconds,
              )}
            </span>
          </div>
        ) : (
          <div
            className={`connection-pill connection-pill--${connection}`}
          >
            {connection === "poor" ||
            connection === "reconnecting" ? (
              <Loader2
                size={13}
                className="spin"
              />
            ) : connection === "offline" ? (
              <WifiOff size={13} />
            ) : (
              <Wifi size={13} />
            )}

            {CONNECTION_LABEL[connection]}
          </div>
        )}
      </div>

      <div className="header__actions">
        <button
          className="icon-action"
          onClick={onOpenSettings}
          type="button"
          title="Settings"
          aria-label="Open settings"
        >
          <Settings size={17} />

          <span className="icon-action__label">
            Settings
          </span>
        </button>

        <button
          className="icon-action"
          onClick={handleHelp}
          type="button"
          title="Help"
          aria-label="Open help"
        >
          <HelpCircle size={17} />

          <span className="icon-action__label">
            Help
          </span>
        </button>

        <button
          className="icon-action icon-action--exit"
          onClick={handleExitStudio}
          type="button"
          title="Exit studio"
          aria-label="Exit studio"
        >
          <LogOut size={17} />

          <span className="icon-action__label">
            Exit studio
          </span>
        </button>
      </div>
    </header>
  );
}