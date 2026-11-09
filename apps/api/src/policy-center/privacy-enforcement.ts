import { ForbiddenException } from "@nestjs/common";
import { Connection, Types } from "mongoose";

/**
 * Server-side checks for the Privacy Controls page. Modules call these
 * through the shared mongoose connection so no module has to import the
 * Policy Center module. If the settings collection is not registered, every
 * check allows the action (the old behaviour).
 */

type Kind = "messaging" | "comments";

const oid = (id: string) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null);

async function settingsFor(connection: Connection | undefined, userId: string) {
  const model = connection?.models?.["UserPrivacySettings"];
  if (!model || !userId) return null;
  return (await model.findOne({ userId: String(userId) }).lean().exec().catch(() => null)) as any;
}

async function areFriends(connection: Connection, a: string, b: string) {
  const model = connection.models["Friendship"];
  const A = oid(a);
  const B = oid(b);
  if (!model || !A || !B) return false;
  return Boolean(
    await model
      .exists({ status: "accepted", $or: [{ requester: A, receiver: B }, { requester: B, receiver: A }] })
      .exec()
      .catch(() => null),
  );
}

async function follows(connection: Connection, follower: string, following: string) {
  const model = connection.models["Follow"];
  const A = oid(follower);
  const B = oid(following);
  if (!model || !A || !B) return false;
  return Boolean(await model.exists({ followerId: A, followingId: B }).exec().catch(() => null));
}

/**
 * Whether `actorId` may message / comment on content of `ownerId`.
 * - messaging "following": people the owner follows may message them.
 * - comments "followers": people who follow the owner may comment.
 */
export async function isInteractionAllowed(connection: Connection | undefined, kind: Kind, actorId: string, ownerId: string) {
  if (!connection || !actorId || !ownerId || String(actorId) === String(ownerId)) return true;
  const settings = await settingsFor(connection, ownerId);
  const value: string = settings?.[kind] ?? "everyone";
  if (value === "everyone") return true;
  if (value === "nobody") return false;
  if (value === "friends") return areFriends(connection, actorId, ownerId);
  if (value === "following") return follows(connection, ownerId, actorId);
  if (value === "followers") return follows(connection, actorId, ownerId);
  return true;
}

export async function assertInteractionAllowed(connection: Connection | undefined, kind: Kind, actorId: string, ownerId: string) {
  if (await isInteractionAllowed(connection, kind, actorId, ownerId)) return;
  throw new ForbiddenException(kind === "messaging" ? "This person isn't accepting messages from you." : "Comments on this post are limited by the author's privacy settings.");
}

/** Accounts the viewer has muted. */
export async function mutedUserIds(connection: Connection | undefined, viewerId: string | undefined): Promise<string[]> {
  if (!viewerId) return [];
  const settings = await settingsFor(connection, viewerId);
  return Array.isArray(settings?.mutedUserIds) ? settings.mutedUserIds.map(String) : [];
}

/** Of the given user ids, the ones who turned off "appear in search". */
export async function unsearchableUserIds(connection: Connection | undefined, userIds: string[]): Promise<Set<string>> {
  const model = connection?.models?.["UserPrivacySettings"];
  if (!model || !userIds.length) return new Set();
  const rows = (await model.find({ userId: { $in: userIds.map(String) }, searchable: false }).select("userId").lean().exec().catch(() => [])) as any[];
  return new Set(rows.map((r) => String(r.userId)));
}
