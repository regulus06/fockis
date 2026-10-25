import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

import { Post, PostSchema } from '../posts/post.schema';
import {
  Product,
  ProductSchema,
} from '../fockis-shop/products/schemas/product.schema';

import { StoriesModule } from '../stories/stories.module';
import { FriendsModule } from '../friends/friends.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Post.name,
        schema: PostSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),
    StoriesModule,
    FriendsModule,
    EventsModule,
  ],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
