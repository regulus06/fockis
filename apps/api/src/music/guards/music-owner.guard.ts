import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MusicContent } from '../schemas/music-content.schema';

/**
 * Verifies that req.user (populated by your existing JwtAuthGuard, which
 * MUST run before this guard) is the producer who owns the MusicContent
 * referenced by the route's :id param.
 *
 * This is the server-side ownership check the spec requires — the frontend
 * is never trusted to gate producer-only actions on its own.
 *
 * Usage: @UseGuards(JwtAuthGuard, MusicOwnerGuard)
 */
@Injectable()
export class MusicOwnerGuard implements CanActivate {
  constructor(
    @InjectModel(MusicContent.name) private readonly musicContentModel: Model<MusicContent>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // set by your existing auth guard/strategy
    const contentId = req.params.id;

    if (!user?.id) {
      throw new ForbiddenException('Authentication required.');
    }

    const content = await this.musicContentModel
      .findById(contentId)
      .select('producerId')
      .lean();

    if (!content) {
      throw new NotFoundException('Content not found.');
    }

    if (content.producerId.toString() !== user.id.toString() && !user.isAdmin) {
      throw new ForbiddenException('You do not own this content.');
    }

    req.musicContent = content;
    return true;
  }
}
