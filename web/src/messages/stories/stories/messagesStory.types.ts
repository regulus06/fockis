export type MessagesStoryType =
  | "image"
  | "video"
  | "text";

export interface MessagesStory {
  id: string;

  userId: string;

  name: string;

  avatar?: string | null;

  type: MessagesStoryType;

  mediaUrl?: string | null;

  text?: string | null;

  createdAt: string;

  expiresAt: string;

  seen: boolean;
}

export interface MessagesStoryProfile {
  userId: string;

  fockisId?: string | null;

  name: string;

  username?: string | null;

  avatar?: string | null;

  bio?: string | null;
}

export interface CreateMessagesStoryInput {
  type: MessagesStoryType;

  text?: string;

  mediaFile?: File | null;

  mediaUrl?: string | null;
}

export interface MessagesStoryGroup {
  userId: string;

  profile: MessagesStoryProfile;

  stories: MessagesStory[];

  hasUnseen: boolean;
}