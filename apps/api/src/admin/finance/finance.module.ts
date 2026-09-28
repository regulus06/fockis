import { Module } from "@nestjs/common";

import { FinanceAdminController } from "./finance.controller";
import { FinanceAdminService } from "./finance.service";

@Module({
  controllers: [FinanceAdminController],
  providers: [FinanceAdminService],
  exports: [FinanceAdminService],
})
export class FinanceAdminModule {}