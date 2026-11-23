import { Body, Controller, Get, Param, Patch, Query, Req } from "@nestjs/common";

import {
  AdminNotificationListQueryDto,
  AdminNotificationPreferencesDto,
  MarkAllReadDto,
} from "./admin-notifications.dto";
import { AdminNotificationsService, readerFromRequest } from "./admin-notifications.service";

// ============================================================================
// /admin/notifications
//
// Every signed-in account may call these routes, but each only ever sees its
// own notifications, filtered again by its CURRENT permissions (a revoked
// permission hides the notifications that needed it). Non-administrators
// never receive admin notifications, so they always get an empty list.
// ============================================================================

@Controller("admin/notifications")
export class AdminNotificationsController {
  constructor(private readonly notifications: AdminNotificationsService) {}

  @Get()
  list(@Req() req: any, @Query() query: AdminNotificationListQueryDto) {
    return this.notifications.list(readerFromRequest(req), query);
  }

  @Get("unread-count")
  async unreadCount(@Req() req: any) {
    return { unread: await this.notifications.unreadCount(readerFromRequest(req)) };
  }

  @Get("preferences")
  preferences(@Req() req: any) {
    return this.notifications.getPreferences(readerFromRequest(req));
  }

  @Patch("preferences")
  updatePreferences(@Req() req: any, @Body() body: AdminNotificationPreferencesDto) {
    return this.notifications.updatePreferences(readerFromRequest(req), body);
  }

  @Patch("read-all")
  readAll(@Req() req: any, @Body() body: MarkAllReadDto) {
    return this.notifications.markAllRead(readerFromRequest(req), body?.category);
  }

  @Get(":id")
  get(@Req() req: any, @Param("id") id: string) {
    return this.notifications.get(readerFromRequest(req), id);
  }

  @Patch(":id/read")
  read(@Req() req: any, @Param("id") id: string) {
    return this.notifications.markRead(readerFromRequest(req), id);
  }

  @Patch(":id/unread")
  unread(@Req() req: any, @Param("id") id: string) {
    return this.notifications.markUnread(readerFromRequest(req), id);
  }
}
