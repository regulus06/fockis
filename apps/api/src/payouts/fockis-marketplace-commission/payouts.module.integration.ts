/**
 * Merge these imports/providers/controllers into your existing PayoutsModule.
 * Do not replace your existing PayoutsController or PayoutsWebhookController.
 */
import {
  MarketplaceCommission,
  MarketplaceCommissionSchema,
} from "./schemas/marketplace-commission.schema";
import { MarketplaceCommissionService } from "./services/marketplace-commission.service";
import { MarketplaceCommissionController } from "./controllers/marketplace-commission.controller";

// Add to MongooseModule.forFeature([...]):
// { name: MarketplaceCommission.name, schema: MarketplaceCommissionSchema }

// Add to controllers:
// MarketplaceCommissionController

// Add to providers:
// MarketplaceCommissionService

// Add to exports if other modules need commission quotes:
// MarketplaceCommissionService
