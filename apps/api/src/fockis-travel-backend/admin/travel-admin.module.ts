import { Module } from "@nestjs/common";

import { MongooseModule } from "@nestjs/mongoose";

import { TravelAdminController } from "./travel-admin.controller";

import { TravelAdminService } from "./travel-admin.service";

import {
Listing,
ListingSchema,
} from "../travel-src/listings/listing.schema";

import {
Partner,
PartnerSchema,
} from "../travel-src/partners/partner.schema";

import {
Booking,
BookingSchema,
} from "../travel-src/bookings/booking.schema";

import {
User,
UserSchema,
} from "../../users/user.schema";

@Module({
imports: [
MongooseModule.forFeature([
{
name: Listing.name,
schema: ListingSchema,
},
{
name: Partner.name,
schema: PartnerSchema,
},
{
name: Booking.name,
schema: BookingSchema,
},
{
name: User.name,
schema: UserSchema,
},
]),
],

controllers: [TravelAdminController],

providers: [TravelAdminService],

exports: [TravelAdminService],
})
export class TravelAdminModule {}
