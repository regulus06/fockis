import { Injectable } from '@nestjs/common';
import { UserDomainActivityService } from '../domain-activity.service';

@Injectable()
export class UserFinanceService {
  constructor(private readonly domainActivity: UserDomainActivityService) {}
  list(userId: string, query: any = {}) { return this.domainActivity.list('finance', userId, query); }
  summary(userId: string) { return this.domainActivity.summary(userId).then((x) => x['finance']); }
}
