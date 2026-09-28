import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MarketplaceSettings } from '../schemas/marketplace-settings.schema';

@Injectable()
export class MarketplaceSettingsService {
  constructor(
    @InjectModel(MarketplaceSettings.name)
    private settingsModel: Model<MarketplaceSettings>,
  ) {}

  async getSettings() {
    let settings = await this.settingsModel.findOne();

    if (!settings) {
      settings = await this.settingsModel.create({});
    }

    return settings;
  }
}