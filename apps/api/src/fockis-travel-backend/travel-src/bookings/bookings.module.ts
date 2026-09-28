import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
Booking,
BookingSchema,
} from "./booking.schema";

import {
Listing,
ListingSchema,
} from "../listings/listing.schema";

import { BookingsController } from "./bookings.controller";
import { PartnerBookingsController } from "./partner-bookings.controller";
import { BookingsService } from "./bookings.service";

@Module({
imports: [
MongooseModule.forFeature([
{
name: Booking.name,
schema: BookingSchema,
},
{
name: Listing.name,
schema: ListingSchema,
},
]),
],
controllers: [
BookingsController,
PartnerBookingsController,
],
providers: [
BookingsService,
],
exports: [
BookingsService,
],
})
export class BookingsModule {}