import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";

import type { Product } from "../../types/product.types";
import { Rail } from "../common/Rail";
import { RailSkeleton } from "../products/ProductRailSection";
import { effectivePrice } from "../../utils/pricing";
import { formatPrice } from "../../utils/currency";
import {
  getPrimaryProductImage,
  getProductVideo,
  getRealDiscount,
} from "../../utils/productMedia";

/**
 * ============================================================================
 * WATCH & SHOP — short product video rail
 * ============================================================================
 *
 * Videos come only from the product's own media (video files uploaded with
 * the product). Nothing is faked:
 *   - products with a video get a playable 9:16 card
 *   - when no product has a video yet, products are shown with their photo
 *     and clearly labelled "Photo · no video yet"
 * Clicking a card opens the existing product page.
 * ============================================================================
 */

// Only one video plays at a time across the rail.
let activeVideo: HTMLVideoElement | null = null;

function VideoDealCard({ product }: { product: Product }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const video = getProductVideo(product);
  const image = getPrimaryProductImage(product);
  const hasVideo = Boolean(video) && !videoFailed;
  const discount = getRealDiscount(product);
  const price = effectivePrice(product);
  const href = `/shop/product/${product.slug || product.id}`;
  const title = product.name?.trim() || "Product details unavailable";

  useEffect(() => {
    const element = videoRef.current;
    return () => {
      if (activeVideo === element) activeVideo = null;
    };
  }, []);

  async function togglePlay(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      if (activeVideo && activeVideo !== element) activeVideo.pause();
      activeVideo = element;
      try {
        await element.play();
      } catch {
        setPlaying(false);
      }
    } else {
      element.pause();
    }
  }

  function toggleMute(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const element = videoRef.current;
    if (!element) return;
    element.muted = !element.muted;
    setMuted(element.muted);
  }

  return (
    <article className="fk-vcard" role="listitem">
      <div className="fk-vcard__media">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={video!.src}
              poster={image?.src}
              muted={muted}
              playsInline
              loop
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setVideoFailed(true)}
              onLoadedMetadata={(event) => {
                const value = event.currentTarget.duration;
                if (Number.isFinite(value) && value > 0) setDuration(value);
              }}
              aria-label={`${title} video`}
            />

            <button
              type="button"
              className="fk-vcard__play"
              onClick={togglePlay}
              aria-label={playing ? `Pause ${title} video` : `Play ${title} video`}
            >
              {playing ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" />
              )}
            </button>

            <button
              type="button"
              className="fk-vcard__mute"
              onClick={toggleMute}
              aria-label={muted ? "Unmute video" : "Mute video"}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </>
        ) : (
          <Link to={href} className="fk-vcard__photo" aria-label={title}>
            {image && !imageFailed ? (
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="fk-vcard__placeholder" aria-hidden="true">
                <Film size={34} />
              </span>
            )}
            <span className="fk-vcard__no-video">Photo</span>
          </Link>
        )}

        {discount > 0 && <span className="fk-vcard__discount">-{discount}%</span>}

        {hasVideo && duration !== null && (
          <span className="fk-vcard__duration">
            {Math.floor(duration / 60)}:{String(Math.round(duration % 60)).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="fk-vcard__body">
        <Link to={href} className="fk-vcard__title">
          {title}
        </Link>

        {product.storeName && (
          <span className="fk-vcard__seller">{product.storeName}</span>
        )}

        <div className="fk-vcard__price">
          {Number(price) > 0 ? (
            <>
              <strong>{formatPrice(price)}</strong>
              {discount > 0 && <s>{formatPrice(product.price)}</s>}
            </>
          ) : (
            <span>Price unavailable</span>
          )}
        </div>

        <Link to={href} className="fk-btn fk-btn--cart fk-vcard__cta">
          Shop now
        </Link>
      </div>
    </article>
  );
}

interface WatchAndShopProps {
  products: Product[];
  loading: boolean;
}

export function WatchAndShop({ products, loading }: WatchAndShopProps) {
  const railRef = useRef<HTMLDivElement>(null);

  function scrollRail(direction: number) {
    const scroller = railRef.current?.querySelector<HTMLElement>(".rail-scroll");
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * Math.max(240, scroller.clientWidth * 0.85),
      behavior: "smooth",
    });
  }

  const withVideo = products.filter((product) => Boolean(getProductVideo(product)));
  const withoutVideo = products.filter((product) => !getProductVideo(product));
  const usingPhotos = withVideo.length === 0;

  // Real videos first. If there are only a few, fill the row with the latest
  // products shown as clearly labelled photo cards.
  const items = [
    ...withVideo.slice(0, 16),
    ...(withVideo.length < 6 ? withoutVideo.slice(0, 8 - withVideo.length) : []),
  ];

  if (!loading && items.length === 0) return null;

  return (
    <section className="fk-section fk-watch" aria-label="Watch and shop">
      <div className="fk-section__head fk-watch__head">
        <span className="fk-watch__badge" aria-hidden="true">
          <Play size={22} fill="currentColor" />
        </span>
        <div className="fk-watch__titles">
          <span className="fk-section__eyebrow fk-section__eyebrow--light">
            Deals in motion
          </span>
          <h2>Watch &amp; Shop</h2>
          <p>
            {usingPhotos
              ? "Product videos uploaded by sellers will play here. Until then, here are their latest products."
              : "Short product videos from Fockis sellers. Cards marked “Photo” don’t have a video yet."}
          </p>
        </div>
        <div className="fk-watch__controls">
          <Link to="/shop/products?sort=newest" className="fk-section__link">
            See all <span aria-hidden="true">›</span>
          </Link>
          <button
            type="button"
            className="fk-watch__arrow"
            aria-label="Scroll videos left"
            onClick={() => scrollRail(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            className="fk-watch__arrow"
            aria-label="Scroll videos right"
            onClick={() => scrollRail(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <RailSkeleton count={5} />
      ) : (
        <div ref={railRef}>
          <Rail ariaLabel="Watch and shop videos" className="fk-watch__rail">
            {items.map((product) => (
              <VideoDealCard key={product.id} product={product} />
            ))}
          </Rail>
        </div>
      )}
    </section>
  );
}
