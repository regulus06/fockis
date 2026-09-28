import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";


import {
Coupon,
CouponSchema
} from "./schemas/coupon.schema";


@Module({

imports:[
MongooseModule.forFeature([
{
name:Coupon.name,
schema:CouponSchema
}
])
],


controllers:[],


providers:[],


exports:[
MongooseModule
]

})


export class CouponsModule {}