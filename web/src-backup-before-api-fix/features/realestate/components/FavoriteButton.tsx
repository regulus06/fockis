import React from "react";
import { Heart } from "lucide-react";

interface FavoriteButtonProps {
  saved: boolean;
  onClick: () => void;
}

const FavoriteButton: React.FC<
  FavoriteButtonProps
> = ({ saved, onClick }) => {
  return (
    <button
      type="button"
      className={`re-favorite ${
        saved ? "is-saved" : ""
      }`}
      aria-label={
        saved
          ? "Remove property from saved"
          : "Save property"
      }
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Heart
        size={18}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
};

export default FavoriteButton;