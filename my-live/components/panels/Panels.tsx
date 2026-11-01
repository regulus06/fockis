import { useMemo, useState } from "react";

import { api } from "../../api";
import {
  Check,
  DollarSign,
  Gift as GiftIcon,
  Heart,
  MessageCircle,
  MessageCircleQuestion,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  Vote,
  X,
} from "lucide-react";

import {
  effects,
  gifts,
  products,
  streamCategories,
  tracks,
} from "../../data";

import type {
  Analytics,
  Effect,
  EffectCategory,
  Gift,
  Guest,
  GuestLayout,
  LiveGuestInvitationDTO,
  Phase,
  Product,
  SentGift,
  StreamInfo,
} from "../../types";

import {
  Avatar,
  Button,
  EmptyState,
  PanelShell,
  ToggleSwitch,
} from "../ui/Primitives";

/* ============================================================================
   SETTINGS PANEL
   ============================================================================ */

export function SettingsPanel({
  streamInfo,
  setStreamInfo,
  onClose,
}: {
  streamInfo: StreamInfo;
  setStreamInfo: (info: StreamInfo) => void;
  onClose: () => void;
}) {
  return (
    <PanelShell
      title="Stream settings"
      subtitle="Shown to viewers before and during your live"
      onClose={onClose}
    >
      <div className="field">
        <label className="field__label" htmlFor="settings-title">
          Title
        </label>

        <input
          id="settings-title"
          className="field__input"
          value={streamInfo.title}
          maxLength={100}
          onChange={(event) =>
            setStreamInfo({
              ...streamInfo,
              title: event.target.value,
            })
          }
          placeholder="What I'm building today 🔥"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="settings-description">
          Description
        </label>

        <textarea
          id="settings-description"
          className="field__textarea"
          value={streamInfo.description}
          onChange={(event) =>
            setStreamInfo({
              ...streamInfo,
              description: event.target.value,
            })
          }
          placeholder="Tell your viewers what this LIVE is about…"
          rows={3}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="settings-category">
            Category
          </label>

          <select
            id="settings-category"
            className="field__select"
            value={streamInfo.category}
            onChange={(event) =>
              setStreamInfo({
                ...streamInfo,
                category: event.target.value,
              })
            }
          >
            {streamCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="settings-visibility">
            Visibility
          </label>

          <select
            id="settings-visibility"
            className="field__select"
            value={streamInfo.visibility}
            onChange={(event) =>
              setStreamInfo({
                ...streamInfo,
                visibility:
                  event.target.value as StreamInfo["visibility"],
              })
            }
          >
            <option value="public">Public</option>
            <option value="followers">Followers only</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      <div className="toggles">
        <ToggleSwitch
          label="Save replay"
          description="Automatically save this stream so viewers can watch it later"
          checked={streamInfo.saveReplay}
          onChange={(value) =>
            setStreamInfo({
              ...streamInfo,
              saveReplay: value,
            })
          }
        />

        <ToggleSwitch
          label="Allow comments"
          checked={streamInfo.allowComments}
          onChange={(value) =>
            setStreamInfo({
              ...streamInfo,
              allowComments: value,
            })
          }
        />

        <ToggleSwitch
          label="Allow reactions"
          checked={streamInfo.allowReactions}
          onChange={(value) =>
            setStreamInfo({
              ...streamInfo,
              allowReactions: value,
            })
          }
        />

        <ToggleSwitch
          label="Notify followers"
          description="Send a notification when you go live"
          checked={streamInfo.notifyFollowers}
          onChange={(value) =>
            setStreamInfo({
              ...streamInfo,
              notifyFollowers: value,
            })
          }
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        onClick={onClose}
      >
        Save settings
      </Button>
    </PanelShell>
  );
}

/* ============================================================================
   GUESTS
   ============================================================================ */

const LAYOUT_OPTIONS: {
  id: GuestLayout;
  label: string;
  minGuests: number;
}[] = [
  {
    id: "solo",
    label: "Solo",
    minGuests: 0,
  },
  {
    id: "side-by-side",
    label: "Side by side",
    minGuests: 1,
  },
  {
    id: "guest-full",
    label: "Guest full screen",
    minGuests: 1,
  },
  {
    id: "grid-2",
    label: "2 guests",
    minGuests: 2,
  },
  {
    id: "grid-4",
    label: "4 guests",
    minGuests: 3,
  },
];

export function GuestInvitePanel({
  guests,
  availableFollowers,
  inviteGuest,
  removeGuest,
  toggleMuteGuest,
  guestLayout,
  setGuestLayout,
  guestInvitations = [],
  acceptGuestInvitation,
  declineGuestInvitation,
  onClose,
}: {
  guests: Guest[];
  availableFollowers: Guest[];
  inviteGuest: (guest: Guest) => void | Promise<void>;
  removeGuest: (id: string) => void | Promise<void>;
  toggleMuteGuest: (id: string) => void;
  guestLayout: GuestLayout;
  setGuestLayout: (layout: GuestLayout) => void;
  guestInvitations?: LiveGuestInvitationDTO[];
  acceptGuestInvitation?: (
    invitation: LiveGuestInvitationDTO,
  ) => void | Promise<unknown>;
  declineGuestInvitation?: (
    invitation: LiveGuestInvitationDTO,
  ) => void | Promise<unknown>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Guest[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const unavailableIds = useMemo(
    () => new Set(guests.map((guest) => guest.id)),
    [guests],
  );

  const visibleFollowers = useMemo(
    () => availableFollowers.filter((guest) => !unavailableIds.has(guest.id)),
    [availableFollowers, unavailableIds],
  );

  const handleSearch = async (value: string) => {
    setSearch(value);
    setSearchError(null);

    const query = value.trim();
    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const users = await api.searchUsers(query);
      const mapped = users
        .map((user) => {
          const id = String(user.id ?? user._id ?? "").trim();
          const name = String(
            user.displayName ??
              user.name ??
              [user.firstName, user.lastName].filter(Boolean).join(" ") ??
              user.username ??
              "Fockis User",
          ).trim() || "Fockis User";

          if (!id || unavailableIds.has(id)) return null;

          return {
            id,
            name,
            username: user.username,
            avatarUrl: user.profilePicture ?? user.avatar,
            avatarTone: "signal",
            status: "invited",
          } as Guest;
        })
        .filter((item): item is Guest => Boolean(item));

      setSearchResults(mapped);
    } catch (error) {
      console.error("[FOCKIS LIVE] Guest user search failed:", error);
      setSearchResults([]);
      setSearchError(
        error instanceof Error ? error.message : "Unable to search Fockis users.",
      );
    } finally {
      setSearching(false);
    }
  };

  const results = search.trim() ? searchResults : visibleFollowers;

  return (
    <PanelShell
      title="Invite guest"
      subtitle="Bring viewers into your stream as co-hosts"
      onClose={onClose}
    >
      {guestInvitations.length > 0 && (
        <div className="panel-section">
          <p className="panel-section__label">
            LIVE invitations
          </p>

          <div className="connected-list">
            {guestInvitations.map((invitation) => {
              const inviter =
                invitation.host?.displayName ??
                invitation.host?.name ??
                invitation.host?.username ??
                "A Fockis creator";

              return (
                <div
                  className="connected-row"
                  key={invitation.id}
                >
                  <Avatar
                    name={inviter}
                    tone="signal"
                    size="md"
                  />

                  <div className="connected-row__info">
                    <span className="follower-row__name">
                      {inviter}
                    </span>

                    <span className="status-dot status-dot--live">
                      <span className="status-dot__dot" />
                      Invited you to join LIVE
                    </span>

                    {invitation.message && (
                      <span className="follower-row__meta">
                        {invitation.message}
                      </span>
                    )}
                  </div>

                  <div className="connected-row__actions">
                    <button
                      className="icon-btn"
                      type="button"
                      title="Decline invitation"
                      onClick={() =>
                        void declineGuestInvitation?.(invitation)
                      }
                    >
                      <X size={14} />
                    </button>

                    <button
                      className="icon-btn"
                      type="button"
                      title="Accept invitation"
                      onClick={() =>
                        void acceptGuestInvitation?.(invitation)
                      }
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="panel-section">
        <p className="panel-section__label">
          Search Fockis users
        </p>

        <input
          className="panel-search"
          value={search}
          placeholder="Search followers or Fockis users…"
          onChange={(event) => void handleSearch(event.target.value)}
        />

        <div className="follower-list">
          {searching && (
            <p className="follower-list__empty">Searching Fockis users…</p>
          )}

          {!searching && searchError && (
            <p className="follower-list__empty">{searchError}</p>
          )}

          {!searching && !searchError && results.length === 0 && (
            <p className="follower-list__empty">
              {search.trim()
                ? "No Fockis users found."
                : "No available followers yet. Search for a Fockis user above."}
            </p>
          )}

          {!searching && results.map((follower) => (
            <div
              className="follower-row"
              key={follower.id}
            >
              <Avatar
                name={follower.name}
                tone={follower.avatarTone}
                size="md"
              />

              <span className="follower-row__name">
                {follower.name}
              </span>

              <Button
                size="sm"
                variant="secondary"
                icon={<UserPlus size={13} />}
                onClick={() => inviteGuest(follower)}
              >
                Invite
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <p className="panel-section__label">
          Connected guests
        </p>

        {guests.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={18} />}
            title="No guests connected"
            description="Invited guests will appear here once they join your stream."
          />
        ) : (
          <div className="connected-list">
            {guests.map((guest) => (
              <div
                className="connected-row"
                key={guest.id}
              >
                <Avatar
                  name={guest.name}
                  tone={guest.avatarTone}
                  size="md"
                />

                <div className="connected-row__info">
                  <span className="follower-row__name">
                    {guest.name}
                  </span>

                  <span
                    className={`status-dot ${
                      guest.status === "muted"
                        ? "status-dot--muted"
                        : "status-dot--live"
                    }`}
                  >
                    <span className="status-dot__dot" />

                    {guest.status === "muted"
                      ? "Muted"
                      : guest.status === "invited"
                        ? "Invitation sent"
                        : guest.status === "accepted"
                          ? "Accepted"
                          : "Connected"}
                  </span>
                </div>

                <div className="connected-row__actions">
                  {(guest.status === "connected" ||
                    guest.status === "muted") && (
                    <button
                      className="icon-btn"
                      type="button"
                      title={
                        guest.status === "muted"
                          ? "Unmute"
                          : "Mute"
                      }
                      onClick={() =>
                        toggleMuteGuest(guest.id)
                      }
                    >
                      {guest.status === "muted" ? (
                        <MicOff size={14} />
                      ) : (
                        <Mic size={14} />
                      )}
                    </button>
                  )}

                  <button
                    className="icon-btn icon-btn--remove"
                    type="button"
                    title="Remove guest"
                    onClick={() =>
                      removeGuest(guest.id)
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {guests.length > 0 && (
        <div className="panel-section">
          <p className="panel-section__label">
            Layout
          </p>

          <div className="layout-grid">
            {LAYOUT_OPTIONS.filter(
              (option) =>
                guests.length >= option.minGuests,
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`layout-option ${
                  guestLayout === option.id
                    ? "layout-option--active"
                    : ""
                }`}
                onClick={() =>
                  setGuestLayout(option.id)
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

/* ============================================================================
   EFFECTS
   ============================================================================ */

const EFFECT_GROUP_LABEL: Record<
  EffectCategory,
  string
> = {
  beauty: "Beauty",
  filters: "Filters",
  backgrounds: "Backgrounds",
};

const EFFECT_GROUPS: EffectCategory[] = [
  "beauty",
  "filters",
  "backgrounds",
];

export function EffectsPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [active, setActive] = useState<string>(
    effects[0]?.id ?? "",
  );

  return (
    <PanelShell
      title="Effects"
      subtitle="Applied live — only you decide what viewers see"
      onClose={onClose}
    >
      {EFFECT_GROUPS.map((group) => (
        <div
          className="panel-section"
          key={group}
        >
          <p className="panel-section__label">
            {EFFECT_GROUP_LABEL[group]}
          </p>

          <div className="effects-grid">
            {effects
              .filter(
                (effect: Effect) =>
                  effect.category === group,
              )
              .map((effect) => (
                <button
                  key={effect.id}
                  type="button"
                  className={`effect-card ${
                    active === effect.id
                      ? "effect-card--active"
                      : ""
                  }`}
                  onClick={() =>
                    setActive(effect.id)
                  }
                >
                  <span
                    className={`effect-card__swatch effect-card__swatch--${effect.swatchTone}`}
                  >
                    {active === effect.id && (
                      <Check
                        size={13}
                        strokeWidth={3}
                      />
                    )}
                  </span>

                  <span className="effect-card__label">
                    {effect.label}
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </PanelShell>
  );
}

/* ============================================================================
   MUSIC
   ============================================================================ */

export function MusicPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const [tab, setTab] = useState<
    "popular" | "favorites" | "recent"
  >("popular");

  const [playingId, setPlayingId] =
    useState<string | null>(null);

  const [added, setAdded] = useState<string[]>([]);

  const list =
    tab === "favorites"
      ? tracks.slice(0, 2)
      : tab === "recent"
        ? tracks.slice(2, 5)
        : tracks;

  return (
    <PanelShell
      title="Music"
      subtitle="Royalty-free tracks for your stream"
      onClose={onClose}
    >
      <div className="search-wrap">
        <Search
          size={15}
          className="search-wrap__icon"
        />

        <input
          className="search-wrap__input"
          placeholder="Search music…"
        />
      </div>

      <div className="music-tabs">
        <button
          type="button"
          className={`music-tab ${
            tab === "popular"
              ? "music-tab--active"
              : ""
          }`}
          onClick={() => setTab("popular")}
        >
          Popular
        </button>

        <button
          type="button"
          className={`music-tab ${
            tab === "favorites"
              ? "music-tab--active"
              : ""
          }`}
          onClick={() => setTab("favorites")}
        >
          Favorites
        </button>

        <button
          type="button"
          className={`music-tab ${
            tab === "recent"
              ? "music-tab--active"
              : ""
          }`}
          onClick={() => setTab("recent")}
        >
          Recent
        </button>
      </div>

      <div className="track-list">
        {list.map((track) => {
          const isPlaying =
            playingId === track.id;

          const isAdded =
            added.includes(track.id);

          return (
            <div
              className="track-row"
              key={track.id}
            >
              <button
                className="track-row__play"
                type="button"
                aria-label={
                  isPlaying ? "Pause" : "Play"
                }
                onClick={() =>
                  setPlayingId(
                    isPlaying
                      ? null
                      : track.id,
                  )
                }
              >
                {isPlaying ? (
                  <Pause
                    size={13}
                    fill="currentColor"
                  />
                ) : (
                  <Play
                    size={13}
                    fill="currentColor"
                  />
                )}
              </button>

              <div className="track-row__info">
                <span className="track-row__name">
                  {track.title}
                </span>

                <span className="track-row__artist">
                  {track.artist}
                </span>
              </div>

              <span className="track-row__duration">
                {track.duration}
              </span>

              <button
                className={`track-row__add ${
                  isAdded
                    ? "track-row__add--added"
                    : ""
                }`}
                type="button"
                onClick={() =>
                  setAdded((current) =>
                    current.includes(track.id)
                      ? current.filter(
                          (id) =>
                            id !== track.id,
                        )
                      : [
                          ...current,
                          track.id,
                        ],
                  )
                }
              >
                {isAdded ? (
                  <Check size={13} />
                ) : (
                  <Plus size={13} />
                )}

                {isAdded ? "Added" : "Add"}
              </button>
            </div>
          );
        })}
      </div>

      <p className="disclaimer">
        Demo catalog for prototyping — not for
        production playback.
      </p>
    </PanelShell>
  );
}

/* ============================================================================
   PRODUCTS
   ============================================================================ */

export function ProductsPanel({
  featuredProduct,
  featureProduct,
  unfeatureProduct,
  onClose,
}: {
  featuredProduct: Product | null;
  featureProduct: (product: Product) => void;
  unfeatureProduct: () => void;
  onClose: () => void;
}) {
  return (
    <PanelShell
      title="Feature product"
      subtitle="Show a shoppable card inside your live"
      onClose={onClose}
    >
      {products.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={18} />}
          title="No products yet"
          description="Add products to your Fockis storefront to feature them live."
        />
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            const isFeatured =
              featuredProduct?.id === product.id;

            return (
              <div
                className={`product-card ${
                  isFeatured
                    ? "product-card--featured"
                    : ""
                }`}
                key={product.id}
              >
                <div
                  className={`product-card__thumb product-card__thumb--${product.imageTone}`}
                >
                  <ShoppingBag size={20} />
                </div>

                <div className="product-card__info">
                  <span className="product-card__name">
                    {product.name}
                  </span>

                  <span className="product-card__meta">
                    <span className="product-card__rating">
                      <Star
                        size={11}
                        fill="currentColor"
                      />{" "}
                      {product.rating}
                    </span>

                    <span className="product-card__price">
                      {product.price}
                    </span>
                  </span>

                  {!product.inStock && (
                    <span className="product-card__oos">
                      Out of stock
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={
                    isFeatured
                      ? "secondary"
                      : "primary"
                  }
                  disabled={!product.inStock}
                  onClick={() =>
                    isFeatured
                      ? unfeatureProduct()
                      : featureProduct(product)
                  }
                >
                  {isFeatured
                    ? "Unfeature"
                    : "Feature on live"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}

/* ============================================================================
   GIFTS
   ============================================================================ */

export function GiftsPanel({
  sendGift,
  giftFeed,
  phase,
  onClose,
}: {
  sendGift: (
    label: string,
    icon: string,
  ) => void;
  giftFeed: SentGift[];
  phase: Phase;
  onClose: () => void;
}) {
  const isLive = phase === "live";

  return (
    <PanelShell
      title="Send gift"
      subtitle="Preview how gifting appears on your live"
      onClose={onClose}
    >
      <div className="gift-grid">
        {gifts.map((gift: Gift) => (
          <button
            key={gift.id}
            className="gift-card"
            type="button"
            disabled={!isLive}
            onClick={() =>
              sendGift(
                gift.label,
                gift.icon,
              )
            }
          >
            <span className="gift-card__icon">
              {gift.icon}
            </span>

            <span className="gift-card__label">
              {gift.label}
            </span>

            <span className="gift-card__cost">
              {gift.coinCost} coins
            </span>
          </button>
        ))}
      </div>

      {!isLive && (
        <p className="hint">
          Go live to preview gift animations in
          your stream.
        </p>
      )}

      {giftFeed.length > 0 && (
        <div className="recent-gifts">
          <p className="panel-section__label">
            Recent gifts
          </p>

          {giftFeed
            .slice()
            .reverse()
            .map((gift) => (
              <div
                className="recent-gift-row"
                key={gift.id}
              >
                <span>{gift.giftIcon}</span>

                <span>
                  <strong>
                    {gift.username}
                  </strong>{" "}
                  sent a {gift.giftLabel}
                </span>
              </div>
            ))}
        </div>
      )}
    </PanelShell>
  );
}

/* ============================================================================
   ANALYTICS
   ============================================================================ */

export function AnalyticsPanel({
  analytics,
  phase,
  onClose,
}: {
  analytics: Analytics;
  phase: Phase;
  onClose: () => void;
}) {
  const isLive = phase === "live";

  const cards: {
    icon: typeof Heart;
    label: string;
    value: string;
  }[] = [
    {
      icon: Users,
      label: "Current viewers",
      value: `${analytics.currentViewers}`,
    },
    {
      icon: TrendingUp,
      label: "Peak viewers",
      value: `${analytics.peakViewers}`,
    },
    {
      icon: Heart,
      label: "Likes",
      value: `${analytics.likes}`,
    },
    {
      icon: MessageCircle,
      label: "Comments",
      value: `${analytics.comments}`,
    },
    {
      icon: Share2,
      label: "Shares",
      value: `${analytics.shares}`,
    },
    {
      icon: UserPlus,
      label: "New followers",
      value: `+${analytics.newFollowers}`,
    },
    {
      icon: GiftIcon,
      label: "Gifts",
      value: `$${analytics.giftRevenue.toFixed(2)}`,
    },
    {
      icon: DollarSign,
      label: "Total revenue",
      value: `$${analytics.totalRevenue.toFixed(2)}`,
    },
  ];

  return (
    <PanelShell
      title="Live analytics"
      subtitle={
        isLive
          ? "Updating in real time"
          : "Metrics reset each stream"
      }
      onClose={onClose}
    >
      <div className="analytics-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              className="analytics-card"
              key={card.label}
            >
              <span className="analytics-card__icon">
                <Icon size={14} />
              </span>

              <span className="analytics-card__value">
                {card.value}
              </span>

              <span className="analytics-card__label">
                {card.label}
              </span>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}

/* ============================================================================
   POLLS
   ============================================================================ */

export function PollsPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <PanelShell
      title="Polls"
      subtitle="Ask your viewers a question in real time"
      onClose={onClose}
    >
      <EmptyState
        icon={<Vote size={18} />}
        title="No poll running"
        description="Create a poll to get instant feedback from viewers during your live."
      />
    </PanelShell>
  );
}

/* ============================================================================
   Q&A
   ============================================================================ */

export function QnaPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <PanelShell
      title="Q&A"
      subtitle="Collect and answer viewer questions"
      onClose={onClose}
    >
      <EmptyState
        icon={<MessageCircleQuestion size={18} />}
        title="No questions yet"
        description="Questions viewers ask in chat will be collected here for easy answering."
      />
    </PanelShell>
  );
}