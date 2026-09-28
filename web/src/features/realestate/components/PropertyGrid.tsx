import React from "react";

import type { Property } from "../types/Property";
import PropertyCard from "./PropertyCard";

interface PropertyGridProps {
  properties: Property[];
  savedIds: string[];
  onSave: (id: string) => void;
  onOpen: (property: Property) => void;
  layout?: "grid" | "list";
}

const PropertyGrid: React.FC<
  PropertyGridProps
> = ({
  properties,
  savedIds,
  onSave,
  onOpen,
  layout = "grid",
}) => {
  if (!properties.length) {
    return (
      <div className="re-empty">
        <div>⌕</div>
        <h3>
          No properties match your search
        </h3>
        <p>
          Try adjusting your filters or
          expanding your search area.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        layout === "grid"
          ? "property-grid"
          : "property-list"
      }
    >
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          saved={savedIds.includes(
            property.id,
          )}
          layout={layout}
          onSave={() => onSave(property.id)}
          onOpen={() => onOpen(property)}
        />
      ))}
    </div>
  );
};

export default PropertyGrid;