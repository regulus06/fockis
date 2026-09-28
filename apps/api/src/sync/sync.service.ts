import { Injectable } from '@nestjs/common';

@Injectable()
export class SyncService {
  private lastSyncMap: Map<string, number> = new Map();

  syncUser(userId: string, payload: any) {
    const now = Date.now();

    this.lastSyncMap.set(userId, now);

    return {
      userId,
      synced: true,
      timestamp: now,
      changesApplied: Array.isArray(payload?.changes)
        ? payload.changes.length
        : 0,
    };
  }

  getLastSync(userId: string) {
    return {
      userId,
      lastSyncedAt: this.lastSyncMap.get(userId) || null,
    };
  }

  forceResync(userId: string) {
    const now = Date.now();
    this.lastSyncMap.set(userId, now);

    return {
      userId,
      resynced: true,
      timestamp: now,
    };
  }
}