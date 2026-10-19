import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type { Product } from "../../types/product.types";
import { getPrimaryProductImage } from "../../utils/productMedia";

/**
 * ============================================================================
 * FLASH DEAL HERO — the big red banner at the top of the Shop homepage
 * ============================================================================
 *
 * - The product pictures come from real discounted products (best deals
 *   first). When there are no deals yet the newest products are used, and
 *   when nothing has a photo the banner just shows its graphics.
 * - The countdown runs to the end of the shopper's current day, which is
 *   when "Today's deals" roll over.
 * ============================================================================
 */

function msUntilEndOfDay(now = new Date()): number {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return Math.max(0, end.getTime() - now.getTime());
}

function useCountdown() {
  const [remaining, setRemaining] = useState(() => msUntilEndOfDay());

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(msUntilEndOfDay()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const totalSeconds = Math.floor(remaining / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

function Bolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 120" aria-hidden="true">
      <defs>
        <linearGradient id="fk-bolt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3a6" />
          <stop offset="0.45" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#ff9f1c" />
        </linearGradient>
      </defs>
      <path
        d="M40 0 6 68h22L16 120l42-74H36L52 0Z"
        fill="url(#fk-bolt-grad)"
      />
    </svg>
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 0c.6 5.6 2.6 8.4 12 12-9.4 3.6-11.4 6.4-12 12-.6-5.6-2.6-8.4-12-12 9.4-3.6 11.4-6.4 12-12Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HeroProduct({ product, slot }: { product: Product; slot: number }) {
  const [failed, setFailed] = useState(false);
  const image = getPrimaryProductImage(product);
  if (!image || failed) return null;

  return (
    <Link
      to={`/shop/product/${product.slug || product.id}`}
      className={`fk-flash__product fk-flash__product--${slot}`}
      title={product.name}
    >
      <img src={image.src} alt={image.alt} onError={() => setFailed(true)} />
    </Link>
  );
}

interface FlashDealHeroProps {
  deals: Product[];
  fallback: Product[];
}

export function FlashDealHero({ deals, fallback }: FlashDealHeroProps) {
  const { hours, minutes, seconds } = useCountdown();

  const source = deals.length > 0 ? deals : fallback;
  const pictured = source.filter((p) => getPrimaryProductImage(p)).slice(0, 3);

  return (
    <section className="fk-flash" aria-label="Flash deal">
      <Bolt className="fk-flash__bolt fk-flash__bolt--left" />
      <Bolt className="fk-flash__bolt fk-flash__bolt--right" />
      <Sparkle className="fk-flash__spark fk-flash__spark--1" />
      <Sparkle className="fk-flash__spark fk-flash__spark--2" />
      <Sparkle className="fk-flash__spark fk-flash__spark--3" />
      <Sparkle className="fk-flash__spark fk-flash__spark--4" />

      <div className="fk-flash__copy">
        <h1 className="fk-flash__title">
          <span>FLASH</span> <em>DEAL</em>
        </h1>
        <p>Limited time offers. Shop now before it’s gone!</p>
        <Link to="/shop/deals" className="fk-flash__cta">
          Shop flash deals <span aria-hidden="true">›</span>
        </Link>
      </div>

      <div className="fk-flash__products" aria-hidden={pictured.length === 0}>
        {pictured.map((product, index) => (
          <HeroProduct key={product.id} product={product} slot={index + 1} />
        ))}
      </div>

      <div className="fk-flash__timer" role="timer" aria-live="off">
        <span className="fk-flash__timer-label">Ends in</span>
        <div className="fk-flash__timer-row">
          <span className="fk-flash__unit">
            <strong>{pad(hours)}</strong>
            <small>Hours</small>
          </span>
          <span className="fk-flash__colon" aria-hidden="true">:</span>
          <span className="fk-flash__unit">
            <strong>{pad(minutes)}</strong>
            <small>Mins</small>
          </span>
          <span className="fk-flash__colon" aria-hidden="true">:</span>
          <span className="fk-flash__unit">
            <strong>{pad(seconds)}</strong>
            <small>Secs</small>
          </span>
        </div>
      </div>
    </section>
  );
}

export default FlashDealHero;
