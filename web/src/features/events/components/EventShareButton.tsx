import { useState } from "react";
import { Check, Share2 } from "lucide-react";

import type { FockisEvent } from "../types/event.types";
import { absoluteEventUrl } from "../utils/eventMedia";

interface Props {
  event: Pick<FockisEvent, "id" | "title">;
  label?: string;
  className?: string;
}

/** Native share sheet where available, otherwise copies the link. */
export default function EventShareButton({ event, label = "Share", className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  async function share(clickEvent: React.MouseEvent) {
    clickEvent.stopPropagation();

    const url = absoluteEventUrl(event.id);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: event.title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed or clipboard blocked: nothing to do.
    }
  }

  return (
    <button type="button" className={`fke-btn fke-btn--ghost ${className}`} onClick={share}>
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      <span>{copied ? "Link copied" : label}</span>
    </button>
  );
}
