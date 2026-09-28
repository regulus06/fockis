import {
Injectable,
UnauthorizedException,
} from "@nestjs/common";

import {
ConfigService,
} from "@nestjs/config";

import {
PassportStrategy,
} from "@nestjs/passport";

import {
ExtractJwt,
Strategy,
} from "passport-jwt";

import {
InjectModel,
} from "@nestjs/mongoose";

import {
Model,
Types,
} from "mongoose";

import {
User,
UserDocument,
} from "../../../users/user.schema";

// ============================================================================
// JWT PAYLOAD
// ============================================================================

interface JwtPayload {
sub?: string;
id?: string;
userId?: string;

email?: string;
username?: string;

role?: string;

permissions?: string[];

isSuperAdmin?: boolean;

mustChangePassword?: boolean;

iat?: number;
exp?: number;
}

// ============================================================================
// TRAVEL JWT STRATEGY
// ============================================================================

@Injectable()
export class JwtStrategy extends PassportStrategy(
Strategy,
"jwt",
) {
constructor(
private readonly config: ConfigService,

@InjectModel(User.name)
private readonly userModel: Model<UserDocument>,

) {
super({
jwtFromRequest:
ExtractJwt.fromAuthHeaderAsBearerToken(),

  secretOrKey:
    config.get<string>("JWT_SECRET") ||
    process.env.JWT_SECRET ||
    "secretKey123",

  ignoreExpiration: false,

  passReqToCallback: true,
});

}

// ==========================================================================
// VALIDATE
// ==========================================================================

async validate(
request: any,
payload: JwtPayload,
) {
console.log(
"✈️ TRAVEL JWT: validate() reached",
);

// ========================================================================
// RESOLVE USER ID
// ========================================================================

const userId =
  payload?.sub ??
  payload?.userId ??
  payload?.id;

if (!userId) {
  console.error(
    "❌ TRAVEL JWT: user ID missing",
  );

  throw new UnauthorizedException(
    "Invalid authentication token: user ID is missing.",
  );
}

if (
  !Types.ObjectId.isValid(userId)
) {
  console.error(
    "❌ TRAVEL JWT: invalid user ID",
    userId,
  );

  throw new UnauthorizedException(
    "Invalid authentication token: invalid user ID.",
  );
}

// ========================================================================
// LOAD CURRENT USER
// ========================================================================

const user =
  await this.userModel
    .findById(userId)
    .lean()
    .exec();

if (!user) {
  console.error(
    "❌ TRAVEL JWT: user not found",
    userId,
  );

  throw new UnauthorizedException(
    "User not found.",
  );
}

// ========================================================================
// RESOLVE ROLE
// ========================================================================

const userRole =
  String(
    (user as any).role ??
    payload?.role ??
    "user",
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

// ========================================================================
// SUPER ADMIN
// ========================================================================

const databaseIsSuperAdmin =
  Boolean(
    (user as any).isSuperAdmin,
  );

const roleIsSuperAdmin =
  userRole === "super_admin" ||
  userRole === "superadmin";

const isSuperAdmin =
  databaseIsSuperAdmin ||
  roleIsSuperAdmin;

// ========================================================================
// ADMIN
// ========================================================================

const isAdmin =
  userRole === "admin" ||
  userRole === "administrator" ||
  isSuperAdmin;

// ========================================================================
// AUTHORIZATION LOG
// ========================================================================

console.log(
  "✈️ TRAVEL AUTHORIZATION",
  {
    userId:
      String(user._id),

    role:
      userRole,

    isAdmin,

    isSuperAdmin,

    databaseIsSuperAdmin,

    roleIsSuperAdmin,
  },
);

// ========================================================================
// ACCOUNT STATUS
// ========================================================================

if (
  (user as any).isActive === false
) {
  console.error(
    "❌ TRAVEL JWT: account disabled",
  );

  throw new UnauthorizedException(
    "This account has been disabled.",
  );
}

// ========================================================================
// REQUEST.USER
// ========================================================================

return {
  id:
    String(user._id),

  userId:
    String(user._id),

  sub:
    String(user._id),

  email:
    (user as any).email ??
    payload?.email,

  username:
    (user as any).username ??
    payload?.username,

  role:
    userRole,

  isAdmin,

  isSuperAdmin,

  permissions:
    (user as any).permissions ||
    payload?.permissions ||
    [],

  isActive:
    Boolean(
      (user as any).isActive,
    ),

  verified:
    Boolean(
      (user as any).verified,
    ),

  mustChangePassword:
    Boolean(
      (user as any).mustChangePassword,
    ),

  fockisId:
    String(
      (user as any).fockisId ||
      "",
    )
      .trim()
      .toUpperCase(),
};
}
}
