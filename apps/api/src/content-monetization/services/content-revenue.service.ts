import {
  Injectable,
} from "@nestjs/common";

import {
  InjectModel,
} from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  ContentPurchase,
  ContentPurchaseDocument,
} from "../schemas/content-purchase.schema";

import {
  PurchaseStatus,
} from "../types/content-monetization.types";

@Injectable()
export class ContentRevenueService {
  constructor(
    @InjectModel(ContentPurchase.name)
    private readonly purchaseModel:
      Model<ContentPurchaseDocument>,
  ) {}

  async getCreatorRevenue(
    creatorId: string,
  ) {
    const result =
      await this.purchaseModel.aggregate([
        {
          $match: {
            creatorId:
              new Types.ObjectId(creatorId),
            status:
              PurchaseStatus.COMPLETED,
          },
        },
        {
          $group: {
            _id: "$creatorId",
            grossRevenue: {
              $sum: "$amount",
            },
            platformFees: {
              $sum: "$platformFee",
            },
            creatorRevenue: {
              $sum: "$creatorAmount",
            },
            totalPurchases: {
              $sum: 1,
            },
          },
        },
      ]);

    return (
      result[0] ?? {
        grossRevenue: 0,
        platformFees: 0,
        creatorRevenue: 0,
        totalPurchases: 0,
      }
    );
  }
}