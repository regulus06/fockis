/**
 * Official Fockis brand mark.
 *
 * Source asset: mobile/Fockis-Mobile-Shell/assets/fockis-icon.png
 * Web copies (resized, same artwork) live in: web/public/brand/
 *
 * Vite serves `public/` from the site root, so the files are referenced
 * through BASE_URL to keep working if the app is ever deployed under a
 * sub-path.
 */

const BASE = import.meta.env.BASE_URL || "/";

export const FOCKIS_LOGO_SRC = {
  small: `${BASE}brand/fockis-icon-96.png`,
  medium: `${BASE}brand/fockis-icon-192.png`,
  large: `${BASE}brand/fockis-icon-512.png`,
} as const;

interface FockisLogoProps {
  /** Rendered size of the square mark in pixels. */
  size?: number;
  /** Optional wordmark next to the icon. */
  wordmark?: boolean;
  /** Small label after the wordmark, e.g. "SHOP" or "SELLER CENTER". */
  label?: string;
  className?: string;
  /** Use on dark backgrounds so the wordmark is light. */
  tone?: "light" | "dark";
}

export function FockisLogo({
  size = 36,
  wordmark = false,
  label,
  className,
  tone = "dark",
}: FockisLogoProps) {
  const src =
    size <= 48
      ? FOCKIS_LOGO_SRC.small
      : size <= 96
        ? FOCKIS_LOGO_SRC.medium
        : FOCKIS_LOGO_SRC.large;

  return (
    <span
      className={[
        "fk-logo",
        `fk-logo--${tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <img
        className="fk-logo__mark"
        src={src}
        width={size}
        height={size}
        alt={wordmark ? "" : "Fockis"}
        aria-hidden={wordmark ? true : undefined}
        decoding="async"
        style={{ width: size, height: size }}
      />

      {wordmark && (
        <span className="fk-logo__text">
          <span className="fk-logo__word">Fockis</span>
          {label && <span className="fk-logo__label">{label}</span>}
        </span>
      )}
    </span>
  );
}

export default FockisLogo;
