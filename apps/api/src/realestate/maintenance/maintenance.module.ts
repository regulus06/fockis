import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Maintenance,
  MaintenanceSchema,
} from './schemas/maintenance.schema';

import {
  MaintenanceService,
} from './services/maintenance.service';

import {
  MaintenanceController,
} from './controllers/maintenance.controller';



@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Maintenance.name,
        schema: MaintenanceSchema,
      },
    ]),
  ],

  controllers: [
    MaintenanceController,
  ],

  providers: [
    MaintenanceService,
  ],

  exports: [
    MaintenanceService,
  ],
})
export class MaintenanceModule {}