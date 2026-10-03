import {
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

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  register(@Body() body: CreateUserDto) {
    return this.authService.register(
      body.username,
      body.email,
      body.password,
      body.firstName,
      body.lastName,
      body.countryCode,
    );
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  login(@Body() body: LoginDto, @Req() request: Request) {
    return this.authService.login(body.email, body.password, request);
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
    );
  }
}