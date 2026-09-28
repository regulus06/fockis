// LOCATION:
// web/src/socket/events/notification.events.ts


import type {
  AppNotification,
} from "../../features/notifications/type/Notification";



/*
=================================================
NOTIFICATION SOCKET EVENTS
Matches NestJS NotificationsGateway
=================================================
*/


export const NOTIFICATION_EVENTS = {


  NEW:
    "notification",


  PING:
    "ping",


  PONG:
    "pong",


} as const;






export interface NotificationSocketPayload
extends Partial<AppNotification>{


  _id:string;


  type:string;


  title?:string;


  message:string;


  recipientId?:string;


  senderId?:string;


  entityId?:string;


  entityType?:string;


  link?:string;


  createdAt:string;


}