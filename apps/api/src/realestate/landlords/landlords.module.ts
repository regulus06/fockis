import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Landlord,
  LandlordSchema,
} from './schemas/landlord.schema';

import { LandlordService } from './services/landlord.service';
import { LandlordController } from './controllers/landlord.controller';


@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Landlord.name,
        schema: LandlordSchema,
      },
    ]),
  ],

  controllers: [
    LandlordController,
  ],

  providers: [
    LandlordService,
  ],

  exports: [
    LandlordService,
  ],
})
export class LandlordsModule {}