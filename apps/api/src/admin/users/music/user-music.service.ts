import { Injectable } from "@nestjs/common";

import { UserDomainActivityService } from "../domain-activity.service";

@Injectable()
export class UserMusicService {
  constructor(
    private readonly domainActivity: UserDomainActivityService,
  ) {}

  list(
    userId: string,
    query: any = {},
    actor: any,
  ) {
    return this.domainActivity.list(
      "music",
      userId,
      query,
      actor,
    );
  }

  summary(
    userId: string,
    actor: any,
  ) {
    return this.domainActivity
      .summary(
        userId,
        actor,
      )
      .then(
        (result) => result["music"],
      );
  }
}