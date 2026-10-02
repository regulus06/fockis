import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PostsController } from './posts.controller';
import { PostMediaController } from './post-media.controller';
import { PostsService } from './posts.service';

import {
  Post,
  PostSchema,
} from './post.schema';

import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Post.name,
        schema: PostSchema,
      },
    ]),

    FriendsModule,
  ],

  controllers: [
    PostsController,
    PostMediaController,
  ],

  providers: [
    PostsService,
  ],

  exports: [
    PostsService,
    MongooseModule,
  ],
})
export class PostsModule {}