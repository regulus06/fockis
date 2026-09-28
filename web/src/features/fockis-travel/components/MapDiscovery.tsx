import { useState } from 'react';

export interface MapDiscoveryResult {
  id: string;
  type: string;
  name: string;
  meta: string;
  image: string;
  pinEmoji: string;
  top: string;
  left: string;
  amber?: boolean;
}

export interface MapDiscoveryProps {
  areaLabel: string;
  results: MapDiscoveryResult[];
}

/**
 * "See everything, all at once" map + result-list pairing used on the
 * homepage and TravelSearchPage. Selecting a list item highlights the
 * matching pin, and vice versa.
 */
export default function MapDiscovery({ areaLabel, results }: MapDiscoveryProps) {
  const [activeId, setActiveId] = useState(results[0]?.id);

  return (
    <div className="map-discovery">
      <div className="map-results">
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`map-result-item${item.id === activeId ? ' is-active' : ''}`}
            onClick={() => setActiveId(item.id)}
          >
            <img src={item.image} alt="" />
            <div>
              <div className="type">{item.type}</div>
              <h5>{item.name}</h5>
              <div className="loc" style={{ fontSize: 12 }}>{item.meta}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="map-canvas" role="img" aria-label={`Map of ${areaLabel} showing ${results.length} results`}>
        <div className="map-badge">📍 {areaLabel}</div>
        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`map-pin${item.amber ? ' map-pin--amber' : ''}${item.id === activeId ? ' is-active' : ''}`}
            style={{ top: item.top, left: item.left }}
            onClick={() => setActiveId(item.id)}
            aria-label={item.name}
          >
            <span aria-hidden="true">{item.pinEmoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
