import {
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private readonly reflector: Reflector,
  ) {
    super();
  }

  async canActivate(
    context: ExecutionContext,
  ) {
    // ========================================================================
    // PUBLIC ROUTES
    // ========================================================================

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

    // ========================================================================
    // REQUEST
    // ========================================================================

    const request =
      context.switchToHttp().getRequest();

    const path =
      request?.path ||
      request?.url ||
      request?.originalUrl ||
      "";

    // ========================================================================
    // ACADEMY ROUTES
    // ========================================================================
    //
    // Academy has its own authentication system:
    //
    //   AcademyJwtAuthGuard
    //   academy-jwt Passport strategy
    //   Academy JWT secret
    //
    // Therefore the global Fockis JWT guard must completely
    // bypass Academy requests.
    // ========================================================================

    if (
      typeof path === "string" &&
      (
        path === "/academy" ||
        path.startsWith("/academy/")
      )
    ) {
      return true;
    }

    // ========================================================================
    // NORMAL FOCKIS AUTHENTICATION
    // ========================================================================
    //
    // First authenticate the request.
    // JwtStrategy will:
    //
    // - validate the JWT
    // - load the current user
    // - verify the account is active
    // - check account lockout
    // - check inactivity
    // - attach req.user
    //
    // ========================================================================

    const authenticated =
      await super.canActivate(context);

    if (!authenticated) {
      return false;
    }

    // ========================================================================
    // FIRST-LOGIN PASSWORD CHANGE
    // ========================================================================
    //
    // Organization-created users can have:
    //
    //   mustChangePassword = true
    //
    // This means the user has authenticated successfully but
    // must change the temporary/administrator-generated password
    // before accessing the rest of Fockis.
    //
    // The password endpoint is intentionally allowed.
    // ========================================================================

    const user =
      request?.user;

    const isPasswordChangeRoute =
      typeof path === "string" &&
      (
        path.endsWith("/password") ||
        (
          path.includes("/users/") &&
          path.endsWith("/password")
        )
      );

    if (
      user?.mustChangePassword &&
      !isPasswordChangeRoute
    ) {
      throw new ForbiddenException(
        "You must change your password before continuing.",
      );
    }

    // ========================================================================
    // AUTHENTICATION SUCCESS
    // ========================================================================

    return true;
  }
}