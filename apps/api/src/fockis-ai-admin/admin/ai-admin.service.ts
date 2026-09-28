import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  AiPlan,
  AiPlanDocument,
} from "./schemas/ai-plan.schema";
import {
  AiUserAccess,
  AiUserAccessDocument,
} from "./schemas/ai-user-access.schema";
import {
  AiTool,
  AiToolDocument,
} from "./schemas/ai-tool.schema";
import {
  AiConversation,
  AiConversationDocument,
} from "./schemas/ai-conversation.schema";
import {
  AiRecommendation,
  AiRecommendationDocument,
} from "./schemas/ai-recommendation.schema";
import {
  AiSpecialAd,
  AiSpecialAdDocument,
} from "./schemas/ai-special-ad.schema";
import {
  AiUsage,
  AiUsageDocument,
} from "./schemas/ai-usage.schema";
import {
  AiSettings,
  AiSettingsDocument,
} from "./schemas/ai-settings.schema";

import { AiAccessService } from "../access/ai-access.service";
import { VapiService } from "../vapi/vapi.service";

@Injectable()
export class AiAdminService {
  constructor(
    @InjectModel(AiPlan.name)
    private readonly planModel: Model<AiPlanDocument>,
    @InjectModel(AiUserAccess.name)
    private readonly userAccessModel: Model<AiUserAccessDocument>,
    @InjectModel(AiTool.name)
    private readonly toolModel: Model<AiToolDocument>,
    @InjectModel(AiConversation.name)
    private readonly conversationModel: Model<AiConversationDocument>,
    @InjectModel(AiRecommendation.name)
    private readonly recommendationModel: Model<AiRecommendationDocument>,
    @InjectModel(AiSpecialAd.name)
    private readonly specialAdModel: Model<AiSpecialAdDocument>,
    @InjectModel(AiUsage.name)
    private readonly usageModel: Model<AiUsageDocument>,
    @InjectModel(AiSettings.name)
    private readonly settingsModel: Model<AiSettingsDocument>,
    private readonly accessService: AiAccessService,
    private readonly vapiService: VapiService,
  ) {}

  async getDashboard() {
    const [settings, plans, users, conversations, tools, recommendations, specialAds, usage] =
      await Promise.all([
        this.getSettings(),
        this.planModel.countDocuments(),
        this.userAccessModel.countDocuments(),
        this.conversationModel.countDocuments(),
        this.toolModel.countDocuments({ enabled: true }),
        this.recommendationModel.countDocuments(),
        this.specialAdModel.countDocuments({ enabled: true }),
        this.usageModel.aggregate([
          {
            $group: {
              _id: null,
              requests: { $sum: "$requests" },
              tokens: { $sum: "$tokens" },
              credits: { $sum: "$creditsUsed" },
              cost: { $sum: "$estimatedCost" },
            },
          },
        ]),
      ]);

    return {
      status: settings.enabled ? "operational" : "disabled",
      aiEnabled: settings.enabled,
      emergencyDisabled: settings.emergencyDisabled,
      counts: {
        plans,
        users,
        conversations,
        tools,
        recommendations,
        specialAds,
      },
      usage: usage[0] ?? {
        requests: 0,
        tokens: 0,
        credits: 0,
        cost: 0,
      },
      vapi: {
        configured: this.vapiService.isConfigured(),
      },
    };
  }

  getPlans() {
    return this.planModel.find().sort({ priority: 1, createdAt: 1 }).lean();
  }

  createPlan(body: any) {
    return this.planModel.create({
      name: body.name,
      description: body.description ?? "",
      membershipPlanId: body.membershipPlanId,
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
      features: {
        chat: body.features?.chat ?? false,
        voice: body.features?.voice ?? false,
        phoneCalls: body.features?.phoneCalls ?? false,
        recommendations: body.features?.recommendations ?? false,
        specialAds: body.features?.specialAds ?? false,
      },
      limits: body.limits ?? {},
    });
  }

  async updatePlan(id: string, body: any) {
    const updated = await this.planModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new NotFoundException("AI plan not found");
    }

