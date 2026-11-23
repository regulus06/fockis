import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";

import { UsersService } from "../users/users.service";
import {
  User,
  UserDocument,
} from "../users/user.schema";

import { AuthTokenService } from "./auth-token.service";
import { AuthSecurityService } from "./auth-security.service";

import { PlatformSecurityPolicyService } from "../admin/security/platform-security/platform-security-policy.service";
import { AccountSecurityService } from "../admin/security/platform-security/account-security.service";
import { SecurityEventsService } from "../admin/security/platform-security/security-events.service";
import { isPasswordExpired } from "../admin/security/platform-security/password-policy";
import {
  AuthRestrictionService,
  availableMethods,
} from "../admin/security/incidents/auth-restriction.service";

/** Token for the extra sign-in check after high-risk activity. */
export const LOGIN_VERIFICATION_TOKEN_TYPE = "login_verification";
const LOGIN_VERIFICATION_TTL_SECONDS = 15 * 60;
import { maskEmail } from "./login-verification.util";

/**
 * Compared against when the email address has no account, so a sign-in for an
 * unknown address takes as long as one for a real account.
 * (bcrypt hash of a random string; it matches nothing users can type.)
 */
const TIMING_EQUALIZER_HASH =
  "$2a$12$U9gw1zuENp5BNG6ndooukeN48OzVpFVEZdlUS0Wavevgxfqn9bw8m";

export interface LoginOptions {
  rememberMe?: boolean;
}

