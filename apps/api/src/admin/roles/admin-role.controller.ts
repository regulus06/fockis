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

import { AdminRoleService } from './admin-role.service';

import { SuperAdminGuard } from '../safety/super-admin.guard';

import { CreateAdminRoleDto } from './dto/create-admin-role.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';

@Controller('admin/roles')
@UseGuards(SuperAdminGuard)
export class AdminRoleController {
  constructor(
    private readonly roleService: AdminRoleService,
  ) {}

  @Get()
  list() {
    return this.roleService.list();
  }

  @Get('permissions')
  permissions() {
    return this.roleService.getPermissions();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.roleService.getById(id);
  }

  @Post()
  create(
    @Body() dto: CreateAdminRoleDto,
    @Req() req: any,
  ) {
    return this.roleService.create(
      dto,
      req.user,
      req,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminRoleDto,
    @Req() req: any,
  ) {
    return this.roleService.update(
      id,
      dto,
      req.user,
      req,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.roleService.remove(
      id,
      req.user,
      req,
    );
  }
}