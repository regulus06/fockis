import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsModule } from '../payments/payments.module';
import { WEBSITE_STUDIO_MODELS } from './schemas/website-studio.schemas';
import { TemplatesService } from './templates/templates.service';
import { WebsitesService } from './websites/websites.service';
import { DomainsService } from './domains/domains.service';
import { MediaService } from './media/media.service';
import { CommerceService } from './business/commerce.service';
import { SubmissionsService } from './business/submissions.service';
import { WebsiteAiService } from './ai/website-ai.service';
import { WebsiteStudioCatalogController, WebsitesController } from './controllers/studio.controller';
import { PublicSitesController } from './controllers/public-sites.controller';
import { WebsiteStudioAdminController } from './controllers/admin.controller';

/**
 * FOCKIS WEBSITE STUDIO
 *
 * Independent module: own collections (website_studio_*), own routes
 * (/website-studio/*). Reuses existing Fockis infrastructure:
 *  - authentication (global JwtAuthGuard / RbacGuard),
 *  - payments (UniversalPaymentService from PaymentsModule),
 *  - media uploads (/uploads pipeline, called from the frontend),
 *  - organizations (read-only ownership checks).
 */
@Module({
  imports: [MongooseModule.forFeature(WEBSITE_STUDIO_MODELS), PaymentsModule],
  controllers: [WebsiteStudioCatalogController, WebsitesController, PublicSitesController, WebsiteStudioAdminController],
  providers: [TemplatesService, WebsitesService, DomainsService, MediaService, CommerceService, SubmissionsService, WebsiteAiService],
  exports: [WebsitesService, TemplatesService, WebsiteAiService],
})
export class WebsiteStudioModule {}
