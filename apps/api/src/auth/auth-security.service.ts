import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

import type { Request } from "express";

@Injectable()
export class AuthSecurityService {
  private readonly PASSWORD_MINIMUM_LENGTH = 12;

  validatePassword(
    password: string,
  ): void {
    const value = String(
      password || "",
    );

    if (
      value.length <
      this.PASSWORD_MINIMUM_LENGTH
    ) {
      throw new BadRequestException(
        `Password must be at least ${this.PASSWORD_MINIMUM_LENGTH} characters long.`,
      );
    }

    if (!/[A-Z]/.test(value)) {
      throw new BadRequestException(
        "Password must contain at least one uppercase letter.",
      );
    }

    if (!/[a-z]/.test(value)) {
      throw new BadRequestException(
        "Password must contain at least one lowercase letter.",
      );
    }

    if (!/[0-9]/.test(value)) {
      throw new BadRequestException(
        "Password must contain at least one number.",
      );
    }

    if (
      !/[^A-Za-z0-9]/.test(value)
    ) {
      throw new BadRequestException(
        "Password must contain at least one special character.",
      );
    }
  }

  tooManyRequests(
    message: string,
  ): HttpException {
    return new HttpException(
      {
        statusCode:
          HttpStatus.TOO_MANY_REQUESTS,
        message,
        error:
          "Too Many Requests",
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  getRequestIp(
    request?: Request | any,
  ): string | undefined {
    if (!request) {
      return undefined;
    }

    const forwardedFor =
      request.headers?.[
        "x-forwarded-for"
      ];

    if (
      typeof forwardedFor ===
      "string"
    ) {
      const firstIp =
        forwardedFor
          .split(",")[0]
          ?.trim();

      if (firstIp) {
        return firstIp;
      }
    }

    const realIp =
      request.headers?.[
        "x-real-ip"
      ];

    if (
      typeof realIp ===
      "string" &&
      realIp.trim()
    ) {
      return realIp.trim();
    }

    if (
      typeof request.ip ===
      "string" &&
      request.ip.trim()
    ) {
      return request.ip.trim();
    }

    if (
      typeof request.socket
        ?.remoteAddress ===
      "string"
    ) {
      return request.socket.remoteAddress;
    }

    return undefined;
  }
}