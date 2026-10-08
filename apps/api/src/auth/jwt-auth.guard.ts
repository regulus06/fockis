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
  ): Promise<boolean> {
    // ========================================================================
    // 1. PUBLIC ROUTES
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
    // 2. REQUEST
    // ========================================================================

    const request =
      context.switchToHttp().getRequest();

    const path =
      typeof request?.path === "string"
        ? request.path
        : typeof request?.url === "string"
          ? request.url.split("?")[0]
          : typeof request?.originalUrl === "string"
            ? request.originalUrl.split("?")[0]
            : "";

    const normalizedPath =
      String(path || "")
        .trim()
        .replace(/\/+$/, "")
        .toLowerCase();

    // ========================================================================
    // 3. PUBLIC POST MEDIA
    // ========================================================================
    //
    // Post photos/videos are delivered through the GCS-backed media gateway.
    //
    // Browser <img> and <video> requests cannot reliably attach the Fockis
    // Authorization header, so post media delivery must be public.
    //
    // IMPORTANT:
    // - Only /uploads/media/posts/* is public here.
    // - The rest of the Fockis API remains protected.
    // - /uploads/music/* remains protected by the music security barrier.
    // - The actual media is still read from the configured GCS bucket.
    //
    // Example:
    //
    // /uploads/media/posts/example.mp4
    // /uploads/media/posts/example.jpg
    //
    // ========================================================================

    if (
      normalizedPath === "/uploads/media/posts" ||
      normalizedPath.startsWith(
        "/uploads/media/posts/",
      )
    ) {
      return true;
    }

    // ========================================================================
    // 4. ACADEMY ROUTES
    // ========================================================================
    //
    // Academy has its own authentication system.
    //
    // The global Fockis JWT guard must not authenticate Academy routes.
    // Academy controllers/guards remain responsible for protecting them.
    // ========================================================================

    if (
      normalizedPath === "/academy" ||
      normalizedPath.startsWith("/academy/")
    ) {
      return true;
    }

    // ========================================================================
    // 5. NORMAL FOCKIS AUTHENTICATION
    // ========================================================================

    const authenticated =
      await super.canActivate(context);

    if (!authenticated) {
      return false;
    }

    // ========================================================================
    // 6. REQUEST USER
    // ========================================================================

    const user = request?.user;

    if (!user) {
      return false;
    }

    // ========================================================================
    // 7. FIRST-LOGIN PASSWORD CHANGE
    // ========================================================================
    //
    // Users created with mustChangePassword=true may authenticate, but
    // cannot continue into the application until the password is changed.
    //
    // Only the password-change endpoint is allowed through.
    // ========================================================================

    const isPasswordChangeRoute =
      normalizedPath.endsWith("/password") &&
      (
        normalizedPath.startsWith("/users/") ||
        normalizedPath.includes("/users/") ||
        normalizedPath.includes("/auth/")
      );

    if (
      user.mustChangePassword === true &&
      !isPasswordChangeRoute
    ) {
      throw new ForbiddenException(
        "You must change your password before continuing.",
      );
    }

    // ========================================================================
    // 8. AUTHENTICATION SUCCESS
    // ========================================================================

    return true;
  }
}