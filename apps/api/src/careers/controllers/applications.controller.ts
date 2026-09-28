import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from "@nestjs/common";

import {
  ApplicationsService,
} from "../services/applications.service";

import {
  CreateApplicationDto,
} from "../dto/create-application.dto";

import {
  UpdateApplicationStatusDto,
} from "../dto/update-application-status.dto";

@Controller("careers/applications")
export class ApplicationsController {
  constructor(
    private readonly applicationsService:
      ApplicationsService,
  ) {}

  @Get()
  findMine(@Req() req: any) {
    const userId = req.user?.id;

    return this.applicationsService
      .findAllForUser(userId);
  }

  @Get(":id")
  findOne(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;

    return this.applicationsService
      .findOne(id, userId);
  }

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateApplicationDto,
  ) {
    const userId = req.user?.id;

    return this.applicationsService
      .create(userId, dto);
  }

  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService
      .updateStatus(id, dto);
  }
}