/**
 * organization-public-links.controller.ts   (all under /church)
 * -----------------------------------------------------------------------------
 * Public (no sign-in):
 *   GET /public/organizations/resolve/:name     name, old name or ID → { organizationId, handle, redirect }
 *   GET /public/organizations/by-host?host=     an organization's own Fockis address
 *   GET /public/sitemap.xml                      every public organization, for search engines
 *   GET /public/share/:name                      link-preview page (WhatsApp, Facebook…)
 *   GET /organizations/:id/public-link          current link
 *
 * Owner only:
 *   GET /organizations/:id/public-link/check?handle=
 *   PUT /organizations/:id/public-link           { handle }
 * -----------------------------------------------------------------------------
 */

import { Body, Controller, Get, Header, Param, Put, Query, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { Public } from "../../../auth/public.decorator";
import { userIdOf } from "../../communities/communities.controller";
import { OrganizationHandlesService } from "../services/organization-handles.service";

@Controller()
export class OrganizationPublicLinksController {
  constructor(private readonly handles: OrganizationHandlesService) {}

  @Public()
  @Get("public/organizations/resolve/:name")
  resolve(@Param("name") name: string) {
    return this.handles.resolve(name);
  }

  @Public()
  @Get("public/organizations/by-host")
  byHost(@Query("host") host: string) {
    return this.handles.resolveHost(String(host ?? ""));
  }

  @Public()
  @Get("public/sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  @Header("Cache-Control", "public, max-age=3600")
  sitemap() {
    return this.handles.sitemap();
  }

  @Public()
  @Get("public/share/:name")
  async share(@Param("name") name: string, @Res() res: Response) {
    const { html, status } = await this.handles.share(name);
    res.status(status).setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=600");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(html);
  }

  @Public()
  @Get("organizations/:organizationId/public-link")
  link(@Param("organizationId") organizationId: string) {
    return this.handles.linkInfo(organizationId);
  }

  @Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
  @Get("organizations/:organizationId/public-link/check")
  check(@Param("organizationId") organizationId: string, @Query("handle") handle: string, @Req() req: Request) {
    return this.handles.check(organizationId, userIdOf(req), handle);
  }

  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Put("organizations/:organizationId/public-link")
  rename(@Param("organizationId") organizationId: string, @Body() body: { handle?: unknown }, @Req() req: Request) {
    return this.handles.rename(organizationId, userIdOf(req), body?.handle);
  }
}
