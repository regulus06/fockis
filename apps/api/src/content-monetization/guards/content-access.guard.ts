import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import {
  ContentAccessService,
} from "../services/content-access.service";

@Injectable()
export class ContentAccessGuard
  implements CanActivate
{
  constructor(
    private readonly accessService:
      ContentAccessService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest();

    const userId = String(
      request.user?.userId ??
        request.user?.id,
    );

    const contentId =
      request.params?.contentId;

    const access =
      await this.accessService.getAccess(
        userId,
        contentId,
      );

    if (!access.canStream) {
      throw new ForbiddenException({
        code: "CONTENT_PAYMENT_REQUIRED",
        contentId,
        streamPrice:
          access.streamPrice,
        currency:
          access.currency,
      });
    }

    request.contentAccess = access;

    return true;
  }
}