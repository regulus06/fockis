import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard(
  'jwt',
) {
  /**
   * Allows both authenticated and anonymous requests.
   *
   * If a valid JWT is present:
   *   req.user is populated normally.
   *
   * If no JWT is present or authentication fails:
   *   the request is still allowed through and
   *   req.user remains undefined.
   *
   * This is intended for public browsing endpoints
   * where authenticated users receive additional
   * access information.
   */
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest();

    try {
      const result =
        await super.canActivate(context);

      return result === true || !!result;
    } catch {
      /*
       * Authentication is optional for this route.
       *
       * Do not reject anonymous visitors.
       */
      request.user = undefined;

      return true;
    }
  }

  /**
   * Passport normally throws an UnauthorizedException
   * when authentication fails.
   *
   * For this guard, failed optional authentication
   * should simply result in no authenticated user.
   */
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    _info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser | undefined {
    if (err || !user) {
      return undefined;
    }

    return user;
  }
}