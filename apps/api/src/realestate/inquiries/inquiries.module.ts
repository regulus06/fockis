import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Inquiry,
  InquirySchema,
} from './schemas/inquiry.schema';

import { InquiryService } from './services/inquiry.service';
import { InquiryController } from './controllers/inquiry.controller';


@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Inquiry.name,
        schema: InquirySchema,
      },
    ]),
  ],

  controllers: [
    InquiryController,
  ],

  providers: [
    InquiryService,
  ],

  exports: [
    InquiryService,
  ],
})
export class InquiriesModule {}