
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service";
import { CreateUserDto } from "../dto/create-user.dto";
import { LoginDto } from "../dto/login.dto";
import { Public } from "./public.decorator";
import { LoginVerificationService } from "./login-verification.service";
import { PublicRecoveryRequestDto } from "../admin/security/incidents/security-incidents.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly verification: LoginVerificationService,
  ) {}

  // ============================================================
  // SIGN-IN VERIFICATION (after high-risk activity)
  // ============================================================

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login/verification/email")
  sendVerificationEmail(
    @Body("verification_token") token: string,
    @Req() request: Request,
  ) {
    return this.verification.sendEmailCode(String(token ?? ""), request);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login/verification/verify")
  verifyLogin(
    @Body("verification_token") token: string,
    @Body("method") method: string,
    @Body("code") code: string,
    @Req() request: Request,
  ) {
    if (method !== "totp" && method !== "email") {
      throw new BadRequestException("Choose a verification method.");
    }

    return this.verification.verify(String(token ?? ""), method, String(code ?? ""), request);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post("login/verification/recovery")
  verificationRecovery(
    @Body("verification_token") token: string,
    @Body("message") message: string,
    @Req() request: Request,
  ) {
    return this.verification.requestRecoveryFromVerification(
      String(token ?? ""),
      String(message ?? "").slice(0, 1000),
      request,
    );
  }

  /** Public account recovery request. Same answer whether or not the account exists. */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } })
  @Post("recovery")
  requestRecovery(@Body() body: PublicRecoveryRequestDto, @Req() request: Request) {
    return this.verification.requestRecovery(body.email, body.message, request);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  register(@Body() body: CreateUserDto) {
    if (body.termsAccepted !== true) {
      throw new BadRequestException(
        "You must accept the terms and policies to register.",
      );
    }

    if (
      !Array.isArray(body.acceptedPolicies) ||
      body.acceptedPolicies.length === 0
    ) {
      throw new BadRequestException(
        "You must accept the required policies.",
      );
    }

    if (!body.policyAcceptanceVersion?.trim()) {
      throw new BadRequestException(
        "Policy acceptance version is required.",
      );
    }

    return this.authService.register(
      body.username,
      body.email,
      body.password,
      body.firstName,
      body.lastName,
      body.countryCode,
      {
        termsAccepted: true,
        acceptedPolicies: body.acceptedPolicies,
        policyAcceptanceVersion: body.policyAcceptanceVersion,
        policyAcceptedAt: new Date(),
      },
    );
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  login(@Body() body: LoginDto, @Req() request: Request) {
    return this.authService.login(body.email, body.password, request, {
      rememberMe: body.rememberMe === true,
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("forgot-password")
  forgotPassword(@Body("email") email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("reset-password")
  resetPassword(
    @Body("token") token: string,
    @Body("password") password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("mfa/setup")
  beginMfaSetup(@Body("setupToken") setupToken: string) {
    return this.authService.beginMfaSetup(setupToken);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("mfa/confirm")
  confirmMfaSetup(
    @Body("setupToken") setupToken: string,
    @Body("code") code: string,
  ) {
    return this.authService.confirmMfaSetup(setupToken, code);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("mfa/verify")
  verifyMfaLogin(
    @Body()
    body: {
      challenge_token?: string;
      challengeToken?: string;
      code?: string;
    },
    @Req() request: Request,
  ) {
    const challengeToken = String(
      body.challenge_token ?? body.challengeToken ?? "",
    ).trim();

    return this.authService.verifyMfaLogin(
      challengeToken,
      String(body.code ?? "").trim(),
      request,
    );
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("mfa/recovery")
  verifyMfaRecoveryCode(
    @Body("challengeToken") challengeToken: string,
    @Body("recoveryCode") recoveryCode: string,
    @Req() request: Request,
  ) {
    return this.authService.verifyMfaRecoveryCode(
      challengeToken,
      recoveryCode,
      request,
    );
  }

  @Get("mfa/status")
  getMfaStatus(@Req() request: Request) {
    const user = request.user as any;
    const userId = user?.userId ?? user?.id ?? user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated user ID is missing.");
    }

    return this.authService.getMfaStatus(String(userId));
  }

  @Patch("mfa/disable")
  disableMfa(
    @Body("currentPassword") currentPassword: string,
    @Body("mfaCode") mfaCode: string,
    @Req() request: Request,
  ) {
    const user = request.user as any;
    const userId = user?.userId ?? user?.id ?? user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated user ID is missing.");
    }

    return this.authService.disableMfa(
      String(userId),
      currentPassword,
      mfaCode,
      {
        tokenIat: Number(user?.tokenIssuedAt) || null,
        request,
      },
    );
  }

  // ==========================================================================
  // REAUTHENTICATION
  //
  // Returns a short-lived token for the X-Fockis-Reauth header, required by
  // sensitive actions (security policy changes, account recovery, two-factor
  // changes) according to the platform security policy.
  // ==========================================================================

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("reauthenticate")
  reauthenticate(
    @Body("password") password: string,
    @Body("code") code: string,
    @Req() request: Request,
  ) {
    return this.authService.reauthenticate(
      this.currentUserId(request),
      String(password ?? ""),
      code === undefined || code === null ? undefined : String(code),
      request,
    );
  }

  // ==========================================================================
  // SELF-SERVICE TWO-FACTOR
  // ==========================================================================

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("mfa/enroll/start")
  startMfaEnrollment(@Req() request: Request) {
    return this.authService.startSelfServiceEnrollment(
      this.currentUserId(request),
      request,
    );
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("mfa/enroll/confirm")
  confirmMfaEnrollment(@Body("code") code: string, @Req() request: Request) {
    return this.authService.confirmSelfServiceEnrollment(
      this.currentUserId(request),
      String(code ?? "").trim(),
      request,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("mfa/recovery-codes/regenerate")
  regenerateRecoveryCodes(@Body("code") code: string, @Req() request: Request) {
    return this.authService.regenerateRecoveryCodes(
      this.currentUserId(request),
      String(code ?? "").trim(),
      request,
    );
  }

  // ==========================================================================
  // SESSIONS
  // ==========================================================================

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("sessions/revoke-others")
  revokeOtherSessions(@Req() request: Request) {
    return this.authService.revokeOtherSessions(
      this.currentUserId(request),
      request,
    );
  }

  private currentUserId(request: Request): string {
    const user = request.user as any;
    const userId = user?.userId ?? user?.id ?? user?.sub;

    if (!userId) {
      throw new UnauthorizedException("Authenticated user ID is missing.");
    }

    return String(userId);
  }
}
