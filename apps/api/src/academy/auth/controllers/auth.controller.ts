import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { AuthService } from "../services/auth.service";

import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";

import { AcademyJwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";

import { Roles } from "../decorators/roles.decorator";

@Controller("academy/auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post("register")
  register(
    @Body() dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @Post("bootstrap-admin")
  bootstrapAdmin(
    @Body()
    body: {
      email: string;
      password: string;
      name: string;
      bootstrapSecret: string;
    },
  ) {
    return this.authService.bootstrapAdmin(body);
  }

  @Post("login")
  login(
    @Body() dto: LoginDto,
  ) {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(AcademyJwtAuthGuard)
  me(
    @Req() req: any,
  ) {
    return this.authService.me(
      req.user.userId,
    );
  }

  @Patch("me")
  @UseGuards(AcademyJwtAuthGuard)
  updateMe(
    @Req() req: any,
    @Body()
    body: {
      name?: string;
      email?: string;
    },
  ) {
    return this.authService.updateMe(
      req.user.userId,
      body,
    );
  }

  @Patch("me/disable")
  @UseGuards(AcademyJwtAuthGuard)
  disableMe(
    @Req() req: any,
  ) {
    return this.authService.disableAccount(
      req.user.userId,
    );
  }

  @Post("change-password")
  @UseGuards(AcademyJwtAuthGuard)
  changePassword(
    @Req() req: any,
    @Body()
    body: {
      currentPassword: string;
      newPassword: string;
    },
  ) {
    return this.authService.changePassword(
      req.user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get("sessions")
  @UseGuards(AcademyJwtAuthGuard)
  getSessions(
    @Req() req: any,
  ) {
    return this.authService.getSessions(
      req.user.userId,
    );
  }

  @Post("sessions/sign-out-all")
  @UseGuards(AcademyJwtAuthGuard)
  signOutAllSessions(
    @Req() req: any,
  ) {
    return this.authService.signOutAllSessions(
      req.user.userId,
    );
  }

  @Get("2fa/status")
  @UseGuards(AcademyJwtAuthGuard)
  getTwoFactorStatus(
    @Req() req: any,
  ) {
    return this.authService.getTwoFactorStatus(
      req.user.userId,
    );
  }

  @Post("2fa/enable")
  @UseGuards(AcademyJwtAuthGuard)
  enableTwoFactor(
    @Req() req: any,
  ) {
    return this.authService.enableTwoFactor(
      req.user.userId,
    );
  }

  @Post("2fa/disable")
  @UseGuards(AcademyJwtAuthGuard)
  disableTwoFactor(
    @Req() req: any,
  ) {
    return this.authService.disableTwoFactor(
      req.user.userId,
    );
  }

  @Get("login-history")
  @UseGuards(AcademyJwtAuthGuard)
  getLoginHistory(
    @Req() req: any,
  ) {
    return this.authService.getLoginHistory(
      req.user.userId,
    );
  }

  @Get("security-events")
  @UseGuards(AcademyJwtAuthGuard)
  getSecurityEvents(
    @Req() req: any,
  ) {
    return this.authService.getSecurityEvents(
      req.user.userId,
    );
  }

  @Get("users")
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles("administrator")
  findAll() {
    return this.authService.findAll();
  }

  @Patch("users/:id/role")
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles("administrator")
  updateRole(
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.authService.updateRole(
      id,
      dto,
    );
  }
}