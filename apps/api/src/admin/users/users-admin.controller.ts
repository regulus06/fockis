import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { RbacGuard } from '../rbac/rbac.guard';
import { Roles } from '../rbac/roles.decorator';
import { Role } from '../rbac/roles.enum';
import { UsersAdminService } from './users-admin.service';

@Controller('admin/users')
@UseGuards(RbacGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class UsersAdminController {
  constructor(private readonly users: UsersAdminService) {}

  @Get('stats')
  stats() { return this.users.getStats(); }

  @Get()
  list(@Query() query: any) { return this.users.getUsers(query); }

  @Get('export')
  async export(@Query() query: any, @Res() res: Response) {
    const csv = await this.users.export(query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fockis-users.csv"');
    return res.send(csv);
  }

  @Post('bulk-action')
  bulk(@Body() body: any, @Req() req: any) { return this.users.bulkAction(body, req.user, req); }

  @Get(':id')
  get(@Param('id') id: string) { return this.users.getUser(id); }

  @Patch(':id/profile')
  profile(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.users.updateProfile(id, body, req.user, req); }

  @Patch(':id/status')
  status(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.users.updateStatus(id, body, req.user, req); }

  @Patch(':id/role')
  role(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.users.updateRole(id, body, req.user, req); }

  @Patch(':id/permissions')
  permissions(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.users.updatePermissions(id, body, req.user, req); }

  @Patch(':id/verification')
  verification(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.users.updateVerification(id, body, req.user, req); }

  @Patch(':id/premium')
  premium(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.users.updatePremium(id, body, req.user, req); }

  @Patch(':id/fockis-id-access')
  fockisId(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.users.updateFockisIdAccess(id, body, req.user, req); }

  @Post(':id/lock')
  lock(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.users.lock(id, body, req.user, req); }

  @Post(':id/unlock')
  unlock(@Param('id') id: string, @Req() req: any) { return this.users.unlock(id, req.user, req); }

  @Post(':id/force-password-change')
  forcePasswordChange(@Param('id') id: string, @Req() req: any) { return this.users.forcePasswordChange(id, req.user, req); }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Req() req: any) { return this.users.resetPassword(id, req.user, req); }

  @Get(':id/activity')
  activity(@Param('id') id: string, @Query() q: any) { return this.users.getActivity(id, q); }

  @Get(':id/messages')
  messages(@Param('id') id: string, @Query() q: any) { return this.users.getMessages(id, q); }

  @Get(':id/bookings')
  bookings(@Param('id') id: string, @Query() q: any) { return this.users.getBookings(id, q); }

  @Get(':id/payments')
  payments(@Param('id') id: string, @Query() q: any) { return this.users.getPayments(id, q); }

  @Get(':id/reports')
  reports(@Param('id') id: string, @Query() q: any) { return this.users.getReports(id, q); }

  @Get(':id/domains')
  domains(@Param('id') id: string) { return this.users.getDomainSummary(id); }
}
