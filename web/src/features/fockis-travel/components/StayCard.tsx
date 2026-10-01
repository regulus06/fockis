import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { FOCKIS_API_URL } from "../../../config/fockisConfig";
import "../styles/StayCard.scss";

export interface StayCardProps {
  id: string;
  name: string;
  location: string;
  image: string;
  rating: number;
  amenities: string;
  price: number;
  currency?: string;
  isSaved?: boolean;
  onToggleSave?: (id: string, saved: boolean) => void;
}

function resolveMediaUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  // Already a complete URL or browser-local URL.
  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Backend uploads are commonly returned as:
  // /uploads/filename.jpg
  //
  // Resolve them against the Fockis API instead of
  // the Vite/Vercel frontend origin.
  const cleanPath = trimmed.replace(/^\/+/, "");

  return `${FOCKIS_API_URL}/${cleanPath}`;
}

export default function StayCard({
  id,
  name,
  location,
  image,
  rating,
  amenities,
  price,
  currency = "$",
  isSaved = false,
  onToggleSave,
}: StayCardProps) {
  const [saved, setSaved] = useState(isSaved);
  const [imageFailed, setImageFailed] = useState(false);

  const imageUrl = resolveMediaUrl(image);
  const showImage = Boolean(imageUrl) && !imageFailed;

  function handleSave(
    e: React.MouseEvent<HTMLButtonElement>,
  ) {
    e.preventDefault();
    e.stopPropagation();

    const next = !saved;

    setSaved(next);
    onToggleSave?.(id, next);
  }

  function handleImageError() {
    setImageFailed(true);
  }

  return (
    <article className="stay-card">
      <div className={`thumb${showImage ? "" : " no-image"}`}>
        {showImage ? (
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="stay-card-image"
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
        ) : (
          <div className="stay-card-image-placeholder">
            <span>Fockis Travel</span>
          </div>
        )}

        <button
          type="button"
          className={`fav${saved ? " is-saved" : ""}`}
          aria-label={
            saved
              ? "Remove from wishlist"
              : "Save to wishlist"
          }
          aria-pressed={saved}
          onClick={handleSave}
        >
          <Heart
            size={15}
            aria-hidden="true"
            fill={saved ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="body">
        <div className="row1">
          <h4>{name}</h4>

          <div className="rating">
            <span className="star">
              <Star
                size={12}
                fill="currentColor"
                aria-hidden="true"
              />
            </span>

            {Number.isFinite(rating)
              ? rating.toFixed(1)
              : "0.0"}
          </div>
        </div>

        <div className="loc">{location}</div>

        <div className="amenities">{amenities}</div>

        <div className="price-row">
          <div className="price">
            {currency}
            {price}
            <span>/night</span>
          </div>

          <Link
            to={`/travel/stays/${id}`}
            className="view-link"
          >
            View stay →
          </Link>
        </div>
      </div>
    </article>
  );
}