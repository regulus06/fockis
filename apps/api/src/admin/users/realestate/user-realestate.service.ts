import { Injectable } from '@nestjs/common';
import { UserDomainActivityService } from '../domain-activity.service';

@Injectable()
export class UserRealEstateService {
  constructor(private readonly domainActivity: UserDomainActivityService) {}
  list(userId: string, query: any = {}) { return this.domainActivity.list('realestate', userId, query); }
  summary(userId: string) { return this.domainActivity.summary(userId).then((x) => x['realestate']); }
}
