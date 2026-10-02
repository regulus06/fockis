import React from 'react';

import type { EventCategory } from '../types/event.types';

interface Props {
  category: EventCategory | 'all';
  status:
    | 'all'
    | 'upcoming'
    | 'live'
    | 'ended';

  search: string;

  onCategoryChange: (
    category: EventCategory | 'all',
  ) => void;

  onStatusChange: (
    status:
      | 'all'
      | 'upcoming'
      | 'live'
      | 'ended',
  ) => void;

  onSearchChange: (
    search: string,
  ) => void;
}

export default function EventFilters({
  category,
  status,
  search,
  onCategoryChange,
  onStatusChange,
  onSearchChange,
}: Props) {
  return (
    <div className="fk-event-filters">
      <input
        value={search}
        onChange={(e) =>
          onSearchChange(e.target.value)
        }
        placeholder="Search events..."
      />

      <select
        value={category}
        onChange={(e) =>
          onCategoryChange(
            e.target.value as EventCategory | 'all',
          )
        }
      >
        <option value="all">
          All categories
        </option>

        <option value="music">Music</option>
        <option value="sports">Sports</option>
        <option value="business">Business</option>
        <option value="education">
          Education
        </option>
        <option value="food">Food</option>
        <option value="community">
          Community
        </option>
        <option value="party">Party</option>
        <option value="conference">
          Conference
        </option>
        <option value="other">Other</option>
      </select>

      <select
        value={status}
        onChange={(e) =>
          onStatusChange(
            e.target.value as
              | 'all'
              | 'upcoming'
              | 'live'
              | 'ended',
          )
        }
      >
        <option value="all">
          All events
        </option>

        <option value="upcoming">
          Upcoming
        </option>

        <option value="live">
          Live now
        </option>

        <option value="ended">
          Ended
        </option>
      </select>
    </div>
  );
}