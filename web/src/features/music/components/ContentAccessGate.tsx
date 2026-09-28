import type { ReactNode } from 'react';
import { useMusicEntitlement } from '../hooks/useMusicEntitlement';
import { MusicAccessBadge } from './MusicAccessBadge';

interface ContentAccessGateProps {
  contentId: string;
  accessType: 'free' | 'preview_paid' | 'paid' | 'premium' | 'exclusive';
  renderFull: () => ReactNode;
  renderPreview: () => ReactNode;
  renderLocked: () => ReactNode;
}

/**
 * The single place in the UI that decides which of three renderers to show,
 * based on the access level the BACKEND returned — never on a locally-held
 * "hasPurchased" flag. Every content detail page, track card expansion, and
 * video page should route through this rather than reimplementing the
 * full/preview/locked branching.
 */
export function ContentAccessGate({ contentId, accessType, renderFull, renderPreview, renderLocked }: ContentAccessGateProps) {
  const { access, loading, error, refresh } = useMusicEntitlement(contentId);

  if (loading) {
    return <div className="content-access-gate content-access-gate--loading">Checking access…</div>;
  }

  if (error || !access) {
    return (
      <div className="content-access-gate content-access-gate--error">
        <p>Couldn't verify access to this content.</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  return (
    <div className="content-access-gate">
      <MusicAccessBadge accessType={accessType} level={access.level} />
      {access.level === 'full' && renderFull()}
      {access.level === 'preview' && renderPreview()}
      {access.level === 'denied' && renderLocked()}
    </div>
  );
}
