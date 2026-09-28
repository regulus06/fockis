import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { MusicEntitlementService } from '../services/music-entitlement.service';

/**
 * Does NOT reject the request outright for paid content the user hasn't
 * purchased — it instead attaches `req.musicAccess` describing exactly what
 * the requester is allowed to receive (full / preview-only / denied), so the
 * controller can respond with a preview stream instead of a 403 where that
 * is the correct UX (e.g. GET /music/:id/access should always succeed and
 * describe access level; only the actual signed-media endpoint enforces a
 * hard denial for EXCLUSIVE content with no entitlement).
 *
 * Usage: @UseGuards(OptionalJwtAuthGuard, MusicEntitlementGuard)
 * (OptionalJwtAuthGuard = your existing guard variant that populates
 * req.user when a valid token is present but does not reject anonymous
 * requests — needed because previews must work for logged-out visitors.)
 */
@Injectable()
export class MusicEntitlementGuard implements CanActivate {
  constructor(private readonly entitlementService: MusicEntitlementService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const contentId = req.params.id;
    const userId = req.user?.id ?? null;

    const access = await this.entitlementService.resolveAccess(contentId, userId);
    if (!access) {
      throw new NotFoundException('Content not found.');
    }

    req.musicAccess = access;
    return true;
  }
}
