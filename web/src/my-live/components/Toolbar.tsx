import {
  BarChart3,
  Gift,
  MessageCircleQuestion,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  Music2,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Type,
  Users,
  Video,
  VideoOff,
  Vote,
} from "lucide-react";

import type {
  DeviceState,
  DeviceStatus,
  Guest,
  PanelId,
  Product,
  StudioSourceState,
} from "../types";

import { ControlButton, Menu } from "./ui/Primitives";

function deviceHint(status: DeviceStatus, device: "camera" | "microphone") {
  if (status === "permission-denied") {
    return `${device === "camera" ? "Camera" : "Microphone"} access is blocked — allow it in your browser settings`;
  }

  if (status === "unavailable" || status === "disconnected") {
    return `No ${device} detected`;
  }

  return null;
}

export function Toolbar({
  devices,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
  activePanel,
  setActivePanel,
  guests,
  featuredProduct,
  onAddText,
  sourceState,
  onOpenTools,
}: {
  devices: DeviceState;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => void;
  activePanel: PanelId;
  setActivePanel: (panel: PanelId) => void;
  guests: Guest[];
  featuredProduct: Product | null;
  onAddText?: () => void;
  sourceState?: StudioSourceState;
  /** Opens the scenes / sources drawer on tablet and mobile. */
  onOpenTools?: () => void;
}) {
  const toggle = (panel: PanelId) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const micIssue = deviceHint(devices.microphone, "microphone");
  const cameraIssue = deviceHint(devices.camera, "camera");
  const textActive = sourceState?.activeSource === "text" && !!sourceState.text;

  return (
    <div className="toolbar" role="toolbar" aria-label="Live production controls">
      <div className="toolbar__group">
        {onOpenTools && (
          <span className="control--tools">
            <ControlButton
              icon={<SlidersHorizontal size={22} />}
              label="Tools"
              tooltip="Scenes, sources and creator tools"
              onClick={onOpenTools}
            />
          </span>
        )}

        <ControlButton
          icon={devices.micEnabled ? <Mic size={22} /> : <MicOff size={22} />}
          label="Microphone"
          active={devices.micEnabled}
          danger={!!micIssue}
          disabled={devices.microphone !== "connected"}
          tooltip={micIssue ?? (devices.micEnabled ? "Mute microphone" : "Unmute microphone")}
          onClick={toggleMic}
        />

        <ControlButton
          icon={devices.cameraEnabled ? <Video size={22} /> : <VideoOff size={22} />}
          label="Camera"
          active={devices.cameraEnabled}
          danger={!!cameraIssue}
          disabled={devices.camera !== "connected"}
          tooltip={cameraIssue ?? (devices.cameraEnabled ? "Turn camera off" : "Turn camera on")}
          onClick={toggleCamera}
        />

        <ControlButton
          icon={<MonitorUp size={22} />}
          label="Share screen"
          active={devices.screenShareEnabled}
          tooltip={devices.screenShareEnabled ? "Stop sharing screen" : "Share your screen"}
          onClick={toggleScreenShare}
        />

        <ControlButton
          icon={<Sparkles size={22} />}
          label="Effects"
          active={activePanel === "effects"}
          tooltip="Beauty, filters & backgrounds"
          onClick={() => toggle("effects")}
        />

        <ControlButton
          icon={<Type size={22} />}
          label="Text"
          className="control--wide-only"
          active={textActive}
          disabled={!onAddText}
          tooltip={textActive ? "Edit text overlay" : "Add a text overlay"}
          onClick={onAddText}
        />

        <ControlButton
          icon={<ShoppingBag size={22} />}
          label="Products"
          className="control--wide-only"
          active={activePanel === "products"}
          badge={featuredProduct ? 1 : undefined}
          tooltip="Feature a product"
          onClick={() => toggle("products")}
        />
      </div>

      <div className="toolbar__divider" aria-hidden="true" />

      <div className="toolbar__more">
        <Menu
          label="More tools"
          placement="above"
          triggerClassName="control control--menu"
          trigger={
            <>
              <span className="control__icon-wrap">
                <MoreHorizontal size={22} />
              </span>
              <span className="control__label">More</span>
            </>
          }
          items={[
            {
              id: "text",
              label: textActive ? "Edit text overlay" : "Text overlay",
              icon: <Type size={16} />,
              onSelect: onAddText,
              disabled: !onAddText,
            },
            {
              id: "products",
              label: featuredProduct ? "Products (1 featured)" : "Products",
              icon: <ShoppingBag size={16} />,
              onSelect: () => setActivePanel("products"),
            },
            {
              id: "guests",
              label: guests.length ? `Guests (${guests.length})` : "Guests",
              icon: <Users size={16} />,
              onSelect: () => setActivePanel("guests"),
            },
            { id: "music", label: "Music", icon: <Music2 size={16} />, onSelect: () => setActivePanel("music") },
            { id: "gifts", label: "Gifts", icon: <Gift size={16} />, onSelect: () => setActivePanel("gifts") },
            { id: "polls", label: "Polls", icon: <Vote size={16} />, onSelect: () => setActivePanel("polls") },
            { id: "qna", label: "Q&A", icon: <MessageCircleQuestion size={16} />, onSelect: () => setActivePanel("qna") },
            { id: "analytics", label: "Analytics", icon: <BarChart3 size={16} />, onSelect: () => setActivePanel("analytics") },
            { id: "settings", label: "Stream settings", icon: <Settings size={16} />, onSelect: () => setActivePanel("settings") },
          ]}
        />
      </div>
    </div>
  );
}
