import type { Store } from '../../types/store.types';

export function StoreBanner({ store }: { store: Store }) {
  return (
    <div
      className="store-page-banner"
      style={store.bannerUrl ? { backgroundImage: `url('${store.bannerUrl}')` } : undefined}
      role="img"
      aria-label={`${store.name} banner`}
    />
  );
}
