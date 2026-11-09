import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { FockisDomainPricing, FockisDomainPricingSchema } from "./fockis-domain-pricing.schema";
import { DomainPricingService } from "./domain-pricing.service";

/**
 * The shared Fockis domain price list. No other dependencies, so Organization
 * Identity, Fockis Academy and the Admin Center can all import it.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: FockisDomainPricing.name, schema: FockisDomainPricingSchema }])],
  providers: [DomainPricingService],
  exports: [DomainPricingService],
})
export class DomainPricingModule {}
