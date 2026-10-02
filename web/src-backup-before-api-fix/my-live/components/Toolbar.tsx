import {
  Mic,
  MicOff,
  MonitorUp,
  ShoppingBag,
  Sparkles,
  Type,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

import type {
  DeviceState,
  Guest,
  PanelId,
  Product,
} from "../types";

import { ControlButton } from "./ui/Primitives";

export function Toolbar({
  devices,
  toggleMic,
  toggleCamera,
  toggleScreenShare,
  activePanel,
  setActivePanel,
  guests,
  featuredProduct,
}: {
  devices: DeviceState;

  toggleMic: () => void;

  toggleCamera: () => void;

  toggleScreenShare: () => void;

  activePanel: PanelId;

  setActivePanel: (panel: PanelId) => void;

  guests: Guest[];

  featuredProduct: Product | null;
}) {
  const toggle = (panel: PanelId) => {
    setActivePanel(
      activePanel === panel ? null : panel,
    );
  };

  return (
    <div className="toolbar">
      {/* ================================================================
          DEVICE CONTROLS
      ================================================================ */}

      <div className="toolbar__group">
        <ControlButton
          icon={
            devices.micEnabled ? (
              <Mic size={18} />
            ) : (
              <MicOff size={18} />
            )
          }
          label="Microphone"
          active={devices.micEnabled}
          disabled={
            devices.microphone !== "connected"
          }
          tooltip={
            devices.micEnabled
              ? "Mute microphone"
              : "Unmute microphone"
          }
          onClick={toggleMic}
        />

        <ControlButton
          icon={
            devices.cameraEnabled ? (
              <Video size={18} />
            ) : (
              <VideoOff size={18} />
            )
          }
          label="Camera"
          active={devices.cameraEnabled}
          disabled={
            devices.camera !== "connected"
          }
          tooltip={
            devices.cameraEnabled
              ? "Turn camera off"
              : "Turn camera on"
          }
          onClick={toggleCamera}
        />

        <ControlButton
          icon={<MonitorUp size={18} />}
          label="Share screen"
          active={devices.screenShareEnabled}
          tooltip={
            devices.screenShareEnabled
              ? "Stop sharing screen"
              : "Share your screen"
          }
          onClick={toggleScreenShare}
        />
      </div>

      <div className="toolbar__divider" />

      {/* ================================================================
          CREATOR TOOLS
      ================================================================ */}

      <div className="toolbar__group">
        <ControlButton
          icon={<Users size={18} />}
          label="Guests"
          active={activePanel === "guests"}
          badge={
            guests.length > 0
              ? guests.length
              : undefined
          }
          tooltip="Invite guests"
          onClick={() => toggle("guests")}
        />

        <ControlButton
          icon={<Sparkles size={18} />}
          label="Effects"
          active={activePanel === "effects"}
          tooltip="Beauty, filters & backgrounds"
          onClick={() => toggle("effects")}
        />

        {/* ==============================================================
            TEXT

            "text" is not currently part of PanelId.
            Do not pass "text" to setActivePanel().
            
            Until a dedicated Text panel is added to PanelId,
            this button opens the Effects panel where text tools
            can be integrated.
        ============================================================== */}

        <ControlButton
          icon={<Type size={18} />}
          label="Text"
          active={activePanel === "effects"}
          tooltip="Add text overlay"
          onClick={() => toggle("effects")}
        />

        <ControlButton
          icon={<ShoppingBag size={18} />}
          label="Products"
          active={activePanel === "products"}
          badge={
            featuredProduct ? "1" : undefined
          }
          tooltip="Feature a product"
          onClick={() => toggle("products")}
        />
      </div>
    </div>
  );
}