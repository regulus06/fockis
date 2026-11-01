import { ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";

import type { Business } from "../../types/business.types";
import { BusinessCardSkeleton, useRailScroll } from "../BusinessUi";
import FeaturedBusinessCard from "./FeaturedBusinessCard";

interface Props {
  businesses: Business[];
  loading: boolean;
  onViewAll: () => void;
  distanceFor?: (business: Business) => string | undefined;
}

export default function FeaturedBusinessesRail({ businesses, loading, onViewAll, distanceFor }: Props) {
  const { trackRef, canPrev, canNext, scrollBy } = useRailScroll();

  if (!loading && businesses.length === 0) return null;

  return (
    <section className="fkbd-section" aria-labelledby="fkbd-featured-title">
      <header className="fkbd-section__head">
        <Star size={28} className="fkbd-section__star" fill="currentColor" strokeWidth={0} aria-hidden="true" />
        <div>
          <h2 id="fkbd-featured-title">Featured Businesses</h2>
          <p>Top and trusted businesses on Fockis.</p>
        </div>
        <button type="button" className="fkbd-viewall" onClick={onViewAll}>
          View All <ArrowRight size={15} aria-hidden="true" />
        </button>
      </header>

      <div className="fkbd-carousel">
        <div className="fkbd-carousel__track" ref={trackRef} role="list">
          {loading
            ? Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="fkbd-carousel__item">
                  <BusinessCardSkeleton />
                </div>
              ))
            : businesses.map((business) => (
                <div className="fkbd-carousel__item" role="listitem" key={business.id}>
                  <FeaturedBusinessCard business={business} distance={distanceFor?.(business)} />
                </div>
              ))}
        </div>

        {canPrev && (
          <button type="button" className="fkbd-arrow fkbd-arrow--prev" onClick={() => scrollBy(-1)} aria-label="Previous featured businesses">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        {canNext && (
          <button type="button" className="fkbd-arrow fkbd-arrow--next" onClick={() => scrollBy(1)} aria-label="More featured businesses">
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
