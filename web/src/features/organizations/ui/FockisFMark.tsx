/**
 * FockisFMark.tsx
 * The flat blue Fockis "F" used in the Fockis Organizations artwork, as SVG so
 * it stays sharp at every size.
 */

import { useId } from "react";

export default function FockisFMark({
  size = 34,
  className,
  title,
}: {
  size?: number | string;
  className?: string;
  title?: string;
}): React.JSX.Element {
  const id = useId().replace(/:/g, "");
  const width = typeof size === "number" ? size * 1.36 : size;
  return (
    <svg
      className={className}
      viewBox="40 40 610 425"
      width={width}
      height={typeof size === "number" ? size : undefined}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`fo-f-top-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#0a4fb0" />
          <stop offset="100%" stopColor="#1a8cff" />
        </linearGradient>
        <linearGradient id={`fo-f-low-${id}`} x1="0" x2="1" y1="1" y2="0">
          <stop offset="0%" stopColor="#083f94" />
          <stop offset="100%" stopColor="#0a63d1" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#fo-f-top-${id})`}
        d="M150 48 L635 48 Q641 48 637 54 L575 125 Q566 136 552 136 L250 136 Q180 136 140 190 L66 302 L112 80 Q120 48 150 48 Z"
      />
      <path
        fill={`url(#fo-f-low-${id})`}
        d="M215 196 L525 196 Q531 196 527 202 L482 278 Q474 290 460 290 L305 290 L270 425 Q262 455 232 455 L70 455 Q48 455 54 432 L120 260 Q145 196 215 196 Z"
      />
    </svg>
  );
}
