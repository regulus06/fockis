export type ReactionEmoji = '❤️' | '😂' | '👍' | '😮' | '😢' | '🙏';

export interface Reaction {
  emoji: ReactionEmoji;
  userIds: string[];
}

export const REACTION_EMOJIS: ReactionEmoji[] = ['❤️', '😂', '👍', '😮', '😢', '🙏'];
