import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  Camera,
  Check,
  Edit3,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  MoreHorizontal,
  Music2,
  Settings,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";

import {
  ThemeProvider,
  useFockisTheme,
} from "../../context/ThemeContext";

import {
  useFockisProfile,
} from "../hooks/useMessageFockisProfile";

import {
  useFockisProfileStore,
} from "../store/fockismessageprofileStore";

import FockisProfileSettings from "../components/FockisMesageProfileSettings";

import "../styles/FockisProfilePage.scss";

type ProfileUser = {
  id?: string;
  _id?: string;
  userId?: string;
  fockisId?: string;
  username?: string;
  displayName?: string;
  name?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
  coverUrl?: string | null;
  coverPhotoUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  createdAt?: string;
  joinedAt?: string;
};

type ProfileData = {
  user?: ProfileUser;
  posts?: unknown[];
  followers?: number;
  following?: number;
  friends?: number;
  postCount?: number;
  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;
  bio?: string;
  location?: string;
  website?: string;
};

type Tab =
  | "posts"
  | "about"
  | "photos"
  | "videos"
  | "music"
  | "friends";

function normalizeId(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function getStoredCurrentUserId(): string {
  const directId =
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id");

  if (directId) {
    return directId.trim();
  }

  try {
    const raw = localStorage.getItem("user");

    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw);

    return normalizeId(
      parsed?._id ??
        parsed?.id ??
        parsed?.userId,
    );
  } catch {
    return "";
  }
}

