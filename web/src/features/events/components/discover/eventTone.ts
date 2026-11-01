import type { EventCategory } from "../../types/event.types";

export type EventTone = "violet" | "blue" | "green" | "amber" | "pink" | "cyan" | "slate";

const TONES: Partial<Record<EventCategory, EventTone>> = {
  music: "violet",
  party: "violet",
  arts: "pink",
  cultural: "pink",
  business: "slate",
  networking: "slate",
  conference: "slate",
  meeting: "slate",
  technology: "blue",
  education: "cyan",
  academic: "cyan",
  school: "cyan",
  workshop: "cyan",
  sports: "green",
  health: "green",
  environment: "green",
  food: "amber",
  fundraiser: "amber",
  community: "blue",
  civic: "blue",
  youth: "pink",
};

/** Colour family used for category tags on discovery cards. */
export function categoryTone(category: string): EventTone {
  return TONES[category as EventCategory] ?? "blue";
}
