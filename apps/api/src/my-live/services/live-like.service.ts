import {
  Injectable,
  Logger,
} from "@nestjs/common";

import { RedisService } from "../../redis/redis.service";

export interface LiveLikeResult {
  liked: boolean;
  changed: boolean;
  duplicate: boolean;
  existed: boolean;
}

@Injectable()
export class LiveLikeService {
  private readonly logger =
    new Logger(LiveLikeService.name);

  constructor(
    private readonly redisService: RedisService,
  ) {}

  // ===========================================================================
  // LIKE
  // ===========================================================================

  async like(
    streamId: string,
    userId: string,
  ): Promise<LiveLikeResult> {
    if (!streamId || !userId) {
      return {
        liked: false,
        changed: false,
        duplicate: false,
        existed: false,
      };
    }

    const key =
      `live:${streamId}:likes`;

    try {
      const redis: any =
        this.redisService;

      // RedisService exposes raw commands.
      if (
        typeof redis.sadd ===
        "function"
      ) {
        const result =
          await redis.sadd(
            key,
            userId,
          );

        const changed =
          Number(result) === 1;

        return {
          liked: true,
          changed,
          duplicate: !changed,
          existed: changed,
        };
      }

      // RedisService exposes getClient().
      if (
        typeof redis.getClient ===
        "function"
      ) {
        const client =
          redis.getClient();

        if (
          typeof client.sAdd ===
          "function"
        ) {
          const result =
            await client.sAdd(
              key,
              userId,
            );

          const changed =
            Number(result) === 1;

          return {
            liked: true,
            changed,
            duplicate: !changed,
            existed: changed,
          };
        }

        if (
          typeof client.sadd ===
          "function"
        ) {
          const result =
            await client.sadd(
              key,
              userId,
            );

          const changed =
            Number(result) === 1;

          return {
            liked: true,
            changed,
            duplicate: !changed,
            existed: changed,
          };
        }
      }
    } catch (error) {
      this.logger.error(
        `Redis LIVE like failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }

    /*
     * Redis is the realtime idempotency layer.
     *
     * If Redis is temporarily unavailable we do NOT
     * pretend the operation changed state. This is
     * important because incrementing MongoDB counters
     * when Redis did not confirm the mutation can
     * permanently corrupt like counts.
     */
    return {
      liked: false,
      changed: false,
      duplicate: false,
      existed: false,
    };
  }

  // ===========================================================================
  // UNLIKE
  // ===========================================================================

  async unlike(
    streamId: string,
    userId: string,
  ): Promise<LiveLikeResult> {
    if (!streamId || !userId) {
      return {
        liked: false,
        changed: false,
        duplicate: false,
        existed: false,
      };
    }

    const key =
      `live:${streamId}:likes`;

    try {
      const redis: any =
        this.redisService;

      // Redis raw command.
      if (
        typeof redis.srem ===
        "function"
      ) {
        const result =
          await redis.srem(
            key,
            userId,
          );

        const existed =
          Number(result) === 1;

        return {
          liked: false,
          changed: existed,
          duplicate: false,
          existed,
        };
      }

      // Redis client.
      if (
        typeof redis.getClient ===
        "function"
      ) {
        const client =
          redis.getClient();

        if (
          typeof client.sRem ===
          "function"
        ) {
          const result =
            await client.sRem(
              key,
              userId,
            );

          const existed =
            Number(result) === 1;

          return {
            liked: false,
            changed: existed,
            duplicate: false,
            existed,
          };
        }

        if (
          typeof client.srem ===
          "function"
        ) {
          const result =
            await client.srem(
              key,
              userId,
            );

          const existed =
            Number(result) === 1;

          return {
            liked: false,
            changed: existed,
            duplicate: false,
            existed,
          };
        }
      }
    } catch (error) {
      this.logger.error(
        `Redis LIVE unlike failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }

    /*
     * Never decrement the MongoDB counter unless
     * Redis confirmed that the user actually had
     * a like removed.
     */
    return {
      liked: false,
      changed: false,
      duplicate: false,
      existed: false,
    };
  }

  // ===========================================================================
  // HAS LIKED
  // ===========================================================================

  async hasLiked(
    streamId: string,
    userId: string,
  ): Promise<boolean> {
    if (!streamId || !userId) {
      return false;
    }

    const key =
      `live:${streamId}:likes`;

    try {
      const redis: any =
        this.redisService;

      if (
        typeof redis.sismember ===
        "function"
      ) {
        const result =
          await redis.sismember(
            key,
            userId,
          );

        return Number(result) === 1;
      }

      if (
        typeof redis.getClient ===
        "function"
      ) {
        const client =
          redis.getClient();

        if (
          typeof client.sIsMember ===
          "function"
        ) {
          const result =
            await client.sIsMember(
              key,
              userId,
            );

          return Boolean(result);
        }

        if (
          typeof client.sismember ===
          "function"
        ) {
          const result =
            await client.sismember(
              key,
              userId,
            );

          return Number(result) === 1;
        }
      }
    } catch (error) {
      this.logger.error(
        `Redis LIVE like lookup failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }

    return false;
  }

  // ===========================================================================
  // COUNT
  // ===========================================================================

  async count(
    streamId: string,
  ): Promise<number> {
    if (!streamId) {
      return 0;
    }

    const key =
      `live:${streamId}:likes`;

    try {
      const redis: any =
        this.redisService;

      if (
        typeof redis.scard ===
        "function"
      ) {
        const result =
          await redis.scard(key);

        return Math.max(
          0,
          Number(result) || 0,
        );
      }

      if (
        typeof redis.getClient ===
        "function"
      ) {
        const client =
          redis.getClient();

        if (
          typeof client.sCard ===
          "function"
        ) {
          const result =
            await client.sCard(key);

          return Math.max(
            0,
            Number(result) || 0,
          );
        }

        if (
          typeof client.scard ===
          "function"
        ) {
          const result =
            await client.scard(key);

          return Math.max(
            0,
            Number(result) || 0,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Redis LIVE like count failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }

    return 0;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  async clear(
    streamId: string,
  ): Promise<void> {
    if (!streamId) {
      return;
    }

    const key =
      `live:${streamId}:likes`;

    try {
      const redis: any =
        this.redisService;

      if (
        typeof redis.del ===
        "function"
      ) {
        await redis.del(key);
        return;
      }

      if (
        typeof redis.getClient ===
        "function"
      ) {
        const client =
          redis.getClient();

        if (
          typeof client.del ===
          "function"
        ) {
          await client.del(key);
        }
      }
    } catch (error) {
      this.logger.error(
        `Redis LIVE like cleanup failed: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }
}