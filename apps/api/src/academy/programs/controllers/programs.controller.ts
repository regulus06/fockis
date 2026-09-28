import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

// ============================================================================
// SERVICE
// ============================================================================

import { ProgramsService } from "../services/programs.service";

// ============================================================================
// DTOs
// ============================================================================

import { CreateProgramDto } from "../dto/create-program.dto";
import { UpdateProgramDto } from "../dto/update-program.dto";

// ============================================================================
// SCHEMA TYPES
// ============================================================================

import type { ProgramCategory } from "../schemas/program.schema";

// ============================================================================
// ACADEMY AUTH
// ============================================================================

import { AcademyJwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";

// ============================================================================
// ACADEMY PROGRAMS CONTROLLER
// ============================================================================
//
// Public endpoints:
//
//   GET    /academy/programs
//   GET    /academy/programs/:slug
//   GET    /academy/programs/:slug/curriculum
//
// Protected endpoints:
//
//   POST   /academy/programs
//   PATCH  /academy/programs/:slug
//   DELETE /academy/programs/:slug
//
// Required roles for protected endpoints:
//
//   administrator
//   staff
// ============================================================================

@Controller("academy/programs")
export class ProgramsController {
  constructor(
    private readonly programsService: ProgramsService,
  ) {}

  // ==========================================================================
  // GET ALL PROGRAMS
  // ==========================================================================

  @Get()
  findAll(
    @Query("cat") cat?: ProgramCategory,
  ) {
    return this.programsService.findAll(cat);
  }

  // ==========================================================================
  // GET PROGRAM BY SLUG
  // ==========================================================================

  @Get(":slug")
  findOne(
    @Param("slug") slug: string,
  ) {
    return this.programsService.findBySlug(slug);
  }

  // ==========================================================================
  // GET PROGRAM CURRICULUM
  // ==========================================================================

  @Get(":slug/curriculum")
  curriculum(
    @Param("slug") slug: string,
  ) {
    return this.programsService.getCurriculum(slug);
  }

  // ==========================================================================
  // CREATE PROGRAM
  // ==========================================================================

  @Post()
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    "administrator",
    "staff",
  )
  create(
    @Body() dto: CreateProgramDto,
  ) {
    return this.programsService.create(dto);
  }

  // ==========================================================================
  // UPDATE PROGRAM
  // ==========================================================================

  @Patch(":slug")
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    "administrator",
    "staff",
  )
  update(
    @Param("slug") slug: string,
    @Body() dto: UpdateProgramDto,
  ) {
    return this.programsService.update(
      slug,
      dto,
    );
  }

  // ==========================================================================
  // DELETE PROGRAM
  // ==========================================================================

  @Delete(":slug")
  @UseGuards(
    AcademyJwtAuthGuard,
    RolesGuard,
  )
  @Roles(
    "administrator",
    "staff",
  )
  remove(
    @Param("slug") slug: string,
  ) {
    return this.programsService.remove(slug);
  }
}