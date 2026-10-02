import { useCallback, useEffect, useState } from 'react';
import { musicApi } from '../services/musicApi';
import type { ResolvedAccess } from '../types/music.types';

/**
 * Fetches the CURRENT access level for a piece of content from the server.
 * This is the only thing components should trust to decide whether to show
 * full playback controls vs. a preview/unlock prompt — never derive this
 * from local purchase state alone (e.g. right after a purchase, re-fetch
 * rather than optimistically flipping a flag).
 */
export function useMusicEntitlement(contentId: string | undefined) {
  const [access, setAccess] = useState<ResolvedAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await musicApi.getAccess(contentId);
      setAccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check access.');
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { access, loading, error, refresh };
}
