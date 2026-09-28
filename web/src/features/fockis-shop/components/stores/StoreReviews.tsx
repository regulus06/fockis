import { useEffect, useState } from 'react';
import type { Store, StoreReview } from '../../types/store.types';
import { getStoreReviews } from '../../services/storeApi';
import { Stars } from '../common/Stars';
import { ShopLoading } from '../common/ShopLoading';
import { ShopEmptyState } from '../common/ShopEmptyState';

export function StoreReviews({ store }: { store: Store }) {
  const [reviews, setReviews] = useState<StoreReview[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStoreReviews(store.id).then((res) => {
      if (!cancelled) setReviews(res);
    });
    return () => {
      cancelled = true;
    };
  }, [store.id]);

  return (
    <div className="store-page-reviews">
      <div className="section-head">
        <div>
          <h3>Store reviews</h3>
          <Stars rating={store.rating.average} reviews={store.rating.totalReviews} />
        </div>
      </div>
      {reviews === null ? (
        <ShopLoading rows={2} />
      ) : reviews.length === 0 ? (
        <ShopEmptyState icon="⭐" title="No store reviews yet" />
      ) : (
        <div className="review-list">
          {reviews.map((r) => (
            <div className="review-item" key={r.id}>
              <div className="review-item-head">
                <Stars rating={r.rating} />
                <span className="review-author mono">{r.authorName}</span>
              </div>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