    return updated;
  }

  async getUsers(params: {
    search?: string;
    page: number;
    limit: number;
  }) {
    const skip = (params.page - 1) * params.limit;

    const filter: Record<string, any> = {};
    if (params.search?.trim()) {
      const value = params.search.trim();
      filter.$or = [
        { email: { $regex: value, $options: "i" } },
        { name: { $regex: value, $options: "i" } },
        { username: { $regex: value, $options: "i" } },
      ];
    }

    // Uses the existing MongoDB "users" collection without requiring
    // a specific User schema/import from the existing application.
    const usersCollection = this.userAccessModel.db.collection("users");

    const [users, total] = await Promise.all([
      usersCollection
        .find(filter, {
          projection: {
            password: 0,
            passwordHash: 0,
            refreshToken: 0,
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .toArray(),
      usersCollection.countDocuments(filter),
    ]);

    const ids = users
      .map((user: any) => user._id)
      .filter(Boolean);

    const accesses = ids.length
      ? await this.userAccessModel.find({
          userId: { $in: ids },
        }).lean()
      : [];

    const accessMap = new Map(
      accesses.map((access: any) => [String(access.userId), access]),
    );

    return {
      data: users.map((user: any) => ({
        ...user,
        _id: String(user._id),
        aiAccess: accessMap.get(String(user._id)) ?? null,
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages: Math.ceil(total / params.limit),
      },
    };
  }

  async getUserAccess(userId: string) {
    const id = this.toObjectId(userId);

    let access = await this.userAccessModel.findOne({ userId: id }).lean();

    if (!access) {
      access = await this.userAccessModel.create({
        userId: id,
        mode: "INHERIT",
        features: {},
        reason: "",
      }).then((doc) => doc.toObject());
    }

    return access;
  }

  async updateUserAccess(userId: string, body: any) {
    const id = this.toObjectId(userId);

    const updated = await this.userAccessModel.findOneAndUpdate(
      { userId: id },
      {
        $set: {
          mode: body.mode ?? "INHERIT",
          features: body.features ?? {},
          expiresAt: body.expiresAt || null,
          reason: body.reason ?? "",
          updatedBy: body.updatedBy ? this.toObjectId(body.updatedBy) : undefined,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return updated;
  }

  async getConversations(params: {
    search?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const skip = (params.page - 1) * params.limit;
    const filter: Record<string, any> = {};

    if (params.status) {
      filter.status = params.status;
    }

    if (params.search?.trim()) {
      filter.$or = [
        { title: { $regex: params.search.trim(), $options: "i" } },
        { summary: { $regex: params.search.trim(), $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.conversationModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      this.conversationModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        pages: Math.ceil(total / params.limit),
      },
    };
  }

  async updateConversation(id: string, body: any) {
    const updated = await this.conversationModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new NotFoundException("AI conversation not found");
    }

    return updated;
  }

  getTools() {
    return this.toolModel.find().sort({ name: 1 }).lean();
  }

  createTool(body: any) {
    return this.toolModel.create({
      name: body.name,
      description: body.description ?? "",
      type: body.type ?? "function",
      enabled: body.enabled ?? true,
      requiresAccess: body.requiresAccess ?? true,
      schema: body.schema ?? {},
      vapiToolId: body.vapiToolId,
    });
  }

  async updateTool(id: string, body: any) {
    const updated = await this.toolModel.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true },
    );

    if (!updated) {
      throw new NotFoundException("AI tool not found");
    }

    return updated;
  }

  getRecommendations() {
    return this.recommendationModel
      .find()
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();
  }

  getSpecialAds() {
    return this.specialAdModel
      .find()
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();
  }

  async getUsage(from?: string, to?: string) {
    const match: Record<string, any> = {};

    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const [summary, byFeature, byDay] = await Promise.all([
      this.usageModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            requests: { $sum: "$requests" },
            tokens: { $sum: "$tokens" },
            credits: { $sum: "$creditsUsed" },
            estimatedCost: { $sum: "$estimatedCost" },
          },
        },
      ]),
      this.usageModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$feature",
            requests: { $sum: "$requests" },
            tokens: { $sum: "$tokens" },
            credits: { $sum: "$creditsUsed" },
            estimatedCost: { $sum: "$estimatedCost" },
          },
        },
        { $sort: { requests: -1 } },
      ]),
      this.usageModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            requests: { $sum: "$requests" },
            tokens: { $sum: "$tokens" },
            credits: { $sum: "$creditsUsed" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      summary: summary[0] ?? {
        requests: 0,
        tokens: 0,
        credits: 0,
        estimatedCost: 0,
      },
      byFeature,
      byDay,
    };
  }

  async getSettings() {
    let settings = await this.settingsModel.findOne().lean();

    if (!settings) {
      const created = await this.settingsModel.create({
        enabled: true,
        emergencyDisabled: false,
        allowChat: true,
        allowVoice: true,
        allowPhoneCalls: true,
        allowRecommendations: true,
        allowSpecialAds: true,
        defaultDailyCredits: 100,
        defaultMonthlyCredits: 3000,
        vapiAssistantId: process.env.VAPI_ASSISTANT_ID ?? "",
        vapiPhoneNumberId: process.env.VAPI_PHONE_NUMBER_ID ?? "",
      });

      settings = created.toObject();
    }

    return settings;
  }

  async updateSettings(body: any) {
    const settings = await this.settingsModel.findOneAndUpdate(
      {},
      {
        $set: body,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return settings;
  }

  async emergencyDisable(body: any) {
    const disabled = Boolean(body.disabled);

    const settings = await this.settingsModel.findOneAndUpdate(
      {},
      {
        $set: {
          emergencyDisabled: disabled,
          enabled: !disabled,
          emergencyReason: body.reason ?? "",
          emergencyDisabledAt: disabled ? new Date() : null,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return {
      success: true,
      disabled,
      settings,
    };
  }

  private toObjectId(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new Error("Invalid MongoDB ObjectId");
    }

    return new Types.ObjectId(value);
  }
}
