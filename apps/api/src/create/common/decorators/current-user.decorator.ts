import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Extracts the authenticated user (from the validated JWT) off the request.
 * NEVER trust a userId/ownerId sent in the request body — always use this.
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ) => {
    const request = ctx.switchToHttp().getRequest();

    const user: AuthenticatedUser = request.user;

    return data
      ? user?.[data]
      : user;
  },
);