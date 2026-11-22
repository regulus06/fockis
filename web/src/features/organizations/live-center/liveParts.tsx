/**
 * liveParts.tsx — small shared pieces of the livestream screens.
 */

import { Globe, Lock, Radio, UsersRound, Users } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { STATUS_LABEL, VISIBILITY_LABEL, type LiveStatus, type LiveVisibility, type Livestream } from "./liveApi";
import { validZone } from "../events-center/zonedTime";

export function VisibilityBadge({ value }: { value: LiveVisibility }) {
  const Icon = value === "public" ? Globe : value === "members" ? Users : value === "private" ? Lock : UsersRound;
  return (
    <span className={`lv-vis lv-vis--${value}`}>
      <Icon aria-hidden="true" /> {VISIBILITY_LABEL[value]}
    </span>
  );
}

export function StatusBadge({ value }: { value: LiveStatus }) {
  return (
    <span className={`lv-status lv-status--${value}`}>
      {value === "live" ? <i className="lv-dot" aria-hidden="true" /> : <i aria-hidden="true" />}
      {STATUS_LABEL[value]}
    </span>
  );
}

export function Thumb({ stream, className = "lv-thumb" }: { stream: Pick<Livestream, "posterUrl" | "coverUrl" | "title">; className?: string }) {
  const src = stream.posterUrl || stream.coverUrl;
  return src ? (
    <img className={className} src={mediaUrl(src) ?? undefined} alt="" loading="lazy" />
  ) : (
    <span className={`${className} lv-thumb--empty`} aria-hidden="true">
      <Radio />
    </span>
  );
}

/** "Sun, Jan 26, 2026" + "10:00 AM – 12:00 PM (EST)" in the livestream's time zone. */
export function streamWhen(s: Pick<Livestream, "scheduledStart" | "scheduledEnd" | "timeZone">): { date: string; time: string } {
  const zone = validZone(s.timeZone);
  const start = new Date(s.scheduledStart);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(start);
  const t = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" });
  let abbr = "";
  try {
    abbr = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(start).find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    abbr = "";
  }
  const end = s.scheduledEnd ? ` – ${t.format(new Date(s.scheduledEnd))}` : "";
  return { date, time: `${t.format(start)}${end}${abbr ? ` (${abbr})` : ""}` };
}

export function formatCount(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : n.toLocaleString("en-US");
}
