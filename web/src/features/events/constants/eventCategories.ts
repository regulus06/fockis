import {
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Church,
  Cpu,
  GraduationCap,
  HandHeart,
  Handshake,
  Landmark,
  Leaf,
  Megaphone,
  Mic,
  Music,
  Palette,
  PartyPopper,
  Presentation,
  School,
  Sparkles,
  Stethoscope,
  Trophy,
  Users,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { EventCategory } from "../types/event.types";

export interface EventCategoryMeta {
  value: EventCategory;
  label: string;
  icon: LucideIcon;
  /** Shown as a quick chip on the Discover page. */
  featured?: boolean;
}

export const EVENT_CATEGORIES: EventCategoryMeta[] = [
  { value: "music", label: "Music", icon: Music, featured: true },
  { value: "business", label: "Business", icon: Briefcase, featured: true },
  { value: "education", label: "Education", icon: GraduationCap, featured: true },
  { value: "sports", label: "Sports", icon: Trophy, featured: true },
  { value: "food", label: "Food & drink", icon: Utensils, featured: true },
  { value: "technology", label: "Technology", icon: Cpu, featured: true },
  { value: "arts", label: "Arts", icon: Palette, featured: true },
  { value: "community", label: "Community", icon: Users, featured: true },
  { value: "networking", label: "Networking", icon: Handshake },
  { value: "party", label: "Party", icon: PartyPopper },
  { value: "conference", label: "Conference", icon: Presentation },
  { value: "workshop", label: "Workshop", icon: Wrench },
  { value: "cultural", label: "Cultural", icon: Sparkles },
  { value: "religious", label: "Faith", icon: Church },
  { value: "health", label: "Health", icon: Stethoscope },
  { value: "youth", label: "Youth", icon: Baby },
  { value: "school", label: "School", icon: School },
  { value: "academic", label: "Academic", icon: BookOpen },
  { value: "fundraiser", label: "Fundraiser", icon: HandHeart },
  { value: "meeting", label: "Meeting", icon: Mic },
  { value: "environment", label: "Environment", icon: Leaf },
  { value: "political", label: "Political", icon: Megaphone },
  { value: "civic", label: "Civic", icon: Landmark },
  { value: "general", label: "General", icon: CalendarDays },
  { value: "other", label: "Other", icon: Building2, featured: true },
];

const BY_VALUE = new Map(EVENT_CATEGORIES.map((item) => [item.value, item]));

export function categoryMeta(value: string | undefined): EventCategoryMeta {
  return (
    BY_VALUE.get(value as EventCategory) ?? {
      value: "general",
      label: value ? value.charAt(0).toUpperCase() + value.slice(1) : "General",
      icon: CalendarDays,
    }
  );
}
