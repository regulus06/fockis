import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { limitValue, pageValue } from '../user-admin-utils';

@Injectable()
export class UserPaymentsService {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async list(userId:string,q:any){
    const names=['Payment','Transaction','PaymentIntent','ShopPayment']; const limit=limitValue(q.limit); const skip=Number(q.skip ?? (pageValue(q.page)-1)*limit)||0;
    for(const name of names){const model=this.connection.models[name]; if(!model)continue; const filter:any={$or:[{userId},{customerId:userId},{payerId:userId},{buyerId:userId}]}; if(q.status)filter.status=q.status; const [docs,total]=await Promise.all([model.find(filter).sort({createdAt:-1}).skip(skip).limit(limit).lean().exec(),model.countDocuments(filter)]); const items=docs.map((x:any)=>({id:String(x._id),_id:String(x._id),userId:String(x.userId??userId),amount:Number(x.amount??x.total??x.amountReceived??0),currency:x.currency??'USD',status:x.status??'unknown',paymentMethod:x.paymentMethod??x.method,provider:x.provider??'stripe',providerPaymentId:x.providerPaymentId??x.stripePaymentIntentId,stripePaymentIntentId:x.stripePaymentIntentId,description:x.description,metadata:x.metadata??{},createdAt:x.createdAt,updatedAt:x.updatedAt})); return {items,payments:items,total,page:Math.floor(skip/limit)+1,limit,pages:Math.ceil(total/limit)};}
    return {items:[],payments:[],total:0,page:1,limit,pages:0};
  }
}