export interface SignInContext {
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class AuthLoginService {
  constructor(
    private readonly usersService: UsersService,

    private readonly jwtService: JwtService,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly tokenService: AuthTokenService,

    private readonly securityService: AuthSecurityService,

    private readonly securityPolicy: PlatformSecurityPolicyService,

    private readonly accountSecurity: AccountSecurityService,

    private readonly securityEvents: SecurityEventsService,

    private readonly restrictions: AuthRestrictionService,
  ) {}

  async login(
    email: string,
    password: string,
    request?: any,
    options: LoginOptions = {},
  ) {
    const normalizedEmail = String(
      email || "",
    )
      .toLowerCase()
      .trim();

    // ------------------------------------------------------------
    // BASIC VALIDATION
    // ------------------------------------------------------------

    if (
      !normalizedEmail ||
      !password
    ) {
      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    const ip =
      this.securityService.getRequestIp(
        request,
      ) || undefined;

    const userAgent =
      typeof request?.headers?.[
        "user-agent"
      ] === "string"
        ? request.headers[
            "user-agent"
          ]
        : undefined;

    const context = {
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    };

    // ------------------------------------------------------------
    // FIND USER
    // ------------------------------------------------------------

    const user =
      await this.usersService.findByEmail(
        normalizedEmail,
      );

    if (!user) {
      // Same work and the same limits as a real account, so responses do
      // not reveal whether an account exists.
      try {
        await bcrypt.compare(
          password,
          TIMING_EQUALIZER_HASH,
        );
      } catch {
        // Timing equalization only; never block the response.
      }

      const platform =
        await this.securityPolicy.getPlatform();

      await this.accountSecurity.failUnknownAccount(
        normalizedEmail,
        platform.accounts,
        context,
      );

      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    const userId =
      user._id.toString();

    // ------------------------------------------------------------
    // EFFECTIVE SECURITY POLICY
    // ------------------------------------------------------------

    const effective =
      await this.securityPolicy.getEffectiveForUser(
        user as any,
      );

    const policy =
      effective.values;

    const organizationIds =
      effective.organizations.map(
        (org) => org.organizationId,
      );

    // ------------------------------------------------------------
    // RESERVE THE ATTEMPT (lockout + retry delay, atomic)
    // ------------------------------------------------------------

    const reservation =
      await this.accountSecurity.reserveAttempt(
        userId,
        policy,
        context,
      );

    // ------------------------------------------------------------
    // PASSWORD
    // ------------------------------------------------------------

    const passwordMatches =
      Boolean(user.password) &&
      (await bcrypt.compare(
        password,
        user.password,
      ));

    if (!passwordMatches) {
      const willLock =
        Boolean(policy.loginLockoutEnabled) &&
        reservation.attempt >=
          Number(policy.maxFailedLoginAttempts);

      await this.usersService.recordFailedLoginAttempt(
        userId,
        ip,
        userAgent,
        willLock,
      );

      await this.accountSecurity.handleFailedAttempt(
        user,
        reservation,
        policy,
        {
          ...context,
          organizations:
            organizationIds,
        },
      );

      throw new UnauthorizedException(
        "Invalid credentials",
      );
    }

    // ------------------------------------------------------------
    // ACCOUNT STATUS
    //
    // Checked after the password so the message is only shown to someone
    // who knows the password.
    // ------------------------------------------------------------

    if (user.isActive === false) {
      await this.usersService.clearLoginLockout(
        userId,
      );

      await this.securityEvents.record({
        action: "auth.login.denied_disabled",
        outcome: "denied",
        severity: "low",
        targetId: userId,
        targetType: "user",
        ...context,
        retentionDays: Number(
          policy.authEventRetentionDays || 180,
        ),
      });

      throw new UnauthorizedException(
        "This account has been disabled.",
      );
    }

    // ------------------------------------------------------------
    // SUCCESSFUL PASSWORD CHECK
    // ------------------------------------------------------------

    const challengeTwoFactor =
      effective.requiresTwoFactor ||
      Boolean(user.mfaEnabled);

    const restriction =
      await this.restrictions.activeFor(userId);

    // Alerts compare with earlier sign-ins, so run before the history
    // entry for this sign-in is written.
    await this.accountSecurity.onPasswordVerified(
      user,
      reservation,
      policy,
      {
        ...context,
        mfaPending:
          challengeTwoFactor ||
          Boolean(restriction),
      },
    );

    // ------------------------------------------------------------
    // STEP-UP VERIFICATION (after high-risk failed-login activity)
    //
    // The password was right, but the account had a burst of failed
    // attempts: the owner must also verify before getting a session.
    // Only someone who knows the password sees this step, so it does
    // not reveal anything about the account to others.
    // ------------------------------------------------------------

    if (restriction) {
      return this.verificationChallenge(
        user,
        restriction,
        options.rememberMe === true,
        context,
      );
    }

    return this.completeSignIn(
      user as UserDocument,
      {
        context,
        rememberMe: options.rememberMe === true,
        mfaSatisfied: false,
      },
    );
  }

  // ==============================================================
  // STEP-UP CHALLENGE
  // ==============================================================

  private async verificationChallenge(
    user: any,
    restriction: any,
    rememberMe: boolean,
    context: SignInContext,
  ) {
    const userId = String(user._id);
    const platform = await this.securityPolicy.getPlatform();

    const fullUser = await this.userModel
      .findById(userId)
      .select("+mfaSecret")
      .lean()
      .exec();

    const methods = availableMethods(fullUser ?? user, {
      emailCodesAllowed: Boolean(platform.accounts.loginVerificationEmailCodes),
    });

    const verificationToken = this.jwtService.sign(
      {
        sub: userId,
        purpose: LOGIN_VERIFICATION_TOKEN_TYPE,
        tokenType: LOGIN_VERIFICATION_TOKEN_TYPE,
        restrictionId: String(restriction._id),
        rememberMe,
      },
      { expiresIn: LOGIN_VERIFICATION_TTL_SECONDS },
    );

    await this.securityEvents.record({
      action: "auth.login.verification_required",
      outcome: "denied",
      severity: "medium",
      targetId: userId,
      targetType: "user",
      ...context,
      metadata: {
        restriction: String(restriction._id),
        methods: methods.join(","),
      },
    });

    return {
      requiresVerification: true,
      requiresMfa: false,
      mfaVerified: false,
      verification_token: verificationToken,
      verificationMethods: methods,
      maskedEmail: methods.includes("email") ? maskEmail(String(user.email ?? "")) : null,
      expiresInSeconds: LOGIN_VERIFICATION_TTL_SECONDS,
      message:
        "We noticed unusual sign-in activity on this account. Confirm it's you to continue.",
    };
  }

  // ==============================================================
  // COMPLETE SIGN-IN
  //
  // Everything after the password (and any step-up verification):
  // two-factor, password expiry and the session token.
  // `mfaSatisfied` is true when the step-up check already used the
  // authenticator app, so it is not asked for twice.
  // ==============================================================

  async completeSignIn(
    user: UserDocument,
    options: {
      context: SignInContext;
      rememberMe: boolean;
      mfaSatisfied: boolean;
    },
  ) {
    const userId = String(user._id);
    const context = options.context;
    const ip = context.ip ?? undefined;
    const userAgent = context.userAgent ?? undefined;

    const effective =
      await this.securityPolicy.getEffectiveForUser(
        user as any,
      );

    const policy = effective.values;

    const challengeTwoFactor =
      (effective.requiresTwoFactor ||
        Boolean(user.mfaEnabled)) &&
      !(options.mfaSatisfied && user.mfaEnabled);

    const updatedUser =
      await this.usersService.recordSuccessfulLogin(
        userId,
        ip,
        userAgent,
      );

    const currentUser =
      updatedUser || user;

    // ------------------------------------------------------------
    // PASSWORD EXPIRATION
    // ------------------------------------------------------------

    if (
      !(currentUser as any).mustChangePassword &&
      isPasswordExpired(
        (currentUser as any).passwordChangedAt ??
          (currentUser as any).createdAt,
        policy,
      )
    ) {
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { mustChangePassword: true } },
      );

      (currentUser as any).mustChangePassword = true;

      await this.securityEvents.record({
        action: "auth.password.expired",
        outcome: "success",
        severity: "info",
        targetId: userId,
        targetType: "user",
        ...context,
        retentionDays: Number(
          policy.authEventRetentionDays || 180,
        ),
      });
    }

    // ------------------------------------------------------------
    // FOCKIS ID
    // ------------------------------------------------------------

    let finalFockisId = String(
      (currentUser as any)
        .fockisId || "",
    )
      .trim()
      .toUpperCase();

    if (!finalFockisId) {
      finalFockisId =
        await this.usersService.getOrCreateFockisId(
          userId,
        );
    }

    // ------------------------------------------------------------
    // REFRESH USER FROM DATABASE
    //
    // This makes sure MFA/security fields are current.
    // ------------------------------------------------------------

    const freshUser =
      await this.userModel
        .findById(userId)
        .select(
          "+mfaSecret +mfaRecoveryCodes",
        )
        .exec();

    const loginUser =
      freshUser ||
      (currentUser as UserDocument);

    const rememberMe =
      options.rememberMe === true;

    const mfaVerified =
      options.mfaSatisfied && Boolean(loginUser.mfaEnabled);

    // ------------------------------------------------------------
    // TWO-FACTOR
    //
    // Required by policy, or turned on by the user.
    // ------------------------------------------------------------

    if (challengeTwoFactor) {
      // ----------------------------------------------------------
      // MFA SETUP REQUIRED
      //
      // Users who must use two-factor enroll here, during sign-in, before
      // they get access — enforcement never locks them out.
      // ----------------------------------------------------------

      if (!loginUser.mfaEnabled) {
        const setupToken =
          this.jwtService.sign(
            {
              sub: userId,
              email: loginUser.email,
              purpose:
                "mfa_setup",
              tokenType:
                "mfa_setup",
              rememberMe,
            },
            {
              expiresIn: "5m",
            },
          );

        return {
          requiresMfa: true,

          mfaSetupRequired:
            true,

          mfaVerified:
            false,

          setup_token:
            setupToken,

          message:
            "MFA setup is required before access is granted.",

          user: {
            _id: userId,

            id: userId,

            email:
              loginUser.email,

            username:
              loginUser.username,

            role:
              loginUser.role ||
              "user",

            mfaEnabled:
              false,

            mfaRequired:
              true,
          },
        };
      }

      // ----------------------------------------------------------
      // MFA CHALLENGE REQUIRED
      // ----------------------------------------------------------

      const challengeToken =
        this.jwtService.sign(
          {
            sub: userId,

            email:
              loginUser.email,

            purpose:
              "mfa_challenge",

            tokenType:
              "mfa_challenge",

            rememberMe,
          },
          {
            expiresIn: "5m",
          },
        );

      return {
        requiresMfa: true,

        mfaSetupRequired:
          false,

        mfaVerified:
          false,

        challenge_token:
          challengeToken,

        message:
          "MFA verification required.",

        user: {
          _id: userId,

          id: userId,

          email:
            loginUser.email,

          username:
            loginUser.username,

          role:
            loginUser.role ||
            "user",

          mfaEnabled:
            true,

          mfaRequired:
            effective.requiresTwoFactor,
        },
      };
    }

    // ------------------------------------------------------------
    // CREATE ACCESS TOKEN
    // ------------------------------------------------------------

    const token =
      this.tokenService.createAccessToken(
        loginUser,
        userId,
        mfaVerified,
        this.accountSecurity.accessTokenExpiresIn(
          policy,
          rememberMe,
        ),
      );

    // ------------------------------------------------------------
    // NORMAL LOGIN RESPONSE
    // ------------------------------------------------------------

    return {
      access_token:
        token,

      requiresMfa:
        false,

      mfaVerified,

      mustChangePassword:
        Boolean(
          (loginUser as any)
            .mustChangePassword,
        ),

      user:
        await this.tokenService.buildUserForTokenResponse(
          loginUser,
          userId,
        ),
    };
  }
}

