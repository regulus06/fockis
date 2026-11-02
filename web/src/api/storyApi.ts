import { api } from "./api";

/* ============================================================================
   STORY TYPES
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

export interface Story {
  _id: string;
  id?: string;
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
   EVENTS
============================================================================ */

export const FOCKIS_STORY_CREATED_EVENT = "fockis:story-created";
export const FOCKIS_STORY_DELETED_EVENT = "fockis:story-deleted";

/* ============================================================================
   MEDIA PATH NORMALIZATION

   IMPORTANT:
   - Preserve post-media paths.
   - Preserve uploads paths.
   - Preserve absolute storage URLs.
   - Only use uploads for a bare filename.
============================================================================ */

function normalizeStoryMedia(value: unknown): string {
  if (typeof value !== "string") return "";

  let path = value.trim();

  if (
    !path ||
    path === "undefined" ||
    path === "null"
  ) {
    return "";
  }

  // Do not modify absolute, blob, or data URLs.
  if (/^(https?:\/\/|blob:|data:)/i.test(path)) {
    return path;
  }

  path = path
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");

  if (!path) return "";

  // Preserve the public post-media route.
  if (/^post-media\//i.test(path)) {
    return path;
  }

  // Preserve existing upload and media routes.
  if (
    /^(uploads|upload|media|public\/uploads|api\/uploads)\//i.test(path)
  ) {
    return path;
  }

  // Bare filenames belong to the uploads directory.
  return `uploads/${path}`;
}

// Folders the API's public /post-media/:file route streams from.
const POST_MEDIA_FOLDERS = ["posts", "posts/images", "posts/videos", "post-media", "stories", "story-media"];

function extractUploadedMedia(response: any): string {
  /*
   * The upload returns a *signed* Google Cloud link, which expires and can be
   * refused by the bucket. Prefer a stable path the API streams itself, the
   * same way post photos and videos load: posts/images/<file> →
   * post-media/<file>.
   */
  const storageKey = String(response?.storageKey ?? response?.data?.storageKey ?? "").replace(/^\/+/, "");
  if (storageKey) {
    const parts = storageKey.split("/");
    const fileName = parts.pop() ?? "";
    if (fileName && POST_MEDIA_FOLDERS.includes(parts.join("/"))) {
      return `post-media/${fileName}`;
    }
  }

  const candidates = [
    response?.media,
    response?.url,
    response?.path,
    response?.fileUrl,
    response?.filePath,
    response?.filename,
    response?.data?.media,
    response?.data?.url,
    response?.data?.path,
    response?.data?.fileUrl,
    response?.data?.filePath,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return normalizeStoryMedia(candidate);
    }
  }

  throw new Error(
    "The upload completed, but the server did not return a usable media URL.",
  );
}

/* ============================================================================
   STORY API
============================================================================ */

export const storyApi = {
  /* --------------------------------------------------------------------------
     GET ACTIVE STORIES
     GET /stories
  -------------------------------------------------------------------------- */

  async getStories(): Promise<Story[]> {
    const response = await api.get<Story[]>("/stories");

    const stories = Array.isArray(response.data)
      ? response.data
      : [];

    return stories.map((story) => ({
      ...story,
      media: normalizeStoryMedia(story.media),
      avatar: story.avatar
        ? normalizeStoryMedia(story.avatar)
        : story.avatar,
      id: story.id || story._id,
    }));
  },

  /* --------------------------------------------------------------------------
     UPLOAD STORY MEDIA
     POST /uploads?context=story
  -------------------------------------------------------------------------- */

  async uploadStoryMedia(
    file: File,
  ): Promise<{
    media: string;
    type: "image" | "video";
  }> {
    const formData = new FormData();
    formData.append("file", file);

    // The shared client defaults to JSON; a file upload must be multipart
    // (axios adds the boundary).
    const response = await api.post(
      "/uploads?context=story",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    const media = extractUploadedMedia(response.data);

    const returnedType = response.data?.type;

    const type: "image" | "video" =
      returnedType === "video" ||
      file.type.startsWith("video/")
        ? "video"
        : "image";

    return {
      media,
      type,
    };
  },

  /* --------------------------------------------------------------------------
     CREATE STORY
     POST /stories
  -------------------------------------------------------------------------- */

  async createStory(
    data: CreateStoryData,
  ): Promise<Story> {
    const normalizedData: CreateStoryData = {
      ...data,
      media: normalizeStoryMedia(data.media),
      avatar: data.avatar
        ? normalizeStoryMedia(data.avatar)
        : data.avatar,
      productImage: data.productImage
        ? normalizeStoryMedia(data.productImage)
        : data.productImage,
    };

    if (!normalizedData.media) {
      throw new Error("Story media URL is missing.");
    }

    const response = await api.post<Story>(
      "/stories",
      normalizedData,
    );

    const story: Story = {
      ...response.data,
      media: normalizeStoryMedia(response.data.media),
      id: response.data.id || response.data._id,
    };

    window.dispatchEvent(
      new CustomEvent(FOCKIS_STORY_CREATED_EVENT, {
        detail: story,
      }),
    );

    return story;
  },

  /* --------------------------------------------------------------------------
     DELETE ONE STORY
     DELETE /stories/:id
  -------------------------------------------------------------------------- */

  async deleteStory(id: string, userId: string) {
    const response = await api.delete(
      `/stories/${id}`,
      {
        data: { userId },
      },
    );

    window.dispatchEvent(
      new CustomEvent(FOCKIS_STORY_DELETED_EVENT, {
        detail: { id },
      }),
    );

    return response.data;
  },

  /* --------------------------------------------------------------------------
     DELETE ALL USER STORIES
     DELETE /stories/user/all
  -------------------------------------------------------------------------- */

  async deleteAllStories(userId: string) {
    const response = await api.delete(
      "/stories/user/all",
      {
        data: { userId },
      },
    );

    window.dispatchEvent(
      new CustomEvent(FOCKIS_STORY_DELETED_EVENT, {
        detail: { userId },
      }),
    );

    return response.data;
  },
};

export default storyApi;