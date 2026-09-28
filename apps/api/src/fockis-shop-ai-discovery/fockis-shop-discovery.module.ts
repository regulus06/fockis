import { Module } from "@nestjs/common";

import { FockisShopDiscoveryController } from "./fockis-shop-discovery.controller";
import { FockisShopDiscoveryService } from "./fockis-shop-discovery.service";
import { VapiWebhookGuard } from "./vapi-webhook.guard";

@Module({
  controllers: [
    FockisShopDiscoveryController,
  ],
  providers: [
    FockisShopDiscoveryService,
    VapiWebhookGuard,
  ],
  exports: [
    FockisShopDiscoveryService,
  ],
})
export class FockisShopDiscoveryModule {}