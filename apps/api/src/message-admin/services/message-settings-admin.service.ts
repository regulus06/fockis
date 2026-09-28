import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  MessageSettings,
  MessageSettingsDocument,
} from '../schemas/message-settings.schema';

import { UpdateMessageSettingsDto } from '../dto/update-message-settings.dto';

@Injectable()
export class MessageSettingsAdminService {
  constructor(
    @InjectModel(MessageSettings.name)
    private readonly messageSettingsModel: Model<MessageSettingsDocument>,
  ) {}

  async getSettings(): Promise<MessageSettings> {
    let settings =
      await this.messageSettingsModel.findOne().lean();

    if (!settings) {
      const created =
        await this.messageSettingsModel.create({});

      settings = created.toObject();
    }

    return settings as MessageSettings;
  }

  async updateSettings(
    dto: UpdateMessageSettingsDto,
  ): Promise<MessageSettings> {
    const settings =
      await this.messageSettingsModel.findOneAndUpdate(
        {},
        {
          $set: dto,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

    if (!settings) {
      throw new NotFoundException(
        'Message settings could not be updated.',
      );
    }

    return settings.toObject();
  }

  async getPublicSettings() {
    return this.getSettings();
  }
}