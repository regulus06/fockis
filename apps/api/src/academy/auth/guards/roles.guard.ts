import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AcademyRole } from '../schemas/academy-user.schema';

/**
 * Pairs with AcademyJwtAuthGuard: that guard authenticates the request and
 * attaches `request.user` (from JwtStrategy.validate), this guard checks
 * that user's role against whatever @Roles(...) the route requires.
 *
 *   @UseGuards(AcademyJwtAuthGuard, RolesGuard)
 *   @Roles('administrator', 'staff')
 *   @Post()
 *   create(...) { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AcademyRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Your role does not have permission to perform this action.');
    }
    return true;
  }
}
