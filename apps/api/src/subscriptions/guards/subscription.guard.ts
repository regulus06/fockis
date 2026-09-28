import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";

import {
  SubscriptionPlan,
} from "../schemas/subscription.schema";

import {
  REQUIRED_SUBSCRIPTION_PLAN,
} from "../decorators/require-plan.decorator";

import {
  SubscriptionsService,
} from "../services/subscription.service";

/* ============================================================
   FOCKIS ACCOUNT SUBSCRIPTION GUARD

   ACCOUNT LEVELS

   BASIC   = FREE
   BRONZE  = PAID
   SILVER  = PAID
   GOLDEN  = PAID
   DIAMOND = PAID

   The guard checks whether the authenticated user has
   the required account level.
============================================================ */

@Injectable()
export class SubscriptionGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,

    private readonly subscriptionsService:
      SubscriptionsService,
  ) {}

  /* ============================================================
     CAN ACTIVATE
  ============================================================ */

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {

    const requiredPlan =
      this.reflector.getAllAndOverride<SubscriptionPlan>(
        REQUIRED_SUBSCRIPTION_PLAN,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    /* ----------------------------------------------------------
       No account-level requirement.
    ---------------------------------------------------------- */

    if (!requiredPlan) {
      return true;
    }

    /* ----------------------------------------------------------
       Get request.
    ---------------------------------------------------------- */

    const request =
      context.switchToHttp().getRequest();

    /* ----------------------------------------------------------
       Get authenticated user.
    ---------------------------------------------------------- */

    const user =
      request.user;

    if (!user) {
      throw new UnauthorizedException(
        "Authentication required.",
      );
    }

    /* ----------------------------------------------------------
       Get authenticated user ID.

       Supports the different JWT payload formats
       currently used by the application.
    ---------------------------------------------------------- */

    const userId =
      user.id ??
      user._id ??
      user.userId ??
      user.sub;

    if (!userId) {
      throw new UnauthorizedException(
        "Authenticated user ID not found.",
      );
    }

    /* ----------------------------------------------------------
       Check account level.

       BASIC   -> rank 1
       BRONZE  -> rank 2
       SILVER  -> rank 3
       GOLDEN  -> rank 4
       DIAMOND -> rank 5
    ---------------------------------------------------------- */

    const hasAccess =
      await this.subscriptionsService.hasPlan(
        userId.toString(),
        requiredPlan,
      );

    /* ----------------------------------------------------------
       Account does not have the required level.
    ---------------------------------------------------------- */

    if (!hasAccess) {
      throw new ForbiddenException({
        code:
          "SUBSCRIPTION_UPGRADE_REQUIRED",

        message:
          `This service requires the ${requiredPlan} account level.`,

        requiredPlan,
      });
    }

    return true;
  }
}