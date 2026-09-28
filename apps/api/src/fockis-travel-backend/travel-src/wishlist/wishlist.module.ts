import {
  Module,
} from '@nestjs/common';

import {
  MongooseModule,
} from '@nestjs/mongoose';

import {
  Wishlist,
  WishlistSchema,
} from './wishlist.schema';

import {
  WishlistController,
} from './wishlist.controller';

import {
  WishlistService,
} from './wishlist.service';

import {
  Listing,
  ListingSchema,
} from '../listings/listing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Wishlist.name,
        schema: WishlistSchema,
      },
      {
        name: Listing.name,
        schema: ListingSchema,
      },
    ]),
  ],

  controllers: [
    WishlistController,
  ],

  providers: [
    WishlistService,
  ],

  exports: [
    WishlistService,
  ],
})
export class WishlistModule {}