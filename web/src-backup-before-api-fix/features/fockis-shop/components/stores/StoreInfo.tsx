import type { Store } from '../../types/store.types';

export function StoreInfo({ store }: { store: Store }) {
  return (
    <div className="store-page-info">
      <h3>About this store</h3>
      <p>{store.description}</p>
      {store.categories.length > 0 && (
        <div className="tag-row" style={{ marginTop: 12 }}>
          {store.categories.map((c) => (
            <span className="tag" key={c}>{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}
