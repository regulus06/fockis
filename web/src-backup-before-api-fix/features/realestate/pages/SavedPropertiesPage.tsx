import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

import { useSavePropertiesStore } from "../store/savePropertiesStore";
import { propertyApi } from "../services/propertyApi";
import type { Property } from "../types/Property";

import PropertyGrid from "../components/PropertyGrid";

import "../styles/RealEstatePage.scss";

const SavedPropertiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { savedIds, toggleSaved } = useSavePropertiesStore();

  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    propertyApi
      .getProperties()
      .then((data) => {
        if (!cancelled) {
          setAllProperties(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load saved properties:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load properties",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const savedProperties = useMemo(
    () => allProperties.filter((property) => savedIds.includes(property.id)),
    [allProperties, savedIds],
  );

  return (
    <div className="re-page">
      <div className="re-container">
        <div
          className="re-page-heading"
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p className="re-eyebrow">Fockis Real Estate</p>
            <h1>Saved properties</h1>
            <p>Properties you've bookmarked to revisit later.</p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "999px",
              border: "1px solid var(--re-line)",
              background: "white",
              color: "var(--re-ink-soft)",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            <Heart size={15} fill="currentColor" />
            {savedProperties.length} saved
          </div>
        </div>

        {loading && <div className="re-loading">Loading saved properties...</div>}

        {error && !loading && (
          <div
            style={{
              padding: "14px 18px",
              marginBottom: "20px",
              borderRadius: "12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
            }}
          >
            <strong>Couldn't load saved properties</strong>
            <p style={{ margin: "5px 0 0", opacity: 0.7 }}>{error}</p>
          </div>
        )}

        {!loading && !error && savedProperties.length === 0 ? (
          <div className="re-empty">
            <div>
              <Heart size={22} />
            </div>
            <h3>No saved properties yet</h3>
            <p>Tap the heart icon on any listing to save it here.</p>
            <button
              type="button"
              className="re-primary"
              style={{ marginTop: "16px" }}
              onClick={() => navigate("/realestate")}
            >
              Browse properties
            </button>
          </div>
        ) : (
          !loading &&
          !error && (
            <PropertyGrid
              properties={savedProperties}
              savedIds={savedIds}
              onSave={toggleSaved}
              onOpen={(property) =>
                navigate(`/realestate/property/${property.id}`)
              }
            />
          )
        )}
      </div>
    </div>
  );
};

export default SavedPropertiesPage;
import "../styles/_input-reset.scss";