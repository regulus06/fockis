import { useState } from "react";

import { categoryMeta } from "../constants/eventCategories";
import type { FockisEvent } from "../types/event.types";
import { eventCover } from "../utils/eventMedia";

interface Props {
  event: Pick<FockisEvent, "coverMediaType" | "coverImageUrl" | "coverVideoUrl" | "category" | "title">;
  /** Details page shows video controls; cards show a muted preview frame. */
  controls?: boolean;
  className?: string;
}

/** Lazy cover image/video with a branded fallback (never a broken image). */
export default function EventCover({ event, controls = false, className = "" }: Props) {
  const cover = eventCover(event);
  const [failed, setFailed] = useState(false);
  const Icon = categoryMeta(event.category).icon;

  if (cover.type === "none" || failed) {
    return (
      <div className={`fke-cover fke-cover--placeholder ${className}`} aria-hidden="true">
        <Icon size={38} strokeWidth={1.6} />
      </div>
    );
  }

  if (cover.type === "video") {
    return (
      <div className={`fke-cover ${className}`}>
        <video
          src={cover.url}
          muted={!controls}
          controls={controls}
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          aria-label={controls ? `${event.title} video` : undefined}
          aria-hidden={controls ? undefined : true}
          tabIndex={controls ? 0 : -1}
        />
      </div>
    );
  }

  return (
    <div className={`fke-cover ${className}`}>
      <img
        src={cover.url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
