import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Grid2x2,
  Info,
  LayoutPanelLeft,
  Lock,
  Phone,
  Users,
} from "lucide-react";

import { RecordingIndicator } from "../recording/RecordingIndicator";
import { useElapsedTimer } from "../../hooks/useElapsedTimer";
import type { LocalConnectionQuality, StageLayout } from "./VideoGrid";

import "../../styles/components/room.scss";

import FockisMark from "../../../../components/fockis/FockisMark";

type ConnectionState = "connected" | "reconnecting" | "disconnected";

interface MeetingTopBarProps {
  topic: string;
  /** Scheduled start (ISO). Also drives the elapsed timer. */
  startTime?: string | null;
  /** Scheduled end (ISO). */
  endTime?: string | null;
  recording: boolean;
  connectionState: ConnectionState;
  connectionQuality: LocalConnectionQuality;
  participantCount: number;
  waitingRoomEnabled: boolean;
  locked: boolean;
  layout: StageLayout;
  onLayoutChange: (layout: StageLayout) => void;
  onShowInfo: () => void;
  onLeave: () => void;
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Today, Oct 13, 2026 • 2:00 PM – 3:00 PM (EDT)" */
function formatSchedule(startTime?: string | null, endTime?: string | null) {
  if (!startTime) return "";
  const start = new Date(startTime);
  if (!isValidDate(start)) return "";

  const end = endTime ? new Date(endTime) : null;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const dayPrefix = isSameDay(start, now)
    ? "Today, "
    : isSameDay(start, tomorrow)
      ? "Tomorrow, "
      : "";

  const day = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const zone =
    new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(start)
      .find((part) => part.type === "timeZoneName")?.value ?? "";

  const range =
    end && isValidDate(end) ? `${time(start)} – ${time(end)}` : time(start);

  return `${dayPrefix}${day} • ${range}${zone ? ` (${zone})` : ""}`;
}

const QUALITY_LABEL: Record<LocalConnectionQuality, string> = {
  good: "Good",
  weak: "Fair",
  poor: "Poor",
  reconnecting: "Reconnecting",
};

function SignalBars({ level }: { level: number }) {
  return (
    <span className="fm-header__bars" aria-hidden="true">
      {[1, 2, 3, 4].map((bar) => (
        <i key={bar} className={bar <= level ? "is-on" : ""} />
      ))}
    </span>
  );
}

export function MeetingTopBar({
  topic,
  startTime,
  endTime,
  recording,
  connectionState,
  connectionQuality,
  participantCount,
  waitingRoomEnabled,
  locked,
  layout,
  onLayoutChange,
  onShowInfo,
  onLeave,
}: MeetingTopBarProps) {
  const elapsed = useElapsedTimer(startTime ?? null);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!layoutOpen) return;
    const close = (event: MouseEvent) => {
      if (!layoutRef.current?.contains(event.target as Node)) setLayoutOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLayoutOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [layoutOpen]);

  const schedule = formatSchedule(startTime, endTime);

  const effectiveQuality: LocalConnectionQuality =
    connectionState === "connected"
      ? connectionQuality
      : connectionState === "reconnecting"
        ? "reconnecting"
        : "poor";
  const qualityLevel =
    connectionState === "disconnected"
      ? 0
      : effectiveQuality === "good"
        ? 4
        : effectiveQuality === "weak"
          ? 2
          : 1;
  const qualityLabel =
    connectionState === "disconnected" ? "Offline" : QUALITY_LABEL[effectiveQuality];

  const liveLabel =
    connectionState === "connected"
      ? "Live"
      : connectionState === "reconnecting"
        ? "Reconnecting"
        : "Offline";

  const securityDetail = locked
    ? "Meeting locked"
    : waitingRoomEnabled
      ? "Waiting room on"
      : "Waiting room off";

  return (
    <header className="fm-header">
      <div className="fm-header__brand">
        <span className="fm-header__brand-mark">
          <FockisMark />
        </span>
        <span className="fm-header__brand-name">Fockis</span>
        <span className="fm-header__brand-product">Meetings</span>
      </div>

      <span className="fm-header__divider" aria-hidden="true" />

      <div className="fm-header__meeting">
        <div className="fm-header__title-row">
          <h1 className="fm-header__title" title={topic}>
            {topic}
          </h1>
          <button
            type="button"
            className="fm-header__info"
            onClick={onShowInfo}
            aria-label="Meeting information"
            title="Meeting information"
          >
            <Info size={17} />
          </button>
        </div>
        {schedule && <p className="fm-header__schedule">{schedule}</p>}
      </div>

      <div
        className={`fm-header__live fm-header__live--${connectionState}`}
        role="status"
        title={`${elapsed} elapsed`}
      >
        <span className="fm-header__live-dot" />
        <span>{liveLabel}</span>
        <span className="fm-header__live-timer mono">{elapsed}</span>
      </div>

      {recording && (
        <div className="fm-header__recording">
          <RecordingIndicator />
        </div>
      )}

      <div className="fm-header__spacer" />

      <div className="fm-header__stats">
        <div className="fm-header__stat">
          <Users size={22} />
          <span>
            <strong>{participantCount}</strong>
            <small>{participantCount === 1 ? "Participant" : "Participants"}</small>
          </span>
        </div>

        <div className="fm-header__stat fm-header__stat--secure">
          <Lock size={21} />
          <span>
            <strong>Secure</strong>
            <small>{securityDetail}</small>
          </span>
        </div>

        <div className={`fm-header__stat fm-header__stat--quality fm-header__stat--${effectiveQuality}`}>
          <SignalBars level={qualityLevel} />
          <span>
            <strong>{qualityLabel}</strong>
            <small>Connection</small>
          </span>
        </div>
      </div>

      <div className="fm-header__layout" ref={layoutRef}>
        <button
          type="button"
          className="fm-header__layout-btn"
          aria-haspopup="menu"
          aria-expanded={layoutOpen}
          aria-label="Layout"
          onClick={() => setLayoutOpen((value) => !value)}
        >
          {layout === "gallery" ? <Grid2x2 size={18} /> : <LayoutPanelLeft size={18} />}
          <span>Layout</span>
          <ChevronDown size={16} />
        </button>

        {layoutOpen && (
          <div className="fm-header__menu" role="menu">
            {(
              [
                ["speaker", "Speaker view", LayoutPanelLeft],
                ["gallery", "Gallery view", Grid2x2],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={layout === value}
                className="fm-header__menu-item"
                onClick={() => {
                  onLayoutChange(value);
                  setLayoutOpen(false);
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
                {layout === value && <Check size={15} className="fm-header__menu-check" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="fm-header__leave" onClick={onLeave}>
        <Phone size={19} className="fm-hangup-icon" aria-hidden="true" />
        <span>Leave</span>
      </button>
    </header>
  );
}
