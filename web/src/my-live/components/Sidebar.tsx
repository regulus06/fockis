import {
  BarChart3,
  Camera,
  Film,
  Globe,
  Image as ImageIcon,
  MessageCircleQuestion,
  Music2,
  Plus,
  ShoppingBag,
  Sparkles,
  Type,
  Users,
  Video,
  Vote,
} from "lucide-react";

import type {
  DeviceState,
  PanelId,
  Scene,
  Source,
  SourceType,
} from "../types";

const SOURCE_ICON: Record<SourceType, typeof Camera> = {
  camera: Camera,
  screen: Video,
  image: ImageIcon,
  video: Film,
  text: Type,
  browser: Globe,
};

export function Sidebar({
  scenes,
  activeScene,
  onSelectScene,
  sources,
  activePanel,
  onSelectPanel,
  guestCount,
  hasFeaturedProduct,
  onAddScene,
  toggleCamera,
  toggleScreenShare,
  devices,
  onAddImage,
  onAddVideo,
  onAddText,
  onAddBrowser,
  sourceState,
}: {
  scenes: Scene[];
  activeScene: Scene;
  onSelectScene: (scene: Scene) => void;
  sources: Source[];
  activePanel: PanelId;
  onSelectPanel: (panel: PanelId) => void;
  guestCount: number;
  hasFeaturedProduct: boolean;
  onAddScene: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  devices: DeviceState;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddText: () => void;
  onAddBrowser: () => void;
  sourceState: {
    imageUrl: string | null;
    videoUrl: string | null;
    text: string;
    browserUrl: string | null;
    activeSource: SourceType | null;
  };
}) {
  const handleSourceClick = (type: SourceType) => {
    switch (type) {
      case "camera":
        toggleCamera();
        return;
      case "screen":
        toggleScreenShare();
        return;
      case "image":
        onAddImage();
        return;
      case "video":
        onAddVideo();
        return;
      case "text":
        onAddText();
        return;
      case "browser":
        onAddBrowser();
        return;
    }
  };

  const isSourceActive = (type: SourceType) => {
    if (type === "camera") return devices.cameraEnabled;
    if (type === "screen") return devices.screenShareEnabled;
    if (type === "image") return sourceState.activeSource === "image" && !!sourceState.imageUrl;
    if (type === "video") return sourceState.activeSource === "video" && !!sourceState.videoUrl;
    if (type === "text") return sourceState.activeSource === "text" && !!sourceState.text;
    if (type === "browser") return sourceState.activeSource === "browser" && !!sourceState.browserUrl;
    return false;
  };

  return (
    <aside className="sidebar">
      <section className="sidebar__section">
        <div className="sidebar__heading">Scenes</div>

        <div className="scene-list">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              className={`scene-card ${
                activeScene.id === scene.id ? "scene-card--active" : ""
              }`}
              onClick={() => onSelectScene(scene)}
              type="button"
            >
              <span
                className={`scene-card__thumb scene-card__thumb--${scene.thumbnailTone}`}
              >
                {scene.thumbnailTone === "camera"
                  ? "CAM"
                  : scene.thumbnailTone === "intro"
                    ? "SOON"
                    : scene.thumbnailTone === "screen"
                      ? "SCRN"
                      : scene.thumbnailTone === "interview"
                        ? "INT"
                        : "END"}
              </span>

              <span className="scene-card__name">{scene.name}</span>
            </button>
          ))}
        </div>

        <button
          className="add-scene"
          type="button"
          onClick={onAddScene}
        >
          <Plus size={14} />
          Add scene
        </button>
      </section>

      <section className="sidebar__section">
        <div className="sidebar__heading">Sources</div>

        <div className="source-grid">
          {sources.map((source) => {
            const Icon = SOURCE_ICON[source.type];
            const active = isSourceActive(source.type);

            return (
              <button
                className={`source-chip ${
                  active ? "source-chip--active" : ""
                }`}
                type="button"
                key={source.id}
                onClick={() => handleSourceClick(source.type)}
                aria-pressed={active}
                title={
                  source.type === "image"
                    ? "Choose an image"
                    : source.type === "video"
                      ? "Choose a video"
                      : source.type === "text"
                        ? "Add text overlay"
                        : source.type === "browser"
                          ? "Add a webpage"
                          : undefined
                }
              >
                <Icon size={15} />
                {source.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="sidebar__section">
        <div className="sidebar__heading">Creator tools</div>

        <nav className="tool-nav">
          <ToolNavButton
            icon={<Sparkles size={16} />}
            label="Effects"
            active={activePanel === "effects"}
            onClick={() => onSelectPanel("effects")}
          />

          <ToolNavButton
            icon={<Music2 size={16} />}
            label="Music"
            active={activePanel === "music"}
            onClick={() => onSelectPanel("music")}
          />

          <ToolNavButton
            icon={<Users size={16} />}
            label="Guests"
            active={activePanel === "guests"}
            onClick={() => onSelectPanel("guests")}
            badge={guestCount > 0 ? guestCount : undefined}
          />

          <ToolNavButton
            icon={<ShoppingBag size={16} />}
            label="Products"
            active={activePanel === "products"}
            onClick={() => onSelectPanel("products")}
            badge={hasFeaturedProduct ? "1" : undefined}
          />

          <ToolNavButton
            icon={<Vote size={16} />}
            label="Polls"
            active={activePanel === "polls"}
            onClick={() => onSelectPanel("polls")}
          />

          <ToolNavButton
            icon={<MessageCircleQuestion size={16} />}
            label="Q&A"
            active={activePanel === "qna"}
            onClick={() => onSelectPanel("qna")}
          />

          <ToolNavButton
            icon={<BarChart3 size={16} />}
            label="Analytics"
            active={activePanel === "analytics"}
            onClick={() => onSelectPanel("analytics")}
          />
        </nav>
      </section>
    </aside>
  );
}

function ToolNavButton({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
}) {
  return (
    <button
      className={`tool-button ${
        active ? "tool-button--active" : ""
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="tool-button__icon">{icon}</span>
      {label}
      {badge !== undefined && (
        <span className="tool-button__badge">{badge}</span>
      )}
    </button>
  );
}
