import { Module } from "@nestjs/common";
import { MarketingAdminController } from "./marketing-admin.controller";
import { MarketingAdminService } from "./marketing-admin.service";

@Module({
  controllers: [MarketingAdminController],
  providers: [MarketingAdminService],
  exports: [MarketingAdminService],
})
export class MarketingAdminModule {}
