import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";

import type { Request } from "express";

import { PlatformSecurityPolicyService } from "../admin/security/platform-security/platform-security-policy.service";
import { passwordPolicyProblems } from "../admin/security/platform-security/password-policy";
import type { PolicyValues } from "../admin/security/platform-security/security-policy.definitions";

@Injectable()
export class AuthSecurityService {
  constructor(
    private readonly securityPolicy: PlatformSecurityPolicyService,
  ) {}

  /**
   * Validate a new password against the effective security policy.
   *
   * `values` is the effective policy for the account; when omitted (for
   * example at registration) the platform account policy is used.
   */
  async validateNewPassword(
    password: string,
    values?: PolicyValues,
  ): Promise<void> {
    const policy =
      values ?? (await this.securityPolicy.getPlatform()).accounts;

    const problems = passwordPolicyProblems(password, policy);

    if (problems.length) {
      throw new BadRequestException(problems[0]);
    }
  }

  /**
   * @deprecated Use validateNewPassword(), which follows the platform
   * security policy. Kept for existing callers; applies the strict defaults.
   */
  validatePassword(
    password: string,
  ): void {
    const problems = passwordPolicyProblems(password, {
      minimumPasswordLength: 12,
      strongPasswords: true,
    });

    if (problems.length) {
      throw new BadRequestException(problems[0]);
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