/**
 * External applications
 *
 * Jobs with applicationMethod "external" send candidates to the
 * employer's own application page instead of the Fockis form.
 */

/** Returns the URL only if it is a safe http(s) link. */
export function safeApplicationUrl(url?: string | null): string | null {
  let raw = String(url ?? '').trim();
  if (!raw) return null;
  // "www.company.com/jobs" or "company.com/jobs": treat as https.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw) && /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(raw)) raw = `https://${raw}`;
  try {
    const parsed = new URL(raw);
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
  // Without the "noopener" feature string, window.open returns the new tab
  // (with it, browsers always return null and this page would ALSO leave
  // Fockis). The link to Fockis is cut right after.
  const opened = window.open(safe, '_blank');
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      /* cross-origin already */
    }
  } else {
    // Pop-up blocked or no new tabs (some in-app browsers): open it here.
    window.location.assign(safe);
  }
  return true;
}
