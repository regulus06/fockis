import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  Users,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "../styles/viewer.scss";

import {
  useLiveViewer,
} from "../hooks/useLiveViewer";

import { ViewerHeader } from "./ViewerHeader";
import { ViewerStage } from "./ViewerStage";
import { ViewerChat } from "./ViewerChat";

export interface LiveViewerProps {
  liveId?: string;
}

export default function LiveViewer({
  liveId: liveIdProp,
}: LiveViewerProps) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();

  const liveId = liveIdProp || params.id || "";

  const viewer = useLiveViewer({
    streamId: liveId,
  });

  const [muted, setMuted] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      viewer.videoRef(element);
    },
    [viewer.videoRef],
  );

  const handleToggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      viewer.setIsMuted(next);
      return next;
    });
  }, [viewer.setIsMuted]);

  const handleSendMessage = async (text: string) => {
    const value = text.trim();
    if (!value) return;

    try {
      await viewer.sendMessage(value);
    } catch (error) {
      console.error("[LIVE VIEWER] Failed to send message:", error);
      throw error instanceof Error ? error : new Error("Your message couldn't be sent.");
    }
  };

  const handleLike = async () => {
    try {
      await viewer.toggleLike();
    } catch (error) {
      console.error("[LIVE VIEWER] Like failed:", error);
    }
  };

  const handleFollow = async () => {
    try {
      await viewer.toggleFollow();
    } catch (error) {
      console.error("[LIVE VIEWER] Follow failed:", error);
    }
  };

  const handleShare = async () => {
    if (sharing) return;

    setSharing(true);
    try {
      await viewer.shareStream();
    } catch (error) {
      console.error("[LIVE VIEWER] Share failed:", error);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("Link copied");
    } catch {
      setToast("Couldn't copy the link");
    }
  };

  const handleReload = async () => {
    try {
      await viewer.reload();
    } catch (error) {
      console.error("[LIVE VIEWER] Reload failed:", error);
    }
  };

  const handleBack = () => {
    navigate("/my-live");
  };

  /* --------------------------------------------------------------- states */

  if (!liveId) {
    return (
      <div className="live-viewer">
        <div className="live-viewer__state">
          <span className="live-viewer__state-icon"><AlertCircle size={28} /></span>
          <h2>Invalid live stream</h2>
          <p>No live stream ID was provided.</p>
          <button type="button" onClick={handleBack} className="live-viewer__button live-viewer__button--primary">
            <ArrowLeft size={17} />
            Back to Live
          </button>
        </div>
      </div>
    );
  }

  if (viewer.loading) {
    return (
      <div className="live-viewer" aria-busy="true">
        <div className="live-viewer__skeleton" aria-label="Loading live stream">
          <div className="live-viewer__skeleton-bar" />
          <div className="live-viewer__skeleton-body">
            <div className="live-viewer__skeleton-stage" />
            <div className="live-viewer__skeleton-side">
              <span /><span /><span /><span />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewer.error) {
    return (
      <div className="live-viewer">
        <div className="live-viewer__state" role="alert">
          <span className="live-viewer__state-icon live-viewer__state-icon--error"><AlertCircle size={28} /></span>
          <h2>Unable to load live stream</h2>
          <p>{viewer.error}</p>
          <div className="live-viewer__state-actions">
            <button type="button" onClick={() => void handleReload()} className="live-viewer__button live-viewer__button--primary">
              <RefreshCw size={17} />
              Try again
            </button>
            <button type="button" onClick={handleBack} className="live-viewer__button">
              <ArrowLeft size={17} />
              Back to Live
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!viewer.stream) {
    return (
      <div className="live-viewer">
        <div className="live-viewer__state">
          <span className="live-viewer__state-icon"><Users size={28} /></span>
          <h2>Live stream not found</h2>
          <p>This live stream may have ended or is no longer available.</p>
          <button type="button" onClick={handleBack} className="live-viewer__button live-viewer__button--primary">
            <ArrowLeft size={17} />
            Back to Live
          </button>
        </div>
      </div>
    );
  }

  const stream = viewer.stream;

  return (
    <div className="live-viewer">
      <ViewerHeader
        stream={stream}
        connected={viewer.connected}
        onBack={handleBack}
        onShare={() => void handleShare()}
        onCopyLink={() => void handleCopyLink()}
        sharing={sharing}
      />

      <main className="live-viewer__main">
        <ViewerStage
          stream={stream}
          videoRef={handleVideoRef}
          connected={viewer.connected}
          muted={muted}
          onToggleMute={handleToggleMute}
          messages={viewer.messages}
          liked={viewer.liked}
          isFollowing={viewer.isFollowing}
          sharing={sharing}
          onLike={() => void handleLike()}
          onFollow={() => void handleFollow()}
          onShare={() => void handleShare()}
          onSend={handleSendMessage}
        />

        <div className={`live-viewer__side ${chatOpen ? "live-viewer__side--open" : ""}`}>
          {chatOpen && (
            <div className="live-viewer__backdrop" onClick={() => setChatOpen(false)} aria-hidden="true" />
          )}

          <ViewerChat
            messages={viewer.messages}
            onSend={handleSendMessage}
            title={stream.title || "Live stream"}
            description={stream.description}
            onClose={chatOpen ? () => setChatOpen(false) : undefined}
          />
        </div>

        <button
          type="button"
          className="live-viewer__chat-toggle"
          onClick={() => setChatOpen(true)}
          aria-label="Open full chat"
        >
          <MessageCircle size={18} />
          Chat{viewer.messages.length ? ` · ${viewer.messages.length}` : ""}
        </button>
      </main>

      {toast && (
        <div className="live-viewer__toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export { LiveViewer };
