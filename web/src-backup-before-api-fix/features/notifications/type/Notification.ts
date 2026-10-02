export interface AppNotification {
  _id: string;
  recipientId: string;
  senderId?: string;

  type: string;

  title: string;
  message: string;

  entityId?: string;
  entityType?: string;

  image?: string;
  link?: string;

  read: boolean;

  createdAt?: string;
  updatedAt?: string;
}