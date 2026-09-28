import {
  Module,
} from '@nestjs/common';

import {
  MongooseModule,
} from '@nestjs/mongoose';

import {
  Review,
  ReviewSchema,
} from './review.schema';

import {
  Listing,
  ListingSchema,
} from '../listings/listing.schema';

import {
  ReviewController,
} from './reviews.controller';

import {
  ReviewService,
} from './reviews.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Review.name,
        schema: ReviewSchema,
      },
      {
        name: Listing.name,
        schema: ListingSchema,
      },
    ]),
  ],

  controllers: [
    ReviewController,
  ],

  providers: [
    ReviewService,
  ],

  exports: [
    ReviewService,
  ],
})
export class ReviewsModule {}