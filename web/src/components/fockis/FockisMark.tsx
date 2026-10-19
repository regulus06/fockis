import "./FockisMark.css";

/**
 * ============================================================================
 * FOCKIS MARK — the official Fockis logo, for every logo slot in the app
 * ============================================================================
 *
 * Artwork:
 *   mobile/Fockis-Mobile-Shell/assets/fockis-icon.png
 *
 * Web assets:
 *   web/public/brand/fockis-icon-96.png
 *   web/public/brand/fockis-icon-192.png
 *   web/public/brand/fockis-icon-512.png
 *
 * Usage:
 *
 * 1. Fill an existing logo box:
 *      <span className="some-brand-mark">
 *        <FockisMark />
 *      </span>
 *
 * 2. Render at a fixed size:
 *      <FockisMark size={28} />
 *
 * ============================================================================
 */

const BASE = import.meta.env.BASE_URL || "/";

export const FOCKIS_MARK_SRC = `${BASE}brand/fockis-icon-96.png`;

const SRC_SET = [
  `${BASE}brand/fockis-icon-96.png 1x`,
  `${BASE}brand/fockis-icon-192.png 2x`,
].join(", ");

interface FockisMarkProps {
  /** Fixed pixel size. Omit to fill the parent logo box. */
  size?: number;

  /** Hidden text that preserves the parent box's original size in fill mode. */
  spacer?: string;

  /** Accessible name. Empty by default when a separate Fockis label is present. */
  alt?: string;

  /** Optional additional CSS class. */
  className?: string;
}

export default function FockisMark({
  size,
  spacer = "F",
  alt = "",
  className,
}: FockisMarkProps) {
  const classes = [
    "fockis-mark",
    size ? "fockis-mark--sized" : "fockis-mark--fill",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (size) {
    return (
      <img
        className={classes}
        src={FOCKIS_MARK_SRC}
        srcSet={SRC_SET}
        alt={alt}
        width={size}
        height={size}
        draggable={false}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <>
      <img
        className={classes}
        src={FOCKIS_MARK_SRC}
        srcSet={SRC_SET}
        alt={alt}
        draggable={false}
      />

      <span className="fockis-mark__spacer" aria-hidden="true">
        {spacer}
      </span>
    </>
  );
}

export { FockisMark };