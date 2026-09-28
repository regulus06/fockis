import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
  isValidObjectId,
} from "mongoose";

import {
  MusicSettings,
  MusicSettingsDocument,
} from "../schemas/music-settings.schema";

@Injectable()
export class MusicSettingsService {
  private readonly GLOBAL_KEY = "global";

  constructor(
    @InjectModel(MusicSettings.name)
    private readonly settingsModel: Model<MusicSettingsDocument>,
  ) {}

  /* ==========================================================
     GET AUTO APPROVAL
  ========================================================== */

  async getCreatorAutoApproval() {
    const settings =
      await this.settingsModel.findOneAndUpdate(
        {
          key: this.GLOBAL_KEY,
        },
        {
          $setOnInsert: {
            key: this.GLOBAL_KEY,
            creatorAutoApproval: false,
            updatedBy: null,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

    return {
      enabled: Boolean(
        settings?.creatorAutoApproval,
      ),
      updatedAt:
        settings?.updatedAt || null,
      updatedBy: settings?.updatedBy
        ? String(settings.updatedBy)
        : null,
    };
  }

  /* ==========================================================
     GET BOOLEAN ONLY
  ========================================================== */

  async getCreatorAutoApprovalEnabled(): Promise<boolean> {
    const settings =
      await this.settingsModel.findOne({
        key: this.GLOBAL_KEY,
      });

    if (!settings) {
      const created =
        await this.settingsModel.create({
          key: this.GLOBAL_KEY,
          creatorAutoApproval: false,
          updatedBy: null,
        });

      return Boolean(
        created.creatorAutoApproval,
      );
    }

    return Boolean(
      settings.creatorAutoApproval,
    );
  }

  /* ==========================================================
     UPDATE AUTO APPROVAL
  ========================================================== */

  async setCreatorAutoApproval(
    enabled: boolean,
    adminUserId: string,
  ) {
    if (typeof enabled !== "boolean") {
      throw new BadRequestException(
        "The enabled value must be true or false.",
      );
    }

    if (
      !adminUserId ||
      !isValidObjectId(adminUserId)
    ) {
      throw new BadRequestException(
        "Invalid administrator user ID.",
      );
    }

    const updated =
      await this.settingsModel.findOneAndUpdate(
        {
          key: this.GLOBAL_KEY,
        },
        {
          $set: {
            creatorAutoApproval: enabled,
            updatedBy: new Types.ObjectId(
              adminUserId,
            ),
          },
          $setOnInsert: {
            key: this.GLOBAL_KEY,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      );

    return {
      enabled: Boolean(
        updated?.creatorAutoApproval,
      ),
      updatedAt:
        updated?.updatedAt || null,
      updatedBy: updated?.updatedBy
        ? String(updated.updatedBy)
        : null,
    };
  }
}