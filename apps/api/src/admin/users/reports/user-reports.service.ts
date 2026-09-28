import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { limitValue, pageValue } from '../user-admin-utils';

@Injectable()
export class UserReportsService {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  async list(userId:string,q:any){
    const names=['Report','UserReport','ModerationReport']; const limit=limitValue(q.limit); const skip=Number(q.skip ?? (pageValue(q.page)-1)*limit)||0;
    for(const name of names){const model=this.connection.models[name]; if(!model)continue; const filter:any={$or:[{reportedUserId:userId},{userId},{targetUserId:userId}]}; if(q.status)filter.status=q.status; if(q.type)filter.type=q.type; const [docs,total]=await Promise.all([model.find(filter).sort({createdAt:-1}).skip(skip).limit(limit).lean().exec(),model.countDocuments(filter)]); const items=docs.map((x:any)=>({...x,id:String(x._id),_id:String(x._id),reportedUserId:String(x.reportedUserId??userId),type:x.type??'other',reason:x.reason??'',description:x.description,status:x.status??'open',priority:x.priority??'medium',createdAt:x.createdAt,updatedAt:x.updatedAt})); return {items,reports:items,total,page:Math.floor(skip/limit)+1,limit,pages:Math.ceil(total/limit)};}
    return {items:[],reports:[],total:0,page:1,limit,pages:0};
  }
}
