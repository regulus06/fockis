import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../auth/public.decorator';


export const REQUIRES_SUPER_ADMIN_KEY =
  'requires_super_admin';



@Injectable()
export class DestructiveGuard implements CanActivate {


  constructor(
    private readonly reflector: Reflector,
  ) {}



  canActivate(
    context: ExecutionContext,
  ): boolean {


    // =========================
    // 0. PUBLIC ROUTE CHECK
    // =========================

    const isPublic =
      this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );


    if (isPublic) {
      return true;
    }



    // =========================
    // 1. SUPER ADMIN REQUIREMENT CHECK
    // =========================

    const requiresSuperAdmin =
      this.reflector.getAllAndOverride<boolean>(
        REQUIRES_SUPER_ADMIN_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );


    if (!requiresSuperAdmin) {
      return true;
    }



    // =========================
    // 2. USER CHECK
    // =========================

    const request =
      context.switchToHttp().getRequest();


    const user = request.user;



    if (!user) {

      throw new ForbiddenException(
        'Authentication required',
      );

    }



    // =========================
    // 3. SUPER ADMIN CHECK
    // =========================

    if (!user.isSuperAdmin) {

      throw new ForbiddenException(
        'Destructive action requires super admin privileges',
      );

    }



    return true;

  }

}