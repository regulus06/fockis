import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// ============================================================================
// SCHEMA
// ============================================================================

import {
  Program,
  ProgramSchema,
} from "./schemas/program.schema";

// ============================================================================
// SERVICE
// ============================================================================

import { ProgramsService } from "./services/programs.service";

// ============================================================================
// CONTROLLER
// ============================================================================

import { ProgramsController } from "./controllers/programs.controller";

// ============================================================================
// PROGRAMS MODULE
// ============================================================================

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Program.name,
        schema: ProgramSchema,
      },
    ]),
  ],

  controllers: [
    ProgramsController,
  ],

  providers: [
    ProgramsService,
  ],

  exports: [
    ProgramsService,
  ],
})
export class ProgramsModule {}