import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Lease,
  LeaseSchema,
} from './schemas/lease.schema';

import { LeaseService } from './services/lease.service';
import { LeaseController } from './controllers/lease.controller';



@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Lease.name,
        schema: LeaseSchema,
      },
    ]),
  ],

  controllers: [
    LeaseController,
  ],

  providers: [
    LeaseService,
  ],

  exports: [
    LeaseService,
  ],
})
export class LeasesModule {}