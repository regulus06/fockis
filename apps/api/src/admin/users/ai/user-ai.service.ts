import { Injectable } from '@nestjs/common';
import { UserDomainActivityService } from '../domain-activity.service';

@Injectable()
export class UserAiService {
  constructor(private readonly domainActivity: UserDomainActivityService) {}
  list(userId: string, query: any = {}) { return this.domainActivity.list('ai', userId, query); }
  summary(userId: string) { return this.domainActivity.summary(userId).then((x) => x['ai']); }
}
