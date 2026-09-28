import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type DomainPolicyDocument =
  HydratedDocument<DomainPolicy>;

@Schema({
  collection: "domain_policies",
  timestamps: true,
})
export class DomainPolicy {
  @Prop({
    default: true,
    index: true,
  })
  domainsEnabled!: boolean;

  @Prop({
    default: true,
  })
  freeDomainsEnabled!: boolean;

  @Prop({
    default: 1,
    min: 0,
  })
  freeDomainsPerUser!: number;

  @Prop({
    default: true,
  })
  paidDomainsEnabled!: boolean;

  @Prop({
    default: 9.99,
    min: 0,
  })
  paidDomainPrice!: number;

  @Prop({
    default: "USD",
  })
  currency!: string;

  @Prop({
    default: true,
  })
  allowManualAssignment!: boolean;

  @Prop({
    default: true,
  })
  allowUserDomainChanges!: boolean;

  @Prop({
    default: 9.99,
    min: 0,
  })
  domainChangePrice!: number;
}

export const DomainPolicySchema =
  SchemaFactory.createForClass(DomainPolicy);