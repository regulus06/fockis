// ============================================================================
// WORKSPACE STORE
// ----------------------------------------------------------------------------
// Module-level store for the current business workspace, shared by every
// marketing route mount (mailchimp, agency, billing) and persisted locally.
// Selecting a workspace only changes what the UI requests. It is NOT a security
// boundary: the backend must authorize every businessId it receives.
// ============================================================================

import { FOCKIS_BUSINESS_ID } from "../data/agencyMockData";

const KEY = "fockis-marketing:workspace";
type Listener = () => void;

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? FOCKIS_BUSINESS_ID;
  } catch {
    return FOCKIS_BUSINESS_ID;
  }
}

let activeId = typeof window === "undefined" ? FOCKIS_BUSINESS_ID : read();
const listeners = new Set<Listener>();
let version = 0;

export function getActiveBusinessId(): string {
  return activeId;
}

export function setActiveBusinessId(id: string): void {
  if (id === activeId) return;
  activeId = id;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* storage unavailable */
  }
  notifyWorkspaceChange();
}

/** Call after businesses are added/edited so subscribers re-read. */
export function notifyWorkspaceChange(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribeWorkspace(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWorkspaceVersion(): number {
  return version;
}
