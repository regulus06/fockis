import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Requires a valid session; throws 401 if missing/invalid. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Attaches `req.user` when a valid session is present, but never throws —
 * for routes that behave differently for signed-in vs anonymous visitors
 * (e.g. public playlist detail, which shows `isFavoritedByCurrentUser`
 * when signed in but is still viewable when signed out).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    // Never throw — just pass through `undefined` if there's no valid user.
    return (user ?? undefined) as TUser;
  }
}