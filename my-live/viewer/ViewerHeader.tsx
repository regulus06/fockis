import {
  ArrowLeft,
  MoreHorizontal,
  Radio,
  Share2,
} from "lucide-react";

import type {
  LiveViewerStream,
} from "../hooks/useLiveViewer";

import { formatCount } from "../utils";

interface ViewerHeaderProps {
  stream: LiveViewerStream;
  onBack?: () => void;
  onShare: () => void;
}

export function ViewerHeader({
  stream,
  onBack,
  onShare,
}: ViewerHeaderProps) {
  const username =
    stream.username?.trim() ||
    "Fockis User";

  return (
    <header className="viewer-header">
      <div className="viewer-header__left">
        <button
          className="viewer-header__icon"
          type="button"
          aria-label="Go back"
          onClick={
            onBack ??
            (() => window.history.back())
          }
        >
          <ArrowLeft size={20} />
        </button>

        <div className="viewer-header__brand">
          <span className="viewer-header__brand-mark">
            F
          </span>

          <div className="viewer-header__host">
            <strong>
              {username}
            </strong>

            <span>
              is live
            </span>
          </div>
        </div>
      </div>

      <div className="viewer-header__center">
        <Radio size={15} />

        <span>
          {formatCount(stream.viewers)}
        </span>

        <span>
          watching
        </span>
      </div>

      <div className="viewer-header__right">
        <button
          className="viewer-header__share"
          type="button"
          onClick={onShare}
        >
          <Share2 size={17} />
          <span>Share</span>
        </button>

        <button
          className="viewer-header__icon"
          type="button"
          aria-label="More options"
        >
          <MoreHorizontal size={21} />
        </button>
      </div>
    </header>
  );
}