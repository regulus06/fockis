import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type DomainCampaignDocument =
  HydratedDocument<DomainCampaign>;

@Schema({
  collection: "domain_campaigns",
  timestamps: true,
})
export class DomainCampaign {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    default: true,
  })
  enabled!: boolean;

  @Prop({
    required: true,
  })
  startsAt!: Date;

  @Prop({
    required: true,
  })
  endsAt!: Date;

  @Prop({
    required: true,
    min: 0,
  })
  freeDomainLimit!: number;

  @Prop({
    default: 0,
    min: 0,
  })
  freeDomainsUsed!: number;

  @Prop({
    default: true,
  })
  appliesToUsers!: boolean;

  @Prop({
    default: true,
  })
  appliesToOrganizations!: boolean;

  @Prop({
    type: [Types.ObjectId],
    ref: "User",
    default: [],
  })
  userIds!: Types.ObjectId[];

  @Prop({
    default: false,
  })
  deleted!: boolean;
}

export const DomainCampaignSchema =
  SchemaFactory.createForClass(DomainCampaign);

DomainCampaignSchema.index({
  enabled: 1,
  startsAt: 1,
  endsAt: 1,
});