import type {
  FockisProfile,
  FockisPost,
  FockisFriend,
  FockisUser,
  UpdateProfilePayload,
} from "../types/fockisprofiletypes";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000";

/* ============================================================================
   PROFILE API ERROR
============================================================================ */

export class ProfileApiError extends Error {
  status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name = "ProfileApiError";
    this.status = status;
  }
}

/* ============================================================================
   AUTH
============================================================================ */

function getToken(): string | null {
  return localStorage.getItem("token");
}

/* ============================================================================
   MEDIA URL
============================================================================ */

function normalizeMediaUrl(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const cleanValue =
    String(value).trim();

  if (!cleanValue) {
    return "";
  }

  if (
    cleanValue.startsWith("http://") ||
    cleanValue.startsWith("https://") ||
    cleanValue.startsWith("blob:")
  ) {
    return cleanValue;
  }

  if (
    cleanValue.startsWith("/uploads/")
  ) {
    return `${API_BASE}${cleanValue}`;
  }

  return cleanValue;
}

/* ============================================================================
   REQUEST
============================================================================ */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers = new Headers(
    options.headers,
  );

  /*
   * Never manually set Content-Type for FormData.
   * The browser must create the multipart boundary.
   */
  if (
    !(options.body instanceof FormData)
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
    },
  );

  const text =
    await response.text();

  let data: any = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message ||
          data?.error ||
          `Profile request failed (${response.status})`;

    throw new ProfileApiError(
      message,
      response.status,
    );
  }

  return data as T;
}

/* ============================================================================
   USER NORMALIZATION
============================================================================ */

