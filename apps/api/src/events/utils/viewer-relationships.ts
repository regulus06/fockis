/* ============================================================================
   VIEWER RELATIONSHIPS FOR EVENTS
   apps/api/src/events/utils/viewer-relationships.ts

   Friends, follows and blocks for one viewer, read through the shared
   Mongoose connection (the same approach FeedService uses), so the
   Events module does not depend on Friends/Follows exporting services.

   Fails closed for blocks: if the Friendship model cannot be read, the
   viewer simply has no friends for visibility purposes, which can only
   hide "friends" events, never reveal anything.
============================================================================ */

import { Logger } from "@nestjs/common";
import { Connection, Types } from "mongoose";

export interface EventViewerRelationships {
  friendIds: string[];
  followedIds: string[];
  blockedIds: string[];
}

export const EMPTY_RELATIONSHIPS: EventViewerRelationships = {
  friendIds: [],
  followedIds: [],
  blockedIds: [],
};

function idOf(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    const record = value as { _id?: unknown; id?: unknown; toString?: () => string };

    if (record._id) {
      return String(record._id);
    }

    if (record.id) {
      return String(record.id);
    }

    return record.toString?.() ?? "";
  }

  return String(value);
}

export async function loadEventViewerRelationships(
  connection: Connection,
  viewerId: string | undefined,
  logger?: Logger,
): Promise<EventViewerRelationships> {
  if (!viewerId || !Types.ObjectId.isValid(viewerId)) {
    return { ...EMPTY_RELATIONSHIPS };
  }

  const viewer = new Types.ObjectId(viewerId);
  const friendshipModel = connection.models["Friendship"];
  const followModel = connection.models["Follow"];

  const [friendships, follows] = await Promise.all([
    friendshipModel
      ? friendshipModel
          .find({
            status: { $in: ["accepted", "blocked"] },
            $or: [{ requester: viewer }, { receiver: viewer }],
          })
          .select("requester receiver status")
          .lean()
          .exec()
          .catch((error: unknown) => {
            logger?.warn(`Could not load friendships: ${String(error)}`);
            return [];
          })
      : Promise.resolve([]),

    followModel
      ? followModel
          .find({ followerId: viewer })
          .select("followingId")
          .lean()
          .exec()
          .catch((error: unknown) => {
            logger?.warn(`Could not load follows: ${String(error)}`);
            return [];
          })
      : Promise.resolve([]),
  ]);

  const friends = new Set<string>();
  const blocked = new Set<string>();

  for (const row of friendships as any[]) {
    const requester = idOf(row.requester);
    const receiver = idOf(row.receiver);
    const other = requester === viewerId ? receiver : requester;

    if (!other || other === viewerId) {
      continue;
    }

    if (row.status === "blocked") {
      blocked.add(other);
    } else if (row.status === "accepted") {
      friends.add(other);
    }
  }

  for (const id of blocked) {
    friends.delete(id);
  }

  const followed = new Set<string>();

  for (const row of follows as any[]) {
    const id = idOf(row.followingId);

    if (id && id !== viewerId && !blocked.has(id)) {
      followed.add(id);
    }
  }

  return {
    friendIds: Array.from(friends),
    followedIds: Array.from(followed),
    blockedIds: Array.from(blocked),
  };
}
