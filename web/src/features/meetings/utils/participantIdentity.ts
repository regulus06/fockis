import type { ParticipantRole, RoomParticipant } from "../types";

/**
 * Participant identity helpers shared by the video stage and the sidebar.
 *
 * The same person can reach the room store from two sources: the Fockis
 * realtime socket (keyed by the Fockis user id) and LiveKit (keyed by the
 * LiveKit identity, usually "fockis-user-<id>"). These helpers treat those
 * ids as aliases so one person is never shown or counted twice.
 */

export function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function uniqueKeys(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }

  return result;
}

function expandKey(value: unknown): string[] {
  const key = normalizeKey(value);
  if (!key) return [];
  const raw = key.replace(/^fockis-user-/i, "");
  return [key, raw, `fockis-user-${raw}`];
}

export function getParticipantKeys(participant: RoomParticipant): string[] {
  const item = participant as RoomParticipant & {
    user?: { id?: string; _id?: string; userId?: string };
    userId?: string;
    user_id?: string;
    identity?: string;
  };

  return uniqueKeys(
    [
      participant.id,
      item.userId,
      item.user_id,
      item.identity,
      item.user?.id,
      item.user?._id,
      item.user?.userId,
    ].flatMap(expandKey),
  );
}

export function getIdentityKeys(identity: unknown): string[] {
  return uniqueKeys(expandKey(identity));
}

export function participantMatchesId(
  participant: RoomParticipant,
  id: unknown,
): boolean {
  const target = getIdentityKeys(id);
  if (!target.length) return false;
  return getParticipantKeys(participant).some((key) => target.includes(key));
}

const ROLE_RANK: Record<ParticipantRole, number> = {
  host: 3,
  "co-host": 2,
  participant: 1,
};

export function strongerRole(
  a: ParticipantRole | undefined,
  b: ParticipantRole | undefined,
): ParticipantRole {
  const left = a ?? "participant";
  const right = b ?? "participant";
  return (ROLE_RANK[right] ?? 0) > (ROLE_RANK[left] ?? 0) ? right : left;
}

function looksLikeIdentity(name: string, participant: RoomParticipant): boolean {
  const key = normalizeKey(name);
  return !key || getParticipantKeys(participant).includes(key);
}

/**
 * Collapse store entries that describe the same person. Keeps the strongest
 * role and a human display name; media flags come from the LiveKit-sourced
 * entry ("fockis-user-*") when one exists, because that is what is actually
 * being published.
 */
export function dedupeParticipants(
  participants: RoomParticipant[],
): RoomParticipant[] {
  const groups: { keys: Set<string>; items: RoomParticipant[] }[] = [];

  for (const participant of participants) {
    const keys = getParticipantKeys(participant);
    const group = groups.find((candidate) =>
      keys.some((key) => candidate.keys.has(key)),
    );

    if (group) {
      keys.forEach((key) => group.keys.add(key));
      group.items.push(participant);
    } else {
      groups.push({ keys: new Set(keys), items: [participant] });
    }
  }

  return groups.map(({ items }) => {
    if (items.length === 1) return items[0];

    const media =
      items.find((item) => /^fockis-user-/i.test(item.id)) ?? items[0];
    const named =
      items.find((item) => !looksLikeIdentity(item.user.displayName, item)) ??
      items[0];
    const role = items.reduce<ParticipantRole>(
      (current, item) => strongerRole(current, item.role),
      "participant",
    );

    return {
      ...items[0],
      ...media,
      id: items[0].id,
      role,
      user: {
        ...media.user,
        ...named.user,
        avatarUrl: items.find((item) => item.user.avatarUrl)?.user.avatarUrl,
      },
      handRaised: items.some((item) => item.handRaised),
      isSpeaking: items.some((item) => item.isSpeaking),
      screenSharing: items.some((item) => item.screenSharing),
    };
  });
}
