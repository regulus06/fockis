import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";

import {
  Server,
  Socket,
} from "socket.io";

/* ============================================================================
GIFT SOCKET GATEWAY

Namespace:

/gifts

Each LIVE has its own Socket.IO room:

live_<liveId>

Example:

live_6a777bb84f6b008f452ddd4f

Each Fockis feed post also has its own room:

post_<postId>

Example:

post_6a777bb84f6b008f452ddd4f
============================================================================ */

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },

  namespace: "/gifts",
})
export class GiftsGateway {
  @WebSocketServer()
  server!: Server;

  /* ========================================================================
     JOIN LIVE
     ======================================================================== */

  joinLive(
    socket: Socket,
    liveId: string,
  ) {
    if (!liveId) {
      return;
    }

    const room =
      `live_${liveId}`;

    socket.join(room);

    console.log(
      "[GiftsGateway] Socket joined gift room:",
      {
        socketId: socket.id,
        liveId,
        room,
      },
    );
  }

  /* ========================================================================
     LEAVE LIVE
     ======================================================================== */

  leaveLive(
    socket: Socket,
    liveId: string,
  ) {
    if (!liveId) {
      return;
    }

    const room =
      `live_${liveId}`;

    socket.leave(room);

    console.log(
      "[GiftsGateway] Socket left gift room:",
      {
        socketId: socket.id,
        liveId,
        room,
      },
    );
  }

  /* ========================================================================
     JOIN LIVE MESSAGE
     ======================================================================== */

  @SubscribeMessage(
    "join_live_gifts",
  )
  handleJoinLive(
    @ConnectedSocket()
    socket: Socket,

    @MessageBody()
    data: {
      liveId: string;
    },
  ) {
    this.joinLive(
      socket,
      data?.liveId,
    );

    return {
      success: true,
      liveId: data?.liveId,
    };
  }

  /* ========================================================================
     LEAVE LIVE MESSAGE
     ======================================================================== */

  @SubscribeMessage(
    "leave_live_gifts",
  )
  handleLeaveLive(
    @ConnectedSocket()
    socket: Socket,

    @MessageBody()
    data: {
      liveId: string;
    },
  ) {
    this.leaveLive(
      socket,
      data?.liveId,
    );

    return {
      success: true,
      liveId: data?.liveId,
    };
  }

  /* ========================================================================
     SEND GIFT ANIMATION

     IMPORTANT:

     .to(room).emit()

     sends the gift to EVERY SOCKET currently inside
     that LIVE's gift room.
     ======================================================================== */

  sendGiftAnimation(
    liveId: string,
    data: {
      giftId: string;
      giftName: string;
      emoji: string;
      animation: string;
      sound: string;
      duration: number;
      fullScreenAnimation: boolean;
      senderId: string;
      receiverId: string;
      liveId: string;
    },
  ) {
    if (!liveId) {
      return;
    }

    const room =
      `live_${liveId}`;

    console.log(
      "[GiftsGateway] Broadcasting gift:",
      {
        room,
        giftId: data.giftId,
        giftName: data.giftName,
        senderId: data.senderId,
        receiverId: data.receiverId,
      },
    );

    /*
     * EVERYONE in this LIVE room gets the gift.
     */
    this.server
      .to(room)
      .emit(
        "gift_received",
        data,
      );
  }

  /* ========================================================================
     JOIN POST

     Called when a FockisPostCard mounts, so this socket
     receives live gift-count updates for that specific post.
     ======================================================================== */

  joinPost(
    socket: Socket,
    postId: string,
  ) {
    if (!postId) {
      return;
    }

    const room =
      `post_${postId}`;

    socket.join(room);

    console.log(
      "[GiftsGateway] Socket joined post gift room:",
      {
        socketId: socket.id,
        postId,
        room,
      },
    );
  }

  /* ========================================================================
     LEAVE POST

     Called when a FockisPostCard unmounts.
     ======================================================================== */

  leavePost(
    socket: Socket,
    postId: string,
  ) {
    if (!postId) {
      return;
    }

    const room =
      `post_${postId}`;

    socket.leave(room);

    console.log(
      "[GiftsGateway] Socket left post gift room:",
      {
        socketId: socket.id,
        postId,
        room,
      },
    );
  }

  /* ========================================================================
     JOIN POST MESSAGE
     ======================================================================== */

  @SubscribeMessage(
    "join_post_gifts",
  )
  handleJoinPost(
    @ConnectedSocket()
    socket: Socket,

    @MessageBody()
    data: {
      postId: string;
    },
  ) {
    this.joinPost(
      socket,
      data?.postId,
    );

    return {
      success: true,
      postId: data?.postId,
    };
  }

  /* ========================================================================
     LEAVE POST MESSAGE
     ======================================================================== */

  @SubscribeMessage(
    "leave_post_gifts",
  )
  handleLeavePost(
    @ConnectedSocket()
    socket: Socket,

    @MessageBody()
    data: {
      postId: string;
    },
  ) {
    this.leavePost(
      socket,
      data?.postId,
    );

    return {
      success: true,
      postId: data?.postId,
    };
  }

  /* ========================================================================
     SEND GIFT UPDATE TO POST

     IMPORTANT:

     .to(room).emit()

     sends the updated gift count to EVERY SOCKET currently
     viewing that Fockis feed post.
     ======================================================================== */

  sendGiftUpdateToPost(
    postId: string,
    data: {
      postId: string;
      giftsCount: number;
      emoji?: string;
    },
  ) {
    if (!postId) {
      return;
    }

    const room =
      `post_${postId}`;

    console.log(
      "[GiftsGateway] Broadcasting post gift update:",
      {
        room,
        postId: data.postId,
        giftsCount: data.giftsCount,
      },
    );

    /*
     * EVERYONE currently viewing this post gets the
     * updated gift count.
     */
    this.server
      .to(room)
      .emit(
        "gift_received_post",
        data,
      );
  }

  /* ========================================================================
     SOCKET DISCONNECT
     ======================================================================== */

  handleDisconnect(
    socket: Socket,
  ) {
    console.log(
      "[GiftsGateway] Socket disconnected:",
      socket.id,
    );
  }
}