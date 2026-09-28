import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';

import { FockisIdAdminService } from '../services/fockis-id-admin.service';

import { UpdateFockisIdPricingDto } from '../dto/update-fockis-id-pricing.dto';
import { UpdateFockisIdSettingsDto } from '../dto/update-fockis-id-settings.dto';

@Controller('admin/messages/fockis-id')
export class FockisIdAdminController {
  constructor(
    private readonly fockisIdAdminService: FockisIdAdminService,
  ) {}

  @Get()
  async getSettings() {
    return this.fockisIdAdminService.getSettings();
  }

  @Get('pricing')
  async getPricing() {
    return this.fockisIdAdminService.getPublicPricing();
  }

  @Patch('pricing')
  async updatePricing(
    @Body() dto: UpdateFockisIdPricingDto,
  ) {
    return this.fockisIdAdminService.updatePricing(
      dto,
    );
  }

  @Patch('settings')
  async updateSettings(
    @Body() dto: UpdateFockisIdSettingsDto,
  ) {
    return this.fockisIdAdminService.updateSettings(
      dto,
    );
  }
}