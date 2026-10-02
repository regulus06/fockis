import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { musicApi } from "../services/musicApi";

import type {
  MusicAccessType,
  MusicContent,
  MusicPublishStatus,
} from "../types/music.types";

import "../styles/MusicDashboard.scss";

type DashboardFilter =
  | "all"
  | "published"
  | "draft"
  | "processing"
  | "scheduled"
  | "failed";

type SortOption =
  | "newest"
  | "plays"
  | "views"
  | "purchases"
  | "title";

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMoney(
  cents: number,
  currency = "USD",
): string {
  const safeCents = Number.isFinite(cents)
    ? cents
    : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(safeCents / 100);
}

function formatDate(date?: string): string {
  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatContentType(type: string): string {
  return String(type || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatAccessType(
  accessType: MusicAccessType,
): string {
  switch (accessType) {
    case "free":
      return "Free";

    case "preview_paid":
      return "Preview + Paid";

    case "paid":
      return "Paid";

    case "premium":
      return "Premium";

    case "exclusive":
      return "Exclusive";

    default:
      return "Unknown";
  }
}

function getStatusLabel(
  status: MusicPublishStatus,
): string {
  switch (status) {
    case "published":
      return "Published";

    case "draft":
      return "Draft";

    case "processing":
      return "Processing";

    case "scheduled":
      return "Scheduled";

    case "failed":
      return "Failed";

    case "taken_down":
      return "Taken Down";

    default:
      return status;
  }
}

function getStatusClass(
  status: MusicPublishStatus,
): string {
  return `music-dashboard-status music-dashboard-status--${status}`;
}

function getAccessClass(
  accessType: MusicAccessType,
): string {
  return `music-dashboard-access music-dashboard-access--${accessType}`;
}

function getContentImage(
  content: MusicContent,
): string | undefined {
  return (
    content.coverImageUrl ||
    content.thumbnailUrl
  );
}

function getContentIcon(
  content: MusicContent,
): string {
  const type = String(
    content.type || "",
  ).toLowerCase();

  if (
    type.includes("movie") ||
    type.includes("film")
  ) {
    return "🎞️";
  }

  if (
    type.includes("video") ||
    type.includes("performance") ||
    type.includes("interview") ||
    type.includes("behind")
  ) {
    return "🎬";
  }

  if (
    type.includes("tutorial") ||
    type.includes("educational")
  ) {
    return "📚";
  }

  if (type.includes("fashion")) {
    return "👗";
  }

  if (type.includes("event")) {
    return "🎟️";
  }

  if (type.includes("announcement")) {
    return "📢";
  }

  if (type.includes("update")) {
    return "✨";
  }

  if (type.includes("album")) {
    return "💿";
  }

  if (type.includes("ep")) {
    return "📀";
  }

  if (type.includes("beat")) {
    return "🥁";
  }

  if (type.includes("instrumental")) {
    return "🎹";
  }

  return "🎵";
}

function getContentId(
  item: MusicContent,
): string {
  const value = item as MusicContent & {
    _id?: string;
    id?: string;
  };

  return String(
    value._id ??
      value.id ??
      "",
  );
}

export default function MusicProducerDashboardPage() {
  const navigate = useNavigate();

  const [content, setContent] =
    useState<MusicContent[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<DashboardFilter>("all");

  const [sort, setSort] =
    useState<SortOption>("newest");

  const [search, setSearch] =
    useState("");

  const [selectedContentId, setSelectedContentId] =
    useState<string | null>(null);

  const [deletingContentId, setDeletingContentId] =
    useState<string | null>(null);

  const loadDashboard = useCallback(
    async (
      showRefreshing = false,
    ) => {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const result =
          await musicApi.myStudioContent();

        setContent(
          Array.isArray(result)
            ? result
            : [],
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load your creator studio.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const published = content.filter(
      (item) =>
        item.status === "published",
    );

    const drafts = content.filter(
      (item) =>
        item.status === "draft",
    );

    const processing = content.filter(
      (item) =>
        item.status === "processing",
    );

    const scheduled = content.filter(
      (item) =>
        item.status === "scheduled",
    );

    const failed = content.filter(
      (item) =>
        item.status === "failed",
    );

    const totalPlays = content.reduce(
      (total, item) =>
        total +
        (Number.isFinite(item.playCount)
          ? item.playCount
          : 0),
      0,
    );

    const totalViews = content.reduce(
      (total, item) =>
        total +
        (Number.isFinite(item.viewCount)
          ? item.viewCount
          : 0),
      0,
    );

    const totalPurchases =
      content.reduce(
        (total, item) =>
          total +
          (Number.isFinite(
            item.purchaseCount,
          )
            ? item.purchaseCount
            : 0),
        0,
      );

    const paidPurchasesValue =
      content.reduce(
        (total, item) =>
          total +
          (Number.isFinite(
            item.purchaseCount,
          )
            ? item.purchaseCount
            : 0) *
            (Number.isFinite(
              item.priceCents,
            )
              ? item.priceCents
              : 0),
        0,
      );

    const featured = content.filter(
      (item) => item.isFeatured,
    );

    const paidContent = content.filter(
      (item) =>
        Number.isFinite(
          item.priceCents,
        ) &&
        item.priceCents > 0,
    );

    return {
      total: content.length,
      published: published.length,
      drafts: drafts.length,
      processing: processing.length,
      scheduled: scheduled.length,
      failed: failed.length,
      totalPlays,
      totalViews,
      totalPurchases,
      paidPurchasesValue,
      featured: featured.length,
      paidContent: paidContent.length,
    };
  }, [content]);

  const filteredContent = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    const result = content.filter(
      (item) => {
        if (
          filter !== "all" &&
          item.status !== filter
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          item.title,
          item.description,
          item.producerName,
          item.genre,
          item.type,
          ...(Array.isArray(item.tags)
            ? item.tags
            : []),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(
                normalizedSearch,
              ),
          );
      },
    );

    return [...result].sort(
      (a, b) => {
        switch (sort) {
          case "plays":
            return (
              b.playCount -
              a.playCount
            );

          case "views":
            return (
              b.viewCount -
              a.viewCount
            );

          case "purchases":
            return (
              b.purchaseCount -
              a.purchaseCount
            );

          case "title":
            return a.title.localeCompare(
              b.title,
            );

          case "newest":
          default:
            return (
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime()
            );
        }
      },
    );
  }, [
    content,
    filter,
    search,
    sort,
  ]);

  const selectedContent =
    selectedContentId
      ? content.find(
          (item) =>
            getContentId(item) ===
            selectedContentId,
        ) ?? null
      : null;

  const handleOpenContent = (
    item: MusicContent,
  ) => {
    const id = getContentId(item);

    if (!id) {
      return;
    }

    navigate(
      `/music/${encodeURIComponent(id)}`,
    );
  };

  const handleEditContent = (
    item: MusicContent,
  ) => {
    const id = getContentId(item);

    if (!id) {
      return;
    }

    navigate(
      `/music/studio/edit/${encodeURIComponent(id)}`,
    );
  };

  const handleDeleteContent = async (
    item: MusicContent,
  ) => {
    const id = getContentId(item);

    if (!id) {
      setError(
        "This content does not have a valid ID and cannot be deleted.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${item.title}"?\n\nThis action permanently removes the content from your creator studio. This cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingContentId(id);
    setError(null);

    try {
      await musicApi.remove(id);

      setContent((current) =>
        current.filter(
          (entry) =>
            getContentId(entry) !== id,
        ),
      );

      setSelectedContentId(
        (current) =>
          current === id
            ? null
            : current,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to delete this content.";

      setError(message);
    } finally {
      setDeletingContentId(null);
    }
  };

  const handleCreateContent = () => {
    navigate(
      "/music/studio/create",
    );
  };

  const handleManageCreatorPage = () => {
    navigate(
      "/music/producer/profile",
    );
  };

  const handleManageTeam = () => {
    navigate(
      "/music/producer/team",
    );
  };

  if (loading) {
    return (
      <div className="music-dashboard">
        <div className="music-dashboard__loading">
          <div className="music-dashboard-spinner" />

          <h2>
            Loading your creator studio
          </h2>

          <p>
            Preparing your content dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="music-dashboard">
      <header className="music-dashboard__header">
        <div className="music-dashboard__header-inner">
          <div>
            <div className="music-dashboard__eyebrow">
              FOCKIS CREATOR STUDIO
            </div>

            <h1>
              Creator Manager
            </h1>

            <p>
              Manage your Creator Page,
              publish content, track
              performance, and grow your
              creator business.
            </p>
          </div>

          <div className="music-dashboard__header-actions">
            <Link
              to="/music"
              className="music-dashboard-button music-dashboard-button--secondary"
            >
              <span>←</span>
              Marketplace
            </Link>

            <Link
              to="/music/producer/profile"
              className="music-dashboard-button music-dashboard-button--secondary"
            >
              <span>◎</span>
              Producer Profile
            </Link>

            <Link
              to="/music/producer/team"
              className="music-dashboard-button music-dashboard-button--secondary"
            >
              <span>♙</span>
              Manage Team
            </Link>

            <button
              type="button"
              className="music-dashboard-button music-dashboard-button--primary"
              onClick={
                handleCreateContent
              }
            >
              <span>＋</span>
              Create Content
            </button>
          </div>
        </div>
      </header>

      <main className="music-dashboard__main">
        <section className="music-dashboard-panel music-dashboard-panel--creator-page">
          <div className="music-dashboard-panel__header">
            <div>
              <span className="music-dashboard-panel__kicker">
                CREATOR PAGE
              </span>

              <h2>
                Manage Your Creator Page
              </h2>

              <p>
                Your Creator Page is your
                public identity on Fockis.
                Manage your producer name,
                biography, genres, artwork,
                social links, and public
                presentation from the Producer
                Profile manager.
              </p>
            </div>

            <Link
              to="/music/producer/profile"
              className="music-dashboard-button music-dashboard-button--primary"
            >
              Edit Producer Profile →
            </Link>
          </div>

          <div className="music-dashboard-creator-manager-grid">
            <Link
              to="/music/producer/profile"
              className="music-dashboard-manager-card"
            >
              <span className="music-dashboard-manager-card__icon">
                ◎
              </span>

              <span className="music-dashboard-manager-card__content">
                <strong>
                  Profile Information
                </strong>

                <small>
                  Update your producer name,
                  bio, genres, and public
                  profile information.
                </small>
              </span>

              <span className="music-dashboard-manager-card__arrow">
                →
              </span>
            </Link>

            <Link
              to="/music/producer/profile"
              className="music-dashboard-manager-card"
            >
              <span className="music-dashboard-manager-card__icon">
                ◈
              </span>

              <span className="music-dashboard-manager-card__content">
                <strong>
                  Creator Branding
                </strong>

                <small>
                  Manage your profile image,
                  cover artwork, and public
                  creator presentation.
                </small>
              </span>

              <span className="music-dashboard-manager-card__arrow">
                →
              </span>
            </Link>

            <Link
              to="/music/producer/profile"
              className="music-dashboard-manager-card"
            >
              <span className="music-dashboard-manager-card__icon">
                #
              </span>

              <span className="music-dashboard-manager-card__content">
                <strong>
                  Genres & Identity
                </strong>

                <small>
                  Keep your creator categories
                  and musical identity accurate
                  for your audience.
                </small>
              </span>

              <span className="music-dashboard-manager-card__arrow">
                →
              </span>
            </Link>

            <Link
              to="/music/producer/team"
              className="music-dashboard-manager-card"
            >
              <span className="music-dashboard-manager-card__icon">
                ♙
              </span>

              <span className="music-dashboard-manager-card__content">
                <strong>
                  Team & Roles
                </strong>

                <small>
                  Add admins, managers,
                  editors, marketing users,
                  and other creator team
                  members.
                </small>
              </span>

              <span className="music-dashboard-manager-card__arrow">
                →
              </span>
            </Link>

            <Link
              to="/music/producer/profile"
              className="music-dashboard-manager-card"
            >
              <span className="music-dashboard-manager-card__icon">
                ↗
              </span>

              <span className="music-dashboard-manager-card__content">
                <strong>
                  Public Appearance
                </strong>

                <small>
                  Preview how listeners see
                  your Fockis Music creator
                  identity.
                </small>
              </span>

              <span className="music-dashboard-manager-card__arrow">
                →
              </span>
            </Link>
          </div>
        </section>

        <section className="music-dashboard__stats">
          <article className="music-dashboard-stat">
            <div className="music-dashboard-stat__icon">
              ✦
            </div>

            <div>
              <span>Total Content</span>

              <strong>
                {formatNumber(stats.total)}
              </strong>

              <small>
                All creator content
              </small>
            </div>
          </article>

          <article className="music-dashboard-stat">
            <div className="music-dashboard-stat__icon">
              ✓
            </div>

            <div>
              <span>Published</span>

              <strong>
                {formatNumber(
                  stats.published,
                )}
              </strong>

              <small>
                Live for your audience
              </small>
            </div>
          </article>

          <article className="music-dashboard-stat">
            <div className="music-dashboard-stat__icon">
              ▶
            </div>

            <div>
              <span>Plays</span>

              <strong>
                {formatNumber(
                  stats.totalPlays,
                )}
              </strong>

              <small>
                Audio plays
              </small>
            </div>
          </article>

          <article className="music-dashboard-stat">
            <div className="music-dashboard-stat__icon">
              ◉
            </div>

            <div>
              <span>Views</span>

              <strong>
                {formatNumber(
                  stats.totalViews,
                )}
              </strong>

              <small>
                Content views
              </small>
            </div>
          </article>

          <article className="music-dashboard-stat">
            <div className="music-dashboard-stat__icon">
              $
            </div>

            <div>
              <span>Purchases</span>

              <strong>
                {formatNumber(
                  stats.totalPurchases,
                )}
              </strong>

              <small>
                Content purchases
              </small>
            </div>
          </article>

          <article className="music-dashboard-stat">
            <div className="music-dashboard-stat__icon">
              ★
            </div>

            <div>
              <span>Featured</span>

              <strong>
                {formatNumber(
                  stats.featured,
                )}
              </strong>

              <small>
                Featured content
              </small>
            </div>
          </article>
        </section>

        <section className="music-dashboard__top-grid">
          <article className="music-dashboard-panel music-dashboard-panel--performance">
            <div className="music-dashboard-panel__header">
              <div>
                <span className="music-dashboard-panel__kicker">
                  PERFORMANCE
                </span>

                <h2>
                  Content Health
                </h2>
              </div>

              <button
                type="button"
                className="music-dashboard-link-button"
                onClick={() =>
                  setFilter(
                    "published",
                  )
                }
              >
                View published →
              </button>
            </div>

            <div className="music-dashboard-performance">
              {(
                [
                  [
                    "Published content",
                    stats.published,
                  ],
                  [
                    "Drafts",
                    stats.drafts,
                  ],
                  [
                    "Processing",
                    stats.processing,
                  ],
                  [
                    "Scheduled",
                    stats.scheduled,
                  ],
                  [
                    "Failed",
                    stats.failed,
                  ],
                ] as Array<
                  [string, number]
                >
              ).map(
                ([label, value]) => (
                  <div
                    key={label}
                  >
                    <div className="music-dashboard-performance__row">
                      <span>
                        {label}
                      </span>

                      <strong>
                        {value}
                      </strong>
                    </div>

                    <div className="music-dashboard-progress">
                      <span
                        style={{
                          width:
                            stats.total >
                            0
                              ? `${Math.min(
                                  100,
                                  (value /
                                    stats.total) *
                                    100,
                                )}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                ),
              )}
            </div>
          </article>

          <article className="music-dashboard-panel music-dashboard-panel--earnings">
            <div className="music-dashboard-panel__header">
              <div>
                <span className="music-dashboard-panel__kicker">
                  MONETIZATION
                </span>

                <h2>
                  Sales Overview
                </h2>
              </div>

              <span className="music-dashboard-earnings-icon">
                $
              </span>
            </div>

            <div className="music-dashboard-earnings">
              <span>
                Gross content value
              </span>

              <strong>
                {formatMoney(
                  stats.paidPurchasesValue,
                )}
              </strong>

              <p>
                Calculated from recorded
                purchases and current
                content prices.
              </p>
            </div>

            <div className="music-dashboard-earnings-grid">
              <div>
                <span>Purchases</span>

                <strong>
                  {formatNumber(
                    stats.totalPurchases,
                  )}
                </strong>
              </div>

              <div>
                <span>Paid content</span>

                <strong>
                  {formatNumber(
                    stats.paidContent,
                  )}
                </strong>
              </div>
            </div>

            <div className="music-dashboard-earnings-note">
              Final creator earnings should
              be calculated by the server after
              platform fees, refunds, taxes,
              and payouts.
            </div>
          </article>
        </section>

        <section className="music-dashboard-panel music-dashboard-panel--quick-actions">
          <div className="music-dashboard-panel__header">
            <div>
              <span className="music-dashboard-panel__kicker">
                CREATOR TOOLS
              </span>

              <h2>
                Creator Manager
              </h2>

              <p>
                Everything you need to manage
                your Fockis creator business.
              </p>
            </div>
          </div>

          <div className="music-dashboard-actions-grid">
            <Link
              to="/music/producer/profile"
              className="music-dashboard-action"
            >
              <span className="music-dashboard-action__icon">
                ◎
              </span>

              <span>
                <strong>
                  Producer Profile
                </strong>

                <small>
                  Manage your creator name,
                  bio, genres, branding, and
                  public identity.
                </small>
              </span>

              <span className="music-dashboard-action__arrow">
                →
              </span>
            </Link>

            <Link
              to="/music/producer/team"
              className="music-dashboard-action"
            >
              <span className="music-dashboard-action__icon">
                ♙
              </span>

              <span>
                <strong>
                  Manage Team & Roles
                </strong>

                <small>
                  Add and manage admins,
                  managers, editors, marketing,
                  analysts, and other team
                  members.
                </small>
              </span>

              <span className="music-dashboard-action__arrow">
                →
              </span>
            </Link>

            <Link
              to="/music/studio/create"
              className="music-dashboard-action"
            >
              <span className="music-dashboard-action__icon">
                ＋
              </span>

              <span>
                <strong>
                  Create Content
                </strong>

                <small>
                  Publish music, video, movies,
                  series, and creator content.
                </small>
              </span>

              <span className="music-dashboard-action__arrow">
                →
              </span>
            </Link>

            <Link
              to="/music/charts"
              className="music-dashboard-action"
            >
              <span className="music-dashboard-action__icon">
                ↗
              </span>

              <span>
                <strong>
                  View Charts
                </strong>

                <small>
                  Discover trending content
                  across Fockis.
                </small>
              </span>

              <span className="music-dashboard-action__arrow">
                →
              </span>
            </Link>

            <Link
              to="/music"
              className="music-dashboard-action"
            >
              <span className="music-dashboard-action__icon">
                ◉
              </span>

              <span>
                <strong>
                  View Marketplace
                </strong>

                <small>
                  See your content as your
                  audience sees it.
                </small>
              </span>

              <span className="music-dashboard-action__arrow">
                →
              </span>
            </Link>

            <button
              type="button"
              className="music-dashboard-action"
              onClick={() =>
                void loadDashboard(true)
              }
              disabled={refreshing}
            >
              <span className="music-dashboard-action__icon">
                ↻
              </span>

              <span>
                <strong>
                  {refreshing
                    ? "Refreshing..."
                    : "Refresh Studio"}
                </strong>

                <small>
                  Sync your latest creator
                  content data.
                </small>
              </span>

              <span className="music-dashboard-action__arrow">
                →
              </span>
            </button>
          </div>
        </section>

        {error && (
          <section className="music-dashboard__alert music-dashboard__alert--error">
            <div>
              <strong>
                Creator studio action failed.
              </strong>

              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadDashboard(true)
              }
            >
              Try again
            </button>
          </section>
        )}

        <section className="music-dashboard-panel music-dashboard-panel--content">
          <div className="music-dashboard-panel__header music-dashboard-panel__header--content">
            <div>
              <span className="music-dashboard-panel__kicker">
                CONTENT MANAGEMENT
              </span>

              <h2>
                Your Content
              </h2>

              <p>
                Manage music, videos, movies,
                performances, tutorials, series,
                and other creator content from
                one place.
              </p>
            </div>

            <div className="music-dashboard-content-tools">
              <label className="music-dashboard-search">
                <span>Search</span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search content..."
                  aria-label="Search content"
                />
              </label>

              <label className="music-dashboard-select">
                <span>Sort</span>

                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(
                      event.target
                        .value as SortOption,
                    )
                  }
                >
                  <option value="newest">
                    Newest
                  </option>

                  <option value="plays">
                    Most played
                  </option>

                  <option value="views">
                    Most viewed
                  </option>

                  <option value="purchases">
                    Most purchased
                  </option>

                  <option value="title">
                    Title
                  </option>
                </select>
              </label>
            </div>
          </div>

          <div className="music-dashboard-filters">
            {(
              [
                [
                  "all",
                  "All",
                  stats.total,
                ],
                [
                  "published",
                  "Published",
                  stats.published,
                ],
                [
                  "draft",
                  "Drafts",
                  stats.drafts,
                ],
                [
                  "processing",
                  "Processing",
                  stats.processing,
                ],
                [
                  "scheduled",
                  "Scheduled",
                  stats.scheduled,
                ],
                [
                  "failed",
                  "Failed",
                  stats.failed,
                ],
              ] as Array<
                [
                  DashboardFilter,
                  string,
                  number,
                ]
              >
            ).map(
              ([
                filterValue,
                label,
                count,
              ]) => (
                <button
                  key={filterValue}
                  type="button"
                  className={
                    filter ===
                    filterValue
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(
                      filterValue,
                    )
                  }
                >
                  {label}

                  <span>
                    {count}
                  </span>
                </button>
              ),
            )}
          </div>

          {filteredContent.length ===
          0 ? (
            <div className="music-dashboard-empty">
              <div className="music-dashboard-empty__icon">
                ✦
              </div>

              <h3>
                {content.length ===
                0
                  ? "Your creator studio is empty"
                  : "No content found"}
              </h3>

              <p>
                {content.length ===
                0
                  ? "Your published and saved content will appear here when you create it."
                  : "Try changing your search or filters."}
              </p>

              {content.length ===
                0 && (
                <button
                  type="button"
                  className="music-dashboard-button music-dashboard-button--primary"
                  onClick={
                    handleCreateContent
                  }
                >
                  Create your first
                  piece of content
                </button>
              )}
            </div>
          ) : (
            <div className="music-dashboard-table-wrapper">
              <table className="music-dashboard-table">
                <thead>
                  <tr>
                    <th>Content</th>
                    <th>Status</th>
                    <th>Access</th>
                    <th>Plays</th>
                    <th>Views</th>
                    <th>Purchases</th>
                    <th>Released</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContent.map(
                    (item) => {
                      const image =
                        getContentImage(
                          item,
                        );

                      const itemId =
                        getContentId(
                          item,
                        );

                      const isDeleting =
                        deletingContentId ===
                        itemId;

                      return (
                        <tr
                          key={
                            itemId ||
                            `content-${item.title}-${item.createdAt}`
                          }
                          className={
                            selectedContentId ===
                            itemId
                              ? "is-selected"
                              : ""
                          }
                          onClick={() =>
                            itemId &&
                            setSelectedContentId(
                              itemId,
                            )
                          }
                        >
                          <td>
                            <div className="music-dashboard-content-cell">
                              <div className="music-dashboard-thumbnail">
                                {image ? (
                                  <img
                                    src={
                                      image
                                    }
                                    alt=""
                                    loading="lazy"
                                  />
                                ) : (
                                  <span>
                                    {getContentIcon(
                                      item,
                                    )}
                                  </span>
                                )}
                              </div>

                              <div>
                                <strong>
                                  {
                                    item.title
                                  }
                                </strong>

                                <span>
                                  {formatContentType(
                                    item.type,
                                  )}

                                  {item.genre
                                    ? ` • ${formatContentType(
                                        item.genre,
                                      )}`
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                item.status,
                              )}
                            >
                              <i />

                              {getStatusLabel(
                                item.status,
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={getAccessClass(
                                item.accessType,
                              )}
                            >
                              {formatAccessType(
                                item.accessType,
                              )}
                            </span>
                          </td>

                          <td>
                            {formatNumber(
                              item.playCount,
                            )}
                          </td>

                          <td>
                            {formatNumber(
                              item.viewCount,
                            )}
                          </td>

                          <td>
                            {formatNumber(
                              item.purchaseCount,
                            )}
                          </td>

                          <td>
                            {formatDate(
                              item.releaseDate ||
                                item.createdAt,
                            )}
                          </td>

                          <td>
                            <div className="music-dashboard-row-actions">
                              <button
                                type="button"
                                className="music-dashboard-row-button music-dashboard-row-button--open"
                                onClick={(
                                  event,
                                ) => {
                                  event.stopPropagation();

                                  handleOpenContent(
                                    item,
                                  );
                                }}
                              >
                                Open
                              </button>

                              <button
                                type="button"
                                className="music-dashboard-row-button music-dashboard-row-button--edit"
                                onClick={(
                                  event,
                                ) => {
                                  event.stopPropagation();

                                  handleEditContent(
                                    item,
                                  );
                                }}
                                disabled={
                                  isDeleting
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="music-dashboard-row-button music-dashboard-row-button--delete"
                                onClick={(
                                  event,
                                ) => {
                                  event.stopPropagation();

                                  void handleDeleteContent(
                                    item,
                                  );
                                }}
                                disabled={
                                  isDeleting
                                }
                              >
                                {isDeleting
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedContent && (
          <section className="music-dashboard-panel music-dashboard-panel--inspector">
            <div className="music-dashboard-panel__header">
              <div>
                <span className="music-dashboard-panel__kicker">
                  SELECTED CONTENT
                </span>

                <h2>
                  {selectedContent.title}
                </h2>
              </div>

              <button
                type="button"
                className="music-dashboard-close"
                onClick={() =>
                  setSelectedContentId(
                    null,
                  )
                }
                aria-label="Close selected content"
              >
                ×
              </button>
            </div>

            <div className="music-dashboard-inspector">
              <div className="music-dashboard-inspector__cover">
                {getContentImage(
                  selectedContent,
                ) ? (
                  <img
                    src={getContentImage(
                      selectedContent,
                    )}
                    alt=""
                  />
                ) : (
                  <span>
                    {getContentIcon(
                      selectedContent,
                    )}
                  </span>
                )}
              </div>

              <div className="music-dashboard-inspector__details">
                <div className="music-dashboard-inspector__meta">
                  <span
                    className={getStatusClass(
                      selectedContent.status,
                    )}
                  >
                    <i />

                    {getStatusLabel(
                      selectedContent.status,
                    )}
                  </span>

                  <span
                    className={getAccessClass(
                      selectedContent.accessType,
                    )}
                  >
                    {formatAccessType(
                      selectedContent.accessType,
                    )}
                  </span>

                  {selectedContent.isFeatured && (
                    <span className="music-dashboard-featured">
                      ★ Featured
                    </span>
                  )}

                  {selectedContent.isExclusive && (
                    <span className="music-dashboard-exclusive">
                      Exclusive
                    </span>
                  )}
                </div>

                <p>
                  {selectedContent.description ||
                    "No description has been added to this content yet."}
                </p>

                <div className="music-dashboard-inspector__stats">
                  <div>
                    <strong>
                      {formatNumber(
                        selectedContent.playCount,
                      )}
                    </strong>

                    <span>Plays</span>
                  </div>

                  <div>
                    <strong>
                      {formatNumber(
                        selectedContent.viewCount,
                      )}
                    </strong>

                    <span>Views</span>
                  </div>

                  <div>
                    <strong>
                      {formatNumber(
                        selectedContent.purchaseCount,
                      )}
                    </strong>

                    <span>Purchases</span>
                  </div>

                  <div>
                    <strong>
                      {formatMoney(
                        selectedContent.priceCents,
                        selectedContent.currency,
                      )}
                    </strong>

                    <span>Price</span>
                  </div>
                </div>

                <div className="music-dashboard-inspector__actions">
                  <button
                    type="button"
                    className="music-dashboard-button music-dashboard-button--primary"
                    onClick={() =>
                      handleOpenContent(
                        selectedContent,
                      )
                    }
                  >
                    View Content
                  </button>

                  <button
                    type="button"
                    className="music-dashboard-button music-dashboard-button--secondary"
                    onClick={() =>
                      handleEditContent(
                        selectedContent,
                      )
                    }
                    disabled={
                      deletingContentId ===
                      getContentId(
                        selectedContent,
                      )
                    }
                  >
                    Edit Content
                  </button>

                  <button
                    type="button"
                    className="music-dashboard-button music-dashboard-button--danger"
                    onClick={() =>
                      void handleDeleteContent(
                        selectedContent,
                      )
                    }
                    disabled={
                      deletingContentId ===
                      getContentId(
                        selectedContent,
                      )
                    }
                  >
                    {deletingContentId ===
                    getContentId(
                      selectedContent,
                    )
                      ? "Deleting..."
                      : "Delete Content"}
                  </button>

                  <button
                    type="button"
                    className="music-dashboard-button music-dashboard-button--secondary"
                    onClick={() =>
                      setSelectedContentId(
                        null,
                      )
                    }
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="music-dashboard-panel music-dashboard-panel--health">
          <div className="music-dashboard-panel__header">
            <div>
              <span className="music-dashboard-panel__kicker">
                STUDIO STATUS
              </span>

              <h2>
                Publishing Health
              </h2>
            </div>
          </div>

          <div className="music-dashboard-health">
            <div className="music-dashboard-health-item">
              <div className="music-dashboard-health-item__icon">
                ✓
              </div>

              <div>
                <strong>
                  Published
                </strong>

                <span>
                  {stats.published} piece
                  {stats.published ===
                  1
                    ? ""
                    : "s"} live
                </span>
              </div>
            </div>

            <div className="music-dashboard-health-item">
              <div className="music-dashboard-health-item__icon">
                ○
              </div>

              <div>
                <strong>
                  Drafts
                </strong>

                <span>
                  {stats.drafts} waiting for
                  publishing
                </span>
              </div>
            </div>

            <div className="music-dashboard-health-item">
              <div className="music-dashboard-health-item__icon">
                ◌
              </div>

              <div>
                <strong>
                  Processing
                </strong>

                <span>
                  {stats.processing} being
                  processed
                </span>
              </div>
            </div>

            <div className="music-dashboard-health-item">
              <div className="music-dashboard-health-item__icon">
                ◷
              </div>

              <div>
                <strong>
                  Scheduled
                </strong>

                <span>
                  {stats.scheduled} scheduled
                  item
                  {stats.scheduled ===
                  1
                    ? ""
                    : "s"}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}