/* ============================================================================
   ORGANIZATION EVENTS
   apps/api/src/events/controllers/organization-events.controller.ts

   GET  /events/organization/:organizationId          public: the events this
                                                      viewer may see (homepage)
   GET  /events/organization/:organizationId/manage   event managers: every
                                                      event, tab counts and
                                                      registration counts
   POST /events/:id/archive | /events/:id/restore     event managers
   GET|PUT /events/organization/:organizationId/catalog
                                                      event managers: event
                                                      types, categories,
                                                      locations, templates

   Creating / editing / cancelling use the existing /events endpoints with an
   organizationId; EventsService checks the organization permission.
============================================================================ */

import { BadRequestException, Body, Controller, Get, Header, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { EventsService } from "../services/events.service";
import { OrganizationEventCatalogService } from "../services/organization-event-catalog.service";
import { Public } from "../../auth/public.decorator";
import { OptionalJwtAuthGuard } from "../../auth/optional-jwt-auth.guard";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

function userIdOf(req: Request): string | undefined {
  const user = (req as { user?: { id?: string; _id?: string; userId?: string; sub?: string } }).user;
  const id = user?.id ?? user?._id ?? user?.userId ?? user?.sub;
  return id ? String(id) : undefined;
}

function requireUser(req: Request): string {
  const id = userIdOf(req);
  if (!id) throw new BadRequestException("Sign in to continue.");
  return id;
}

@Controller("events")
export class OrganizationEventsController {
  constructor(
    private readonly events: EventsService,
    private readonly catalog: OrganizationEventCatalogService,
  ) {}

  @Get("organization/:organizationId")
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Header("Cache-Control", "no-store")
  list(@Req() req: Request, @Param("organizationId") organizationId: string, @Query("includePast") includePast?: string) {
    return this.events.organizationEvents(organizationId, userIdOf(req), includePast === "true");
  }

  @Get("organization/:organizationId/manage")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  manage(
    @Req() req: Request,
    @Param("organizationId") organizationId: string,
    @Query("tab") tab?: string,
    @Query("search") search?: string,
    @Query("type") type?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.events.manageOrganizationEvents(organizationId, requireUser(req), {
      tab,
      search,
      type,
      page: Number(page) || 1,
      limit: Number(limit) || 25,
    });
  }

  @Get("organization/:organizationId/catalog")
  @UseGuards(JwtAuthGuard)
  @Header("Cache-Control", "no-store")
  getCatalog(@Req() req: Request, @Param("organizationId") organizationId: string) {
    return this.catalog.get(organizationId, requireUser(req));
  }

  @Put("organization/:organizationId/catalog")
  @UseGuards(JwtAuthGuard)
  saveCatalog(@Req() req: Request, @Param("organizationId") organizationId: string, @Body() body: Record<string, unknown>) {
    return this.catalog.save(organizationId, requireUser(req), body && typeof body === "object" ? body : {});
  }

  @Post(":id/archive")
  @UseGuards(JwtAuthGuard)
  archive(@Req() req: Request, @Param("id") id: string) {
    return this.events.archive(requireUser(req), id, true);
  }

  @Post(":id/restore")
  @UseGuards(JwtAuthGuard)
  restore(@Req() req: Request, @Param("id") id: string) {
    return this.events.archive(requireUser(req), id, false);
  }
}
