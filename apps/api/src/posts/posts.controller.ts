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

import { memoryStorage } from 'multer';

import { Storage } from '@google-cloud/storage';

import { PostsService } from './posts.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('posts')

export class PostsController {

  private readonly storage: Storage;

  private readonly bucketName: string;

  constructor(

    private readonly postsService: PostsService,

  ) {

    this.storage = this.createStorage();

    this.bucketName =

      process.env.GOOGLE_CLOUD_STORAGE_BUCKET || '';

    if (!this.bucketName) {

      console.warn(

        'GOOGLE_CLOUD_STORAGE_BUCKET is not configured. Post uploads will fail until it is set.',

      );

    }

  }

  // ============================================================

  // GET ALL POSTS

  // ============================================================

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

  // ============================================================

  // GET POSTS BY USER

  // ============================================================

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

  // ============================================================

  // GET ONE POST

  // ============================================================

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

  // ============================================================

  // CREATE POST

  // ============================================================

  @HttpPost()

  @UseInterceptors(

    FileInterceptor('file', {

      storage: memoryStorage(),

      limits: {

        fileSize: 200 * 1024 * 1024,

      },

    }),

  )

  async create(

    @UploadedFile()

    file: Express.Multer.File | undefined,

    @Body() body: any,

  ) {

    if (!body.user) {

      throw new BadRequestException(

        'User ID is required',

      );

    }

    let media =

      typeof body.media === 'string'

        ? body.media

        : '';

    if (file) {

      media =

        await this.uploadPostFileToGoogleCloud(

          file,

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

          body.audience || 'public',

        media,

      });

    return this.normalizePost(post);

  }

  // ============================================================

  // LIKE / UNLIKE

  // ============================================================

  @HttpPost(':id/like')

