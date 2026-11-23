import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";

import {
  AdminNotification,
  AdminNotificationPreference,
  AdminNotificationPreferenceSchema,
  AdminNotificationSchema,
} from "./admin-notification.schema";
import { AdminNotificationsController } from "./admin-notifications.controller";
import { AdminNotificationsGateway } from "./admin-notifications.gateway";
import { AdminNotificationsService } from "./admin-notifications.service";
import { AdminRecipientsService } from "./admin-recipients.service";

/**
 * Admin notifications. Other modules do not import this module: they emit
 * ADMIN_NOTIFICATION_EVENT on the global event emitter.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminNotification.name, schema: AdminNotificationSchema },
      { name: AdminNotificationPreference.name, schema: AdminNotificationPreferenceSchema },
    ]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = String(config.get<string>("JWT_SECRET") ?? "").trim();

        if (secret.length < 32) {
          throw new Error(
            "SECURITY ERROR: JWT_SECRET is missing or too short. JWT_SECRET must be at least 32 characters.",
          );
        }

        return { secret };
      },
    }),
  ],
  controllers: [AdminNotificationsController],
  providers: [AdminNotificationsService, AdminRecipientsService, AdminNotificationsGateway],
  exports: [AdminNotificationsService, AdminRecipientsService, AdminNotificationsGateway],
})
export class AdminNotificationsModule {}
