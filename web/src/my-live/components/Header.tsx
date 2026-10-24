import {
  Eye,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MoreHorizontal,
  Forward,
  Settings,
  UserPlus,
  WifiOff,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import type {
  ConnectionQuality,
  Phase,
} from "../types";

import {
  formatCount,
  formatDuration,
} from "../utils";

import { Menu } from "./ui/Primitives";

import FockisMark from "../../components/fockis/FockisMark";

const CONNECTION_LABEL: Record<ConnectionQuality, string> = {
  excellent: "Connected",
  good: "Connected",
  poor: "Poor connection",
  reconnecting: "Reconnecting…",
  offline: "Offline",
};

const PHASE_LABEL: Record<Phase, string> = {
  setup: "PREVIEW",
  starting: "STARTING",
  live: "LIVE",
  ending: "ENDING",
  ended: "ENDED",
};

export function Header({
  phase,
  connection,
  viewers,
  elapsedSeconds,
  username,
  onOpenSettings,
  onShare,
  onInviteGuest,
  onOpenManager,
  onOpenMenu,
}: {
  phase: Phase;
  connection: ConnectionQuality;
  viewers: number;
  elapsedSeconds: number;
  username: string;
  onOpenSettings: () => void;
  onShare?: () => void;
  onInviteGuest?: () => void;
  onOpenManager?: () => void;
  /** Opens the scenes / sources / creator tools drawer (tablet & phone). */
  onOpenMenu?: () => void;
}) {
  const navigate = useNavigate();

  const isLive = phase === "live";
  const isBroadcasting = phase === "live" || phase === "ending";
  const isTransitioning = phase === "starting" || phase === "ending";
  const connectionIssue =
    connection === "poor" ||
    connection === "reconnecting" ||
    connection === "offline";

  return (
    <header className="header">
      <div className="header__brand">
        {onOpenMenu && (
          <button
            type="button"
            className="header-btn header-btn--icon header-btn--menu"
            onClick={onOpenMenu}
            aria-label="Open studio menu"
            title="Scenes, sources and creator tools"
          >
            <MenuIcon size={22} />
          </button>
        )}

        <span className="header__brand-mark">
          <FockisMark />
        </span>

        <span className="header__brand-text">
          <span className="header__brand-name">FOCKIS</span>
          <span className="header__brand-sub">LIVE STUDIO</span>
        </span>

        <span className="header__divider" aria-hidden="true" />

        <span className="header__username" title={`@${username}`}>
          @{username}
        </span>
      </div>

      <div className="header__center" aria-live="polite">
        <span
          className={`status-pill status-pill--${phase}`}
          title={isLive ? "You are live" : "You are not broadcasting"}
        >
          {isTransitioning ? (
            <Loader2 size={13} className="spin" aria-hidden="true" />
          ) : (
            <span className="status-pill__dot" aria-hidden="true" />
          )}
          {PHASE_LABEL[phase]}
        </span>

        <span className="info-pill" title="Current viewers">
          <Eye size={17} aria-hidden="true" />
          <span>
            {formatCount(isBroadcasting ? viewers : 0)}
            <span className="info-pill__suffix"> viewers</span>
          </span>
        </span>

        <span className="info-pill info-pill--mono" title="Session duration">
          {formatDuration(isBroadcasting ? elapsedSeconds : 0)}
        </span>

        {connectionIssue && (
          <span className={`info-pill info-pill--warn`} role="status">
            {connection === "offline" ? (
              <WifiOff size={14} aria-hidden="true" />
            ) : (
              <Loader2 size={14} className="spin" aria-hidden="true" />
            )}
            {CONNECTION_LABEL[connection]}
          </span>
        )}
      </div>

      <div className="header__actions">
        <Menu
          label="More studio options"
          trigger={<MoreHorizontal size={20} />}
          triggerClassName="header-btn header-btn--icon"
          items={[
            {
              id: "settings",
              label: "Stream settings",
              icon: <Settings size={16} />,
              onSelect: onOpenSettings,
            },
            {
              id: "manager",
              label: "Live Manager",
              icon: <LayoutDashboard size={16} />,
              onSelect: onOpenManager ?? (() => navigate("/my-live")),
            },
            {
              id: "help",
              label: "Help",
              icon: <HelpCircle size={16} />,
              onSelect: () => navigate("/help"),
            },
            {
              id: "exit",
              label: isBroadcasting ? "Leave studio (stays live)" : "Exit studio",
              icon: <LogOut size={16} />,
              // Leaving the studio UI never ends the broadcast. Ending is
              // only done through the End live session confirmation.
              onSelect: () => navigate("/my-live"),
            },
          ]}
        />

        <button
          type="button"
          className="header-btn header-btn--share"
          onClick={onShare}
          disabled={!isLive || !onShare}
          title={isLive ? "Share your live" : "You can share once you're live"}
        >
          <Forward size={19} aria-hidden="true" />
          <span className="header-btn__label">Share</span>
        </button>

        <button
          type="button"
          className="header-btn header-btn--primary"
          onClick={onInviteGuest}
          disabled={!onInviteGuest}
          title="Invite a guest to your live"
        >
          <UserPlus size={18} aria-hidden="true" />
          <span className="header-btn__label">Invite guest</span>
        </button>
      </div>
    </header>
  );
}
