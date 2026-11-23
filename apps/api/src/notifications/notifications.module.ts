import {
Module,
} from "@nestjs/common";


import {
MongooseModule,
} from "@nestjs/mongoose";


import {
NotificationsController,
} from "./notifications.controller";


import {
NotificationsService,
} from "./notifications.service";


import {
Notification,
NotificationSchema,
} from "./schemas/notification.schema";


import {
NotificationsGateway,
} from "./gateways/notifications.gateway";

import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";



@Module({

imports:[

MongooseModule.forFeature([

{

name:Notification.name,

schema:NotificationSchema,

},

]),

// Verifies access tokens on the notifications socket.
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: String(config.get<string>("JWT_SECRET") ?? ""),
  }),
}),

],



controllers:[

NotificationsController,

],



providers:[

NotificationsService,

NotificationsGateway,

],



exports:[

NotificationsService,

NotificationsGateway,

],


})

export class NotificationsModule {}