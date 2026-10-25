import { useState } from "react";

import { avatarUrl } from "../utils/eventMedia";

interface Props {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}

export default function EventAvatar({ name, src, size = 36, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const url = src && !failed ? avatarUrl(src) : "";
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`fke-avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {url ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} /> : initial}
    </span>
  );
}
