import { useState } from "react";
import { Link } from "react-router-dom";

import { TRAVEL_CATEGORIES } from "./travelDiscovery";
import type { TravelCategory } from "./travelDiscovery";
import "../styles/TravelCategoryShortcuts.scss";

/**
 * Circular photo shortcuts under the home search ("Stays", "Cars", …).
 * Every item links to an existing Travel route; see travelDiscovery.ts.
 */

function Shortcut({ category }: { category: TravelCategory }) {
  const [failed, setFailed] = useState(false);

  return (
    <li>
      <Link to={category.to} className="ft-shortcuts__item">
        <span className="ft-shortcuts__photo">
          {!failed && (
            <img
              src={category.image}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
            />
          )}
        </span>
        <span className="ft-shortcuts__label">{category.label}</span>
      </Link>
    </li>
  );
}

export default function TravelCategoryShortcuts({
  className = "",
}: {
  className?: string;
}) {
  return (
    <nav className={`ft-shortcuts ${className}`.trim()} aria-label="Travel categories">
      <ul>
        {TRAVEL_CATEGORIES.map((category) => (
          <Shortcut key={category.id} category={category} />
        ))}
      </ul>
    </nav>
  );
}
