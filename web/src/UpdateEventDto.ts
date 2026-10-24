import React from "react";
import type { EventCategory, EventStatus } from "../types/event.types";

interface Props {
  category: EventCategory | "all";
  status: EventStatus | "all";
  search: string;
  onCategoryChange: (value: EventCategory | "all") => void;
  onStatusChange: (value: EventStatus | "all") => void;
  onSearchChange: (value: string) => void;
}

const categories: EventCategory[] = [
  "general", "music", "sports", "business", "education", "food", "community",
  "party", "conference", "religious", "school", "academic", "fundraiser",
  "workshop", "meeting", "networking", "cultural", "health", "youth",
  "technology", "environment", "political", "civic", "other",
];

export default function EventFilters(props: Props) {
  return (
    <div className="fk-event-filters" role="search" aria-label="Filter events">
      <input type="search" value={props.search} onChange={(e) => props.onSearchChange(e.target.value)}
        placeholder="Search by event, place, or organizer…" aria-label="Search events" />
      <select value={props.category} onChange={(e) => props.onCategoryChange(e.target.value as EventCategory | "all")}
        aria-label="Filter by category">
        <option value="all">All categories</option>
        {categories.map((category) => <option key={category} value={category}>
          {category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
        </option>)}
      </select>
      <select value={props.status} onChange={(e) => props.onStatusChange(e.target.value as EventStatus | "all")}
        aria-label="Filter by status">
        <option value="all">All events</option>
        <option value="upcoming">Upcoming</option>
        <option value="live">Live now</option>
        <option value="ended">Ended</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  );
}
