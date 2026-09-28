import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  AdBudget,
  AdBudgetDocument,
} from "../schemas/ad-budget.schema";

import {
  Campaign,
  CampaignDocument,
} from "../schemas/campaign.schema";

import {
  UpdateBudgetDto,
} from "../dto/budget.dto";

@Injectable()
export class BudgetService {
  constructor(
    @InjectModel(
      AdBudget.name,
    )
    private readonly budgetModel:
      Model<AdBudgetDocument>,

    @InjectModel(
      Campaign.name,
    )
    private readonly campaignModel:
      Model<CampaignDocument>,
  ) {}

  /* ============================================================
     GET
  ============================================================ */

  async getBudget(
    advertiserId: string,
    campaignId: string,
  ) {
    const campaign =
      await this.getCampaign(
        advertiserId,
        campaignId,
      );

    let budget =
      await this.budgetModel
        .findOne({
          campaignId:
            campaign._id,
        })
        .exec();

    if (!budget) {
      budget =
        await this.budgetModel.create({
          campaignId:
            campaign._id,

          advertiserId:
            campaign.advertiserId,

          dailyBudget:
            campaign.dailyBudget,

          totalBudget:
            campaign.totalBudget,

          spentToday: 0,
          lifetimeSpent: 0,
          canSpend: true,
        });
    }

    return budget;
  }

  /* ============================================================
     UPDATE
  ============================================================ */

  async updateBudget(
    advertiserId: string,
    campaignId: string,
    dto: UpdateBudgetDto,
  ) {
    const campaign =
      await this.getCampaign(
        advertiserId,
        campaignId,
      );

    if (
      dto.totalBudget <
      dto.dailyBudget
    ) {
      throw new BadRequestException(
        "Total budget cannot be less than daily budget.",
      );
    }

    campaign.dailyBudget =
      dto.dailyBudget;

    campaign.totalBudget =
      dto.totalBudget;

    await campaign.save();

    return this.budgetModel
      .findOneAndUpdate(
        {
          campaignId:
            campaign._id,
        },
        {
          $set: {
            dailyBudget:
              dto.dailyBudget,

            totalBudget:
              dto.totalBudget,

            canSpend: true,
          },
        },
        {
          new: true,
          upsert: true,
        },
      )
      .exec();
  }

  /* ============================================================
     CHECK SPENDING
  ============================================================ */

  async canSpend(
    campaignId: string,
    amount: number,
  ): Promise<boolean> {
    if (amount <= 0) {
      return false;
    }

    const budget =
      await this.budgetModel
        .findOne({
          campaignId:
            new Types.ObjectId(
              campaignId,
            ),
        })
        .lean()
        .exec();

    if (!budget) {
      return true;
    }

    if (!budget.canSpend) {
      return false;
    }

    if (
      budget.spentToday + amount >
      budget.dailyBudget
    ) {
      return false;
    }

    if (
      budget.lifetimeSpent + amount >
      budget.totalBudget
    ) {
      return false;
    }

    return true;
  }

  /* ============================================================
     RECORD SPEND
  ============================================================ */

  async recordSpend(
    campaignId: string,
    amount: number,
  ) {
    if (amount <= 0) {
      return;
    }

    const budget =
      await this.budgetModel
        .findOne({
          campaignId:
            new Types.ObjectId(
              campaignId,
            ),
        })
        .exec();

    if (!budget) {
      return;
    }

    budget.spentToday += amount;
    budget.lifetimeSpent += amount;

    if (
      budget.lifetimeSpent >=
      budget.totalBudget
    ) {
      budget.canSpend = false;
    }

    if (
      budget.spentToday >=
      budget.dailyBudget
    ) {
      budget.canSpend = false;
    }

    await budget.save();
  }

  /* ============================================================
     RESET DAILY BUDGET
  ============================================================ */

  async resetDailyBudgets() {
    const now =
      new Date();

    await this.budgetModel.updateMany(
      {
        budgetDay: {
          $lt: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          ),
        },
        lifetimeSpent: {
          $lt: 999999999,
        },
      },
      {
        $set: {
          spentToday: 0,
          budgetDay: now,
          canSpend: true,
        },
      },
    );
  }

  /* ============================================================
     CAMPAIGN
  ============================================================ */

  private async getCampaign(
    advertiserId: string,
    campaignId: string,
  ): Promise<CampaignDocument> {
    if (
      !Types.ObjectId.isValid(
        advertiserId,
      ) ||
      !Types.ObjectId.isValid(
        campaignId,
      )
    ) {
      throw new BadRequestException(
        "Invalid campaign or advertiser ID.",
      );
    }

    const campaign =
      await this.campaignModel
        .findById(campaignId)
        .exec();

    if (!campaign) {
      throw new NotFoundException(
        "Campaign not found.",
      );
    }

    if (
      campaign.advertiserId.toString() !==
      advertiserId
    ) {
      throw new BadRequestException(
        "Campaign does not belong to this advertiser.",
      );
    }

    return campaign;
  }
}