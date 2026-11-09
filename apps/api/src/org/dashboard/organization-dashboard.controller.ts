/**
 * organization-dashboard.controller.ts
 * -----------------------------------------------------------------------------
 *   GET  /church/organizations/domain-availability?domain=name.fockis.com  (public)
 *   GET  /church/organizations/:organizationId/dashboard?days=30           (admins)
 *   GET  /church/organizations/:organizationId/members-export              (ViewMembers)
 *   POST /church/organizations/:organizationId/logo                        (UpdateOrganization)
 *
 * Registered before OrganizationsController so "domain-availability" is not
 * read as an organization ID. Authorization lives in the services.
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request, Response } from 'express';

import { OrganizationDashboardService } from './organization-dashboard.service';
import { OrganizationsService } from '../organizations/services/organizations.service';

function userIdOf(req: Request): string {
  const user = (req as any).user as { id?: string; _id?: string; userId?: string } | undefined;
  const id = user?.id ?? user?._id ?? user?.userId;
  if (!id) throw new UnauthorizedException('Sign in to continue.');
  return String(id);
}

@Controller('organizations')
export class OrganizationDashboardController {
  constructor(
    private readonly dashboard: OrganizationDashboardService,
    private readonly organizations: OrganizationsService,
  ) {}

  /** Live check used by the "Create organization" form. The unique index stays the final guard. */
  @Get('domain-availability')
  async domainAvailability(@Query('domain') domain?: string) {
    if (!domain || !domain.trim()) {
      throw new BadRequestException('A Fockis domain is required.');
    }
    try {
      return await this.organizations.checkDomainAvailability(domain);
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response = error.getResponse() as { message?: string | string[] } | string;
        const message =
          typeof response === 'string'
            ? response
            : Array.isArray(response?.message)
              ? response.message.join(' ')
              : response?.message ?? 'Invalid domain.';
        return { domain: domain.trim().toLowerCase(), available: false, valid: false, message };
      }
      throw error;
    }
  }

  @Get(':organizationId/dashboard')
  getDashboard(
    @Param('organizationId') organizationId: string,
    @Query('days') days: string | undefined,
    @Req() req: Request,
  ) {
    return this.dashboard.getDashboard(organizationId, userIdOf(req), days);
  }

  @Get(':organizationId/members-export')
  async exportMembers(
    @Param('organizationId') organizationId: string,
    @Query('status') status: string | undefined,
    @Query('role') role: string | undefined,
    @Query('departmentId') departmentId: string | undefined,
    @Query('search') search: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { filename, csv } = await this.dashboard.exportMembersCsv(organizationId, userIdOf(req), {
      status,
      role,
      departmentId,
      search,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(csv);
  }

  @Post(':organizationId/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadLogo(
    @Param('organizationId') organizationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.dashboard.uploadLogo(organizationId, userIdOf(req), file);
  }
}
