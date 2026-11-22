/**
 * news.module.ts — Fockis News & Media.
 *
 * Reuses existing Fockis infrastructure: authentication (global guards),
 * UniversalPaymentService (Stripe), NotificationsService, Website Studio
 * (media websites, templates, domains, versions, AI copywriting) and the
 * existing /uploads pipeline (called from the web app).
 */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { WebsiteStudioModule } from '../website-studio/website-studio.module';
import { NEWS_MODELS } from './news.schemas';
import { NewsAccessService } from './news-access.service';
import { NewsPublicService } from './news-public.service';
import { NewsroomService } from './newsroom.service';
import { NewsSupportService } from './news-support.service';
import { NewsPublicController, NewsReaderController, NewsroomController } from './news.controller';

@Module({
  imports: [MongooseModule.forFeature(NEWS_MODELS), NotificationsModule, forwardRef(() => PaymentsModule), WebsiteStudioModule],
  controllers: [NewsPublicController, NewsReaderController, NewsroomController],
  providers: [NewsAccessService, NewsPublicService, NewsroomService, NewsSupportService],
  exports: [NewsPublicService],
})
export class NewsModule {}
