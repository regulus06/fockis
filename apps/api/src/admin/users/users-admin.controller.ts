import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";

import type { Response } from "express";

import { RbacGuard } from "../rbac/rbac.guard";
import { Permissions } from "../rbac/permissions.decorator";
import { Permission } from "../rbac/permissions.enum";

import { UsersAdminService } from "./users-admin.service";

@Controller("admin/users")
@UseGuards(RbacGuard)
export class UsersAdminController {
  constructor(
    private readonly users: UsersAdminService,
  ) {}

  // ========================================================================
  // USER ADMINISTRATION DASHBOARD
  // ========================================================================

  @Get("stats")
  @Permissions(Permission.USERS_VIEW)
  stats() {
    return this.users.getStats();
  }

  // ========================================================================
  // USER LIST
  // ========================================================================

  @Get()
  @Permissions(Permission.USERS_VIEW)
  list(
    @Query() query: any,
  ) {
    return this.users.getUsers(query);
  }

  // ========================================================================
  // USER EXPORT
  // ========================================================================

  @Get("export")
  @Permissions(Permission.USERS_EXPORT)
  async export(
    @Query() query: any,
    @Res() res: Response,
  ) {
    const csv =
      await this.users.export(query);

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="fockis-users.csv"',
    );

    return res.send(csv);
  }

  // ========================================================================
  // BULK USER ACTIONS
  // ========================================================================

  @Post("bulk-action")
  @Permissions(Permission.USERS_MANAGE)
  bulk(
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.bulkAction(
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // USER DETAILS
  // ========================================================================

  @Get(":id")
  @Permissions(Permission.USERS_DETAILS_VIEW)
  get(
    @Param("id") id: string,
  ) {
    return this.users.getUser(id);
  }

  // ========================================================================
  // PROFILE
  // ========================================================================

  @Patch(":id/profile")
  @Permissions(Permission.USERS_PROFILE_MANAGE)
  profile(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.updateProfile(
      id,
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // ACCOUNT STATUS
  // ========================================================================

  @Patch(":id/status")
  @Permissions(Permission.USERS_STATUS_MANAGE)
  status(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.updateStatus(
      id,
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // USER ROLE
  // ========================================================================

  @Patch(":id/role")
  @Permissions(Permission.USERS_ROLES_MANAGE)
  role(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.updateRole(
      id,
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // USER PERMISSIONS
  // ========================================================================

  @Patch(":id/permissions")
  @Permissions(Permission.USERS_PERMISSIONS_MANAGE)
  permissions(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.updatePermissions(
      id,
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // VERIFICATION
  // ========================================================================

  @Patch(":id/verification")
  @Permissions(Permission.USERS_VERIFICATION_MANAGE)
  verification(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.updateVerification(
      id,
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // PREMIUM
  // ========================================================================

  @Patch(":id/premium")
  @Permissions(Permission.USERS_PREMIUM_MANAGE)
  premium(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.updatePremium(
      id,
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // FOCKIS ID ACCESS
  // ========================================================================

  @Patch(":id/fockis-id-access")
  @Permissions(Permission.USERS_FOCKIS_ID_MANAGE)
  fockisId(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.updateFockisIdAccess(
      id,
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // ACCOUNT LOCK
  // ========================================================================

  @Post(":id/lock")
  @Permissions(Permission.USERS_LOCK)
  lock(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.users.lock(
      id,
      body,
      req.user,
      req,
    );
  }

  // ========================================================================
  // ACCOUNT UNLOCK
  // ========================================================================

  @Post(":id/unlock")
  @Permissions(Permission.USERS_UNLOCK)
  unlock(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.users.unlock(
      id,
      req.user,
      req,
    );
  }

  // ========================================================================
  // FORCE PASSWORD CHANGE
  // ========================================================================

  @Post(":id/force-password-change")
  @Permissions(Permission.USERS_FORCE_PASSWORD_CHANGE)
  forcePasswordChange(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.users.forcePasswordChange(
      id,
      req.user,
      req,
    );
  }

  // ========================================================================
  // RESET PASSWORD
  // ========================================================================

  @Post(":id/reset-password")
  @Permissions(Permission.USERS_RESET_PASSWORD)
  resetPassword(
    @Param("id") id: string,
    @Req() req: any,
  ) {
    return this.users.resetPassword(
      id,
      req.user,
      req,
    );
  }

  // ========================================================================
  // ACTIVITY
  // ========================================================================

  @Get(":id/activity")
  @Permissions(Permission.USERS_ACTIVITY_VIEW)
  activity(
    @Param("id") id: string,
    @Query() q: any,
  ) {
    return this.users.getActivity(
      id,
      q,
    );
  }

  // ========================================================================
  // MESSAGES
  // ========================================================================

  @Get(":id/messages")
  @Permissions(Permission.USERS_MESSAGES_VIEW)
  messages(
    @Param("id") id: string,
    @Query() q: any,
  ) {
    return this.users.getMessages(
      id,
      q,
    );
  }

  // ========================================================================
  // BOOKINGS
  // ========================================================================

  @Get(":id/bookings")
  @Permissions(Permission.USERS_BOOKINGS_VIEW)
  bookings(
    @Param("id") id: string,
    @Query() q: any,
  ) {
    return this.users.getBookings(
      id,
      q,
    );
  }

  // ========================================================================
  // PAYMENTS
  // ========================================================================

  @Get(":id/payments")
  @Permissions(Permission.USERS_PAYMENTS_VIEW)
  payments(
    @Param("id") id: string,
    @Query() q: any,
  ) {
    return this.users.getPayments(
      id,
      q,
    );
  }

  // ========================================================================
  // REPORTS
  // ========================================================================

  @Get(":id/reports")
  @Permissions(Permission.USERS_REPORTS_VIEW)
  reports(
    @Param("id") id: string,
    @Query() q: any,
  ) {
    return this.users.getReports(
      id,
      q,
    );
  }

  // ========================================================================
  // DOMAINS
  // ========================================================================

  @Get(":id/domains")
  @Permissions(Permission.USERS_DOMAINS_VIEW)
  domains(
    @Param("id") id: string,
  ) {
    return this.users.getDomainSummary(id);
  }
}