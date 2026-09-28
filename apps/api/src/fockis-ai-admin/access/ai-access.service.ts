import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  AiPlan,
  AiPlanDocument,
} from "../admin/schemas/ai-plan.schema";
import {
  AiUserAccess,
  AiUserAccessDocument,
} from "../admin/schemas/ai-user-access.schema";
import {
  AiSettings,
  AiSettingsDocument,
} from "../admin/schemas/ai-settings.schema";

export type AiFeature =
  | "chat"
  | "voice"
  | "phoneCalls"
  | "recommendations"
  | "specialAds";

@Injectable()
export class AiAccessService {
  constructor(
    @InjectModel(AiPlan.name)
    private readonly planModel: Model<AiPlanDocument>,
    @InjectModel(AiUserAccess.name)
    private readonly userAccessModel: Model<AiUserAccessDocument>,
    @InjectModel(AiSettings.name)
    private readonly settingsModel: Model<AiSettingsDocument>,
  ) {}

  async canUse(userId: string, feature: AiFeature) {
    const settings = await this.settingsModel.findOne().lean();

    if (!settings?.enabled || settings.emergencyDisabled) {
      return {
        allowed: false,
        reason: "AI is currently disabled.",
      };
    }

    const id = new Types.ObjectId(userId);
    const override = await this.userAccessModel
      .findOne({ userId: id })
      .lean();

    if (override?.expiresAt && new Date(override.expiresAt) <= new Date()) {
      return {
        allowed: false,
        reason: "AI access override has expired.",
      };
    }

    if (override?.mode === "BLOCKED") {
      return {
        allowed: false,
        reason: "AI access is blocked for this user.",
      };
    }

    if (override?.mode === "GRANTED" || override?.mode === "CUSTOM") {
      const allowed = Boolean(override.features?.[feature]);
      return {
        allowed,
        reason: allowed
          ? "Allowed by user AI access override."
          : "Feature is not enabled by user AI access override.",
      };
    }

    const globalKey = `allow${feature.charAt(0).toUpperCase()}${feature.slice(1)}` as keyof typeof settings;

    if (settings[globalKey] === false) {
      return {
        allowed: false,
        reason: "This AI feature is globally disabled.",
      };
    }

    // Subscription-to-plan resolution is intentionally isolated here.
    // The existing subscription system can call resolvePlanForUser()
    // without coupling this module to a specific User schema.
    return {
      allowed: true,
      reason: "Allowed by global AI configuration.",
    };
  }

  async resolvePlanForUser(membershipPlanId?: string) {
    if (!membershipPlanId) return null;

    return this.planModel.findOne({
      membershipPlanId,
      enabled: true,
    }).lean();
  }
}
