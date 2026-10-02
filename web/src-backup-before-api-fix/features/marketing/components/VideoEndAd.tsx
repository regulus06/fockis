import { useEffect, useState } from "react";

import SponsoredBadge from "./SponsoredBadge";
import AdCtaButton from "./AdCtaButton";

import type { DeliveredFeedAd } from "../types/marketingTypes";

interface VideoEndAdProps {
  ad: DeliveredFeedAd;
  onImpression: (ad: DeliveredFeedAd) => void;
  onClick?: (ad: DeliveredFeedAd) => void;
}

/* ============================================================================
   VIDEO END AD

   Clean transition after a video finishes: short fade-in, ad plays
   muted-autoplay (browser policy compliant), then the CTA becomes
   prominent once playback ends.
============================================================================ */

export default function VideoEndAd({
  ad,
  onImpression,
  onClick,
}: VideoEndAdProps) {
  const [ctaProminent, setCtaProminent] = useState(false);

  useEffect(() => {
    onImpression(ad);
  }, [ad, onImpression]);

  const isVideo = ad.type === "VIDEO" && ad.mediaUrl;

  return (
    <div className="fk-video-end-ad">
      <div className="fk-video-end-ad__transition" aria-hidden="true" />

      <div className="fk-video-end-ad__header">
        <SponsoredBadge />
        <strong>{ad.advertiser.name}</strong>
      </div>

      {isVideo ? (
        <video
          src={ad.mediaUrl}
          poster={ad.thumbnailUrl}
          muted
          autoPlay
          playsInline
          onEnded={() => setCtaProminent(true)}
          className="fk-video-end-ad__video"
        />
      ) : (
        ad.mediaUrl && (
          <img src={ad.mediaUrl} alt="" className="fk-video-end-ad__image" />
        )
      )}

      <p className="fk-video-end-ad__headline">{ad.headline}</p>

      <div
        className={`fk-video-end-ad__cta${
          ctaProminent ? " fk-video-end-ad__cta--prominent" : ""
        }`}
      >
        <AdCtaButton ad={ad} onClick={() => onClick?.(ad)} />
      </div>
    </div>
  );
}