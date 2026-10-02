import React from "react";
import { Check } from "lucide-react";

interface PropertyFeaturesProps {
  features: string[];
}

const PropertyFeatures: React.FC<
  PropertyFeaturesProps
> = ({ features }) => {
  return (
    <div className="re-feature-grid">
      {features.map((feature) => (
        <div
          className="re-feature"
          key={feature}
        >
          <Check size={15} />
          <span>{feature}</span>
        </div>
      ))}
    </div>
  );
};

export default PropertyFeatures;