import { Injectable } from '@nestjs/common';
import { PostsService } from '../posts/posts.service';
import { StoriesService } from '../stories/stories.service';

@Injectable()
export class FeedService {
  constructor(
    private readonly postsService: PostsService,
    private readonly storiesService: StoriesService,
  ) {}

  async getFeed(page = 1, limit = 20) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 20, 1);

    const skip = (safePage - 1) * safeLimit;

    /*
    |--------------------------------------------------------------------------
    | LOAD POSTS AND STORIES
    |--------------------------------------------------------------------------
    */

    const posts = await this.postsService.findAll();
    const stories = await this.storiesService.findAll();

    /*
    |--------------------------------------------------------------------------
    | MEDIA HELPERS
    |--------------------------------------------------------------------------
    */

    const extractMediaValue = (value: any): string => {
      if (!value) {
        return '';
      }

      if (typeof value === 'string') {
        return value.trim();
      }

      if (typeof value === 'object') {
        const possibleValues = [
          value.url,
          value.path,
          value.src,
          value.fileUrl,
          value.filePath,
          value.filename,
          value.fileName,
          value.location,
          value.key,
        ];

        for (const item of possibleValues) {
          if (
            typeof item === 'string' &&
            item.trim()
          ) {
            return item.trim();
          }
        }
      }

      return '';
    };

    /*
    |--------------------------------------------------------------------------
    | GET MEDIA FROM POST
    |--------------------------------------------------------------------------
    */

    const getRawMedia = (post: any): string => {
      if (!post) {
        return '';
      }

      /*
      |----------------------------------------------------------------------
      | media
      |---------------------------------------------------------------------- 
      */

      if (Array.isArray(post.media)) {
        for (const item of post.media) {
          const media = extractMediaValue(item);

          if (media) {
            return media;
          }
        }
      } else {
        const media = extractMediaValue(post.media);

        if (media) {
          return media;
        }
      }

      /*
      |----------------------------------------------------------------------
      | Common image/video fields
      |---------------------------------------------------------------------- 
      */

      const possibleFields = [
        post.image,
        post.imageUrl,
        post.file,
        post.fileUrl,
        post.filePath,
        post.photo,
        post.photoUrl,
        post.attachment,
        post.attachmentUrl,
        post.src,
        post.url,
        post.video,
        post.videoUrl,
      ];

      for (const value of possibleFields) {
        const media = extractMediaValue(value);

        if (media) {
          return media;
        }
      }

      /*
      |----------------------------------------------------------------------
      | Image arrays
      |---------------------------------------------------------------------- 
      */

      if (Array.isArray(post.images)) {
        for (const item of post.images) {
          const media = extractMediaValue(item);

          if (media) {
            return media;
          }
        }
      }

      if (Array.isArray(post.imageUrls)) {
        for (const item of post.imageUrls) {
          const media = extractMediaValue(item);

          if (media) {
            return media;
          }
        }
      }

      /*
      |----------------------------------------------------------------------
      | Attachments
      |---------------------------------------------------------------------- 
      */

      if (Array.isArray(post.attachments)) {
        for (const item of post.attachments) {
          const media = extractMediaValue(item);

          if (media) {
            return media;
          }
        }
      }

      /*
      |----------------------------------------------------------------------
      | Files
      |---------------------------------------------------------------------- 
      */

      if (Array.isArray(post.files)) {
        for (const item of post.files) {
          const media = extractMediaValue(item);

          if (media) {
            return media;
          }
        }
      }

      return '';
    };

    /*
    |--------------------------------------------------------------------------
    | DETECT MEDIA TYPE
    |--------------------------------------------------------------------------
    */

    const detectMediaType = (
      media: string,
      post: any,
    ): 'image' | 'video' | 'none' => {
      if (!media) {
        return 'none';
      }

      const backendType = String(
        post?.mediaType ||
          post?.mimeType ||
          post?.mime ||
          post?.fileType ||
          post?.type ||
          '',
      ).toLowerCase();

      /*
      |----------------------------------------------------------------------
      | Backend explicitly says video
      |---------------------------------------------------------------------- 
      */

      if (
        backendType.includes('video') ||
        backendType.includes('mp4') ||
        backendType.includes('webm') ||
        backendType.includes('mov')
      ) {
        return 'video';
      }

      /*
      |----------------------------------------------------------------------
      | File extension detection
      |---------------------------------------------------------------------- 
      */

      const videoExtensions = [
        '.mp4',
        '.webm',
        '.mov',
        '.m4v',
        '.avi',
        '.mkv',
        '.3gp',
        '.ogv',
      ];

      const lowerMedia = media.toLowerCase();

      const isVideo = videoExtensions.some(
        (extension) =>
          lowerMedia.includes(extension),
      );

      if (isVideo) {
        return 'video';
      }

      return 'image';
    };

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE POSTS
    |--------------------------------------------------------------------------
    */

    const postsNormalized = (posts || [])
      .map((p: any) => {
        const obj =
          p?.toObject?.() || p || {};

        /*
        |--------------------------------------------------------------------
        | GET MEDIA
        |--------------------------------------------------------------------
        */

        const rawMedia =
          getRawMedia(obj);

        /*
        |--------------------------------------------------------------------
        | DETECT MEDIA TYPE
        |--------------------------------------------------------------------
        */

        const mediaType =
          detectMediaType(
            rawMedia,
            obj,
          );

        /*
        |--------------------------------------------------------------------
        | USER ID
        |--------------------------------------------------------------------
        */

        const user =
          typeof obj.user === 'object'
            ? obj.user
            : null;

        const userId =
          user?._id?.toString?.() ||
          user?.id ||
          (typeof obj.user === 'string'
            ? obj.user
            : undefined);

        /*
        |--------------------------------------------------------------------
        | USERNAME
        |--------------------------------------------------------------------
        */

        const username =
          obj.username ||
          user?.username ||
          obj.author?.username ||
          obj.name ||
          'Unknown';

        /*
        |--------------------------------------------------------------------
        | RETURN POST
        |--------------------------------------------------------------------
        */

        return {
          _id:
            obj._id?.toString?.() ||
            obj.id,

          id:
            obj._id?.toString?.() ||
            obj.id,

          user: userId,

          username,

          content:
            obj.content ||
            obj.caption ||
            obj.text ||
            '',

          /*
          |------------------------------------------------------------------
          | MEDIA
          |------------------------------------------------------------------
          |
          | IMPORTANT:
          | We are NO LONGER forcing media to "".
          | The original image/video path is returned.
          |
          */

          media: rawMedia || null,

          /*
          |------------------------------------------------------------------
          | MEDIA TYPE
          |------------------------------------------------------------------
          */

          mediaType,

          /*
          |------------------------------------------------------------------
          | BACKWARD COMPATIBILITY
          |------------------------------------------------------------------
          */

          type: 'post',

          /*
          |------------------------------------------------------------------
          | OTHER POST DATA
          |------------------------------------------------------------------
          */

          likes:
            obj.likes || 0,

          shares:
            obj.shares || 0,

          /*
          |------------------------------------------------------------------
          | GIFTS
          |------------------------------------------------------------------
          |
          | IMPORTANT:
          | Without this line, giftsCount is silently dropped
          | here even though it exists on the underlying Post
          | document - this normalizer whitelists fields rather
          | than spreading the full object.
          |
          */

          giftsCount:
            obj.giftsCount || 0,

          comments:
            obj.comments || [],

          createdAt:
            obj.createdAt
              ? new Date(obj.createdAt)
              : new Date(0),
        };
      });

    /*
    |--------------------------------------------------------------------------
    | SORT POSTS BY NEWEST
    |--------------------------------------------------------------------------
    */

    postsNormalized.sort(
      (a, b) => {
        const aTime =
          a.createdAt instanceof Date
            ? a.createdAt.getTime()
            : new Date(
                a.createdAt,
              ).getTime();

        const bTime =
          b.createdAt instanceof Date
            ? b.createdAt.getTime()
            : new Date(
                b.createdAt,
              ).getTime();

        if (aTime === bTime) {
          return String(
            b._id || '',
          ).localeCompare(
            String(a._id || ''),
          );
        }

        return bTime - aTime;
      },
    );

    /*
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
    */

    const paginated =
      postsNormalized.slice(
        skip,
        skip + safeLimit,
      );

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE STORIES
    |--------------------------------------------------------------------------
    */

    const storiesNormalized =
      (stories || []).map(
        (story: any) => {
          const obj =
            story?.toObject?.() ||
            story ||
            {};

          return {
            ...obj,

            _id:
              obj._id?.toString?.() ||
              obj.id,

            id:
              obj._id?.toString?.() ||
              obj.id,

            createdAt:
              obj.createdAt ||
              new Date(),
          };
        },
      );

    /*
    |--------------------------------------------------------------------------
    | FINAL FEED RESPONSE
    |--------------------------------------------------------------------------
    */

    return {
      feed: paginated,

      stories:
        storiesNormalized,

      products: [],

      page: safePage,

      limit: safeLimit,

      total:
        postsNormalized.length,

      hasMore:
        postsNormalized.length >
        skip + safeLimit,
    };
  }
}