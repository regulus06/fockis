import {
Controller,
Get,
Patch,
Delete,
Param,
Req,
UseGuards,
} from "@nestjs/common";

import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
constructor(
private readonly notificationsService: NotificationsService,
) {}

/*
GET ALL USER NOTIFICATIONS

```
GET /notifications
```

*/
@Get()
findAll(@Req() req: any) {
const userId = String(req.user?.id || req.user?.sub || "");


return this.notificationsService.findAll(userId);


}

/*
GET UNREAD COUNT

```
Supports both:

GET /notifications/unread-count
GET /notifications/unread/count
```

*/

@Get("unread-count")
unreadCount(@Req() req: any) {
const userId = String(req.user?.id || req.user?.sub || "");


return this.notificationsService.unreadCount(userId);


}

@Get("unread/count")
unreadCountNested(@Req() req: any) {
const userId = String(req.user?.id || req.user?.sub || "");


return this.notificationsService.unreadCount(userId);


}

/*
MARK ONE READ

```
PATCH /notifications/:id/read
```

*/
@Patch(":id/read")
markRead(
@Req() req: any,
@Param("id") id: string,
) {
const userId = String(req.user?.id || req.user?.sub || "");

return this.notificationsService.markRead(
  userId,
  id,
);

}

/*
MARK ALL READ

```
PATCH /notifications/read-all
```

*/
@Patch("read-all")
markAllRead(@Req() req: any) {
const userId = String(req.user?.id || req.user?.sub || "");

return this.notificationsService.markAllRead(userId);

}

/*
DELETE NOTIFICATION

```
DELETE /notifications/:id
```

*/
@Delete(":id")
remove(
@Req() req: any,
@Param("id") id: string,
) {
const userId = String(req.user?.id || req.user?.sub || "");

return this.notificationsService.remove(
  userId,
  id,
);


}
}
