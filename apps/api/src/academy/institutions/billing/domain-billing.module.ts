import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AcademyInstitution, AcademyInstitutionSchema } from "../schemas/institution.schema";
import { DomainBillingService } from "./domain-billing.service";
// The shared Fockis domain price list (also used by Organization Identity).
import { DomainPricingModule } from "../../../organization-identity/billing/domain-pricing.module";
// Existing Fockis payment records — read-only (verify domain payments).
import { Payment, PaymentSchema } from "../../../payments/schemas/payment.schema";

/**
 * Fockis domain fees. Has no Academy module dependencies so Courses, Studio,
 * Institutions and the Admin Center can all use it without import cycles.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AcademyInstitution.name, schema: AcademyInstitutionSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    DomainPricingModule,
  ],
  providers: [DomainBillingService],
  exports: [DomainBillingService],
})
export class DomainBillingModule {}
