/* ============================================================================
   ORGANIZATION TIME ZONE — date inputs
   Date/time inputs are filled in the organization's time zone (Settings &
   Roles → Settings → Time zone), not the browser's, so a service at 10:00
   stays at 10:00 for an administrator who is travelling.
============================================================================ */

function wallParts(ms: number, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour") % 24, mi: get("minute"), s: get("second") };
}

function offsetAt(ms: number, zone: string): number {
  const p = wallParts(ms, zone);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000;
}

export function validZone(zone?: string | null): string {
  const z = String(zone ?? "").trim();
  if (z) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: z });
      return z;
    } catch {
      /* fall through */
    }
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO instant → "YYYY-MM-DDTHH:mm" on the organization's clock. */
export function isoToZonedInput(iso: string | null | undefined, zone: string): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const p = wallParts(ms, zone);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** "YYYY-MM-DDTHH:mm" on the organization's clock → ISO instant. */
export function zonedInputToIso(value: string, zone: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return "";
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let guess = wall - offsetAt(wall, zone);
  // Second pass for daylight-saving changes.
  guess = wall - offsetAt(guess, zone);
  return new Date(guess).toISOString();
}

/** "America/New_York (GMT-5)" */
export function zoneLabel(zone: string): string {
  try {
    const off =
      new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    return off ? `${zone.replace(/_/g, " ")} (${off})` : zone.replace(/_/g, " ");
  } catch {
    return zone;
  }
}

/** "Jan 28, 2027" and "10:00 AM – 12:00 PM" in the organization's zone. */
export function zonedWhen(startIso: string, endIso: string, zone: string): { date: string; time: string } {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric", year: "numeric" }).format(s);
  const t = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit" });
  const sameDay = isoToZonedInput(startIso, zone).slice(0, 10) === isoToZonedInput(endIso, zone).slice(0, 10);
  const end = sameDay ? t.format(e) : `${new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(e)}, ${t.format(e)}`;
  return { date, time: `${t.format(s)} – ${end}` };
}
