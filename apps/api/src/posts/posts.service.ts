import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  Post,
  PostDocument,
  ShareDestination,
} from './post.schema';

import {
  calculateViralScore,
} from './utils/viral-score';

import { BlockVisibilityService } from '../friends/services/block-visibility.service';

/*
 * Viral-score safety guard
 *
 * Some existing posts can contain missing/undefined numeric engagement
 * fields. The viral-score formula can therefore produce NaN for those
 * older documents. Mongoose rejects NaN for the numeric `score` field,
 * which turns comment creation/edit/delete into HTTP 500 errors.
 *
 * Keep the existing scoring formula, but never write NaN/Infinity to MongoDB.
 */
function safeViralScore(post: PostDocument): number {
  const score = calculateViralScore(post);

  return Number.isFinite(score) ? score : 0;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name)
    private readonly model: Model<PostDocument>,

    private readonly blockVisibilityService: BlockVisibilityService,
  ) {}

  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */

  create(data: any) {
    return this.model.create(data);
  }

  /*
  |--------------------------------------------------------------------------
  | FIND ALL
  |--------------------------------------------------------------------------
  */

  /**
   * FIND POSTS
   *
   * IMPORTANT:
   *
   * - GET /posts
   *     Returns the normal public feed.
   *
   * - GET /posts?userId=USER_ID
   * - GET /posts/user/USER_ID
   *     Returns ONLY posts owned by that user.
   *
   * This distinction is important for profile pages. A profile must
   * never receive another user's posts just because those posts are
   * public.
   */
  async findAll(
    userId?: string,
    currentUserId?: string,
  ) {
    /*
     * PROFILE MODE
     *
     * When a profile owner is supplied, first make sure the viewer is
     * not blocked by that profile owner (or vice versa).
     */
    if (userId) {
      if (currentUserId) {
        const canView =
          await this.blockVisibilityService.canView(
            String(currentUserId),
            String(userId),
          );

        if (!canView) {
          return [];
        }
      }

      return this.model
        .find({
          user: userId,
        })
        .sort({
          createdAt: -1,
        })
        .exec();
    }

    /*
     * NORMAL FEED MODE
     *
     * Keep public-feed behavior, but remove posts belonging to users
     * blocked by the current viewer.
     */
    const posts = await this.model
      .find({
        audience: 'public',
      })
      .sort({
        createdAt: -1,
      })
      .exec();

    if (!currentUserId || posts.length === 0) {
      return posts;
    }

    const visiblePosts = await Promise.all(
      posts.map(async (post) => {
        const ownerId =
          typeof post.user === 'object' && post.user !== null
            ? String((post.user as any)._id ?? (post.user as any).id ?? '')
            : String(post.user ?? '');

        if (!ownerId) {
          return post;
        }

        const canView =
          await this.blockVisibilityService.canView(
            String(currentUserId),
            ownerId,
          );

        return canView ? post : null;
      }),
    );

    return visiblePosts.filter(
      (post) => post !== null,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | FIND ONE
  |--------------------------------------------------------------------------
  */

  async findOne(
    id: string,
    currentUserId?: string,
  ) {
    const post =
      await this.model.findById(id).exec();

    if (!post) {
      return null;
    }

    if (currentUserId) {
      const ownerId =
        typeof post.user === 'object' && post.user !== null
          ? String((post.user as any)._id ?? (post.user as any).id ?? '')
          : String(post.user ?? '');

      if (ownerId) {
        const canView =
          await this.blockVisibilityService.canView(
            String(currentUserId),
            ownerId,
          );

        if (!canView) {
          throw new ForbiddenException(
            'You cannot view this post.',
          );
        }
      }
    }

    return post;
  }

  /*
  |--------------------------------------------------------------------------
  | LIKE / UNLIKE
  |--------------------------------------------------------------------------
  |
  | One user can only have one
  | active like.
  |
  | Click 1:
  |   +1
  |
  | Click 2:
  |   -1
  |
  */

  async like(
    id: string,
    userId: string,
  ) {
    const post =
      await this.model.findById(
        id,
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    const alreadyLiked =
      post.likedBy.includes(
        userId,
      );

    if (alreadyLiked) {
      /*
      |--------------------------------------------------------------------------
      | UNLIKE
      |--------------------------------------------------------------------------
      */

      await this.model.updateOne(
        {
          _id: id,
        },

        {
          $pull: {
            likedBy:
              userId,
          },
        },
      );
    } else {
      /*
      |--------------------------------------------------------------------------
      | LIKE
      |--------------------------------------------------------------------------
      */

      await this.model.updateOne(
        {
          _id: id,
        },

        {
          $addToSet: {
            likedBy:
              userId,
          },
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | GET UPDATED POST
    |--------------------------------------------------------------------------
    */

    const updatedPost =
      await this.model.findById(
        id,
      );

    if (!updatedPost) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    updatedPost.likes =
      updatedPost.likedBy.length;

    updatedPost.score =
      safeViralScore(
        updatedPost,
      );

    await updatedPost.save();

    return {
      post:
        updatedPost,

      liked:
        !alreadyLiked,

      likes:
        updatedPost.likes,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | REPOST
  |--------------------------------------------------------------------------
  |
  | Unlike like/unlike, a user CAN repost the same post
  | multiple times - every click counts as a new repost,
  | same pattern as share.
  |
  */

  async repost(
    id: string,
    userId: string,
  ) {
    const post =
      await this.model.findById(
        id,
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    post.repostedBy.push(
      userId,
    );

    post.reposts =
      post.repostedBy.length;

    post.score =
      safeViralScore(
        post,
      );

    const savedPost =
      await post.save();

    return {
      post:
        savedPost,

      reposted:
        true,

      reposts:
        savedPost.reposts,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | VIEW
  |--------------------------------------------------------------------------
  |
  | One user only counts once.
  |
  */

  async view(
    id: string,
    userId: string,
  ) {
    const post =
      await this.model.findById(
        id,
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    const alreadyViewed =
      post.viewedBy.includes(
        userId,
      );

    if (!alreadyViewed) {
      post.viewedBy.push(
        userId,
      );

      post.views =
        post.viewedBy.length;
    }

    post.score =
      safeViralScore(
        post,
      );

    return post.save();
  }

  /*
  |--------------------------------------------------------------------------
  | SHARE
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | A user CAN share the same
  | post multiple times.
  |
  | Every share creates a new
  | share event.
  |
  */

  async share(
    id: string,
    userId: string,
    destination: ShareDestination,
  ) {
    const post =
      await this.model.findById(
        id,
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    /*
    |--------------------------------------------------------------------------
    | ADD SHARE EVENT
    |--------------------------------------------------------------------------
    */

    post.shareEvents.push({
      userId,

      destination,

      createdAt:
        new Date(),
    });

    /*
    |--------------------------------------------------------------------------
    | INCREASE SHARE COUNT
    |--------------------------------------------------------------------------
    */

    post.shares =
      post.shareEvents.length;

    /*
    |--------------------------------------------------------------------------
    | UPDATE VIRAL SCORE
    |--------------------------------------------------------------------------
    */

    post.score =
      safeViralScore(
        post,
      );

    const savedPost =
      await post.save();

    return {
      post:
        savedPost,

      shared:
        true,

      destination,

      shares:
        savedPost.shares,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | COMMENT
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | The frontend needs the UPDATED POST after creating a comment.
  |
  | The previous implementation returned only:
  |
  |     post.save()
  |
  | which caused the response shape to be different from the other
  | post actions.
  |
  | We now return:
  |
  |     post
  |     comment
  |     comments
  |     commentsCount
  |
  | This allows the feed to immediately update:
  |
  |     Comment 0 -> Comment 1 -> Comment 2 -> ...
  |
  |--------------------------------------------------------------------------
  */

  async comment(
    id: string,
    body: {
      userId: string;
      username?: string;
      userPhoto?: string;
      content: string;
    },
  ) {
    const post =
      await this.model.findById(
        id,
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    const content =
      body.content?.trim();

    if (!content) {
      throw new ForbiddenException(
        'Comment content is required',
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE COMMENT
    |--------------------------------------------------------------------------
    */

    const newComment = {
      userId:
        body.userId,

      username:
        body.username || '',

      userPhoto:
        body.userPhoto || '',

      content,

      createdAt:
        new Date(),
    };

    /*
    |--------------------------------------------------------------------------
    | ADD COMMENT TO POST
    |--------------------------------------------------------------------------
    */

    post.comments.push(
      newComment,
    );

    /*
    |--------------------------------------------------------------------------
    | UPDATE VIRAL SCORE
    |--------------------------------------------------------------------------
    */

    post.score =
      safeViralScore(
        post,
      );

    /*
    |--------------------------------------------------------------------------
    | SAVE UPDATED POST
    |--------------------------------------------------------------------------
    */

    const savedPost =
      await post.save();

    /*
    |--------------------------------------------------------------------------
    | GET COMPLETE COMMENTS ARRAY
    |--------------------------------------------------------------------------
    |
    | Mongoose returns the updated comments array after save().
    |
    */

    const comments =
      savedPost.comments || [];

    /*
    |--------------------------------------------------------------------------
    | GET THE COMMENT THAT WAS JUST CREATED
    |--------------------------------------------------------------------------
    */

    const latestComment =
      comments[
        comments.length - 1
      ];

    /*
    |--------------------------------------------------------------------------
    | RETURN EVERYTHING THE FRONTEND NEEDS
    |--------------------------------------------------------------------------
    */

    return {
      post:
        savedPost,

      comment:
        latestComment,

      comments,

      commentsCount:
        comments.length,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | EDIT COMMENT
  |--------------------------------------------------------------------------
  */

  async editComment(
    id: string,
    commentIndex: number,
    userId: string,
    content: string,
  ) {
    const post =
      await this.model.findById(
        id,
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    const comments = post.comments || [];

    if (
      commentIndex < 0 ||
      commentIndex >= comments.length
    ) {
      throw new NotFoundException(
        'Comment not found',
      );
    }

    const comment =
      comments[commentIndex];

    const commentUserId =
      String(
        comment.userId ?? '',
      );

    const postOwnerId =
      String(
        post.user ?? '',
      );

    if (
      commentUserId !== String(userId) &&
      postOwnerId !== String(userId)
    ) {
      throw new ForbiddenException(
        'You are not allowed to edit this comment',
      );
    }

    const trimmedContent =
      content.trim();

    if (!trimmedContent) {
      throw new ForbiddenException(
        'Comment content is required',
      );
    }

    comment.content =
      trimmedContent;

    post.score =
      safeViralScore(
        post,
      );

    const savedPost =
      await post.save();

    const updatedComments =
      savedPost.comments || [];

    return {
      post: savedPost,
      comment:
        updatedComments[
          commentIndex
        ],
      comments:
        updatedComments,
      commentsCount:
        updatedComments.length,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE COMMENT
  |--------------------------------------------------------------------------
  */

  async deleteComment(
    id: string,
    commentIndex: number,
    userId: string,
  ) {
    const post =
      await this.model.findById(
        id,
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    const comments = post.comments || [];

    if (
      commentIndex < 0 ||
      commentIndex >= comments.length
    ) {
      throw new NotFoundException(
        'Comment not found',
      );
    }

    const comment =
      comments[commentIndex];

    const commentUserId =
      String(
        comment.userId ?? '',
      );

    const postOwnerId =
      String(
        post.user ?? '',
      );

    if (
      commentUserId !== String(userId) &&
      postOwnerId !== String(userId)
    ) {
      throw new ForbiddenException(
        'You are not allowed to delete this comment',
      );
    }

    comments.splice(
      commentIndex,
      1,
    );

    post.score =
      safeViralScore(
        post,
      );

    const savedPost =
      await post.save();

    const updatedComments =
      savedPost.comments || [];

    return {
      post: savedPost,
      comments:
        updatedComments,
      commentsCount:
        updatedComments.length,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | INCREMENT GIFTS COUNT
  |--------------------------------------------------------------------------
  |
  | Called by GiftsService whenever a gift is sent to a post.
  |
  | Uses an atomic $inc rather than read-then-save so concurrent
  | gifts on the same post can never race and overwrite each
  | other's increment.
  |
  */

  async incrementGiftsCount(
    id: string,
  ) {
    const post =
      await this.model.findByIdAndUpdate(
        id,
        {
          $inc: {
            giftsCount: 1,
          },
        },
        {
          new: true,
        },
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    return post;
  }


  /*
  |--------------------------------------------------------------------------
  | EDIT POST
  |--------------------------------------------------------------------------
  |
  | Only the post owner can edit the post.
  |
  */
  async update(
    id: string,
    userId: string,
    body: {
      content?: string;
      audience?: string;
      media?: string;
      userPhoto?: string;
    },
  ) {
    const post = await this.model.findById(id);

    if (!post) {
      throw new NotFoundException("Post not found");
    }

    if (String(post.user ?? "") !== String(userId)) {
      throw new ForbiddenException(
        "You are not allowed to edit this post",
      );
    }

    if (typeof body.content === "string") {
      const content = body.content.trim();

      if (!content) {
        throw new ForbiddenException(
          "Post content cannot be empty",
        );
      }

      post.content = content;
    }

    if (typeof body.audience === "string" && body.audience.trim()) {
      post.audience = body.audience.trim();
    }

    if (typeof body.media === "string") {
      post.media = body.media;
    }

    if (typeof body.userPhoto === "string") {
      post.userPhoto = body.userPhoto;
    }

    post.score = safeViralScore(post);

    return post.save();
  }

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  async delete(
    id: string,
    userId: string,
  ) {
    const post =
      await this.model.findById(
        id,
      );

    if (!post) {
      throw new NotFoundException(
        'Post not found',
      );
    }

    if (
      post.user.toString() !==
      userId
    ) {
      throw new ForbiddenException(
        'You are not allowed to delete this post',
      );
    }

    return this.model.findByIdAndDelete(
      id,
    );
  }
}