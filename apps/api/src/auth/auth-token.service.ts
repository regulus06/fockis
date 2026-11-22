import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { UsersService } from "../users/users.service";
import { formatPublicFockisId } from "../users/constants/fockis-country.constants";

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * @param expiresIn token lifetime in seconds. When
   *   omitted the module default (7 days) is used. The security policy sets
   *   it for remember-me sign-ins.
   */
  createAccessToken(
    user: any,
    userId: string,
    mfaVerified = false,
    expiresIn?: number,
  ): string {
    const payload = {
      sub: userId,
      email: user.email,
      username: user.username,
      role: user.role || "user",
      permissions: user.permissions || [],
      mustChangePassword: Boolean(user.mustChangePassword),
      tokenType: "access",
      access: "user",
      mfaVerified,
    };

    return expiresIn !== undefined
      ? this.jwtService.sign(payload, { expiresIn })
      : this.jwtService.sign(payload);
  }

  async buildUserForTokenResponse(
    user: any,
    userId: string,
  ) {
    let fockisId = String(
      user.fockisId || "",
    )
      .trim()
      .toUpperCase();

    if (!fockisId) {
      fockisId =
        await this.usersService.getOrCreateFockisId(
          userId,
        );
    }

    const countryCode = String(
      user.countryCode || "",
    )
      .trim()
      .toUpperCase();

    const callingCode = String(
      user.callingCode || "",
    ).trim();

    const publicFockisId = callingCode
      ? formatPublicFockisId(
          fockisId,
          callingCode,
        )
      : fockisId;

    return {
      _id: userId,
      id: userId,

      fockisId,
      publicFockisId,

      countryCode,
      callingCode,

      username: user.username,
      email: user.email,

      firstName: user.firstName || "",
      lastName: user.lastName || "",

      role: user.role || "user",
      permissions: user.permissions || [],

      mfaEnabled: Boolean(
        user.mfaEnabled,
      ),

      mfaVerified: Boolean(
        user.mfaVerifiedAt,
      ),

      mustChangePassword: Boolean(
        user.mustChangePassword,
      ),
    };
  }
}