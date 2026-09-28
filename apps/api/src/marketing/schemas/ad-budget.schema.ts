import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from "mongoose";

export type AdBudgetDocument =
  HydratedDocument<AdBudget>;

/* ============================================================
   BUDGET SCHEMA
============================================================ */

@Schema({
  timestamps: true,
  collection: "marketing_ad_budgets",
})
export class AdBudget {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Campaign",
    required: true,
    unique: true,
    index: true,
  })
  campaignId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  advertiserId!: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  dailyBudget!: number;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  totalBudget!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  spentToday!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  lifetimeSpent!: number;

  @Prop({
    type: Date,
    default: Date.now,
  })
  budgetDay!: Date;

  @Prop({
    type: Boolean,
    default: true,
  })
  canSpend!: boolean;
}

export const AdBudgetSchema =
  SchemaFactory.createForClass(
    AdBudget,
  );

AdBudgetSchema.index({
  advertiserId: 1,
  createdAt: -1,
});

AdBudgetSchema.index({
  campaignId: 1,
});

AdBudgetSchema.index({
  canSpend: 1,
});