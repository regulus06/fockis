import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RailProps {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}

/**
 * Horizontal scroller with touch/trackpad scrolling, scroll-snap and
 * desktop arrow buttons that hide at either end of the rail.
 * The rail itself never causes page-wide horizontal overflow.
 */
export function Rail({ children, ariaLabel, className }: RailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    update();
    el.addEventListener('scroll', update, { passive: true });

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [update, children]);

  function scroll(direction: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.85), behavior: 'smooth' });
  }

  return (
    <div className={['rail-wrap', className].filter(Boolean).join(' ')}>
      <button
        className="rail-arrow left"
        onClick={() => scroll(-1)}
        aria-label={`Scroll ${ariaLabel} left`}
        type="button"
        hidden={!canPrev}
      >
        <ChevronLeft size={22} />
      </button>

      <div className="rail-scroll" ref={scrollRef} role="list" aria-label={ariaLabel}>
        {children}
      </div>

      <button
        className="rail-arrow right"
        onClick={() => scroll(1)}
        aria-label={`Scroll ${ariaLabel} right`}
        type="button"
        hidden={!canNext}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
