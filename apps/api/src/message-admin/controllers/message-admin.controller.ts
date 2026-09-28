import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';

import { MessageAdminService } from '../services/message-admin.service';

@Controller('admin/messages')
export class MessageAdminController {
  constructor(
    private readonly messageAdminService: MessageAdminService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.messageAdminService.getStats();
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.messageAdminService.getUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search,
    });
  }

  @Get('reports')
  async getReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.messageAdminService.getReports({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      status,
    });
  }

  @Patch('reports/:id')
  async updateReport(
    @Param('id') id: string,
    @Body()
    body: {
      status?: string;
      adminNote?: string;
      reviewedBy?: string;
    },
  ) {
    return this.messageAdminService.updateReport(
      id,
      body,
    );
  }
}