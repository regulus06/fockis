import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  MessageSettings,
  MessageSettingsSchema,
} from './schemas/message-settings.schema';

import {
  FockisIdSettings,
  FockisIdSettingsSchema,
} from './schemas/fockis-id-settings.schema';

import {
  MessageReport,
  MessageReportSchema,
} from './schemas/message-report.schema';

import { MessageAdminController } from './controllers/message-admin.controller';
import { FockisIdAdminController } from './controllers/fockis-id-admin.controller';
import { MessageSettingsAdminController } from './controllers/message-settings-admin.controller';

import { MessageAdminService } from './services/message-admin.service';
import { FockisIdAdminService } from './services/fockis-id-admin.service';
import { MessageSettingsAdminService } from './services/message-settings-admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MessageSettings.name,
        schema: MessageSettingsSchema,
      },
      {
        name: FockisIdSettings.name,
        schema: FockisIdSettingsSchema,
      },
      {
        name: MessageReport.name,
        schema: MessageReportSchema,
      },
    ]),
  ],

  controllers: [
    MessageAdminController,
    FockisIdAdminController,
    MessageSettingsAdminController,
  ],

  providers: [
    MessageAdminService,
    FockisIdAdminService,
    MessageSettingsAdminService,
  ],

  exports: [
    MessageAdminService,
    FockisIdAdminService,
    MessageSettingsAdminService,
  ],
})
export class MessageAdminModule {}