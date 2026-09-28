import { api } from "../../../api/api";

/* ============================================================================
TYPES
============================================================================ */

export interface Gift {
  _id: string;

  name: string;

  emoji: string;

  description: string;

  category: string;

  rarity: string;

  coinPrice: number;

  image: string;

  animation: string;

  sound: string;

  duration: number;

  fullScreenAnimation: boolean;
}

export interface SendGiftPayload {
  senderId: string;

  receiverId: string;

  giftId: string;

  /**
   * LIVE stream ID.
   *
   * Present when the gift is sent during a LIVE.
   */
  liveId?: string;

  /**
   * Post ID.
   *
   * Present when the gift is sent under
   * a Fockis photo/video post.
   */
  postId?: string;
}

/**
 * A single gift transaction on a post, with sender
 * identity resolved for display.
 *
 * Returned by GET /gifts/post/:postId/senders
 */
export interface PostGiftSender {
  senderId: string;

  username: string;

  profilePicture: string;

  giftId: string;

  giftName: string;

  emoji: string;

  coinsSpent: number;

  createdAt: string;
}

/* ============================================================================
API
============================================================================ */

export const giftsApi = {

  /* --------------------------------------------------------------------------
  GET ALL GIFTS

  GET /gifts
  -------------------------------------------------------------------------- */

  async getGifts(): Promise<Gift[]> {
    const response =
      await api.get<Gift[]>(
        "/gifts",
      );

    return response.data;
  },

  /* --------------------------------------------------------------------------
  GET SINGLE GIFT

  GET /gifts/:id
  -------------------------------------------------------------------------- */

  async getGift(
    id: string,
  ): Promise<Gift> {
    if (!id) {
      throw new Error(
        "Gift ID is required.",
      );
    }

    const response =
      await api.get<Gift>(
        `/gifts/${id}`,
      );

    return response.data;
  },

  /* --------------------------------------------------------------------------
  GET POST GIFT SENDERS

  GET /gifts/post/:postId/senders

  Returns every gift sent to a post, newest first, with the
  sender's username/avatar and which gift they sent. Powers
  the "who sent this" popover when tapping the gift count on
  a post's action bar.
  -------------------------------------------------------------------------- */

  async getPostGiftSenders(
    postId: string,
  ): Promise<PostGiftSender[]> {
    if (!postId) {
      throw new Error(
        "Post ID is required.",
      );
    }

    const response =
      await api.get<PostGiftSender[]>(
        `/gifts/post/${postId}/senders`,
      );

    return response.data;
  },

  /* --------------------------------------------------------------------------
  SEND GIFT

  POST /gifts/send

  Supports:

  LIVE gift:
    {
      senderId,
      receiverId,
      giftId,
      liveId
    }

  POST gift:
    {
      senderId,
      receiverId,
      giftId,
      postId
    }

  A gift can also contain both liveId and postId if the application
  later needs that behavior.
  -------------------------------------------------------------------------- */

  async sendGift(
    payload: SendGiftPayload,
  ) {
    console.log(
      "[giftsApi] Sending gift:",
      payload,
    );

    if (!payload.senderId) {
      throw new Error(
        "Sender ID is required.",
      );
    }

    if (!payload.receiverId) {
      throw new Error(
        "Receiver ID is required.",
      );
    }

    if (!payload.giftId) {
      throw new Error(
        "Gift ID is required.",
      );
    }

    if (
      !payload.liveId &&
      !payload.postId
    ) {
      console.warn(
        "[giftsApi] Gift has neither liveId nor postId. Treating as a general gift.",
      );
    }

    try {
      const response =
        await api.post(
          "/gifts/send",
          payload,
        );

      console.log(
        "[giftsApi] Gift sent successfully:",
        response.data,
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "[giftsApi] Gift send failed:",
        {
          status:
            error?.response?.status,

          response:
            error?.response?.data,

          payload,
        },
      );

      /*
       * IMPORTANT:
       *
       * Re-throw the original Axios error.
       *
       * Do NOT replace it with:
       *
       * throw new Error(...)
       *
       * because the UI needs:
       *
       * error.response.status
       * error.response.data
       */

      throw error;
    }
  },
};

export default giftsApi;