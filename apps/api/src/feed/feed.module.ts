import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

import { Post, PostSchema } from '../posts/post.schema';
import { StoriesModule } from '../stories/stories.module';
import { FriendsModule } from '../friends/friends.module';
import { EventsModule } from '../events/events.module';

/**
 * Fockis Feed Module
 *
 * Registers the Post model locally for FeedService, exposes the feed
 * controller, and imports the modules that provide story retrieval,
 * block/visibility checks and event recommendations.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Post.name,
        schema: PostSchema,
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
