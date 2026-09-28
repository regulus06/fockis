import React from "react";
import {
  MapPin,
} from "lucide-react";

import type { Property } from "../types/Property";

interface PropertyMapProps {
  properties: Property[];
  onOpen: (property: Property) => void;
}

const PropertyMap: React.FC<
  PropertyMapProps
> = ({ properties, onOpen }) => {
  const positions = [
    { left: "18%", top: "25%" },
    { left: "43%", top: "42%" },
    { left: "68%", top: "28%" },
    { left: "76%", top: "65%" },
    { left: "35%", top: "72%" },
    { left: "57%", top: "80%" },
  ];

  const money = (price: number) =>
    price >= 1_000_000
      ? `$${(price / 1_000_000).toFixed(1)}M`
      : `$${Math.round(price / 1_000)}K`;

  return (
    <div className="re-map">
      <div className="re-map__grid" />

      <div className="re-map__roads" />

      {properties.map((property, index) => (
        <button
          key={property.id}
          type="button"
          className="re-map__pin"
          style={
            positions[index % positions.length]
          }
          onClick={() => onOpen(property)}
        >
          <MapPin size={12} />
          {property.status === "rent"
            ? `${money(property.price)}/mo`
            : money(property.price)}
        </button>
      ))}

      <div className="re-map__label">
        Map preview
      </div>
    </div>
  );
};

export default PropertyMap;