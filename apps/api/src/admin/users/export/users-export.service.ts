import { Injectable } from '@nestjs/common';
import { UserDirectoryService } from '../directory/users-list.service';

@Injectable()
export class UsersExportService {
  constructor(private readonly directory: UserDirectoryService) {}
  async csv(q:any){
    const result=await this.directory.list({...q,page:1,limit:100});
    const headers=['id','username','email','displayName','role','accountType','verified','isActive','online','premium','sellerApproved','fockisId','fockisIdAccessPaid','createdAt','lastActiveAt'];
    const esc=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;
    return [headers.join(','),...result.items.map((u:any)=>headers.map(h=>esc(u[h])).join(','))].join('\n');
  }
}
