import {
  Injectable,
} from "@nestjs/common";

import {
  ContentAccessService,
} from "./content-access.service";

import {
  ContentPricingService,
} from "./content-pricing.service";

import {
  ContentPurchaseService,
} from "./content-purchase.service";

import {
  ContentRevenueService,
} from "./content-revenue.service";

@Injectable()
export class ContentMonetizationService {
  constructor(
    private readonly pricingService:
      ContentPricingService,

    private readonly accessService:
      ContentAccessService,

    private readonly purchaseService:
      ContentPurchaseService,

    private readonly revenueService:
      ContentRevenueService,
  ) {}

  get pricing() {
    return this.pricingService;
  }

  get access() {
    return this.accessService;
  }

  get purchases() {
    return this.purchaseService;
  }

  get revenue() {
    return this.revenueService;
  }
}