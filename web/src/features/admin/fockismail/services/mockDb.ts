// ============================================================================
// PER-BUSINESS MOCK DATABASE (mock mode only)
// ----------------------------------------------------------------------------
// `db` always points at the ACTIVE business's store, so every existing service
// (campaigns, audience, templates, ...) is automatically scoped to the current
// workspace. Use `storeFor(businessId)` to read another business explicitly
// (e.g. agency rollups). Resets on page reload.
// ============================================================================

import { buildStore, type MockStore } from "../data/businessSeeds";
import { getActiveBusinessId } from "./workspaceStore";
import { platformDb } from "./platformDb";

const stores = new Map<string, MockStore>();

export function storeFor(businessId: string): MockStore {
  let store = stores.get(businessId);
  if (!store) {
    const business = platformDb.businesses.find((b) => b.id === businessId) ?? platformDb.businesses[0];
    store = buildStore(business);
    stores.set(businessId, store);
  }
  return store;
}

export function activeBusinessId(): string {
  return getActiveBusinessId();
}

export const db: MockStore = new Proxy({} as MockStore, {
  get(_target, key) {
    return storeFor(getActiveBusinessId())[key as keyof MockStore];
  },
  set(_target, key, value) {
    const store = storeFor(getActiveBusinessId()) as unknown as Record<string, unknown>;
    store[key as string] = value;
    return true;
  },
});

export function findOrThrow<T extends { id: string }>(list: T[], id: string, kind: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`${kind} “${id}” was not found in this workspace.`);
  return item;
}

export function upsert<T extends { id: string }>(list: T[], item: T): T {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) list.unshift(item);
  else list[i] = item;
  return item;
}

export function removeById<T extends { id: string }>(list: T[], id: string): void {
  const i = list.findIndex((x) => x.id === id);
  if (i !== -1) list.splice(i, 1);
}
