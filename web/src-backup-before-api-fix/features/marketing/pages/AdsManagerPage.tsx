import {
  useEffect,
  useState,
} from "react";

import {
  createAd,
  deleteAd,
  getAds,
  pauseAd,
  activateAd,
} from "../services/marketingApi";

import type {
  Advertisement,
  AdPlacement,
} from "../types/marketingTypes";

import AdPreview from "../components/AdPreview";
import AdPlacementSelector from "../components/AdPlacementSelector";

import "../styles/AdsManagerPage.scss";

export default function AdsManagerPage() {
  const [ads, setAds] = useState<Advertisement[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [campaignId, setCampaignId] = useState("");

  const [title, setTitle] = useState("");

  const [description, setDescription] = useState("");

  /*
   * Creative image displayed by the ad.
   */
  const [imageUrl, setImageUrl] = useState("");

  /*
   * URL opened when the user clicks the advertisement.
   */
  const [destinationUrl, setDestinationUrl] = useState("");

  /*
   * The UI currently lets the advertiser select one placement.
   *
   * The API payload expects `placements`, which is an array.
   * Therefore handleCreate sends:
   *
   * placements: [placement]
   */
  const [placement, setPlacement] =
    useState<AdPlacement>("FEED");

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const result = await getAds();

      setAds(
        Array.isArray(result)
          ? result
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load advertisements.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate() {
    if (!campaignId.trim()) {
      setError("Campaign ID is required.");
      return;
    }

    try {
      setError(null);

      await createAd({
        campaignId: campaignId.trim(),

        title:
          title.trim() || undefined,

        description:
          description.trim() || undefined,

        imageUrl:
          imageUrl.trim() || undefined,

        destinationUrl:
          destinationUrl.trim() || undefined,

        /*
         * CreateAdPayload expects `placements`,
         * not `placement`.
         */
        placements: [placement],
      });

      setCampaignId("");
      setTitle("");
      setDescription("");
      setImageUrl("");
      setDestinationUrl("");
      setPlacement("FEED");

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create advertisement.",
      );
    }
  }

  return (
    <main className="fk-marketing-page">
      <header className="fk-marketing-header">
        <div>
          <span className="fk-marketing-eyebrow">
            AD MANAGER
          </span>

          <h1>
            Advertisements
          </h1>

          <p>
            Create and manage your
            campaign advertisements.
          </p>
        </div>
      </header>

      {error && (
        <div className="fk-marketing-error">
          {error}
        </div>
      )}

      <section className="fk-marketing-panel">
        <h2>
          Create advertisement
        </h2>

        <div className="fk-form-grid">
          <div className="fk-form-field">
            <label>
              Campaign ID
            </label>

            <input
              value={campaignId}
              onChange={(event) =>
                setCampaignId(
                  event.target.value,
                )
              }
              placeholder="Campaign ID"
            />
          </div>

          <div className="fk-form-field">
            <label>
              Ad title
            </label>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="Your ad title"
            />
          </div>

          <div className="fk-form-field">
            <label>
              Description
            </label>

            <input
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder="One short line shown with the ad"
            />
          </div>

          <div className="fk-form-field">
            <label>
              Image URL
            </label>

            <input
              value={imageUrl}
              onChange={(event) =>
                setImageUrl(
                  event.target.value,
                )
              }
              placeholder="https://..."
            />
          </div>

          <div className="fk-form-field">
            <label>
              Destination URL
            </label>

            <input
              value={destinationUrl}
              onChange={(event) =>
                setDestinationUrl(
                  event.target.value,
                )
              }
              placeholder="https://..."
            />
          </div>

          <AdPlacementSelector
            value={placement}
            onChange={(value) =>
              setPlacement(
                value as AdPlacement,
              )
            }
          />
        </div>

        <button
          type="button"
          className="fk-marketing-primary-button"
          onClick={handleCreate}
        >
          Create advertisement
        </button>
      </section>

      <section className="fk-marketing-section">
        <h2>
          Your advertisements
        </h2>

        {loading ? (
          <div className="fk-marketing-loading">
            Loading ads...
          </div>
        ) : ads.length === 0 ? (
          <div className="fk-marketing-empty">
            No advertisements yet.
          </div>
        ) : (
          <div className="fk-ad-grid">
            {ads.map((ad) => {
              const id =
                ad._id ??
                ad.id;

              if (!id) {
                return null;
              }

              return (
                <div
                  className="fk-ad-manager-card"
                  key={id}
                >
                  <AdPreview ad={ad} />

                  <div className="fk-ad-actions">
                    {ad.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setError(null);

                            await pauseAd(id);

                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Unable to pause advertisement.",
                            );
                          }
                        }}
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setError(null);

                            await activateAd(id);

                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Unable to activate advertisement.",
                            );
                          }
                        }}
                      >
                        Activate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setError(null);

                          await deleteAd(id);

                          await load();
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Unable to delete advertisement.",
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}