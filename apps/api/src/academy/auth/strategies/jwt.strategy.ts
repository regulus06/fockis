import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { PassportStrategy } from "@nestjs/passport";

import {
  ExtractJwt,
  Strategy,
} from "passport-jwt";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import { AcademyUser } from "../schemas/academy-user.schema";

// ============================================================================
// ACADEMY JWT PAYLOAD
// ============================================================================

interface AcademyJwtPayload {
  sub?: string;
  userId?: string;
  email?: string;
  role?: string;
  authType?: string;

  iat?: number;
  exp?: number;
}

// ============================================================================
// ACADEMY JWT STRATEGY
// ============================================================================

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  "academy-jwt",
) {
  constructor(
    @InjectModel(AcademyUser.name)
    private readonly userModel: Model<AcademyUser>,
  ) {
    const secret =
      process.env.ACADEMY_JWT_SECRET;

    // ------------------------------------------------------------------------
    // NEVER silently fall back to a different JWT secret.
    // ------------------------------------------------------------------------

    if (!secret) {
      throw new Error(
        "FOCKIS ACADEMY ERROR: ACADEMY_JWT_SECRET is not configured.",
      );
    }

    console.log(
      "[FOCKIS ACADEMY JWT] Strategy initialized.",
    );

    console.log(
      "[FOCKIS ACADEMY JWT] ACADEMY_JWT_SECRET configured:",
      true,
    );

    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      secretOrKey: secret,

      ignoreExpiration: false,

      passReqToCallback: false,
    });
  }

  // ==========================================================================
  // VALIDATE TOKEN
  // ==========================================================================

  async validate(
    payload: AcademyJwtPayload,
  ) {
    console.log(
      "[FOCKIS ACADEMY JWT] Validating token payload:",
      {
        sub: payload?.sub,
        userId: payload?.userId,
        email: payload?.email,
        role: payload?.role,
        authType: payload?.authType,
      },
    );

    // ------------------------------------------------------------------------
    // REQUIRE ACADEMY TOKEN
    // ------------------------------------------------------------------------

    if (payload?.authType !== "academy") {
      console.error(
        "[FOCKIS ACADEMY JWT] Invalid authType:",
        payload?.authType,
      );

      throw new UnauthorizedException(
        "Invalid Academy authentication token.",
      );
    }

    // ------------------------------------------------------------------------
    // USER ID
    // ------------------------------------------------------------------------

    const userId =
      payload?.sub ||
      payload?.userId;

    if (!userId) {
      console.error(
        "[FOCKIS ACADEMY JWT] Token has no user ID.",
      );

      throw new UnauthorizedException(
        "Invalid Academy authentication token: user ID is missing.",
      );
    }

    // ------------------------------------------------------------------------
    // OBJECT ID
    // ------------------------------------------------------------------------

    if (!Types.ObjectId.isValid(userId)) {
      console.error(
        "[FOCKIS ACADEMY JWT] Invalid user ID:",
        userId,
      );

      throw new UnauthorizedException(
        "Invalid Academy authentication token: invalid user ID.",
      );
    }

    // ------------------------------------------------------------------------
    // FIND ACADEMY USER
    // ------------------------------------------------------------------------

    const user =
      await this.userModel
        .findById(userId)
        .exec();

    if (!user) {
      console.error(
        "[FOCKIS ACADEMY JWT] User not found:",
        userId,
      );

      throw new UnauthorizedException(
        "Academy user not found.",
      );
    }

    // ------------------------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------------------------

    console.log(
      "[FOCKIS ACADEMY JWT] Authentication successful:",
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      },
    );

    return {
      id: user._id.toString(),
      userId: user._id.toString(),
      sub: user._id.toString(),

      email: user.email,
      name: user.name,
      role: user.role,
      studentSlug: user.studentSlug,
    };
  }
}