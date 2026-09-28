import type {
  Message,
  Reaction,
  ReactionEmoji,
} from "../types";

let idCounter = 0;

export function generateLocalId(
  prefix = "local",
): string {
  idCounter += 1;

  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function toggleReaction(
  reactions: Reaction[] | undefined,
  emoji: ReactionEmoji,
  userId: string,
): Reaction[] {
  const current = reactions
    ? [...reactions]
    : [];

  const idx = current.findIndex(
    (reaction) =>
      reaction.emoji === emoji,
  );

  if (idx === -1) {
    return [
      ...current,
      {
        emoji,
        userIds: [userId],
      },
    ];
  }

  const existing = current[idx];

  const hasReacted =
    existing.userIds.includes(userId);

  const nextUserIds = hasReacted
    ? existing.userIds.filter(
        (id) => id !== userId,
      )
    : [
        ...existing.userIds,
        userId,
      ];

  if (nextUserIds.length === 0) {
    return current.filter(
      (_, i) => i !== idx,
    );
  }

  current[idx] = {
    ...existing,
    userIds: nextUserIds,
  };

  return current;
}

export function totalReactionCount(
  reactions: Reaction[] | undefined,
): number {
  if (!reactions) {
    return 0;
  }

  return reactions.reduce(
    (sum, reaction) =>
      sum + reaction.userIds.length,
    0,
  );
}

export function isOwnMessage(
  message: Message,
  currentUserId: string,
): boolean {
  if (!currentUserId) {
    return false;
  }

  return (
    String(message.senderId) ===
    String(currentUserId)
  );
}

export function canEditMessage(
  message: Message,
  currentUserId: string,
): boolean {
  return (
    isOwnMessage(
      message,
      currentUserId,
    ) &&
    message.type === "text" &&
    !message.deletedForEveryone
  );
}