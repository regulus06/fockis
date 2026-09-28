import { Module } from "@nestjs/common";

import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";

import { PostsModule } from "../posts/posts.module";
import { StoriesModule } from "../stories/stories.module";
import { WavesModule } from "../waves/waves.module";

@Module({
  imports: [
    PostsModule,
    StoriesModule,

    // Required for the unified feed
    WavesModule,
  ],

  controllers: [
    FeedController,
  ],

  providers: [
    FeedService,
  ],
})
export class FeedModule {}