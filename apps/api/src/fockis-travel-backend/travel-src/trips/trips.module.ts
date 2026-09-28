import {
  Module,
} from '@nestjs/common';

import {
  MongooseModule,
} from '@nestjs/mongoose';

import {
  Trip,
  TripSchema,
} from './trip.schema';

import {
  TripsController,
} from './trips.controller';

import {
  TripsService,
} from './trips.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Trip.name,
        schema: TripSchema,
      },
    ]),
  ],

  controllers: [
    TripsController,
  ],

  providers: [
    TripsService,
  ],

  exports: [
    TripsService,
  ],
})
export class TripsModule {}