import {
  Injectable,
  Logger,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  LiveView,
  LiveViewDocument,
} from "../schemas/live-view.schema";

interface SocketViewer {
  streamId: string;
  userId: string;
  joinedAt: number;
}

export interface RemovedSocketViewer {
  streamId: string;
  userId: string;
  viewerCount: number;
}

@Injectable()
export class LiveViewerService {
  private readonly logger =
    new Logger(LiveViewerService.name);

  /**
   * Active viewers:
   *
   * streamId
   *   -> userId
   *      -> socketIds
   *
   * A user can have multiple sockets/tabs.
   * The user is counted only once per LIVE stream.
   */
  private readonly viewers =
    new Map<
      string,
      Map<string, Set<string>>
    >();

  /**
   * Reverse socket registry.
   *
   * socketId -> stream/user session
   *
   * This allows disconnects to be cleaned up
   * reliably.
   */
  private readonly sockets =
    new Map<string, SocketViewer>();

  constructor(
    @InjectModel(LiveView.name)
    private readonly viewModel:
      Model<LiveViewDocument>,
  ) {}

  // ===========================================================================
  // JOIN
  // ===========================================================================

  async join(
    streamId: string,
    userId: string,
    socketId: string,
  ): Promise<number> {
    if (
      !streamId ||
      !userId ||
      !socketId
    ) {
      return 0;
    }

    let streamViewers =
      this.viewers.get(streamId);

    if (!streamViewers) {
      streamViewers =
        new Map<string, Set<string>>();

      this.viewers.set(
        streamId,
        streamViewers,
      );
    }

    let userSockets =
      streamViewers.get(userId);

    if (!userSockets) {
      userSockets =
        new Set<string>();

      streamViewers.set(
        userId,
        userSockets,
      );
    }

    const alreadyConnected =
      userSockets.has(socketId);

    userSockets.add(socketId);

    this.sockets.set(
      socketId,
      {
        streamId,
        userId,
        joinedAt: Date.now(),
      },
    );

    /**
     * Only persist when this socket was not
     * already registered.
     */
    if (!alreadyConnected) {
      try {
        await this.viewModel.updateOne(
          {
            streamId,
            userId,
          },
          {
            $set: {
              joinedAt: new Date(),
              leftAt: null,
            },
            $setOnInsert: {
              streamId,
              userId,
              watchSeconds: 0,
              isFollowing: false,
            },
          },
          {
            upsert: true,
          },
        );
      } catch (error) {
        this.logger.warn(
          `Failed to persist LIVE viewer join: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );
      }
    }

    return streamViewers.size;
  }

  // ===========================================================================
  // LEAVE
  // ===========================================================================

  async leave(
    streamId: string,
    userId: string,
    socketId: string,
  ): Promise<number> {
    if (
      !streamId ||
      !userId ||
      !socketId
    ) {
      return this.getCount(
        streamId,
      );
    }

    const streamViewers =
      this.viewers.get(streamId);

    if (!streamViewers) {
      this.sockets.delete(
        socketId,
      );

      await this.persistLeave(
        streamId,
        userId,
      );

      return 0;
    }

    const userSockets =
      streamViewers.get(userId);

    if (!userSockets) {
      this.sockets.delete(
        socketId,
      );

      await this.persistLeave(
        streamId,
        userId,
      );

      return streamViewers.size;
    }

    userSockets.delete(
      socketId,
    );

    this.sockets.delete(
      socketId,
    );

    /**
     * The user still has another active
     * socket/tab connected.
     *
     * Therefore the user remains counted.
     */
    if (userSockets.size > 0) {
      return streamViewers.size;
    }

    /**
     * User has completely left the stream.
     */
    streamViewers.delete(
      userId,
    );

    await this.persistLeave(
      streamId,
      userId,
    );

    /**
     * No viewers remain.
     */
    if (
      streamViewers.size === 0
    ) {
      this.viewers.delete(
        streamId,
      );

      return 0;
    }

    return streamViewers.size;
  }

  // ===========================================================================
  // REMOVE SOCKET
  // ===========================================================================

  async removeSocket(
    socketId: string,
  ): Promise<RemovedSocketViewer[]> {
    if (!socketId) {
      return [];
    }

    const session =
      this.sockets.get(
        socketId,
      );

    if (!session) {
      return [];
    }

    const {
      streamId,
      userId,
    } = session;

    const streamViewers =
      this.viewers.get(streamId);

    /**
     * Remove socket from global registry
     * regardless of whether the stream map
     * still exists.
     */
    this.sockets.delete(
      socketId,
    );

    if (!streamViewers) {
      return [];
    }

    const userSockets =
      streamViewers.get(userId);

    if (!userSockets) {
      return [];
    }

    userSockets.delete(
      socketId,
    );

    /**
     * User still has another socket.
     * Do not decrement viewer count.
     */
    if (userSockets.size > 0) {
      return [];
    }

    /**
     * User has no active sockets anymore.
     */
    streamViewers.delete(
      userId,
    );

    await this.persistLeave(
      streamId,
      userId,
    );

    const viewerCount =
      streamViewers.size;

    /**
     * Remove empty stream registry.
     */
    if (viewerCount === 0) {
      this.viewers.delete(
        streamId,
      );
    }

    return [
      {
        streamId,
        userId,
        viewerCount,
      },
    ];
  }

  // ===========================================================================
  // GET COUNT
  // ===========================================================================

  getCount(
    streamId: string,
  ): number {
    if (!streamId) {
      return 0;
    }

    const streamViewers =
      this.viewers.get(streamId);

    if (!streamViewers) {
      return 0;
    }

    return streamViewers.size;
  }

  // ===========================================================================
  // GET ACTIVE VIEWER IDS
  // ===========================================================================

  getActiveViewerIds(
    streamId: string,
  ): string[] {
    if (!streamId) {
      return [];
    }

    const streamViewers =
      this.viewers.get(streamId);

    if (!streamViewers) {
      return [];
    }

    return Array.from(
      streamViewers.keys(),
    );
  }

  // ===========================================================================
  // REMOVE USER FROM ALL STREAMS
  // ===========================================================================

  async removeUserFromAllStreams(
    userId: string,
  ): Promise<void> {
    if (!userId) {
      return;
    }

    const socketIds =
      Array.from(
        this.sockets.entries(),
      )
        .filter(
          ([, session]) =>
            session.userId ===
            userId,
        )
        .map(
          ([socketId]) =>
            socketId,
        );

    /**
     * First remove every known socket.
     */
    for (const socketId of socketIds) {
      await this.removeSocket(
        socketId,
      );
    }

    /**
     * Safety cleanup for any stale
     * in-memory user entries.
     */
    const affectedStreams =
      Array.from(
        this.viewers.entries(),
      );

    for (const [
      streamId,
      streamViewers,
    ] of affectedStreams) {
      if (
        !streamViewers.has(
          userId,
        )
      ) {
        continue;
      }

      streamViewers.delete(
        userId,
      );

      await this.persistLeave(
        streamId,
        userId,
      );

      if (
        streamViewers.size ===
        0
      ) {
        this.viewers.delete(
          streamId,
        );
      }
    }
  }

  // ===========================================================================
  // CLEAR STREAM
  // ===========================================================================

  async clearStream(
    streamId: string,
  ): Promise<void> {
    if (!streamId) {
      return;
    }

    const streamViewers =
      this.viewers.get(streamId);

    /**
     * Persist departures for active viewers.
     */
    if (streamViewers) {
      const userIds =
        Array.from(
          streamViewers.keys(),
        );

      for (const userId of userIds) {
        await this.persistLeave(
          streamId,
          userId,
        );
      }
    }

    /**
     * Remove all socket mappings
     * belonging to this stream.
     */
    const streamSockets =
      Array.from(
        this.sockets.entries(),
      );

    for (const [
      socketId,
      session,
    ] of streamSockets) {
      if (
        session.streamId ===
        streamId
      ) {
        this.sockets.delete(
          socketId,
        );
      }
    }

    this.viewers.delete(
      streamId,
    );

    /**
     * Safety cleanup in MongoDB.
     */
    try {
      await this.viewModel.updateMany(
        {
          streamId,
          leftAt: null,
        },
        {
          $set: {
            leftAt:
              new Date(),
          },
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed clearing LIVE viewers: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  // ===========================================================================
  // PERSIST LEAVE
  // ===========================================================================

  private async persistLeave(
    streamId: string,
    userId: string,
  ): Promise<void> {
    try {
      const view =
        await this.viewModel.findOne(
          {
            streamId,
            userId,
          },
        );

      if (!view) {
        return;
      }

      const now =
        Date.now();

      const joinedAt =
        view.joinedAt?.getTime();

      let additionalSeconds =
        0;

      if (
        typeof joinedAt ===
          "number" &&
        Number.isFinite(
          joinedAt,
        )
      ) {
        additionalSeconds =
          Math.max(
            0,
            Math.floor(
              (now -
                joinedAt) /
                1000,
            ),
          );
      }

      view.leftAt =
        new Date(now);

      view.watchSeconds =
        Math.max(
          0,
          Number(
            view.watchSeconds ||
              0,
          ),
        ) +
        additionalSeconds;

      await view.save();
    } catch (error) {
      this.logger.warn(
        `Failed to persist LIVE viewer leave: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }
}