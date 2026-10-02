import type { Store } from '../../types/store.types';
import { StoreCard } from './StoreCard';
import { ShopEmptyState } from '../common/ShopEmptyState';

export function StoreGrid({ stores, emptyMessage = 'No stores found.' }: { stores: Store[]; emptyMessage?: string }) {
  if (stores.length === 0) {
    return <ShopEmptyState icon="🏪" title="No stores here yet" message={emptyMessage} />;
  }
  return (
    <div className="store-grid">
      {stores.map((s) => (
        <StoreCard key={s.id} store={s} />
      ))}
    </div>
  );
}
