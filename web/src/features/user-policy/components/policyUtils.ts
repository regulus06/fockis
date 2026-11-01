import { useCallback, useEffect, useRef, useState } from "react";

import { apiMessage } from "../api/policyCenterApi";

/** Loads data once (and on reload). Keeps the last good value while reloading. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const value = await run();
      if (alive.current) setData(value);
    } catch (e) {
      if (alive.current) setError(apiMessage(e, "We couldn't load this right now."));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return { data, setData, error, loading, reload };
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const utcDateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function fmtDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  // Calendar dates (effective dates, birthdays) are stored at midnight UTC.
  const dateOnly = typeof value === "string" ? /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(value) : false;
  return (dateOnly ? utcDateFmt : dateFmt).format(d);
}

export function fmtTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : timeFmt.format(d);
}

export function fmtBytes(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const CONSENT_LABELS: Record<string, { title: string; text: string; group: "Cookies" | "Communications" | "Personalization" }> = {
  analytics_cookies: { group: "Cookies", title: "Analytics cookies", text: "Help us understand how Fockis is used so we can improve it." },
  personalization_cookies: { group: "Cookies", title: "Personalization cookies", text: "Remember your choices to tailor what you see." },
  advertising_cookies: { group: "Cookies", title: "Advertising cookies", text: "Show ads that are more relevant to you on Fockis." },
  marketing_emails: { group: "Communications", title: "Marketing emails", text: "News, offers and tips from Fockis by email." },
  product_announcements: { group: "Communications", title: "Product announcements", text: "Emails about new Fockis features." },
  promotional_notifications: { group: "Communications", title: "Promotional notifications", text: "In-app notifications about offers and promotions." },
  personalized_recommendations: { group: "Personalization", title: "Personalized recommendations", text: "Use your activity to suggest people, posts and products." },
  optional_analytics: { group: "Personalization", title: "Optional analytics", text: "Share extra usage details that aren't needed to run Fockis." },
};

export const CORRECTION_FIELDS: { value: string; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "username", label: "Username" },
  { value: "email", label: "Email address" },
  { value: "phone", label: "Phone number" },
  { value: "birth_date", label: "Date of birth" },
  { value: "location", label: "Location" },
  { value: "content", label: "Content about me" },
  { value: "other", label: "Something else" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  legal: "Legal",
  privacy: "Privacy",
  community: "Community",
  compliance: "Compliance",
  moderation: "Moderation",
  payments: "Payments",
  fockis_shop: "Fockis Shop",
  security: "Security",
  copyright: "Copyright",
  data_retention: "Data Retention",
};
