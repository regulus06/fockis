/**
 * usePageBranding.ts
 * -----------------------------------------------------------------------------
 * One shared, cached copy of an organization's page branding for every
 * sidebar, banner and editor on screen. Loading it twice in the same tab
 * reuses the first request; saving in the editor refreshes all of them.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { getAuthToken } from "../api/organizationApi";
import { pageBrandingApi, type ManagedPageBranding, type PageBrandingContent } from "./pageBrandingApi";

interface OrgBrandingState {
  loaded: boolean;
  published: Record<string, PageBrandingContent>;
  managed: Record<string, ManagedPageBranding>;
  canEdit: boolean;
}

const EMPTY: OrgBrandingState = { loaded: false, published: {}, managed: {}, canEdit: false };
const store = new Map<string, OrgBrandingState>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

const k = (pageKey: string, resourceId = "") => (resourceId ? `${pageKey}::${resourceId}` : pageKey);

function emit() {
  for (const l of listeners) l();
}

async function load(orgId: string): Promise<void> {
  const [pub, man] = await Promise.all([
    pageBrandingApi.published(orgId).catch(() => ({ items: [] })),
    getAuthToken() ? pageBrandingApi.manage(orgId).catch(() => ({ canEdit: false, items: [] })) : Promise.resolve({ canEdit: false, items: [] }),
  ]);
  const published: Record<string, PageBrandingContent> = {};
  for (const i of pub.items) published[k(i.pageKey, i.resourceId)] = i.content;
  const managed: Record<string, ManagedPageBranding> = {};
  for (const i of man.items) managed[k(i.pageKey, i.resourceId)] = i;
  store.set(orgId, { loaded: true, published, managed, canEdit: man.canEdit });
  emit();
}

export function refreshPageBranding(orgId: string): Promise<void> {
  const p = load(orgId).finally(() => inflight.delete(orgId));
  inflight.set(orgId, p);
  return p;
}

/** Apply a save/publish result immediately (no refetch flicker). */
export function applyManagedBranding(orgId: string, pageKey: string, resourceId: string, item: ManagedPageBranding | null) {
  const cur = store.get(orgId) ?? { ...EMPTY, loaded: true, canEdit: true };
  const managed = { ...cur.managed };
  const published = { ...cur.published };
  const key = k(pageKey, resourceId);
  if (item) managed[key] = item;
  else delete managed[key];
  if (item?.published) published[key] = item.published;
  else delete published[key];
  store.set(orgId, { ...cur, managed, published });
  emit();
}

export function usePageBranding(organizationId?: string | null) {
  const orgId = organizationId ?? "";
  const state = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (orgId ? (store.get(orgId) ?? EMPTY) : EMPTY),
  );

  useEffect(() => {
    if (!orgId || store.has(orgId) || inflight.has(orgId)) return;
    void refreshPageBranding(orgId);
  }, [orgId]);

  const publishedFor = useCallback((pageKey: string, resourceId = "") => state.published[k(pageKey, resourceId)] ?? null, [state]);
  const managedFor = useCallback((pageKey: string, resourceId = "") => state.managed[k(pageKey, resourceId)] ?? null, [state]);

  return { ...state, publishedFor, managedFor, refresh: () => (orgId ? refreshPageBranding(orgId) : Promise.resolve()) };
}
