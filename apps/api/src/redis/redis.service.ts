import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from "@nestjs/common";

import Redis, {
  RedisOptions,
} from "ioredis";

type RedisMessageCallback = (
  message: any,
) => void;

@Injectable()
export class RedisService
  implements OnModuleDestroy
{
  private readonly logger =
    new Logger(RedisService.name);

  public readonly client: Redis;

  private readonly subscriptions =
    new Map<
      string,
      Set<RedisMessageCallback>
    >();

  private shuttingDown = false;

  constructor() {
    const redisUrl =
      process.env.REDIS_URL?.trim() ||
      "redis://localhost:6379";

    const options: RedisOptions = {
      /*
       * Connect as soon as the service is created.
       */
      lazyConnect: false,

      /*
       * Redis is used by long-running workers.
       *
       * null prevents ioredis from throwing
       * MaxRetriesPerRequestError while Redis is
       * temporarily reconnecting.
       */
      maxRetriesPerRequest: null,

      /*
       * Continue retrying while the application is running.
       */
      retryStrategy: (times: number) => {
        if (this.shuttingDown) {
          return null;
        }

        const delay = Math.min(
          Math.max(times, 1) * 1000,
          10000,
        );

        this.logger.warn(
          `Redis reconnect attempt ${times}. ` +
            `Retrying in ${delay}ms.`,
        );

        return delay;
      },

      /*
       * IMPORTANT:
       *
       * Keep this TRUE because the AI worker and other
       * Redis consumers can issue commands while Redis
       * is temporarily reconnecting.
       */
      enableOfflineQueue: true,

      connectTimeout: 10000,

      keepAlive: 10000,

      autoResubscribe: true,

      autoResendUnfulfilledCommands: true,
    };

    this.client = new Redis(
      redisUrl,
      options,
    );

    this.client.on(
      "connect",
      () => {
        this.logger.log(
          "Redis connection established.",
        );
      },
    );

    this.client.on(
      "ready",
      () => {
        this.logger.log(
          "Redis is ready.",
        );
      },
    );

    this.client.on(
      "reconnecting",
      (delay: number) => {
        if (!this.shuttingDown) {
          this.logger.warn(
            `Redis reconnecting in ${delay}ms...`,
          );
        }
      },
    );

    this.client.on(
      "close",
      () => {
        if (!this.shuttingDown) {
          this.logger.warn(
            "Redis connection closed.",
          );
        }
      },
    );

    this.client.on(
      "end",
      () => {
        if (!this.shuttingDown) {
          this.logger.warn(
            "Redis connection ended.",
          );
        }
      },
    );

    /*
     * Log the REAL Redis error.
     *
     * The previous implementation converted some
     * connection failures into "Unknown Redis error",
     * which made diagnosing REDIS_URL impossible.
     */
    this.client.on(
      "error",
      (error: unknown) => {
        if (this.shuttingDown) {
          return;
        }

        let details =
          "Unknown Redis error";

        if (error instanceof Error) {
          details =
            error.stack ||
            error.message ||
            details;
        } else if (
          typeof error === "string"
        ) {
          details = error;
        } else {
          try {
            details = JSON.stringify(
              error,
            );
          } catch {
            details = String(error);
          }
        }

        this.logger.error(
          `Redis connection error: ${details}`,
        );
      },
    );

    /*
     * ONE global Redis message listener.
     *
     * Application subscriptions are maintained
     * inside this service instead of creating a
     * separate Redis listener for every callback.
     */
    this.client.on(
      "message",
      (
        channel: string,
        message: string,
      ) => {
        this.handleMessage(
          channel,
          message,
        );
      },
    );
  }

  /**
   * Returns true only when ioredis reports that
   * the connection is ready.
   */
  isReady(): boolean {
    return (
      this.client.status ===
      "ready"
    );
  }

  /**
   * Publish a JSON message.
   *
   * If Redis is currently unavailable, do not crash
   * the caller.
   */
  async publish(
    channel: string,
    message: unknown,
  ): Promise<number> {
    if (!this.isReady()) {
      this.logger.warn(
        `Redis unavailable. Skipping publish to "${channel}".`,
      );

      return 0;
    }

    try {
      return await this.client.publish(
        channel,
        JSON.stringify(message),
      );
    } catch (error) {
      this.logger.error(
        `Redis publish failed for "${channel}": ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );

      return 0;
    }
  }

  /**
   * Subscribe to a Redis channel.
   */
  subscribe(
    channel: string,
    callback: RedisMessageCallback,
  ): void {
    let callbacks =
      this.subscriptions.get(
        channel,
      );

    if (!callbacks) {
      callbacks =
        new Set<RedisMessageCallback>();

      this.subscriptions.set(
        channel,
        callbacks,
      );

      /*
       * If Redis is already ready, subscribe now.
       *
       * Otherwise ioredis will reconnect and
       * auto-resubscribe.
       */
      if (this.isReady()) {
        void this.client
          .subscribe(channel)
          .catch((error) => {
            this.logger.error(
              `Failed to subscribe to Redis channel "${channel}": ${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`,
            );
          });
      }
    }

    callbacks.add(callback);
  }

  /**
   * Remove a subscription callback.
   */
  unsubscribe(
    channel: string,
    callback?: RedisMessageCallback,
  ): void {
    const callbacks =
      this.subscriptions.get(
        channel,
      );

    if (!callbacks) {
      return;
    }

    if (callback) {
      callbacks.delete(
        callback,
      );
    } else {
      callbacks.clear();
    }

    if (callbacks.size === 0) {
      this.subscriptions.delete(
        channel,
      );

      if (this.isReady()) {
        void this.client
          .unsubscribe(channel)
          .catch((error) => {
            this.logger.error(
              `Failed to unsubscribe from Redis channel "${channel}": ${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`,
            );
          });
      }
    }
  }

  /**
   * Dispatch an incoming Redis pub/sub message
   * to all callbacks registered for that channel.
   */
  private handleMessage(
    channel: string,
    message: string,
  ): void {
    const callbacks =
      this.subscriptions.get(
        channel,
      );

    if (
      !callbacks ||
      callbacks.size === 0
    ) {
      return;
    }

    let parsedMessage: any;

    try {
      parsedMessage =
        JSON.parse(message);
    } catch {
      parsedMessage = message;
    }

    /*
     * Copy callbacks before iterating so a callback
     * can safely subscribe/unsubscribe without
     * modifying the active iteration.
     */
    const listeners =
      Array.from(callbacks);

    for (const callback of listeners) {
      try {
        callback(parsedMessage);
      } catch (error) {
        this.logger.error(
          `Redis subscriber callback failed for "${channel}": ${
            error instanceof Error
              ? error.stack ||
                error.message
              : String(error)
          }`,
        );
      }
    }
  }

  /**
   * Gracefully close Redis during Nest shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(
      "Closing Redis connection...",
    );

    this.shuttingDown = true;

    this.subscriptions.clear();

    try {
      if (
        this.client.status ===
        "ready"
      ) {
        await this.client.quit();
      } else {
        this.client.disconnect();
      }
    } catch {
      this.client.disconnect();
    }
  }
}