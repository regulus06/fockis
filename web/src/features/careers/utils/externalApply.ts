/**
 * External applications
 *
 * Jobs with applicationMethod "external" send candidates to the
 * employer's own application page instead of the Fockis form.
 */

/** Returns the URL only if it is a safe http(s) link. */
export function safeApplicationUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function isExternalJob(job: { applyMode?: string; applicationUrl?: string | null }): boolean {
  return job.applyMode === 'external' && Boolean(safeApplicationUrl(job.applicationUrl));
}

/** Opens the employer's application page in a new tab (falls back to same tab if blocked). */
export function openExternalApplication(url?: string | null): boolean {
  const safe = safeApplicationUrl(url);
  if (!safe) return false;
  const opened = window.open(safe, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.assign(safe);
  return true;
}
