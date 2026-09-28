import type {
  MonetizedContent,
} from "../types/contentMonetization.types";

import PaidVideoPlayer from "./PaidVideoPlayer";
import PaidMusicPlayer from "./PaidMusicPlayer";

interface PaidContentCardProps {
  content: MonetizedContent;
}

export default function PaidContentCard({
  content,
}: PaidContentCardProps) {
  return (
    <article className="paid-content-card">
      <div className="paid-content-header">
        <div>
          <h3>
            {content.title}
          </h3>

          {content.creatorName && (
            <span>
              {content.creatorName}
            </span>
          )}
        </div>

        {content.monetization.enabled && (
          <span className="monetized-label">
            🔒 Paid
          </span>
        )}
      </div>

      {content.description && (
        <p className="paid-content-description">
          {content.description}
        </p>
      )}

      {content.type === "video" ? (
        <PaidVideoPlayer
          content={content}
        />
      ) : (
        <PaidMusicPlayer
          content={content}
        />
      )}
    </article>
  );
}