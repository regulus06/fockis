import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';

import { MessageSettingsAdminService } from '../services/message-settings-admin.service';

import { UpdateMessageSettingsDto } from '../dto/update-message-settings.dto';

@Controller('admin/messages/settings')
export class MessageSettingsAdminController {
  constructor(
    private readonly messageSettingsAdminService: MessageSettingsAdminService,
  ) {}

  @Get()
  async getSettings() {
    return this.messageSettingsAdminService.getSettings();
  }

  @Patch()
  async updateSettings(
    @Body() dto: UpdateMessageSettingsDto,
  ) {
    return this.messageSettingsAdminService.updateSettings(
      dto,
    );
  }
}