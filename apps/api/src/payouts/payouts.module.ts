import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  Store,
  StoreSchema,
} from "../stores/schemas/store.schema";
import {
  Order,
  OrderSchema,
} from "../fockis-shop/orders/schemas/order.schema";
import { PaymentsModule } from "../payments/payments.module";

import {
  PayoutsController,
  PayoutsWebhookController,
} from "./payouts.controller";
import { PayoutsService } from "./payouts.service";

// Admin-managed commission (Admin Center → Finance → Marketplace payouts → Commission).
import { MarketplaceCommissionController } from "./fockis-marketplace-commission/controllers/marketplace-commission.controller";
import {
  MarketplaceCommission,
  MarketplaceCommissionSchema,
} from "./fockis-marketplace-commission/schemas/marketplace-commission.schema";
import { MarketplaceCommissionService } from "./fockis-marketplace-commission/services/marketplace-commission.service";

// Payout plans, early payouts, holds and audit log.
import { AdminMarketplaceFinanceController } from "./marketplace-finance/controllers/admin-marketplace-finance.controller";
import { SellerFinanceController } from "./marketplace-finance/controllers/seller-finance.controller";
import {
  EarlyPayoutRequest,
  EarlyPayoutRequestSchema,
} from "./marketplace-finance/schemas/early-payout-request.schema";
import {
  FinanceAuditLog,
  FinanceAuditLogSchema,
} from "./marketplace-finance/schemas/finance-audit-log.schema";
import {
  PayoutHold,
  PayoutHoldSchema,
} from "./marketplace-finance/schemas/payout-hold.schema";
import {
  PayoutPlan,
  PayoutPlanAssignment,
  PayoutPlanAssignmentSchema,
  PayoutPlanSchema,
} from "./marketplace-finance/schemas/payout-plan.schema";
import { FinanceAuditService } from "./marketplace-finance/services/finance-audit.service";
import { PayoutHoldsService } from "./marketplace-finance/services/payout-holds.service";
import { PayoutPlansService } from "./marketplace-finance/services/payout-plans.service";
import { SellerFinanceService } from "./marketplace-finance/services/seller-finance.service";
// Organization payouts (gifts to organizations, Fockis fee, scheduled transfers).
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminOrgPayoutsController } from "./organization-payouts/admin-org-payouts.controller";
import { OrgPayoutsService } from "./organization-payouts/org-payouts.service";
import {
  OrgLedgerEntry,
  OrgLedgerEntrySchema,
  OrgPayout,
  OrgPayoutAccount,
  OrgPayoutAccountSchema,
  OrgPayoutConfig,
  OrgPayoutConfigSchema,
  OrgPayoutSchema,
} from "./organization-payouts/org-payout.schemas";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Store.name, schema: StoreSchema },
      { name: Order.name, schema: OrderSchema },
      { name: MarketplaceCommission.name, schema: MarketplaceCommissionSchema },
      { name: PayoutPlan.name, schema: PayoutPlanSchema },
      { name: PayoutPlanAssignment.name, schema: PayoutPlanAssignmentSchema },
      { name: PayoutHold.name, schema: PayoutHoldSchema },
      { name: EarlyPayoutRequest.name, schema: EarlyPayoutRequestSchema },
      { name: FinanceAuditLog.name, schema: FinanceAuditLogSchema },
      { name: OrgPayoutConfig.name, schema: OrgPayoutConfigSchema },
      { name: OrgPayoutAccount.name, schema: OrgPayoutAccountSchema },
      { name: OrgLedgerEntry.name, schema: OrgLedgerEntrySchema },
      { name: OrgPayout.name, schema: OrgPayoutSchema },
    ]),
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [
    PayoutsController,
    PayoutsWebhookController,
    SellerFinanceController,
    MarketplaceCommissionController,
    AdminMarketplaceFinanceController,
    AdminOrgPayoutsController,
  ],
  providers: [
    PayoutsService,
    MarketplaceCommissionService,
    FinanceAuditService,
    PayoutPlansService,
    PayoutHoldsService,
    SellerFinanceService,
    OrgPayoutsService,
  ],
  exports: [PayoutsService, MarketplaceCommissionService, OrgPayoutsService],
})
export class PayoutsModule {}
