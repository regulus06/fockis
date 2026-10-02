import type { ReactNode } from 'react';
import { AlertIcon, InboxIcon, LockIcon } from './icons';
import { PlaylistAccessBadge } from './PlaylistAccessBadge';
import type { AccessType } from '../types/playlist.types';

export function SkeletonCard() {
  return (
    <div className="fk-skeleton-card" aria-hidden="true">
      <div className="fk-skeleton-card__media" />
      <div className="fk-skeleton-card__body">
        <div className="fk-skeleton-card__line fk-skeleton-card__line--title" />
        <div className="fk-skeleton-card__line fk-skeleton-card__line--short" />
        <div className="fk-skeleton-card__line fk-skeleton-card__line--short" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="fk-grid" role="status" aria-label="Loading playlists">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface StateProps {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: 'empty' | 'error';
}

export function StateMessage({ title, body, action, icon, variant = 'empty' }: StateProps) {
  return (
    <div
      className={`fk-state${variant === 'error' ? ' fk-state--error' : ''}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <div className="fk-state__icon">{icon ?? (variant === 'error' ? <AlertIcon width={44} height={44} /> : <InboxIcon width={44} height={44} />)}</div>
      <h3 className="fk-state__title">{title}</h3>
      {body && <p className="fk-state__body">{body}</p>}
      {action}
    </div>
  );
}

export function EmptyPlaylistsState({ context = 'playlists' }: { context?: string }) {
  return (
    <StateMessage
      title={`No ${context} yet`}
      body="When there's something here, it'll show up in this space."
    />
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <StateMessage
      variant="error"
      title="Something went wrong"
      body="We couldn't load this. Please try again."
      action={
        onRetry && (
          <button type="button" className="fk-btn fk-btn--outline" onClick={onRetry}>
            Try again
          </button>
        )
      }
    />
  );
}

export function UnauthorizedState({ onSignIn }: { onSignIn?: () => void }) {
  return (
    <StateMessage
      title="Sign in to access your library"
      body="Your playlists, favorites, and purchases are saved to your Fockis account."
      icon={<LockIcon width={44} height={44} />}
      action={
        <button type="button" className="fk-btn fk-btn--primary" onClick={onSignIn}>
          Sign In
        </button>
      }
    />
  );
}

export function LockedState({
  access,
  price,
  currency,
  onUnlock,
}: {
  access: AccessType;
  price?: number;
  currency?: string;
  onUnlock?: () => void;
}) {
  return (
    <StateMessage
      title="Unlock this playlist to continue"
      body="This collection is part of the creator's paid catalog. Unlock it to stream every track and support their work directly."
      icon={<LockIcon width={44} height={44} />}
      action={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <PlaylistAccessBadge access={access} price={price} currency={currency} size="lg" />
          <button type="button" className="fk-btn fk-btn--gold" onClick={onUnlock}>
            Unlock Access
          </button>
        </div>
      }
    />
  );
}