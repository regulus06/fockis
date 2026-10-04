import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Business, MarketingViewer, Permission } from "../types/platform.types";
import { agencyApi } from "../services/agencyApi";
import {
  getActiveBusinessId,
  getWorkspaceVersion,
  setActiveBusinessId,
  subscribeWorkspace,
} from "../services/workspaceStore";

export interface MarketingWorkspace {
  /** The business whose marketing data the UI is showing. */
  currentBusiness: Business | undefined;
  businesses: Business[];
  loading: boolean;
  switchBusiness: (id: string) => void;
  refresh: () => void;
}

let cache: Business[] = [];

/**
 * Current workspace + list of businesses. Shared across every marketing route
 * because the selection lives in a module-level store.
 * Switching only changes which businessId the UI requests; the backend must
 * authorize access to each one.
 */
export function useMarketingWorkspace(): MarketingWorkspace {
  const activeId = useSyncExternalStore(subscribeWorkspace, getActiveBusinessId, getActiveBusinessId);
  const version = useSyncExternalStore(subscribeWorkspace, getWorkspaceVersion, getWorkspaceVersion);
  const [businesses, setBusinesses] = useState<Business[]>(cache);
  const [loading, setLoading] = useState(cache.length === 0);

  useEffect(() => {
    let live = true;
    agencyApi.getBusinesses().then((list) => {
      if (!live) return;
      cache = list;
      setBusinesses(list);
      setLoading(false);
    }).catch(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [version]);

  const switchBusiness = useCallback((id: string) => setActiveBusinessId(id), []);
  const refresh = useCallback(() => {
    agencyApi.getBusinesses().then((list) => {
      cache = list;
      setBusinesses(list);
    });
  }, []);

  const visible = businesses.filter((b) => b.status !== "archived");
  const currentBusiness = visible.find((b) => b.id === activeId) ?? visible[0];
  return { currentBusiness, businesses: visible, loading, switchBusiness, refresh };
}

let viewerCache: MarketingViewer | null = null;

/** UI-only permission checks. Hiding a button is not security. */
export function useViewer(): { viewer: MarketingViewer | null; can: (p: Permission) => boolean } {
  const [viewer, setViewer] = useState<MarketingViewer | null>(viewerCache);
  useEffect(() => {
    if (viewerCache) return;
    agencyApi.getViewer().then((v) => {
      viewerCache = v;
      setViewer(v);
    }).catch(() => undefined);
  }, []);
  return { viewer, can: (p) => Boolean(viewer?.permissions.includes(p)) };
}