function normalizeUser(
  value: any,
): FockisUser | null {
  if (!value) {
    return null;
  }

  const firstName =
    value.firstName || "";

  const lastName =
    value.lastName || "";

  const generatedFullName =
    [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ");

  const avatar =
    normalizeMediaUrl(
      value.avatar ||
        value.profilePicture ||
        value.profileImage ||
        value.profile_picture ||
        "",
    );

  const profileImage =
    normalizeMediaUrl(
      value.profileImage ||
        value.profilePicture ||
        value.avatar ||
        "",
    );

  const coverImage =
    normalizeMediaUrl(
      value.coverImage ||
        value.coverPhoto ||
        value.cover ||
        "",
    );

  return {
    ...value,

    id:
      value.id ||
      value._id ||
      value.userId ||
      "",

    _id:
      value._id ||
      value.id,

    name:
      value.name ||
      value.fullName ||
      generatedFullName ||
      value.username ||
      "",

    username:
      value.username,

    firstName:
      value.firstName,

    lastName:
      value.lastName,

    avatar,

    profileImage,

    profilePicture:
      avatar ||
      profileImage ||
      "",

    coverImage,

    bio:
      value.bio || "",

    location:
      value.location || "",

    website:
      value.website || "",

    email:
      value.email,

    verified:
      Boolean(value.verified),

    createdAt:
      value.createdAt,

    updatedAt:
      value.updatedAt,
  };
}

/* ============================================================================
   POST NORMALIZATION
============================================================================ */

function normalizePost(
  post: any,
): FockisPost {
  const images: string[] = [];

  if (
    Array.isArray(post?.images)
  ) {
    for (
      const value of post.images
    ) {
      if (
        typeof value === "string" &&
        value.length > 0
      ) {
        images.push(
          normalizeMediaUrl(value),
        );
      }
    }
  }

  if (
    typeof post?.image === "string" &&
    post.image
  ) {
    images.push(
      normalizeMediaUrl(
        post.image,
      ),
    );
  }

  if (
    typeof post?.mediaUrl === "string" &&
    post.mediaUrl
  ) {
    images.push(
      normalizeMediaUrl(
        post.mediaUrl,
      ),
    );
  }

  const uniqueImages =
    Array.from(
      new Set(
        images.filter(Boolean),
      ),
    );

  const author: FockisUser | null =
    post?.author
      ? normalizeUser(
          post.author,
        )
      : post?.user
        ? normalizeUser(
            post.user,
          )
        : null;

  return {
    ...post,

    id:
      post.id ||
      post._id ||
      "",

    _id:
      post._id ||
      post.id,

    content:
      post.content ||
      post.text ||
      "",

    text:
      post.text ||
      post.content ||
      "",

    images:
      uniqueImages,

    image:
      normalizeMediaUrl(
        post.image ||
          uniqueImages[0],
      ),

    mediaUrl:
      normalizeMediaUrl(
        post.mediaUrl ||
          uniqueImages[0],
      ),

    author:
      author || undefined,

    user:
      author || undefined,

    likesCount:
      Number(
        post.likesCount ??
          post.likes ??
          0,
      ),

    commentsCount:
      Number(
        post.commentsCount ??
          post.comments ??
          0,
      ),

    sharesCount:
      Number(
        post.sharesCount ??
          post.shares ??
          0,
      ),
  };
}

/* ============================================================================
   FRIEND NORMALIZATION
============================================================================ */

function normalizeFriend(
  item: any,
): FockisFriend | null {
  const friend =
    item?.friend ||
    item?.user ||
    item;

  if (!friend) {
    return null;
  }

  const user =
    normalizeUser(friend);

  if (!user?.id) {
    return null;
  }

  return {
    id:
      user.id,

    _id:
      user._id,

    fullName:
      user.name ||
      user.username ||
      "User",

    username:
      user.username,

    avatar:
      user.avatar,

    profileImage:
      user.profileImage,

    mutualFriends:
      item?.mutualFriends,

    createdAt:
      item?.createdAt ||
      user.createdAt,

    updatedAt:
      item?.updatedAt ||
      user.updatedAt,
  };
}

/* ============================================================================
   FRIEND ARRAY NORMALIZER
============================================================================ */

function normalizeFriendArray(
  value: unknown,
): FockisFriend[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: FockisFriend[] = [];

  for (
    const item of value
  ) {
    const friend =
      normalizeFriend(item);

    if (friend) {
      result.push(friend);
    }
  }

  return result;
}

/* ============================================================================
   PROFILE NORMALIZATION
============================================================================ */

function normalizeProfile(
  data: any,
): FockisProfile {
  const source =
    data?.profile &&
    typeof data.profile === "object"
      ? {
          ...data.profile,
          ...data,
        }
      : data;

  const normalizedUser =
    normalizeUser(
      source?.user ||
        source?.profile?.user ||
        source,
    );

  const safeUser: FockisUser =
    normalizedUser || {
      id: "",
    };

  /* --------------------------------------------------------------------------
     POSTS
  -------------------------------------------------------------------------- */

  let rawPosts: any[] = [];

  if (
    Array.isArray(
      source?.posts,
    )
  ) {
    rawPosts = source.posts;
  } else if (
    Array.isArray(
      source?.items,
    )
  ) {
    rawPosts = source.items;
  }

  const posts: FockisPost[] =
    rawPosts.map(
      (
        post: any,
      ): FockisPost =>
        normalizePost(post),
    );

  /* --------------------------------------------------------------------------
     FRIENDS
  -------------------------------------------------------------------------- */

  const friends: FockisFriend[] =
    normalizeFriendArray(
      source?.friends,
    );

  /* --------------------------------------------------------------------------
     FOLLOWERS
  -------------------------------------------------------------------------- */

  const followers: FockisFriend[] =
    normalizeFriendArray(
      source?.followers,
    );

  /* --------------------------------------------------------------------------
     FOLLOWING
  -------------------------------------------------------------------------- */

  const following: FockisFriend[] =
    normalizeFriendArray(
      source?.following,
    );

  /* --------------------------------------------------------------------------
     STATS
  -------------------------------------------------------------------------- */

  const stats = {
    posts:
      Number(
        source?.stats?.posts ??
          source?.postsCount ??
          source?.postCount ??
          posts.length,
      ),

    friends:
      Number(
        source?.stats?.friends ??
          source?.friendsCount ??
          friends.length,
      ),

    followers:
      Number(
        source?.stats?.followers ??
          source?.followersCount ??
          followers.length,
      ),

    following:
      Number(
        source?.stats?.following ??
          source?.followingCount ??
          following.length,
      ),
  };

  return {
    user:
      safeUser,

    stats,

    posts,

    friends,

    followers,

    following,
  };
}

/* ============================================================================
   API
============================================================================ */

export const fockisProfileApi = {

  /* ==========================================================================
     CURRENT USER PROFILE

     GET /users/me/profile
  ========================================================================== */

  async getMyProfile(): Promise<FockisProfile> {
    const data =
      await request<any>(
        "/users/me/profile",
      );

    return normalizeProfile(
      data,
    );
  },

  /* ==========================================================================
     PROFILE BY USER ID

     Your UsersController currently has:

       GET /users/:id

     It does NOT have:

       GET /users/:id/profile

     So use /users/:id directly.
  ========================================================================== */

  async getProfileById(
    userId: string,
  ): Promise<FockisProfile> {
    if (!userId) {
      throw new ProfileApiError(
        "User ID is required.",
        400,
      );
    }

    const data =
      await request<any>(
        `/users/${encodeURIComponent(
          userId,
        )}`,
      );

    return normalizeProfile(
      data,
    );
  },

  /* ==========================================================================
     PROFILE POSTS

     Your PostsController has:

       GET /posts?userId=USER_ID

     It does NOT have:

       GET /posts/user/:id

     Therefore use the existing endpoint.
  ========================================================================== */

  async getProfilePosts(
    userId: string,
  ): Promise<FockisPost[]> {
    if (!userId) {
      return [];
    }

    const data =
      await request<any>(
        `/posts?userId=${encodeURIComponent(
          userId,
        )}`,
      );

    let items: any[] = [];

    if (
      Array.isArray(data)
    ) {
      items = data;
    } else if (
      Array.isArray(
        data?.items,
      )
    ) {
      items = data.items;
    } else if (
      Array.isArray(
        data?.posts,
      )
    ) {
      items = data.posts;
    } else if (
      Array.isArray(
        data?.data,
      )
    ) {
      items = data.data;
    }

    return items.map(
      (
        post: any,
      ): FockisPost =>
        normalizePost(post),
    );
  },

  /* ==========================================================================
     PROFILE FRIENDS
  ========================================================================== */

  async getProfileFriends(
    userId: string,
  ): Promise<FockisFriend[]> {
    if (!userId) {
      return [];
    }

    try {
      const data =
        await request<any>(
          `/friends/${encodeURIComponent(
            userId,
          )}?page=1&limit=100`,
        );

      if (
        Array.isArray(data)
      ) {
        return normalizeFriendArray(
          data,
        );
      }

      if (
        Array.isArray(
          data?.items,
        )
      ) {
        return normalizeFriendArray(
          data.items,
        );
      }

      if (
        Array.isArray(
          data?.friends,
        )
      ) {
        return normalizeFriendArray(
          data.friends,
        );
      }

      return [];
    } catch {
      return [];
    }
  },

  /* ==========================================================================
     UPDATE PROFILE

     Supported backend routes:

       PATCH /users/:id
       PATCH /users/:id/profile-picture
       PATCH /users/:id/cover-photo
  ========================================================================== */

  async updateProfile(
    userId: string,
    payload: UpdateProfilePayload,
  ): Promise<void> {
    if (!userId) {
      throw new ProfileApiError(
        "User ID is required.",
        400,
      );
    }

    /* ------------------------------------------------------------------------
       PROFILE AVATAR

       Backend:
       PATCH /users/:id/profile-picture

       Form field:
       file
    ------------------------------------------------------------------------ */

    if (
      payload.avatar instanceof File
    ) {
      const formData =
        new FormData();

      formData.append(
        "file",
        payload.avatar,
      );

      await request<any>(
        `/users/${encodeURIComponent(
          userId,
        )}/profile-picture`,
        {
          method: "PATCH",
          body: formData,
        },
      );
    }

    /* ------------------------------------------------------------------------
       PROFILE IMAGE

       Also supports profileImage.
    ------------------------------------------------------------------------ */

    else if (
      payload.profileImage instanceof File
    ) {
      const formData =
        new FormData();

      formData.append(
        "file",
        payload.profileImage,
      );

      await request<any>(
        `/users/${encodeURIComponent(
          userId,
        )}/profile-picture`,
        {
          method: "PATCH",
          body: formData,
        },
      );
    }

    /* ------------------------------------------------------------------------
       COVER PHOTO

       Backend:
       PATCH /users/:id/cover-photo

       Form field:
       file
    ------------------------------------------------------------------------ */

    if (
      payload.coverImage instanceof File
    ) {
      const formData =
        new FormData();

      formData.append(
        "file",
        payload.coverImage,
      );

      await request<any>(
        `/users/${encodeURIComponent(
          userId,
        )}/cover-photo`,
        {
          method: "PATCH",
          body: formData,
        },
      );
    }

    /* ------------------------------------------------------------------------
       NORMAL PROFILE FIELDS

       Backend:
       PATCH /users/:id
    ------------------------------------------------------------------------ */

    const body: Record<
      string,
      string
    > = {};

    if (
      payload.name !== undefined
    ) {
      body.name =
        String(
          payload.name,
        );
    }

    if (
      (payload as any).fullName !==
      undefined
    ) {
      body.fullName =
        String(
          (payload as any).fullName,
        );
    }

    if (
      payload.firstName !==
      undefined
    ) {
      body.firstName =
        String(
          payload.firstName,
        );
    }

    if (
      payload.lastName !==
      undefined
    ) {
      body.lastName =
        String(
          payload.lastName,
        );
    }

    if (
      payload.username !==
      undefined
    ) {
      body.username =
        String(
          payload.username,
        );
    }

    if (
      payload.bio !== undefined
    ) {
      body.bio =
        String(
          payload.bio,
        );
    }

    if (
      payload.location !==
      undefined
    ) {
      body.location =
        String(
          payload.location,
        );
    }

    if (
      payload.website !==
      undefined
    ) {
      body.website =
        String(
          payload.website,
        );
    }

    /*
     * Do NOT send:
     *
     * avatar
     * profileImage
     * coverImage
     *
     * through this endpoint.
     *
     * Those use the multipart upload
     * endpoints above.
     */

    if (
      Object.keys(body).length > 0
    ) {
      await request<any>(
        `/users/${encodeURIComponent(
          userId,
        )}`,
        {
          method: "PATCH",
          body:
            JSON.stringify(body),
        },
      );
    }
  },
};