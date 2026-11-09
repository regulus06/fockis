import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";

// ============================================================================
// FOCKIS ACADEMY JWT AUTH GUARD
// ============================================================================

@Injectable()
export class AcademyJwtAuthGuard extends AuthGuard(
  "academy-jwt",
) {
  canActivate(
    context: ExecutionContext,
  ) {
    const request =
      context.switchToHttp().getRequest();

    const authorization =
      request.headers?.authorization;

    console.log(
      "[FOCKIS ACADEMY GUARD] Authorization header:",
      authorization
        ? `Bearer ${authorization
            .replace(/^Bearer\s+/i, "")
            .slice(0, 20)}...`
        : "MISSING",
    );

    return super.canActivate(context);
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ) {
    if (err || !user) {
      console.error(
        "[FOCKIS ACADEMY GUARD] Authentication failed:",
        {
          error: err?.message,
          info:
            info?.message ||
            info?.name ||
            "Unknown authentication error",
        },
      );

      throw (
        err ||
        new UnauthorizedException(
          "Invalid or missing Academy authentication token.",
        )
      );
    }

    // Accounts created by a school start with a temporary password: until it
    // is changed, only "who am I" and "change password" are allowed.
    if (user.mustChangePassword) {
      const request = context.switchToHttp().getRequest();
      const path = String(request.originalUrl || request.url || "").split("?")[0];
      const allowed =
        /\/academy\/auth\/me$/.test(path) ||
        /\/academy\/auth\/change-password$/.test(path);

      if (!allowed) {
        throw new ForbiddenException(
          "PASSWORD_CHANGE_REQUIRED: Change your temporary password to continue.",
        );
      }
    }

    console.log(
      "[FOCKIS ACADEMY GUARD] User authenticated:",
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    );

    return user;
  }
}