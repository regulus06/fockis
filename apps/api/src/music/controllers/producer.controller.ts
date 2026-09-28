import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

import {
  ProducerService,
} from "../services/producer.service";

import {
  CreateProducerProfileDto,
} from "../dto/create-producer-profile.dto";

import {
  UpdateProducerProfileDto,
} from "../dto/update-producer-profile.dto";

import {
  ProducerStatus,
} from "../schemas/producer-profile.schema";

@Controller("music/producer")
export class ProducerController {
  constructor(
    private readonly producerService: ProducerService,
  ) {}

  /* ==========================================================
     CURRENT PRODUCER
  ========================================================== */

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return this.producerService.getMyProfile(
      req.user.id,
    );
  }

  /* ==========================================================
     APPLY
  ========================================================== */

  @Post("apply")
  @UseGuards(JwtAuthGuard)
  async apply(
    @Req() req: any,
    @Body() dto: CreateProducerProfileDto,
  ) {
    return this.producerService.createProfile(
      req.user.id,
      dto,
    );
  }

  /* ==========================================================
     UPDATE PROFILE
  ========================================================== */

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  async update(
    @Req() req: any,
    @Body() dto: UpdateProducerProfileDto,
  ) {
    return this.producerService.updateMyProfile(
      req.user.id,
      dto,
    );
  }

  /* ==========================================================
     ADMIN APPLICATIONS
  ========================================================== */

  @Get("admin/applications")
  @UseGuards(JwtAuthGuard)
  async applications(
    @Req() req: any,
    @Query("status")
    status?: ProducerStatus,
  ) {
    this.requireAdmin(req);

    return this.producerService.listApplications(
      status,
    );
  }

  /* ==========================================================
     ADMIN AUTO APPROVAL — GET
  ========================================================== */

  @Get("admin/settings/auto-approval")
  @UseGuards(JwtAuthGuard)
  async getAutoApprovalSetting(
    @Req() req: any,
  ) {
    this.requireAdmin(req);

    return this.producerService
      .getAutoApprovalSetting();
  }

  /* ==========================================================
     ADMIN AUTO APPROVAL — UPDATE
  ========================================================== */

  @Patch("admin/settings/auto-approval")
  @UseGuards(JwtAuthGuard)
  async setAutoApprovalSetting(
    @Req() req: any,
    @Body()
    body: {
      enabled?: boolean;
    },
  ) {
    this.requireAdmin(req);

    if (
      typeof body?.enabled !==
      "boolean"
    ) {
      throw new BadRequestException(
        "The enabled value must be true or false.",
      );
    }

    return this.producerService
      .setAutoApprovalSetting(
        body.enabled,
        req.user.id,
      );
  }

  /* ==========================================================
     ADMIN APPROVE
  ========================================================== */

  @Post("admin/:producerId/approve")
  @UseGuards(JwtAuthGuard)
  async approve(
    @Req() req: any,
    @Param("producerId")
    producerId: string,
  ) {
    this.requireAdmin(req);

    return this.producerService.approve(
      producerId,
      req.user.id,
    );
  }

  /* ==========================================================
     ADMIN REJECT
  ========================================================== */

  @Post("admin/:producerId/reject")
  @UseGuards(JwtAuthGuard)
  async reject(
    @Req() req: any,
    @Param("producerId")
    producerId: string,
    @Body()
    body: {
      note?: string;
    },
  ) {
    this.requireAdmin(req);

    return this.producerService.reject(
      producerId,
      req.user.id,
      body?.note,
    );
  }

  /* ==========================================================
     ADMIN SUSPEND
  ========================================================== */

  @Post("admin/:producerId/suspend")
  @UseGuards(JwtAuthGuard)
  async suspend(
    @Req() req: any,
    @Param("producerId")
    producerId: string,
    @Body()
    body: {
      note?: string;
    },
  ) {
    this.requireAdmin(req);

    return this.producerService.suspend(
      producerId,
      req.user.id,
      body?.note,
    );
  }

  /* ==========================================================
     ADMIN RESTORE
  ========================================================== */

  @Post("admin/:producerId/restore")
  @UseGuards(JwtAuthGuard)
  async restore(
    @Req() req: any,
    @Param("producerId")
    producerId: string,
  ) {
    this.requireAdmin(req);

    return this.producerService.restore(
      producerId,
      req.user.id,
    );
  }

  /* ==========================================================
     PUBLIC PROFILE
  ========================================================== */

  @Get(":producerId")
  async publicProfile(
    @Param("producerId")
    producerId: string,
  ) {
    return this.producerService.getPublicProfile(
      producerId,
    );
  }

  /* ==========================================================
     ADMIN AUTHORIZATION
  ========================================================== */

  private requireAdmin(
    req: any,
  ): void {
    const role =
      req.user?.role;

    const permissions =
      Array.isArray(
        req.user?.permissions,
      )
        ? req.user.permissions
        : [];

    const allowed =
      role === "admin" ||
      role === "super_admin" ||
      permissions.includes(
        "music.admin",
      ) ||
      permissions.includes(
        "music.producers.manage",
      );

    if (!allowed) {
      throw new ForbiddenException(
        "Administrator access required.",
      );
    }
  }
}