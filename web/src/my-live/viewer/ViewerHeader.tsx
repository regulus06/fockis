import {
  ArrowLeft,
  Eye,
  Flag,
  Link2,
  MoreHorizontal,
  Forward,
} from "lucide-react";

import type {
  LiveViewerStream,
} from "../hooks/useLiveViewer";

import { formatCount } from "../utils";
import { Menu } from "../components/ui/Primitives";

import FockisMark from "../../components/fockis/FockisMark";

interface ViewerHeaderProps {
  stream: LiveViewerStream;
  connected?: boolean;
  onBack?: () => void;
  onShare: () => void;
  onCopyLink?: () => void;
  sharing?: boolean;
}

export function ViewerHeader({
  stream,
  connected = true,
  onBack,
  onShare,
  onCopyLink,
  sharing = false,
}: ViewerHeaderProps) {
  const isLive = stream.status === "live";

  return (
    <header className="viewer-header">
      <div className="viewer-header__left">
        <button
          className="viewer-header__icon"
          type="button"
          aria-label="Go back"
          onClick={onBack ?? (() => window.history.back())}
        >
          <ArrowLeft size={20} />
        </button>

        <span className="viewer-header__brand-mark">
          <FockisMark />
        </span>

        <span className="viewer-header__brand">
          <span className="viewer-header__brand-name">FOCKIS</span>
          <span className="viewer-header__brand-sub">LIVE</span>
        </span>
      </div>

      <div className="viewer-header__center" aria-live="polite">
        <span className={`viewer-pill ${isLive ? "viewer-pill--live" : ""}`}>
          <span className="viewer-pill__dot" aria-hidden="true" />
          {isLive ? (connected ? "LIVE" : "CONNECTING") : stream.status.toUpperCase()}
        </span>

        <span className="viewer-pill viewer-pill--plain" title="Watching now">
          <Eye size={16} aria-hidden="true" />
          {formatCount(stream.viewers)}
          <span className="viewer-pill__suffix"> watching</span>
        </span>
      </div>

      <div className="viewer-header__right">
        <button
          className="viewer-header__share"
          type="button"
          onClick={onShare}
          disabled={sharing}
        >
          <Forward size={18} aria-hidden="true" />
          <span>{sharing ? "Sharing…" : "Share"}</span>
        </button>

        <Menu
          label="More options"
          trigger={<MoreHorizontal size={20} />}
          triggerClassName="viewer-header__icon"
          items={[
            {
              id: "copy",
              label: "Copy link",
              icon: <Link2 size={16} />,
              onSelect: onCopyLink,
              disabled: !onCopyLink,
            },
            {
              id: "report",
              label: "Report live",
              icon: <Flag size={16} />,
              disabled: true,
              hint: "Reporting from the web player isn't available yet",
            },
          ]}
        />
      </div>
    </header>
  );
}
