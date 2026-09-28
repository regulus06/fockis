// ============================================================================
// FOCKIS DESIGN STUDIO MODULE
// ============================================================================

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// ============================================================================
// CONTROLLERS
// ============================================================================

import { DesignController } from "./controllers/design.controller";
import { DesignTemplateController } from "./controllers/design-template.controller";
import { MyDesignsController } from "./controllers/my-designs.controller";

// ============================================================================
// SERVICES
// ============================================================================

import { DesignService } from "./services/design.service";
import { DesignTemplateService } from "./services/design-template.service";

// ============================================================================
// SCHEMAS
// ============================================================================

import {
  Design,
  DesignSchema,
} from "./schemas/design.schema";

import {
  DesignTemplate,
  DesignTemplateSchema,
} from "./schemas/design-template.schema";

// ============================================================================
// MODULE
// ============================================================================

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Design.name,
        schema: DesignSchema,
      },
      {
        name: DesignTemplate.name,
        schema: DesignTemplateSchema,
      },
    ]),
  ],

  controllers: [
    DesignController,
    DesignTemplateController,
    MyDesignsController,
  ],

  providers: [
    DesignService,
    DesignTemplateService,
  ],

  exports: [
    DesignService,
    DesignTemplateService,
  ],
})
export class DesignModule {}