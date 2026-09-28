import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Booking,
  BookingSchema,
} from '../bookings/booking.schema';

import {
  Trip,
  TripSchema,
} from '../trips/trip.schema';

import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Booking.name,
        schema: BookingSchema,
      },
      {
        name: Trip.name,
        schema: TripSchema,
      },
    ]),
  ],

  controllers: [
    BusinessController,
  ],

  providers: [
    BusinessService,
  ],

  exports: [
    BusinessService,
  ],
})
export class BusinessModule {}