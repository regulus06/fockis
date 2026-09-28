import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

// ============================================================================
// DESIGN MODULE
// ============================================================================

import { DesignModule } from "../design/design.module";

// ============================================================================
// SCHEMA
// ============================================================================

import {
  ScannedDocument,
  ScannedDocumentSchema,
} from "./schemas/scanned-document.schema";

// ============================================================================
// CONTROLLERS
// ============================================================================

import { DocumentScannerController } from "./controllers/document-scanner.controller";
import { DocumentOcrController } from "./controllers/document-ocr.controller";
import { DocumentPdfController } from "./controllers/document-pdf.controller";
import { DocumentProcessingController } from "./controllers/document-processing.controller";
import { DocumentHistoryController } from "./controllers/document-history.controller";

// ============================================================================
// SERVICES
// ============================================================================

import { DocumentScannerService } from "./services/document-scanner.service";
import { DocumentOcrService } from "./services/document-ocr.service";
import { DocumentProcessingService } from "./services/document-processing.service";
import { DocumentPdfService } from "./services/document-pdf.service";
import { DocumentHistoryService } from "./services/document-history.service";

// ============================================================================
// MODULE
// ============================================================================

@Module({
  imports: [
    // ------------------------------------------------------------------------
    // DESIGN MODULE
    //
    // DesignService and DesignTemplateService are owned by DesignModule.
    // Do NOT register DesignService directly in this module.
    // ------------------------------------------------------------------------

    DesignModule,

    // ------------------------------------------------------------------------
    // DOCUMENT SCANNER DATABASE
    // ------------------------------------------------------------------------

    MongooseModule.forFeature([
      {
        name: ScannedDocument.name,
        schema: ScannedDocumentSchema,
      },
    ]),
  ],

  // ==========================================================================
  // CONTROLLERS
  // ==========================================================================

  controllers: [
    DocumentScannerController,
    DocumentOcrController,
    DocumentPdfController,
    DocumentProcessingController,
    DocumentHistoryController,
  ],

  // ==========================================================================
  // PROVIDERS
  // ==========================================================================

  providers: [
    DocumentScannerService,
    DocumentOcrService,
    DocumentProcessingService,
    DocumentPdfService,
    DocumentHistoryService,
  ],

  // ==========================================================================
  // EXPORTS
  // ==========================================================================

  exports: [
    DocumentScannerService,
    DocumentOcrService,
    DocumentProcessingService,
    DocumentPdfService,
    DocumentHistoryService,
  ],
})
export class DocumentScannerModule {}