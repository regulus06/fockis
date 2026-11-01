import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class EmployerVerifiedGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // Fail closed until membership lookup and permission evaluation are implemented.
    throw new ForbiddenException('EmployerVerifiedGuard is not configured. Access is denied.');
  }
}