function ProfileAvatar({
  user,
  size = "large",
}: {
  user: ProfileUser;
  size?: "small" | "large";
}) {
  const avatar =
    user.avatarUrl ||
    user.avatar ||
    "";

  const name =
    user.displayName ||
    user.name ||
    user.username ||
    "Fockis User";

  if (avatar) {
    return (
      <img
        className={`fockis-profile-avatar fockis-profile-avatar--${size}`}
        src={avatar}
        alt={name}
      />
    );
  }

  return (
    <div
      className={`fockis-profile-avatar fockis-profile-avatar--${size} fockis-profile-avatar--fallback`}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Stat({
  value,
  label,
  onClick,
}: {
  value: number;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <strong>
        {Number.isFinite(value)
          ? value.toLocaleString()
          : "0"}
      </strong>

      <span>{label}</span>
    </>
  );

  if (!onClick) {
    return (
      <div className="fockis-profile-stat">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="fockis-profile-stat fockis-profile-stat--button"
      onClick={onClick}
    >
      {content}
    </button>
  );
}

function EmptyTab({
  icon,
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="fockis-profile-empty-tab">
      <div className="fockis-profile-empty-tab__icon">
        {icon}
      </div>

      <h2>{title}</h2>

      <p>{text}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          className="fockis-profile-primary-button"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ProfilePageInner() {
  const { theme } = useFockisTheme();

  const navigate = useNavigate();

  const { userId: routeUserId } =
    useParams<{
      userId?: string;
    }>();

  const {
    profile,
    loading,
    error,
    profileMissing,
    updateProfile,
    createProfile,
    loadProfile,
  } = useFockisProfile(routeUserId);

  const {
    activeTab,
    setActiveTab,
  } = useFockisProfileStore();

  const [
    settingsOpen,
    setSettingsOpen,
  ] = useState(false);

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const [
    avatarUploading,
    setAvatarUploading,
  ] = useState(false);

  const avatarInputRef =
    useRef<HTMLInputElement>(null);

  const currentUserId =
    getStoredCurrentUserId();

  const profileData =
    (profile ?? null) as
      | ProfileData
      | null;

  const user =
    profileData?.user ?? null;

  const profileUserId =
    normalizeId(
      user?.id ??
        user?._id ??
        user?.userId ??
        routeUserId,
    );

  const isOwnProfile =
    Boolean(currentUserId) &&
    Boolean(profileUserId) &&
    currentUserId === profileUserId;

  const displayName =
    user?.displayName ||
    user?.name ||
    user?.username ||
    "Fockis User";

  const username =
    user?.username ||
    user?.fockisId ||
    "";

  const bio =
    user?.bio ??
    profileData?.bio ??
    "";

  const location =
    user?.location ??
    profileData?.location ??
    "";

  const website =
    user?.website ??
    profileData?.website ??
    "";

  const followersCount =
    Number(
      profileData?.followersCount ??
        profileData?.followers ??
        0,
    ) || 0;

  const followingCount =
    Number(
      profileData?.followingCount ??
        profileData?.following ??
        0,
    ) || 0;

  const friendsCount =
    Number(
      profileData?.friendsCount ??
        profileData?.friends ??
        0,
    ) || 0;

  const postCount =
    Number(
      profileData?.postCount ??
        profileData?.posts?.length ??
        0,
    ) || 0;

  const tabs = useMemo<
    {
      id: Tab;
      label: string;
      icon: ReactNode;
    }[]
  >(
    () => [
      {
        id: "posts",
        label: "Posts",
        icon: <Edit3 size={17} />,
      },
      {
        id: "about",
        label: "About",
        icon: <Info size={17} />,
      },
      {
        id: "photos",
        label: "Photos",
        icon: <ImageIcon size={17} />,
      },
      {
        id: "videos",
        label: "Videos",
        icon: <Video size={17} />,
      },
      {
        id: "music",
        label: "Music",
        icon: <Music2 size={17} />,
      },
      {
        id: "friends",
        label: "Friends",
        icon: <Users size={17} />,
      },
    ],
    [],
  );

  useEffect(() => {
    if (!activeTab) {
      setActiveTab("posts");
    }
  }, [
    activeTab,
    setActiveTab,
  ]);

  useEffect(() => {
    setMenuOpen(false);
    setSettingsOpen(false);
  }, [routeUserId]);

  const handleAvatarClick = () => {
    if (
      !isOwnProfile ||
      avatarUploading
    ) {
      return;
    }

    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file || !isOwnProfile) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      window.alert(
        "Please choose an image file.",
      );
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      window.alert(
        "Profile pictures must be smaller than 8 MB.",
      );
      return;
    }

    const previewUrl =
      URL.createObjectURL(file);

    setAvatarUploading(true);

    try {
      await updateProfile({
        avatarUrl: previewUrl,
      });

      await loadProfile();
    } catch (uploadError) {
      console.error(
        "[FOCKIS PROFILE] Avatar update failed:",
        uploadError,
      );

      window.alert(
        "Unable to update your profile picture.",
      );
    } finally {
      URL.revokeObjectURL(previewUrl);
      setAvatarUploading(false);
    }
  };

  const handleCreateProfile = async () => {
    try {
      await createProfile();
      await loadProfile();
    } catch (createError) {
      console.error(
        "[FOCKIS PROFILE] Create profile failed:",
        createError,
      );
    }
  };

  const handleMessage = () => {
    if (!profileUserId) {
      return;
    }

    navigate(
      `/messages?userId=${encodeURIComponent(
        profileUserId,
      )}`,
    );
  };

  const handleFriends = () => {
    navigate("/friends");
  };

  const handleEditProfile = () => {
    setMenuOpen(false);
    setSettingsOpen(true);
  };

  const handleFollow = () => {
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div
        className={`fockis-profile-shell ${
          theme === "dark"
            ? "fockis-profile-shell--dark"
            : ""
        }`}
      >
        <div className="fockis-profile-loading">
          <div className="fockis-profile-loading__card">
            <div className="fockis-profile-loading__cover" />

            <div className="fockis-profile-loading__content">
              <div className="fockis-profile-loading__avatar" />

              <div className="fockis-profile-loading__lines">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (
    !profile &&
    profileMissing &&
    isOwnProfile
  ) {
    return (
      <div
        className={`fockis-profile-shell ${
          theme === "dark"
            ? "fockis-profile-shell--dark"
            : ""
        }`}
      >
        <div className="fockis-profile-empty">
          <div className="fockis-profile-empty__icon">
            <Users size={38} />
          </div>

          <h1>
            Create your Fockis profile
          </h1>

          <p>
            Your Fockis profile is
            not set up yet. Create
            it to share posts,
            connect with friends,
            and build your Fockis
            presence.
          </p>

          <button
            type="button"
            className="fockis-profile-primary-button"
            onClick={() =>
              void handleCreateProfile()
            }
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`fockis-profile-shell ${
          theme === "dark"
            ? "fockis-profile-shell--dark"
            : ""
        }`}
      >
        <div className="fockis-profile-error">
          <div className="fockis-profile-error__icon">
            !
          </div>

          <h1>
            Unable to load profile
          </h1>

          <p>{error}</p>

          <button
            type="button"
            className="fockis-profile-primary-button"
            onClick={() =>
              void loadProfile()
            }
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className={`fockis-profile-shell ${
          theme === "dark"
            ? "fockis-profile-shell--dark"
            : ""
        }`}
      >
        <div className="fockis-profile-empty">
          <div className="fockis-profile-empty__icon">
            <Users size={38} />
          </div>

          <h1>Profile not found</h1>

          <p>
            This Fockis profile
            may have been removed
            or does not exist.
          </p>

          <button
            type="button"
            className="fockis-profile-secondary-button"
            onClick={() =>
              navigate("/fockis-preview")
            }
          >
            Back to Fockis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fockis-profile-shell ${
        theme === "dark"
          ? "fockis-profile-shell--dark"
          : ""
      }`}
    >
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleAvatarChange}
      />

      <div className="fockis-profile-page">
        {settingsOpen ? (
          <section className="fockis-profile-settings">
            <div className="fockis-profile-settings__header">
              <div>
                <span className="fockis-profile-eyebrow">
                  FOCKIS ACCOUNT
                </span>

                <h1>
                  Profile Settings
                </h1>

                <p>
                  Manage your public
                  Fockis profile.
                </p>
              </div>

              <button
                type="button"
                className="fockis-profile-icon-button"
                aria-label="Close profile settings"
                onClick={() =>
                  setSettingsOpen(false)
                }
              >
                <X size={21} />
              </button>
            </div>

            <FockisProfileSettings
              user={user}
              onSave={async (value) => {
                /*
                 * IMPORTANT:
                 *
                 * The settings component returns
                 * ProfileForm, while updateProfile
                 * currently expects Record<string, unknown>.
                 *
                 * Spreading the value creates a plain
                 * object compatible with the current
                 * updateProfile contract.
                 */
                await updateProfile({
                  ...value,
                });

                await loadProfile();

                setSettingsOpen(false);
              }}
              onClose={() =>
                setSettingsOpen(false)
              }
            />
          </section>
        ) : (
          <>
            <header className="fockis-profile-hero">
              <div
                className="fockis-profile-cover"
                style={
                  user.coverUrl ||
                  user.coverPhotoUrl ||
                  user.bannerUrl
                    ? {
                        backgroundImage:
                          `url("${user.coverUrl || user.coverPhotoUrl || user.bannerUrl}")`,
                      }
                    : undefined
                }
              >
                <div className="fockis-profile-cover__overlay" />

                {isOwnProfile && (
                  <button
                    type="button"
                    className="fockis-profile-cover__button"
                    onClick={() =>
                      window.alert(
                        "Cover photo editing can be connected to your existing media uploader.",
                      )
                    }
                  >
                    <Camera size={17} />
                    Change cover
                  </button>
                )}
              </div>

              <div className="fockis-profile-identity">
                <button
                  type="button"
                  className={`fockis-profile-avatar-button ${
                    isOwnProfile
                      ? "is-editable"
                      : ""
                  }`}
                  onClick={
                    isOwnProfile
                      ? handleAvatarClick
                      : undefined
                  }
                  aria-label={
                    isOwnProfile
                      ? "Change profile picture"
                      : "Profile picture"
                  }
                >
                  <ProfileAvatar
                    user={user}
                  />

                  {isOwnProfile && (
                    <span className="fockis-profile-avatar-button__edit">
                      {avatarUploading ? (
                        <Loader2
                          size={17}
                          className="fockis-spin"
                        />
                      ) : (
                        <Camera size={17} />
                      )}
                    </span>
                  )}
                </button>

                <div className="fockis-profile-identity__main">
                  <div className="fockis-profile-name-row">
                    <h1>{displayName}</h1>

                    <span className="fockis-profile-verified">
                      <Check
                        size={13}
                        strokeWidth={3}
                      />
                    </span>
                  </div>

                  {username && (
                    <p className="fockis-profile-username">
                      @{username}
                    </p>
                  )}

                  {bio && (
                    <p className="fockis-profile-bio">
                      {bio}
                    </p>
                  )}

                  <div className="fockis-profile-meta">
                    {location && (
                      <span>
                        <MapPin size={15} />
                        {location}
                      </span>
                    )}

                    {website && (
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {website.replace(
                          /^https?:\/\//,
                          "",
                        )}
                      </a>
                    )}
                  </div>
                </div>

                <div className="fockis-profile-actions">
                  {isOwnProfile ? (
                    <button
                      type="button"
                      className="fockis-profile-primary-button"
                      onClick={
                        handleEditProfile
                      }
                    >
                      <Edit3 size={17} />
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="fockis-profile-primary-button"
                        onClick={
                          handleFollow
                        }
                      >
                        <UserPlus size={17} />
                        Follow
                      </button>

                      <button
                        type="button"
                        className="fockis-profile-secondary-button"
                        onClick={
                          handleMessage
                        }
                      >
                        Message
                      </button>
                    </>
                  )}

                  <div className="fockis-profile-more">
                    <button
                      type="button"
                      className="fockis-profile-icon-button"
                      aria-label="More profile options"
                      aria-expanded={
                        menuOpen
                      }
                      onClick={() =>
                        setMenuOpen(
                          (value) =>
                            !value,
                        )
                      }
                    >
                      <MoreHorizontal size={21} />
                    </button>

                    {menuOpen && (
                      <div className="fockis-profile-more__menu">
                        {isOwnProfile ? (
                          <>
                            <button
                              type="button"
                              onClick={
                                handleEditProfile
                              }
                            >
                              <Settings size={17} />
                              Profile Settings
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  "/messages",
                                )
                              }
                            >
                              <Users size={17} />
                              Messages
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  "/friends",
                                )
                              }
                            >
                              <UserPlus size={17} />
                              Add Friend
                            </button>

                            <button
                              type="button"
                              className="is-danger"
                              onClick={() =>
                                setMenuOpen(
                                  false,
                                )
                              }
                            >
                              Report Profile
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="fockis-profile-stats">
                <Stat
                  value={postCount}
                  label="Posts"
                />

                <Stat
                  value={followersCount}
                  label="Followers"
                />

                <Stat
                  value={followingCount}
                  label="Following"
                />

                <Stat
                  value={friendsCount}
                  label="Friends"
                  onClick={
                    handleFriends
                  }
                />
              </div>
            </header>

            <nav
              className="fockis-profile-tabs"
              aria-label="Profile navigation"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={
                    activeTab === tab.id
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setActiveTab(
                      tab.id,
                    )
                  }
                >
                  {tab.icon}

                  <span>
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>

            <main className="fockis-profile-content">
              <section className="fockis-profile-content__main">
                {activeTab === "posts" && (
                  <div className="fockis-profile-section">
                    <div className="fockis-profile-section__heading">
                      <div>
                        <span className="fockis-profile-eyebrow">
                          ACTIVITY
                        </span>

                        <h2>Posts</h2>
                      </div>

                      {isOwnProfile && (
                        <button
                          type="button"
                          className="fockis-profile-secondary-button"
                          onClick={() =>
                            navigate(
                              "/fockis-preview",
                            )
                          }
                        >
                          Create post
                        </button>
                      )}
                    </div>

                    <div className="fockis-profile-post-placeholder">
                      <Edit3 size={28} />

                      <h3>
                        {postCount > 0
                          ? "Your posts will appear here"
                          : "No posts yet"}
                      </h3>

                      <p>
                        {isOwnProfile
                          ? "Share something with the Fockis community."
                          : "This user has not shared any posts yet."}
                      </p>

                      {isOwnProfile && (
                        <button
                          type="button"
                          className="fockis-profile-primary-button"
                          onClick={() =>
                            navigate(
                              "/fockis-preview",
                            )
                          }
                        >
                          Create your
                          first post
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "about" && (
                  <div className="fockis-profile-section">
                    <div className="fockis-profile-section__heading">
                      <div>
                        <span className="fockis-profile-eyebrow">
                          PROFILE
                        </span>

                        <h2>About</h2>
                      </div>
                    </div>

                    <div className="fockis-profile-about-grid">
                      <div className="fockis-profile-about-card">
                        <Info size={20} />

                        <div>
                          <span>Bio</span>

                          <strong>
                            {bio ||
                              "No bio added yet."}
                          </strong>
                        </div>
                      </div>

                      <div className="fockis-profile-about-card">
                        <MapPin size={20} />

                        <div>
                          <span>
                            Location
                          </span>

                          <strong>
                            {location ||
                              "No location added."}
                          </strong>
                        </div>
                      </div>

                      <div className="fockis-profile-about-card">
                        <Users size={20} />

                        <div>
                          <span>
                            Friends
                          </span>

                          <strong>
                            {friendsCount.toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "photos" && (
                  <EmptyTab
                    icon={
                      <ImageIcon size={30} />
                    }
                    title="Photos"
                    text="Photos shared by this profile will appear here."
                  />
                )}

                {activeTab === "videos" && (
                  <EmptyTab
                    icon={<Video size={30} />}
                    title="Videos"
                    text="Videos shared by this profile will appear here."
                  />
                )}

                {activeTab === "music" && (
                  <EmptyTab
                    icon={
                      <Music2 size={30} />
                    }
                    title="Music"
                    text="Music and releases from this profile will appear here."
                    actionLabel={
                      isOwnProfile
                        ? "Open Fockis Music"
                        : undefined
                    }
                    onAction={
                      isOwnProfile
                        ? () =>
                            navigate(
                              "/music",
                            )
                        : undefined
                    }
                  />
                )}

                {activeTab === "friends" && (
                  <EmptyTab
                    icon={<Users size={30} />}
                    title="Friends"
                    text="Your Fockis friends will appear here."
                    actionLabel="Open Friends"
                    onAction={
                      handleFriends
                    }
                  />
                )}
              </section>

              <aside className="fockis-profile-content__side">
                <div className="fockis-profile-card">
                  <div className="fockis-profile-card__header">
                    <h3>
                      Profile information
                    </h3>
                  </div>

                  <div className="fockis-profile-card__row">
                    <span>Fockis ID</span>

                    <strong>
                      {user.fockisId ||
                        username ||
                        profileUserId ||
                        "Not available"}
                    </strong>
                  </div>

                  {location && (
                    <div className="fockis-profile-card__row">
                      <span>
                        Location
                      </span>

                      <strong>
                        {location}
                      </strong>
                    </div>
                  )}

                  <div className="fockis-profile-card__row">
                    <span>
                      Followers
                    </span>

                    <strong>
                      {followersCount.toLocaleString()}
                    </strong>
                  </div>

                  <div className="fockis-profile-card__row">
                    <span>
                      Following
                    </span>

                    <strong>
                      {followingCount.toLocaleString()}
                    </strong>
                  </div>

                  <div className="fockis-profile-card__row">
                    <span>Friends</span>

                    <strong>
                      {friendsCount.toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="fockis-profile-card fockis-profile-card--brand">
                  <span className="fockis-profile-eyebrow">
                    FOCKIS
                  </span>

                  <h3>
                    Connect. Create.
                    Belong.
                  </h3>

                  <p>
                    Your profile is
                    the center of
                    your Fockis
                    identity.
                  </p>
                </div>
              </aside>
            </main>
          </>
        )}
      </div>
    </div>
  );
}

export default function FockisMessageProfilePage() {
  return (
    <ThemeProvider>
      <ProfilePageInner />
    </ThemeProvider>
  );
}