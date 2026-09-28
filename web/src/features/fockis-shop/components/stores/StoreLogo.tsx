import type { Store } from '../../types/store.types';

export function StoreLogo({ store }: { store: Store }) {
  return (
    <div className="store-page-logo" aria-hidden="true">
      {store.logoUrl ? <img src={store.logoUrl} alt="" /> : store.emoji ?? '🏪'}
    </div>
  );
}
