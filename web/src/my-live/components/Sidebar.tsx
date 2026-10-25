import type { ReactNode } from "react";
import {
  BarChart3,
  Camera,
  Film,
  Flag,
  Globe,
  Image as ImageIcon,
  Layers,
  MessageCircleQuestion,
  Monitor,
  MonitorPlay,
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
  StudioSourceState,
} from "../types";

const SOURCE_ICON: Record<SourceType, typeof Camera> = {
  camera: Camera,
  screen: Video,
  image: ImageIcon,
  video: Film,
  text: Type,
  browser: Globe,
};

const SOURCE_HINT: Record<SourceType, string> = {
  camera: "Turn your camera on or off",
  screen: "Share a screen, window or tab",
  image: "Show an image on stage",
  video: "Play a video file on stage",
  text: "Add a text overlay",
  browser: "Show a web page on stage",
};

function sceneIcon(scene: Scene) {
  const name = scene.name.trim().toLowerCase();

  if (scene.id === "main-camera" || name.includes("camera")) return Camera;
  if (name.includes("starting")) return MonitorPlay;
  if (name.includes("screen")) return Monitor;
  if (name.includes("interview")) return Users;
  if (name.includes("ending")) return Flag;
  return Layers;
}

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
  sourceState: StudioSourceState;
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

  const isSourceDisabled = (type: SourceType) =>
    type === "camera" &&
    (devices.camera === "permission-denied" || devices.camera === "unavailable");

  return (
    <aside className="sidebar" aria-label="Studio tools">
      <section className="sidebar__section" aria-labelledby="fls-scenes-heading">
        <h2 className="sidebar__heading" id="fls-scenes-heading">Scenes</h2>

        <div className="scene-list" role="radiogroup" aria-labelledby="fls-scenes-heading">
          {scenes.map((scene) => {
            const Icon = sceneIcon(scene);
            const active = activeScene.id === scene.id;

            return (
              <button
                key={scene.id}
                className={`scene-item ${active ? "scene-item--active" : ""}`}
                onClick={() => onSelectScene(scene)}
                type="button"
                role="radio"
                aria-checked={active}
              >
                <span className="scene-item__icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="scene-item__name">{scene.name}</span>
              </button>
            );
          })}
        </div>

        <button className="add-scene" type="button" onClick={onAddScene}>
          <Plus size={16} aria-hidden="true" />
          Add scene
        </button>
      </section>

      <section className="sidebar__section" aria-labelledby="fls-sources-heading">
        <h2 className="sidebar__heading" id="fls-sources-heading">Sources</h2>

        <div className="source-grid">
          {sources.map((source) => {
            const Icon = SOURCE_ICON[source.type];
            const active = isSourceActive(source.type);
            const disabled = isSourceDisabled(source.type);

            return (
              <button
                className={`source-chip ${active ? "source-chip--active" : ""}`}
                type="button"
                key={source.id}
                onClick={() => handleSourceClick(source.type)}
                aria-pressed={active}
                disabled={disabled}
                title={
                  disabled
                    ? devices.camera === "permission-denied"
                      ? "Camera access is blocked in your browser"
                      : "No camera detected"
                    : SOURCE_HINT[source.type]
                }
              >
                <Icon size={17} aria-hidden="true" />
                <span>{source.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="sidebar__section" aria-labelledby="fls-tools-heading">
        <h2 className="sidebar__heading" id="fls-tools-heading">Creator tools</h2>

        <nav className="tool-nav" aria-labelledby="fls-tools-heading">
          <ToolNavButton icon={<Sparkles size={20} />} label="Effects" active={activePanel === "effects"} onClick={() => onSelectPanel("effects")} />
          <ToolNavButton icon={<Music2 size={20} />} label="Music" active={activePanel === "music"} onClick={() => onSelectPanel("music")} />
          <ToolNavButton
            icon={<Users size={20} />}
            label="Guests"
            active={activePanel === "guests"}
            onClick={() => onSelectPanel("guests")}
            badge={guestCount > 0 ? guestCount : undefined}
          />
          <ToolNavButton
            icon={<ShoppingBag size={20} />}
            label="Products"
            active={activePanel === "products"}
            onClick={() => onSelectPanel("products")}
            badge={hasFeaturedProduct ? 1 : undefined}
          />
          <ToolNavButton icon={<Vote size={20} />} label="Polls" active={activePanel === "polls"} onClick={() => onSelectPanel("polls")} />
          <ToolNavButton icon={<MessageCircleQuestion size={20} />} label="Q&A" active={activePanel === "qna"} onClick={() => onSelectPanel("qna")} />
          <ToolNavButton icon={<BarChart3 size={20} />} label="Analytics" active={activePanel === "analytics"} onClick={() => onSelectPanel("analytics")} />
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
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
}) {
  return (
    <button
      className={`tool-button ${active ? "tool-button--active" : ""}`}
      onClick={onClick}
      type="button"
      aria-current={active ? "true" : undefined}
    >
      <span className="tool-button__icon" aria-hidden="true">{icon}</span>
      <span className="tool-button__label">{label}</span>
      {badge !== undefined && (
        <span className="tool-button__badge" aria-label={`${badge} active`}>
          {badge}
        </span>
      )}
    </button>
  );
}
