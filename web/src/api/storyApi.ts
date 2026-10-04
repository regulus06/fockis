import { api } from "./api";
import { buildFockisUploadUrl } from "../config/fockisConfig";

/* ============================================================================
   CREATE STORY DATA
============================================================================ */

export interface CreateStoryData {
  userId: string;

  username?: string;

  avatar?: string | null;

  media: string;

  type?: "image" | "video";

  isProductStory?: boolean;

  productId?: string | null;

  productName?: string | null;

  productImage?: string | null;

  price?: number | null;

  shopLink?: string | null;

  sellerId?: string | null;
}

/* ============================================================================
   STORY RESPONSE
============================================================================ */

export interface Story {
  _id: string;

  userId: string;

  username: string;

  avatar?: string | null;

  media: string;

  type: "image" | "video";

  isProductStory?: boolean;

  productId?: string | null;

  productName?: string | null;

  productImage?: string | null;

  price?: number | null;

  shopLink?: string | null;

  sellerId?: string | null;

  expiresAt: string;

  createdAt?: string;

  updatedAt?: string;
}

/* ============================================================================
   STORY EVENT
============================================================================ */

export const FOCKIS_STORY_CREATED_EVENT =
  "fockis:story-created";

export const FOCKIS_STORY_DELETED_EVENT =
  "fockis:story-deleted";

/* ============================================================================
   STORY API
============================================================================ */

export const storyApi = {
  /* ==========================================================================
     GET ACTIVE STORIES

     GET /stories
  ========================================================================== */

  async getStories(): Promise<Story[]> {
    const response =
      await api.get<Story[]>(
        "/stories",
      );

    return response.data;
  },

  /* ==========================================================================
     UPLOAD STORY MEDIA

     POST /uploads?context=story

     IMPORTANT:
     Story uploads use the normal /uploads/ route.

     We convert the returned path to the full Fockis backend URL here so
     newly-created Stories never get treated as legacy /post-media/ files.
  ========================================================================== */

  async uploadStoryMedia(
    file: File,
  ): Promise<{
    media: string;
    type: "image" | "video";
  }> {
    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    const response =
      await api.post(
        "/uploads?context=story",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        },
      );

    const rawMedia =
      response.data?.media ||
      response.data?.url ||
      response.data?.path ||
      "";

    const media =
      buildFockisUploadUrl(
        rawMedia,
      );

    const type =
      response.data?.type ||
      (
        file.type.startsWith("video/")
          ? "video"
          : "image"
      );

    return {
      media,
      type,
    };
  },

  /* ==========================================================================
     CREATE STORY

     POST /stories

     IMPORTANT:
     After successful creation we dispatch a browser event.
     FockisFeedPage listens for this event and reloads the Story Rail.
  ========================================================================== */

  async createStory(
    data: CreateStoryData,
  ): Promise<Story> {
    /*
     * Normalize the media one more time before saving the Story.
     *
     * This protects us if another part of the frontend passes:
     *
     *   /uploads/file.jpg
     *   uploads/file.jpg
     *   file.jpg
     *
     * All new uploads resolve to the backend /uploads/ route.
     */
    const normalizedData: CreateStoryData = {
      ...data,
      media: buildFockisUploadUrl(
        data.media,
      ),
    };

    const response =
      await api.post<Story>(
        "/stories",
        normalizedData,
      );

    const story =
      response.data;

    /*
     * Tell every mounted Fockis feed that
     * a new story exists.
     */
    window.dispatchEvent(
      new CustomEvent(
        FOCKIS_STORY_CREATED_EVENT,
        {
          detail: story,
        },
      ),
    );

    return story;
  },

  /* ==========================================================================
     DELETE ONE STORY

     DELETE /stories/:id
  ========================================================================== */

  async deleteStory(
    id: string,
    userId: string,
  ) {
    const response =
      await api.delete(
        `/stories/${id}`,
        {
          data: {
            userId,
          },
        },
      );

    /*
     * Tell the feed to refresh.
     */
    window.dispatchEvent(
      new CustomEvent(
        FOCKIS_STORY_DELETED_EVENT,
        {
          detail: {
            id,
          },
        },
      ),
    );

    return response.data;
  },

  /* ==========================================================================
     DELETE ALL CURRENT USER STORIES

     DELETE /stories/user/all
  ========================================================================== */

  async deleteAllStories(
    userId: string,
  ) {
    const response =
      await api.delete(
        "/stories/user/all",
        {
          data: {
            userId,
          },
        },
      );

    /*
     * Tell the feed to refresh.
     */
    window.dispatchEvent(
      new CustomEvent(
        FOCKIS_STORY_DELETED_EVENT,
        {
          detail: {
            userId,
          },
        },
      ),
    );

    return response.data;
  },
};

export default storyApi;