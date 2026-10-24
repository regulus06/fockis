import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
} from "lucide-react";

import type { Business } from "../types/business.types";

import {
  getCategoryOption,
  getInitials,
  getUsableImageUrl,
} from "../utils/businessUtils";

import "../styles/BusinessUi.scss";


/* ============================================================================
   LOGO

   Shows the business's saved logo. Missing, placeholder-service or broken
   images fall back to the business initials, never to another image.
============================================================================ */

export function BusinessLogo({
  business,
  size = 56,
  ring = false,
  className = "",
}: {
  business: Pick<Business, "name" | "logoUrl">;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const src = getUsableImageUrl(business.logoUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span
      className={`fkb-logo ${ring ? "fkb-logo--ring" : ""} ${className}`}
      style={{ ["--fkb-logo-size" as string]: `${size}px` }}
      aria-hidden="true"
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(business.name)
      )}
    </span>
  );
}


/* ============================================================================
   COVER
============================================================================ */

export function BusinessCover({
  business,
  ratio,
  eager = false,
  className = "",
  children,
}: {
  business: Pick<Business, "name" | "coverImageUrl" | "category">;
  ratio?: string;
  eager?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const src = getUsableImageUrl(business.coverImageUrl);
  const [failed, setFailed] = useState(false);
  const CategoryIcon = getCategoryOption(business.category).icon;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span
      className={`fkb-cover ${className}`}
      style={ratio ? { ["--fkb-cover-ratio" as string]: ratio } : undefined}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="fkb-cover__fallback" aria-hidden="true">
          <CategoryIcon strokeWidth={1.25} />
        </span>
      )}

      {children}
    </span>
  );
}


/* ============================================================================
   VERIFIED BADGE
============================================================================ */

export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <BadgeCheck
        size={18}
        aria-label="Verified business"
        role="img"
      />
    );
  }

  return (
    <span className="fkb-badge fkb-badge--verified">
      <BadgeCheck size={14} aria-hidden="true" />
      Verified
    </span>
  );
}


/* ============================================================================
   SKELETONS
============================================================================ */

export function BusinessCardSkeleton() {
  return (
    <div className="fkb-card-skeleton" aria-hidden="true">
      <div className="fkb-skeleton fkb-card-skeleton__cover" />
      <div className="fkb-card-skeleton__body">
        <div className="fkb-skeleton fkb-card-skeleton__line fkb-card-skeleton__line--title" />
        <div className="fkb-skeleton fkb-card-skeleton__line" />
        <div className="fkb-skeleton fkb-card-skeleton__line fkb-card-skeleton__line--short" />
      </div>
    </div>
  );
}

export function BusinessCardSkeletonGrid({
  count = 6,
  label = "Loading businesses",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div className="fkb-grid" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <BusinessCardSkeleton key={index} />
      ))}
    </div>
  );
}


/* ============================================================================
   EMPTY / ERROR STATES
============================================================================ */

export function EmptyState({
  icon,
  title,
  message,
  actions,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  message?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`fkb-state ${compact ? "fkb-state--compact" : ""}`}>
      <span className="fkb-state__icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {actions && <div className="fkb-state__actions">{actions}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  compact = false,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`fkb-state fkb-state--error ${compact ? "fkb-state--compact" : ""}`}
      role="alert"
    >
      <span className="fkb-state__icon" aria-hidden="true">
        <AlertTriangle size={22} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && (
        <div className="fkb-state__actions">
          <button type="button" className="fkb-btn fkb-btn--secondary fkb-btn--sm" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
        </div>
      )}
    </div>
  );
}


/* ============================================================================
   HORIZONTAL RAIL CONTROLS
============================================================================ */

export function useRailScroll(): {
  trackRef: RefObject<HTMLDivElement>;
  canPrev: boolean;
  canNext: boolean;
  scrollBy: (direction: -1 | 1) => void;
} {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    update();
    track.addEventListener("scroll", update, { passive: true });

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;

    observer?.observe(track);

    return () => {
      track.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  });

  const scrollBy = useCallback((direction: -1 | 1) => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    track.scrollBy({
      left: direction * Math.max(track.clientWidth * 0.85, 260),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, []);

  return {
    trackRef,
    canPrev,
    canNext,
    scrollBy,
  };
}

export function RailNav({
  label,
  canPrev,
  canNext,
  onScroll,
}: {
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onScroll: (direction: -1 | 1) => void;
}) {
  if (!canPrev && !canNext) {
    return null;
  }

  return (
    <div className="fkb-rail__nav">
      <button
        type="button"
        className="fkb-btn fkb-btn--secondary fkb-btn--icon fkb-btn--sm"
        onClick={() => onScroll(-1)}
        disabled={!canPrev}
        aria-label={`Scroll ${label} left`}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="fkb-btn fkb-btn--secondary fkb-btn--icon fkb-btn--sm"
        onClick={() => onScroll(1)}
        disabled={!canNext}
        aria-label={`Scroll ${label} right`}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}


/* ============================================================================
   TOAST
============================================================================ */

export function useToast(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: string) => {
    window.clearTimeout(timer.current);
    setMessage(next);
    timer.current = window.setTimeout(() => setMessage(null), 2800);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return [message, show];
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="fkb-visually-hidden-container">
      {message && (
        <div className="fkb-toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}


/* ============================================================================
   COUPON CODE (copy to clipboard)
============================================================================ */
export function CouponCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="fkb-coupon"
      onClick={copy}
      aria-label={copied ? `Coupon code ${code} copied` : `Copy coupon code ${code}`}
    >
      <span>{code}</span>
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
  );
}