  like(

    @Param('id') id: string,

    @Body('userId') userId: string,

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

  // ============================================================

  // REPOST / UN-REPOST

  // ============================================================

  @HttpPost(':id/repost')

  repost(

    @Param('id') id: string,

    @Body('userId') userId: string,

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

  // ============================================================

  // VIEW

  // ============================================================

  @HttpPost(':id/view')

  view(

    @Param('id') id: string,

    @Body('userId') userId: string,

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

  // ============================================================

  // SHARE

  // ============================================================

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

  // ============================================================

  // COMMENT

  // ============================================================

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

        await this.normalizePost(

          result.post,

        ),

    };

  }

  // ============================================================

  // EDIT POST

  // ============================================================

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

  // ============================================================

  // DELETE

  // ============================================================

  @Delete(':id')

  delete(

    @Param('id') id: string,

    @Body('userId') userId: string,

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

  // ============================================================

  // GOOGLE CLOUD STORAGE INITIALIZATION

  // ============================================================

  private createStorage(): Storage {
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT?.trim() || undefined;

    const rawCredentials =
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

    if (!rawCredentials) {
      console.warn(
        '⚠️ GOOGLE_SERVICE_ACCOUNT_JSON is not configured. Using Application Default Credentials.',
      );

      return new Storage({
        projectId,
      });
    }

    try {
      const parsed = JSON.parse(rawCredentials);

      const clientEmail =
        String(parsed.client_email || '').trim();

      const privateKey =
        String(parsed.private_key || '')
          .replace(/\\n/g, '\n')
          .replace(/\r\n/g, '\n')
          .trim();

      if (!clientEmail) {
        throw new Error(
          'GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email.',
        );
      }

      if (!privateKey) {
        throw new Error(
          'GOOGLE_SERVICE_ACCOUNT_JSON is missing private_key.',
        );
      }

      console.log(
        '✅ Google Cloud Storage credentials loaded:',
        {
          projectId,
          clientEmail,
          hasPrivateKey: true,
        },
      );

      return new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        '❌ Failed to initialize Google Cloud Storage credentials:',
        message,
      );

      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_JSON is invalid: ${message}`,
      );
    }
  }

  // ============================================================

  // UPLOAD POST FILE TO GOOGLE CLOUD STORAGE

  // ============================================================

  private async uploadPostFileToGoogleCloud(

    file: Express.Multer.File,

  ): Promise<string> {

    if (!this.bucketName) {

      throw new BadRequestException(

        'Google Cloud Storage is not configured on the backend.',

      );

    }

    if (!file?.buffer) {

      throw new BadRequestException(

        'Uploaded file data is missing.',

      );

    }

    const safeName =

      file.originalname

        .replace(

          /[^a-zA-Z0-9.-]/g,

          '-',

        )

        .replace(

          /-+/g,

          '-',

        )

        .replace(

          /^-|-$/g,

          '',

        ) || 'upload';

    const objectName =

      `posts/${Date.now()}-${safeName}`;

    const storageFile =

      this.storage

        .bucket(this.bucketName)

        .file(objectName);

    await storageFile.save(

      file.buffer,

      {

        resumable: false,

        metadata: {

          contentType:

            file.mimetype ||

            'application/octet-stream',

          cacheControl:

            'private, max-age=3600',

        },

      },

    );

    /*

     * Keep the existing MongoDB format.

     *

     * Example:

     *

     * /uploads/1786522428662-house.jpg

     *

     * The actual file is now stored in:

     *

     * posts/1786522428662-house.jpg

     */

    return `/uploads/${objectName.replace(

      /^posts\//,

      '',

    )}`;

  }

  // ============================================================

  // AUTHENTICATED USER ID

  // ============================================================

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

  // ============================================================

  // NORMALIZE SINGLE POST

  // ============================================================

  private async normalizePost(

    post: any,

  ) {

    if (!post) {

      return post;

    }

    const raw =

      typeof post.toObject === 'function'

        ? post.toObject()

        : post;

    const storedMedia =

      typeof raw.media === 'string'

        ? raw.media

        : '';

    const resolvedMedia =

      await this.resolveMediaUrl(

        storedMedia,

      );

    const image =

      typeof raw.image === 'string'

        ? raw.image

        : resolvedMedia;

    const mediaUrl =

      typeof raw.mediaUrl === 'string'

        ? raw.mediaUrl

        : resolvedMedia;

    let images: string[] = [];

    if (Array.isArray(raw.images)) {

      images =

        raw.images.filter(

          (value: any) =>

            typeof value === 'string' &&

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

      resolvedMedia &&

      !images.includes(resolvedMedia)

    ) {

      images.push(resolvedMedia);

    }

    return {

      ...raw,

      media: resolvedMedia,

      image:

        image || undefined,

      mediaUrl:

        mediaUrl || undefined,

      images,

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

  // ============================================================

  // NORMALIZE POSTS

  // ============================================================

  private async normalizePosts(

    posts: any[],

  ) {

    if (!Array.isArray(posts)) {

      return [];

    }

    return Promise.all(

      posts.map((post) =>

        this.normalizePost(post),

      ),

    );

  }

  // ============================================================

  // RESOLVE MEDIA URL

  // ============================================================

  private async resolveMediaUrl(
    media: string,
  ): Promise<string> {
    if (!media) {
      return '';
    }

    /*
     * Already usable URLs should never be changed.
     */
    if (
      media.startsWith('http://') ||
      media.startsWith('https://') ||
      media.startsWith('blob:') ||
      media.startsWith('data:')
    ) {
      return media;
    }

    const clean =
      media
        .replace(/\\/g, '/')
        .replace(/^\/+/, '');

    /*
     * Only resolve Fockis upload paths.
     */
    if (!clean.startsWith('uploads/')) {
      return media;
    }

    const filename =
      clean
        .replace(/^uploads\//, '')
        .replace(/^posts\//, '');

    if (!filename) {
      return '';
    }

    if (!this.bucketName) {
      console.error(
        '❌ Cannot resolve post media: GOOGLE_CLOUD_STORAGE_BUCKET is missing.',
      );

      return media;
    }

    const objectName =
      `posts/${filename}`;

    try {
      const storageFile =
        this.storage
          .bucket(this.bucketName)
          .file(objectName);

      /*
       * Generate a V4 signed URL.
       *
       * No bucket metadata request is made here.
       * This only signs the object URL.
       */
      const [url] =
        await storageFile.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires:
            Date.now() +
            6 *
              24 *
              60 *
              60 *
              1000,
        });

      if (!url) {
        throw new Error(
          'Google Cloud Storage returned an empty signed URL.',
        );
      }

      console.log(
        `✅ GCS signed URL generated: ${objectName}`,
      );

      return url;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `❌ Failed to sign post media ${objectName}`,
      );

      console.error(
        'GCS signing error:',
        message,
      );

      /*
       * Keep the original database value as a fallback.
       * This prevents one bad media item from breaking
       * the entire Feed request.
       */
      return media;
    }
  }
}
