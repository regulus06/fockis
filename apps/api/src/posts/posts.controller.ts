import {
  Controller,
  Get,
  Post as HttpPost,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
  ) {}

  // ==========================================================================
  // GET ALL POSTS
  // ==========================================================================
  //
  // GET /posts
  //
  // Optional:
  //
  // GET /posts?userId=USER_ID
  //
  // ==========================================================================

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAll(
    @Query('userId') userId?: string,
    @Req() req?: any,
  ) {
    const currentUserId =
      this.getAuthenticatedUserId(req);

    const posts =
      await this.postsService.findAll(
        userId,
        currentUserId,
      );

    return this.normalizePosts(posts);
  }

  // ==========================================================================
  // GET POSTS BY USER
  // ==========================================================================
  //
  // GET /posts/user/:userId
  //
  // ==========================================================================

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserPosts(
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    if (!userId) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    const currentUserId =
      this.getAuthenticatedUserId(req);

    const posts =
      await this.postsService.findAll(
        userId,
        currentUserId,
      );

    return this.normalizePosts(posts);
  }

  // ==========================================================================
  // GET ONE POST
  // ==========================================================================
  //
  // GET /posts/:id
  //
  // IMPORTANT:
  // Keep this AFTER /user/:userId.
  //
  // ==========================================================================

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const currentUserId =
      this.getAuthenticatedUserId(req);

    const post =
      await this.postsService.findOne(
        id,
        currentUserId,
      );

    return this.normalizePost(post);
  }

  // ==========================================================================
  // CREATE POST
  // ==========================================================================

  @HttpPost()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',

        filename: (
          req,
          file,
          cb,
        ) => {
          const safeName =
            file.originalname.replace(
              /[^a-zA-Z0-9.-]/g,
              '-',
            );

          cb(
            null,
            `${Date.now()}-${safeName}`,
          );
        },
      }),
    }),
  )
  async create(
    @UploadedFile() file: any,
    @Body() body: any,
  ) {
    if (!body.user) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    const post =
      await this.postsService.create({
        user: body.user,

        username:
          body.username || '',

        userPhoto:
          body.userPhoto || '',

        content:
          body.content || '',

        type:
          body.type || 'post',

        audience:
          body.audience ||
          'public',

        media: file
          ? `/uploads/${file.filename}`
          : body.media || '',
      });

    return this.normalizePost(
      post,
    );
  }

  // ==========================================================================
  // LIKE / UNLIKE
  // ==========================================================================

  @HttpPost(':id/like')
  like(
    @Param('id') id: string,

    @Body('userId')
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    return this.postsService.like(
      id,
      userId,
    );
  }

  // ==========================================================================
  // REPOST / UN-REPOST
  // ==========================================================================

  @HttpPost(':id/repost')
  repost(
    @Param('id') id: string,

    @Body('userId')
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    return this.postsService.repost(
      id,
      userId,
    );
  }

  // ==========================================================================
  // VIEW
  // ==========================================================================

  @HttpPost(':id/view')
  view(
    @Param('id') id: string,

    @Body('userId')
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    return this.postsService.view(
      id,
      userId,
    );
  }

  // ==========================================================================
  // SHARE
  // ==========================================================================

  @HttpPost(':id/share')
  share(
    @Param('id') id: string,

    @Body()
    body: {
      userId: string;
      destination:
        | 'friend'
        | 'group'
        | 'copy_link'
        | 'whatsapp'
        | 'facebook'
        | 'instagram'
        | 'x'
        | 'messenger'
        | 'other';
    },
  ) {
    if (!body.userId) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    if (!body.destination) {
      throw new BadRequestException(
        'Share destination is required',
      );
    }

    return this.postsService.share(
      id,
      body.userId,
      body.destination,
    );
  }

  // ==========================================================================
  // COMMENT
  // ==========================================================================
  //
  // POST /posts/:id/comment
  //
  // Returns:
  //
  // {
  //   post,
  //   comment,
  //   comments,
  //   commentsCount
  // }
  //
  // This allows the frontend to immediately update the comment list
  // and comment counter without refreshing the page.
  //
  // ==========================================================================

  @HttpPost(':id/comment')
  async comment(
    @Param('id') id: string,

    @Body()
    body: {
      userId: string;
      username?: string;
      userPhoto?: string;
      content: string;
    },
  ) {
    if (!body.userId) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    if (
      !body.content ||
      !body.content.trim()
    ) {
      throw new BadRequestException(
        'Comment content is required',
      );
    }

    const result =
      await this.postsService.comment(
        id,
        body,
      );

    return {
      ...result,

      post:
        this.normalizePost(
          result.post,
        ),
    };
  }

  // ==========================================================================
  // EDIT POST
  // ==========================================================================

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
      content?: string;
      audience?: string;
      media?: string;
      userPhoto?: string;
    },
  ) {
    if (!body.userId) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    if (
      typeof body.content === 'string' &&
      !body.content.trim()
    ) {
      throw new BadRequestException(
        'Post content cannot be empty',
      );
    }

    const post =
      await this.postsService.update(
        id,
        body.userId,
        body,
      );

    return this.normalizePost(post);
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  @Delete(':id')
  delete(
    @Param('id') id: string,

    @Body('userId')
    userId: string,
  ) {
    if (!userId) {
      throw new BadRequestException(
        'User ID is required',
      );
    }

    return this.postsService.delete(
      id,
      userId,
    );
  }

  // ==========================================================================
  // AUTHENTICATED USER ID HELPER
  // ==========================================================================

  private getAuthenticatedUserId(
    req: any,
  ): string {
    const userId =
      req?.user?.id ??
      req?.user?._id ??
      req?.user?.userId ??
      req?.user?.sub;

    if (!userId) {
      throw new BadRequestException(
        'Authenticated user ID is missing',
      );
    }

    return String(userId);
  }

  // ==========================================================================
  // NORMALIZE SINGLE POST
  // ==========================================================================
  //
  // Your database stores uploaded post media as:
  //
  // media: "/uploads/example.jpg"
  //
  // Your frontend profile API looks for:
  //
  // images
  // image
  // mediaUrl
  //
  // So expose all three.
  //
  // ==========================================================================

  private normalizePost(
    post: any,
  ) {
    if (!post) {
      return post;
    }

    const raw =
      typeof post.toObject === 'function'
        ? post.toObject()
        : post;

    const media =
      typeof raw.media === 'string'
        ? raw.media
        : '';

    const image =
      typeof raw.image === 'string'
        ? raw.image
        : media;

    const mediaUrl =
      typeof raw.mediaUrl === 'string'
        ? raw.mediaUrl
        : media;

    let images: string[] = [];

    if (
      Array.isArray(raw.images)
    ) {
      images =
        raw.images.filter(
          (value: any) =>
            typeof value ===
              'string' &&
            value.length > 0,
        );
    }

    if (
      image &&
      !images.includes(image)
    ) {
      images.push(image);
    }

    if (
      mediaUrl &&
      !images.includes(mediaUrl)
    ) {
      images.push(mediaUrl);
    }

    if (
      media &&
      !images.includes(media)
    ) {
      images.push(media);
    }

    return {
      ...raw,

      /*
       * Original database field.
       */
      media,

      /*
       * Fields expected by Fockis frontend.
       */
      image:
        image || undefined,

      mediaUrl:
        mediaUrl || undefined,

      images,

      /*
       * Make sure user information is
       * also available consistently.
       */
      user:
        raw.user ||
        raw.author ||
        undefined,

      author:
        raw.author ||
        raw.user ||
        undefined,
    };
  }

  // ==========================================================================
  // NORMALIZE POST ARRAY
  // ==========================================================================

  private normalizePosts(
    posts: any,
  ) {
    if (!Array.isArray(posts)) {
      return [];
    }

    return posts.map(
      (post) =>
        this.normalizePost(post),
    );
  }
}