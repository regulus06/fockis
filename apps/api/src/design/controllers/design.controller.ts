// ============================================================================
// FOCKIS DESIGN STUDIO - DESIGN CONTROLLER
// ============================================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import type { Request } from "express";

import { CreateDesignDto } from "../dto/create-design.dto";
import { CreateDesignFromTemplateDto } from "../dto/create-design-from-template.dto";
import { UpdateDesignDto } from "../dto/update-design.dto";

import { DesignService } from "../services/design.service";
import { DesignTemplateService } from "../services/design-template.service";

import type { DesignCategory } from "../types/design.types";

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller("document-scanner/design")
export class DesignController {
  constructor(
    private readonly service: DesignService,
    private readonly templateService: DesignTemplateService,
  ) {}

  // ==========================================================================
  // AUTHENTICATED USER
  // ==========================================================================

  private getUserId(req: Request): string {
    const user = (req as any).user;

    const id =
      user?.sub ??
      user?.id ??
      user?._id;

    if (!id) {
      throw new UnauthorizedException(
        "Authenticated user required",
      );
    }

    return String(id);
  }

  // ==========================================================================
  // CREATE DESIGN
  // ==========================================================================
  // POST /document-scanner/design
  // ==========================================================================

  @Post()
  create(
    @Req() req: Request,
    @Body() dto: CreateDesignDto,
  ) {
    return this.service.create(
      this.getUserId(req),
      dto,
    );
  }

  // ==========================================================================
  // CREATE DESIGN FROM TEMPLATE
  // ==========================================================================
  // POST /document-scanner/design/from-template
  // ==========================================================================

  @Post("from-template")
  createFromTemplate(
    @Req() req: Request,
    @Body() dto: CreateDesignFromTemplateDto,
  ) {
    return this.service.createFromTemplate(
      this.getUserId(req),
      dto,
    );
  }

  // ==========================================================================
  // GET DESIGN TEMPLATES
  // ==========================================================================
  // GET /document-scanner/design/templates
  //
  // IMPORTANT:
  // This route is intentionally declared before /:id.
  // ==========================================================================

  @Get("templates")
  getTemplates(
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("premium") premium?: string,
    @Query("popular") popular?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.templateService.list({
      category:
        category && category !== "all"
          ? (category as DesignCategory)
          : undefined,

      search,

      premium:
        premium === undefined
          ? undefined
          : premium === "true",

      popular:
        popular === undefined
          ? undefined
          : popular === "true",

      page:
        page !== undefined
          ? Number(page)
          : undefined,

      limit:
        limit !== undefined
          ? Number(limit)
          : undefined,
    });
  }

  // ==========================================================================
  // LIST MY DESIGNS
  // ==========================================================================
  // GET /document-scanner/design
  // ==========================================================================

  @Get()
  list(
    @Req() req: Request,
    @Query("search") search?: string,
    @Query("category") category?: string,
    @Query("favorite") favorite?: string,
    @Query("archived") archived?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.service.listMine(
      this.getUserId(req),
      {
        search,
        category,

        favorite:
          favorite === undefined
            ? undefined
            : favorite === "true",

        archived:
          archived === undefined
            ? undefined
            : archived === "true",

        page:
          page !== undefined
            ? Number(page)
            : undefined,

        limit:
          limit !== undefined
            ? Number(limit)
            : undefined,
      },
    );
  }

  // ==========================================================================
  // GET SINGLE DESIGN
  // ==========================================================================
  // GET /document-scanner/design/:id
  // ==========================================================================

  @Get(":id")
  get(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.service.getMine(
      this.getUserId(req),
      id,
    );
  }

  // ==========================================================================
  // UPDATE DESIGN
  // ==========================================================================
  // PATCH /document-scanner/design/:id
  // ==========================================================================

  @Patch(":id")
  update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateDesignDto,
  ) {
    return this.service.update(
      this.getUserId(req),
      id,
      dto,
    );
  }

  // ==========================================================================
  // DELETE DESIGN
  // ==========================================================================
  // DELETE /document-scanner/design/:id
  // ==========================================================================

  @Delete(":id")
  remove(
    @Req() req: Request,
    @Param("id") id: string,
  ) {
    return this.service.remove(
      this.getUserId(req),
      id,
    );
  }
}