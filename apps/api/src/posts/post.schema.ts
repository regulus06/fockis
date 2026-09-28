import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

export type ContentType =
  | 'post'
  | 'wave'
  | 'reel'
  | 'story'
  | 'photo'
  | 'video';

export type ShareDestination =
  | 'friend'
  | 'group'
  | 'copy_link'
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'messenger'
  | 'other';

@Schema({ timestamps: true })
export class Post {
  /*
  |--------------------------------------------------------------------------
  | AUTHOR
  |--------------------------------------------------------------------------
  */

  @Prop({
    required: true,
    type: String,
    ref: 'User',
  })
  user!: string;

  @Prop({ default: '' })
  username!: string;

  @Prop({ default: '' })
  userPhoto!: string;

  /*
  |--------------------------------------------------------------------------
  | CONTENT
  |--------------------------------------------------------------------------
  */

  @Prop({ default: '' })
  content!: string;

  @Prop({
    default: 'post',
    enum: [
      'post',
      'wave',
      'reel',
      'story',
      'photo',
      'video',
    ],
  })
  type!: ContentType;

  @Prop({ default: '' })
  media!: string;

  @Prop({
    default: 'public',
    enum: [
      'public',
      'friends',
      'private',
    ],
  })
  audience!: string;

  /*
  |--------------------------------------------------------------------------
  | COUNTS
  |--------------------------------------------------------------------------
  */

  @Prop({ default: 0 })
  likes!: number;

  @Prop({ default: 0 })
  shares!: number;

  @Prop({ default: 0 })
  reposts!: number;

  @Prop({ default: 0 })
  views!: number;

  @Prop({ default: 0 })
  score!: number;

  /*
  |--------------------------------------------------------------------------
  | GIFTS
  |--------------------------------------------------------------------------
  |
  | Total number of gifts sent to this post.
  |
  | Incremented atomically by PostsService.incrementGiftsCount(),
  | called from GiftsService.sendGift() whenever a gift includes
  | a postId.
  |
  */

  @Prop({ default: 0 })
  giftsCount!: number;

  /*
  |--------------------------------------------------------------------------
  | LIKE TRACKING
  |--------------------------------------------------------------------------
  |
  | One user can only have one active like.
  |
  */

  @Prop({
    type: [String],
    default: [],
  })
  likedBy!: string[];

  /*
  |--------------------------------------------------------------------------
  | REPOST TRACKING
  |--------------------------------------------------------------------------
  |
  | Unlike likedBy, this is NOT deduped - a user can repost the
  | same post multiple times, same pattern as shareEvents. Every
  | repost pushes the user's id here, and `reposts` is just this
  | array's length (duplicates included on purpose).
  |
  */

  @Prop({
    type: [String],
    default: [],
  })
  repostedBy!: string[];

  /*
  |--------------------------------------------------------------------------
  | VIEW TRACKING
  |--------------------------------------------------------------------------
  |
  | One user only counts once as a view.
  |
  */

  @Prop({
    type: [String],
    default: [],
  })
  viewedBy!: string[];

  /*
  |--------------------------------------------------------------------------
  | SHARE EVENTS
  |--------------------------------------------------------------------------
  |
  | Every share is recorded.
  |
  | A user can share the same post multiple times.
  |
  | Example:
  |
  | User 123
  |   -> Friend
  |   -> Group
  |   -> Copy Link
  |   -> WhatsApp
  |   -> Facebook
  |
  | All of those count as separate share events.
  |
  */

  @Prop({
    type: [
      {
        userId: {
          type: String,
          required: true,
        },

        destination: {
          type: String,
          required: true,
          enum: [
            'friend',
            'group',
            'copy_link',
            'whatsapp',
            'facebook',
            'instagram',
            'x',
            'messenger',
            'other',
          ],
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  })
  shareEvents!: {
    userId: string;
    destination: ShareDestination;
    createdAt: Date;
  }[];

  /*
  |--------------------------------------------------------------------------
  | COMMENTS
  |--------------------------------------------------------------------------
  */

  @Prop({
    type: [
      {
        userId: {
          type: String,
          required: true,
        },

        username: {
          type: String,
          default: '',
        },

        userPhoto: {
          type: String,
          default: '',
        },

        content: {
          type: String,
          required: true,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  })
  comments!: {
    userId: string;
    username: string;
    userPhoto: string;
    content: string;
    createdAt: Date;
  }[];

  /*
  |--------------------------------------------------------------------------
  | GROUP
  |--------------------------------------------------------------------------
  */

  @Prop({ default: null })
  groupId?: string;
}

export const PostSchema =
  SchemaFactory.createForClass(Post);