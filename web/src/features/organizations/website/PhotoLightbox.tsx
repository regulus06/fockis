/**
 * PhotoLightbox.tsx — full-screen photo viewer for church/ministry galleries.
 *
 * Opens over the page (no new browser tab), so it always has a way out:
 * the ✕ button, the Escape key, tapping outside the photo, or swiping down.
 * Arrows / swipe left-right / ← → keys move between photos.
 */

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import "./PhotoLightbox.scss";

export interface LightboxPhoto {
  src: string;
  title?: string;
}

const SWIPE_PX = 50;

export default function PhotoLightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: LightboxPhoto[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const count = photos.length;
  const photo = photos[index];

  const go = useCallback(
    (step: number) => {
      if (count < 2) return;
      onIndex((index + step + count) % count);
    },
    [count, index, onIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  if (!photo) return null;

  return createPortal(
    <div
      className="plb"
      role="dialog"
      aria-modal="true"
      aria-label={photo.title || "Photo"}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        else if (dy > SWIPE_PX * 1.5 && Math.abs(dy) > Math.abs(dx)) onClose();
      }}
    >
      <div className="plb__bar">
        <span className="plb__count">{count > 1 ? `${index + 1} / ${count}` : ""}</span>
        <button ref={closeRef} type="button" className="plb__close" onClick={onClose} aria-label="Close photo">
          <X aria-hidden="true" />
        </button>
      </div>

      {count > 1 && (
        <button type="button" className="plb__nav plb__nav--prev" onClick={() => go(-1)} aria-label="Previous photo">
          <ChevronLeft aria-hidden="true" />
        </button>
      )}

      <figure className="plb__figure" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <img key={photo.src} src={photo.src} alt={photo.title || ""} draggable={false} />
        {photo.title && <figcaption>{photo.title}</figcaption>}
      </figure>

      {count > 1 && (
        <button type="button" className="plb__nav plb__nav--next" onClick={() => go(1)} aria-label="Next photo">
          <ChevronRight aria-hidden="true" />
        </button>
      )}
    </div>,
    document.body,
  );
}
