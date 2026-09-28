import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Schemas
import { Category, CategorySchema } from './schemas/create-category.schema';
import { Template, TemplateSchema } from './schemas/create-template.schema';
import { TemplateVersion, TemplateVersionSchema } from './schemas/create-template-version.schema';
import { CreateDocument, CreateDocumentSchema } from './schemas/create-document.schema';
import { DocumentVersion, DocumentVersionSchema } from './schemas/create-document-version.schema';
import { Scan, ScanSchema } from './schemas/create-scan.schema';
import { Asset, AssetSchema } from './schemas/create-asset.schema';

// Controllers
import { CreateCategoryController } from './controllers/create-category.controller';
import { CreateTemplateController } from './controllers/create-template.controller';
import { CreateDocumentController } from './controllers/create-document.controller';
import { CreateScannerController } from './controllers/create-scanner.controller';
import { CreateOcrController } from './controllers/create-ocr.controller';
import { CreatePdfController } from './controllers/create-pdf.controller';
import { CreateAssetController } from './controllers/create-asset.controller';
import { CreateExportController } from './controllers/create-export.controller';
import { CreateAdminController } from './controllers/create-admin.controller';
import { CreateWorkspaceController } from './controllers/create-workspace.controller';

// Services
import { CreateCategoryService } from './services/create-category.service';
import { CreateTemplateService } from './services/create-template.service';
import { CreateDocumentService } from './services/create-document.service';
import { CreateVersionService } from './services/create-version.service';
import { CreateScannerService } from './services/create-scanner.service';
import { CreateOcrService } from './services/create-ocr.service';
import { CreatePdfService } from './services/create-pdf.service';
import { CreateExportService } from './services/create-export.service';
import { CreateAssetService } from './services/create-asset.service';
import { CreatePassportPhotoService } from './services/create-passport-photo.service';
import { CreateBackgroundRemovalService } from './services/create-background-removal.service';
import { StorageService } from './utils/storage.service';

// OCR providers
import { LocalOcrProvider } from './providers/ocr/local-ocr.provider';
import { GoogleOcrProvider } from './providers/ocr/google-ocr.provider';
import { AzureOcrProvider } from './providers/ocr/azure-ocr.provider';
import { HANDWRITING_PROVIDER, OCR_PROVIDER } from './providers/ocr/ocr-provider.token';

// Background removal providers
import { LocalBackgroundRemovalProvider } from './providers/background-removal/local-background-removal.provider';
import { RemoveBgApiProvider } from './providers/background-removal/removebg-api.provider';
import { BACKGROUND_REMOVAL_PROVIDER } from './providers/background-removal/background-removal.interface';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Template.name, schema: TemplateSchema },
      { name: TemplateVersion.name, schema: TemplateVersionSchema },
      { name: CreateDocument.name, schema: CreateDocumentSchema },
      { name: DocumentVersion.name, schema: DocumentVersionSchema },
      { name: Scan.name, schema: ScanSchema },
      { name: Asset.name, schema: AssetSchema },
    ]),
  ],
  controllers: [
    CreateCategoryController,
    CreateTemplateController,
    CreateDocumentController,
    CreateScannerController,
    CreateOcrController,
    CreatePdfController,
    CreateAssetController,
    CreateExportController,
    CreateAdminController,
    CreateWorkspaceController,
  ],
  providers: [
    CreateCategoryService,
    CreateTemplateService,
    CreateDocumentService,
    CreateVersionService,
    CreateScannerService,
    CreateOcrService,
    CreatePdfService,
    CreateExportService,
    CreateAssetService,
    CreatePassportPhotoService,
    CreateBackgroundRemovalService,
    StorageService,

    // Concrete provider implementations, selectable via env var without
    // touching any service or controller code.
    LocalOcrProvider,
    GoogleOcrProvider,
    AzureOcrProvider,
    LocalBackgroundRemovalProvider,
    RemoveBgApiProvider,

    {
      provide: OCR_PROVIDER,
      inject: [ConfigService, LocalOcrProvider, GoogleOcrProvider, AzureOcrProvider],
      useFactory: (config: ConfigService, local: LocalOcrProvider, google: GoogleOcrProvider, azure: AzureOcrProvider) => {
        const provider = config.get<string>('OCR_PROVIDER', 'local');
        if (provider === 'google') return google;
        if (provider === 'azure') return azure;
        return local;
      },
    },
    {
      provide: HANDWRITING_PROVIDER,
      inject: [ConfigService, LocalOcrProvider, GoogleOcrProvider, AzureOcrProvider],
      useFactory: (config: ConfigService, local: LocalOcrProvider, google: GoogleOcrProvider, azure: AzureOcrProvider) => {
        const provider = config.get<string>('HANDWRITING_PROVIDER', 'local');
        if (provider === 'google') return google;
        if (provider === 'azure') return azure;
        return local;
      },
    },
    {
      provide: BACKGROUND_REMOVAL_PROVIDER,
      inject: [ConfigService, LocalBackgroundRemovalProvider, RemoveBgApiProvider],
      useFactory: (config: ConfigService, local: LocalBackgroundRemovalProvider, removebg: RemoveBgApiProvider) => {
        const provider = config.get<string>('BACKGROUND_REMOVAL_PROVIDER', 'local');
        if (provider === 'removebg') return removebg;
        return local;
      },
    },
  ],
  exports: [CreateDocumentService, CreateTemplateService, CreateCategoryService],
})
export class CreateModule {}
