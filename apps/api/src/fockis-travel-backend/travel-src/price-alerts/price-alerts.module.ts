import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  PriceAlert,
  PriceAlertSchema,
} from './price-alert.schema';

import {
  PriceAlertsController,
} from './price-alerts.controller';

import {
  PriceAlertsService,
} from './price-alerts.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PriceAlert.name,
        schema: PriceAlertSchema,
      },
    ]),
  ],

  controllers: [
    PriceAlertsController,
  ],

  providers: [
    PriceAlertsService,
  ],

  exports: [
    PriceAlertsService,
  ],
})
export class PriceAlertsModule {}