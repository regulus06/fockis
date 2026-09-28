import {
Prop,
Schema,
SchemaFactory,
} from "@nestjs/mongoose";

import {
HydratedDocument,
} from "mongoose";

import {
SubscriptionPlan,
} from "./subscription.schema";

/* ============================================================
DOCUMENT
============================================================ */

export type SubscriptionPlanDocument =
HydratedDocument<SubscriptionPlanConfig>;

/* ============================================================
SUBSCRIPTION PLAN CONFIGURATION

This collection controls the pricing and presentation
of Fockis subscription plans.

Customers never control these values.
Only authorized administrators can modify them.
============================================================ */

@Schema({
timestamps: true,
collection: "subscription_plan_configs",
})
export class SubscriptionPlanConfig {
/* ============================================================
PLAN
============================================================ */

@Prop({
required: true,
enum: SubscriptionPlan,
unique: true,
index: true,
})
plan!: SubscriptionPlan;

/* ============================================================
DISPLAY NAME
============================================================ */

@Prop({
required: true,
trim: true,
})
name!: string;

/* ============================================================
DESCRIPTION
============================================================ */

@Prop({
required: true,
trim: true,
})
description!: string;

/* ============================================================
MONTHLY PRICE
============================================================ */

@Prop({
type: Number,
required: true,
min: 0,
default: 0,
})
monthlyPrice!: number;

/* ============================================================
YEARLY PRICE
============================================================ */

@Prop({
type: Number,
required: true,
min: 0,
default: 0,
})
yearlyPrice!: number;

/* ============================================================
CURRENCY
============================================================ */

@Prop({
type: String,
required: true,
uppercase: true,
trim: true,
default: "USD",
})
currency!: string;

/* ============================================================
FEATURES
============================================================ */

@Prop({
type: [String],
default: [],
})
features!: string[];

/* ============================================================
ACTIVE
============================================================ */

@Prop({
type: Boolean,
default: true,
index: true,
})
active!: boolean;

/* ============================================================
MOST POPULAR
============================================================ */

@Prop({
type: Boolean,
default: false,
})
popular!: boolean;

/* ============================================================
DISPLAY ORDER
============================================================ */

@Prop({
type: Number,
default: 0,
index: true,
})
displayOrder!: number;

/* ============================================================
STRIPE MONTHLY PRICE
============================================================ */

@Prop({
type: String,
required: false,
trim: true,
})
stripeMonthlyPriceId?: string;

/* ============================================================
STRIPE YEARLY PRICE
============================================================ */

@Prop({
type: String,
required: false,
trim: true,
})
stripeYearlyPriceId?: string;

/* ============================================================
LAST PRICE CHANGE
============================================================ */

@Prop({
type: Date,
required: false,
})
priceUpdatedAt?: Date;
}

/* ============================================================
SCHEMA
============================================================ */

export const SubscriptionPlanConfigSchema =
SchemaFactory.createForClass(
SubscriptionPlanConfig,
);

/* ============================================================
INDEXES
============================================================ */

SubscriptionPlanConfigSchema.index({
active: 1,
displayOrder: 1,
});

SubscriptionPlanConfigSchema.index({
plan: 1,
active: 1,
});
