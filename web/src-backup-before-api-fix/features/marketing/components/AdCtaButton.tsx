import type { DeliveredFeedAd } from "../types/marketingTypes";

interface AdCtaButtonProps {
  ad: DeliveredFeedAd;
  onClick?: () => void;
  className?: string;
}

/* ============================================================================
   SAFE URL CHECK

   Only http(s) destinations are ever opened. javascript:, data:, and
   any other scheme are rejected outright.
============================================================================ */

function isSafeUrl(url?: string): url is string {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/* ============================================================================
   RESOLVE DESTINATION

   App-install ads point to the correct store URL automatically;
   never hard-coded, always sourced from the campaign config.
============================================================================ */

function resolveDestination(ad: DeliveredFeedAd): string | null {
  if (ad.destinationType === "APP" || ad.destinationType === "STORE") {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isIOS && isSafeUrl(ad.appStoreUrl)) {
      return ad.appStoreUrl!;
    }

    if (isAndroid && isSafeUrl(ad.googlePlayUrl)) {
      return ad.googlePlayUrl!;
    }

    // Desktop / unknown device: prefer whichever store URL exists.
    if (isSafeUrl(ad.appStoreUrl)) return ad.appStoreUrl!;
    if (isSafeUrl(ad.googlePlayUrl)) return ad.googlePlayUrl!;

    return null;
  }

  return isSafeUrl(ad.destinationUrl) ? ad.destinationUrl! : null;
}

export default function AdCtaButton({
  ad,
  onClick,
  className = "",
}: AdCtaButtonProps) {
  const destination = resolveDestination(ad);

  const label =
    ad.callToAction ||
    (ad.destinationType === "APP" || ad.destinationType === "STORE"
      ? "Download App"
      : "Visit Website");

  const handleClick = () => {
    onClick?.();

    if (destination) {
      window.open(destination, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      type="button"
      className={`fk-ad-cta ${className}`}
      onClick={handleClick}
      disabled={!destination}
    >
      {label}
    </button>
  );
}