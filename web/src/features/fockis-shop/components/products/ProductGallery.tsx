import { useMemo, useState } from "react";
import { Play } from "lucide-react";

import type { Product } from "../../types/product.types";
import { getProductImages, getProductVideos } from "../../utils/productMedia";

type MediaItem =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; src: string; alt: string; poster?: string };

/**
 * Product media gallery: images and any product videos, with thumbnails.
 * Video files are played in a <video> element, never inside an <img>.
 */
export function ProductGallery({ product }: { product: Product }) {
  const media = useMemo<MediaItem[]>(() => {
    const images = getProductImages(product);
    const videos = getProductVideos(product);
    const poster = images[0]?.src;

    return [
      ...images.map((image) => ({ kind: "image" as const, ...image })),
      ...videos.map((video) => ({ kind: "video" as const, ...video, poster })),
    ];
  }, [product]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);

  const active = media[Math.min(activeIdx, Math.max(0, media.length - 1))];
  const activeFailed = !active || failed.includes(active.src);
  const discountBadge =
    product.salePrice != null && product.salePrice < product.price;

  function markFailed(src: string) {
    setFailed((previous) => (previous.includes(src) ? previous : [...previous, src]));
  }

  return (
    <div className="pdp-gallery">
      {media.length > 1 && (
        <div className="pdp-gallery-thumbs" role="tablist" aria-label="Product media">
          {media.map((item, index) => {
            const itemFailed = failed.includes(item.src);
            return (
              <button
                key={`${item.kind}-${item.src}`}
                type="button"
                role="tab"
                className={index === activeIdx ? "active" : undefined}
                onClick={() => setActiveIdx(index)}
                onMouseEnter={() => item.kind === "image" && setActiveIdx(index)}
                aria-label={item.kind === "video" ? `Play video ${index + 1}` : `Show image ${index + 1}`}
                aria-selected={index === activeIdx}
              >
                {item.kind === "image" && !itemFailed ? (
                  <img src={item.src} alt="" onError={() => markFailed(item.src)} />
                ) : item.kind === "video" ? (
                  <span className="pdp-thumb-video">
                    {item.poster && <img src={item.poster} alt="" />}
                    <Play size={16} fill="currentColor" aria-hidden="true" />
                  </span>
                ) : (
                  <span aria-hidden="true">{product.emoji || "📦"}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="pdp-gallery-main">
        {active && !activeFailed ? (
          active.kind === "video" ? (
            <video
              key={active.src}
              src={active.src}
              poster={active.poster}
              controls
              playsInline
              preload="metadata"
              onError={() => markFailed(active.src)}
              aria-label={active.alt}
            />
          ) : (
            <img src={active.src} alt={active.alt} onError={() => markFailed(active.src)} />
          )
        ) : (
          <div
            className="pdp-gallery-placeholder"
            role="img"
            aria-label={`Image unavailable for ${product.name}`}
          >
            <span aria-hidden="true">{product.emoji || "📦"}</span>
            <small>No product image available</small>
          </div>
        )}

        {discountBadge && <span className="pdp-gallery-flag">Deal</span>}
      </div>
    </div>
  );
}
