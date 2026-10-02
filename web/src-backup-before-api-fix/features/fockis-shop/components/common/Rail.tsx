import { useRef } from 'react';

interface RailProps {
  children: React.ReactNode;
  ariaLabel: string;
}

export function Rail({ children, ariaLabel }: RailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: number) {
    scrollRef.current?.scrollBy({ left: dir * 340, behavior: 'smooth' });
  }

  return (
    <div className="rail-wrap">
      <button className="rail-arrow left" onClick={() => scroll(-1)} aria-label={`Scroll ${ariaLabel} left`} type="button">
        ‹
      </button>
      <div className="rail-scroll" ref={scrollRef} role="list" aria-label={ariaLabel}>
        {children}
      </div>
      <button className="rail-arrow right" onClick={() => scroll(1)} aria-label={`Scroll ${ariaLabel} right`} type="button">
        ›
      </button>
    </div>
  );
}
