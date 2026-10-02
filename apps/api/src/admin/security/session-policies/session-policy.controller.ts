import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { SessionPolicyService } from './session-policy.service';
import { CreateSessionPolicyDto } from './dto/create-session-policy.dto';
import { UpdateSessionPolicyDto } from './dto/update-session-policy.dto';
import { SuperAdminGuard } from '../../safety/super-admin.guard';

@Controller('admin/security/session-policies')
@UseGuards(SuperAdminGuard)
export class SessionPolicyController {
  constructor(
    private readonly sessionPolicyService: SessionPolicyService,
  ) {}

  @Get()
  list() {
    return this.sessionPolicyService.list();
  }

  @Get('defaults')
  defaults() {
    return this.sessionPolicyService.getDefaults();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.sessionPolicyService.getById(id);
  }

  @Post()
  create(
    @Body() dto: CreateSessionPolicyDto,
    @Req() req: Request,
  ) {
    return this.sessionPolicyService.create(dto, req.user as any);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSessionPolicyDto,
    @Req() req: Request,
  ) {
    return this.sessionPolicyService.update(
      id,
      dto,
      req.user as any,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.sessionPolicyService.remove(
      id,
      req.user as any,
    );
  }
}