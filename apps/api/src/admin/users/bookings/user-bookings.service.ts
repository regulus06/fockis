import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { limitValue, pageValue } from '../user-admin-utils';

@Injectable()
export class UserBookingsService {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async list(userId:string,q:any){
    const names=['Booking','TravelBooking','Reservation']; const limit=limitValue(q.limit); const skip=Number(q.skip ?? (pageValue(q.page)-1)*limit)||0;
    for(const name of names){const model=this.connection.models[name]; if(!model)continue; const filter:any={$or:[{userId},{customerId:userId},{travelerId:userId},{guestId:userId}]}; if(q.status)filter.status=q.status; if(q.type)filter.type=q.type; const [items,total]=await Promise.all([model.find(filter).sort({createdAt:-1}).skip(skip).limit(limit).lean().exec(),model.countDocuments(filter)]); return {items:items.map((x:any)=>({...x,id:String(x._id),userId:String(x.userId??userId),bookingCode:String(x.bookingCode??x.code??x._id),listingId:String(x.listingId??x.propertyId??x.tripId??''),type:x.type??'booking',startAt:x.startAt??x.startDate??x.checkIn, endAt:x.endAt??x.endDate??x.checkOut,quantity:Number(x.quantity??1),guests:Number(x.guests??x.guestCount??1),currency:x.currency??'USD',subtotal:Number(x.subtotal??0),fees:Number(x.fees??x.serviceFee??0),tax:Number(x.tax??0),total:Number(x.total??x.amount??0),status:x.status??'pending',paymentStatus:x.paymentStatus??'unknown',notes:x.notes,createdAt:x.createdAt,updatedAt:x.updatedAt})),bookings:items,total,page:Math.floor(skip/limit)+1,limit,pages:Math.ceil(total/limit)};}
    return {items:[],bookings:[],total:0,page:1,limit,pages:0};
  }
}
