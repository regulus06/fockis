import { Link } from 'react-router-dom';
import type { Producer, ProducerCategory } from '../types/playlist.types';
import { formatCount } from '../utils/format';
import { VerifiedIcon } from './icons';

const CATEGORY_LABEL: Record<ProducerCategory, string> = {
  'music-producer': 'Music Producer',
  'recording-artist': 'Recording Artist',
  dj: 'DJ',
  'video-producer': 'Video Producer',
  filmmaker: 'Filmmaker',
  'beat-producer': 'Beat Producer',
  'podcast-creator': 'Podcast Creator',
};

export interface ProducerCardProps {
  producer: Producer;
  onFollow?: (producerId: string) => void;
  onUnfollow?: (producerId: string) => void;
}

/**
 * New component (not in the original file list): the brief's "Featured
 * Producer" cards need distinct layout and actions (follow, category,
 * follower/release counts) that don't belong inside PlaylistCard, so this
 * is a sibling component reused by the marketplace landing page and any
 * future "Producers" directory page.
 */
export function ProducerCard({ producer, onFollow, onUnfollow }: ProducerCardProps) {
  const isFollowing = !!producer.isFollowedByCurrentUser;

  return (
    <article className="fk-producer-card">
      <img
        className="fk-producer-card__avatar"
        src={producer.avatarUrl}
        alt=""
        loading="lazy"
      />
      <div className="fk-producer-card__name">
        <span>{producer.displayName}</span>
        {producer.verified && (
          <span className="fk-verified" title="Verified producer">
            <VerifiedIcon />
          </span>
        )}
      </div>
      <div className="fk-producer-card__handle">@{producer.username}</div>
      <span className="fk-producer-card__category">{CATEGORY_LABEL[producer.category]}</span>

      <div className="fk-producer-card__stats">
        <div>
          <span className="fk-producer-card__stat-value">{formatCount(producer.followerCount)}</span>
          Followers
        </div>
        <div>
          <span className="fk-producer-card__stat-value">{producer.releaseCount}</span>
          Releases
        </div>
      </div>

      <div className="fk-producer-card__actions">
        <button
          type="button"
          className={`fk-btn fk-btn--sm ${isFollowing ? 'fk-btn--outline' : 'fk-btn--primary'}`}
          style={{ flex: 1 }}
          aria-pressed={isFollowing}
          onClick={() => (isFollowing ? onUnfollow?.(producer.id) : onFollow?.(producer.id))}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
        <Link
          to={`/media/producers/${producer.username}`}
          className="fk-btn fk-btn--outline fk-btn--sm"
          style={{ flex: 1 }}
        >
          View Profile
        </Link>
      </div>
    </article>
  );
}