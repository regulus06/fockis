import { useMemo, useRef, useState } from "react";
import {
  Columns2,
  Loader2,
  Mic,
  MicOff,
  MoreHorizontal,
  Search,
  Scan,
  User,
  UserMinus,
  UserPlus,
  Users,
  Video,
} from "lucide-react";

import type { Guest, GuestLayout, Phase } from "../types";
import { useGuestSearch } from "../hooks/useGuestSearch";
import { Avatar, ConfirmDialog, Menu } from "./ui/Primitives";

const LAYOUTS: { id: GuestLayout; label: string; icon: typeof User }[] = [
  { id: "solo", label: "Solo", icon: User },
  { id: "side-by-side", label: "Side by side", icon: Columns2 },
  { id: "guest-full", label: "Guest full screen", icon: Scan },
];

const STATUS_LABEL: Record<Guest["status"], string> = {
  invited: "Invited",
  accepted: "Connecting…",
  connected: "Connected",
  muted: "Muted",
  declined: "Declined",
  removed: "Removed",
  left: "Disconnected",
};

/**
 * Guest management card for the right-hand column of the studio.
 * Uses the same guest workflow as the Guests drawer (useStudio).
 */
export function GuestManager({
  phase,
  guests,
  guestLayout,
  setGuestLayout,
  inviteGuest,
  removeGuest,
  toggleMuteGuest,
  onOpenGuestsPanel,
  pendingInvitations = 0,
}: {
  phase: Phase;
  guests: Guest[];
  guestLayout: GuestLayout;
  setGuestLayout: (layout: GuestLayout) => void;
  inviteGuest: (guest: Guest) => void | Promise<void>;
  removeGuest: (id: string) => void | Promise<void>;
  toggleMuteGuest: (id: string) => void;
  onOpenGuestsPanel: () => void;
  pendingInvitations?: number;
}) {
  const isLive = phase === "live";
  const searchRef = useRef<HTMLInputElement>(null);

  const existingIds = useMemo(
    () => new Set(guests.map((guest) => guest.id)),
    [guests],
  );

  const search = useGuestSearch(existingIds);

  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  const [removing, setRemoving] = useState<Guest | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const hasConnectedGuest = guests.some(
    (guest) => guest.status === "connected" || guest.status === "muted",
  );

  const handleInvite = async (guest: Guest) => {
    setInviteError(null);
    setInviteNotice(null);
    setInvitingId(guest.id);

    try {
      await inviteGuest(guest);
      setInviteNotice(`Invitation sent to ${guest.name}.`);
      search.clear();
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Unable to send the invitation.",
      );
    } finally {
      setInvitingId(null);
    }
  };

  const handleRemove = async () => {
    if (!removing) return;

    setRemoveBusy(true);
    setRemoveError(null);

    try {
      await removeGuest(removing.id);
      setRemoving(null);
    } catch (error) {
      setRemoveError(
        error instanceof Error ? error.message : "Unable to remove this guest.",
      );
    } finally {
      setRemoveBusy(false);
    }
  };

  const showResults = search.query.trim().length > 0;

  return (
    <section className="guest-card" aria-labelledby="fls-guests-title">
      <div className="guest-card__header">
        <h2 className="guest-card__title" id="fls-guests-title">Guests</h2>

        <div className="guest-card__header-actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => searchRef.current?.focus()}
          >
            Invite guest
          </button>

          <Menu
            label="Guest options"
            trigger={<MoreHorizontal size={18} />}
            triggerClassName="icon-square"
            items={[
              {
                id: "manage",
                label: "Manage guests",
                icon: <Users size={15} />,
                onSelect: onOpenGuestsPanel,
              },
              {
                id: "invites",
                label: pendingInvitations
                  ? `Invitations for you (${pendingInvitations})`
                  : "Invitations for you",
                icon: <UserPlus size={15} />,
                onSelect: onOpenGuestsPanel,
              },
            ]}
          />
        </div>
      </div>

      {guests.length > 0 && (
        <ul className="guest-list">
          {guests.map((guest) => {
            const onStage = guest.status === "connected" || guest.status === "muted";

            return (
              <li className="guest-row" key={guest.id}>
                <Avatar name={guest.name} tone="blue" size="md" src={guest.avatarUrl} />

                <div className="guest-row__info">
                  <span className="guest-row__name">{guest.name}</span>
                  <span className={`guest-status guest-status--${guest.status}`}>
                    <span className="guest-status__dot" aria-hidden="true" />
                    {STATUS_LABEL[guest.status]}
                  </span>
                </div>

                <div className="guest-row__actions">
                  <button
                    type="button"
                    className={`icon-square ${guest.status === "muted" ? "icon-square--warn" : ""}`}
                    onClick={() => toggleMuteGuest(guest.id)}
                    disabled={!onStage}
                    aria-pressed={guest.status === "muted"}
                    aria-label={guest.status === "muted" ? `Unmute ${guest.name}` : `Mute ${guest.name}`}
                    title={onStage ? (guest.status === "muted" ? "Unmute guest" : "Mute guest") : "Available once the guest connects"}
                  >
                    {guest.status === "muted" ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <button
                    type="button"
                    className="icon-square"
                    disabled
                    aria-label={`${guest.name}'s camera`}
                    title="Guests control their own camera"
                  >
                    <Video size={18} />
                  </button>

                  <Menu
                    label={`Options for ${guest.name}`}
                    trigger={<MoreHorizontal size={18} />}
                    triggerClassName="icon-square"
                    items={[
                      {
                        id: "remove",
                        label: onStage ? "Remove from live" : "Cancel invitation",
                        icon: <UserMinus size={15} />,
                        danger: true,
                        onSelect: () => {
                          setRemoveError(null);
                          setRemoving(guest);
                        },
                      },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="guest-card__section">
        <label className="guest-card__label" htmlFor="fls-guest-search">
          Invite a guest
        </label>

        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            id="fls-guest-search"
            ref={searchRef}
            type="search"
            value={search.query}
            onChange={(event) => {
              setInviteError(null);
              setInviteNotice(null);
              search.setQuery(event.target.value);
            }}
            placeholder="Search followers or Fockis users…"
            autoComplete="off"
            aria-describedby="fls-guest-search-status"
          />
          {search.searching && <Loader2 size={16} className="spin" aria-hidden="true" />}
        </div>

        <div id="fls-guest-search-status" className="guest-card__status" aria-live="polite">
          {!isLive && !showResults && !inviteNotice && (
            <span>You can send invitations once you're live.</span>
          )}
          {inviteNotice && <span className="guest-card__notice">{inviteNotice}</span>}
          {inviteError && <span className="guest-card__error">{inviteError}</span>}
          {search.error && <span className="guest-card__error">{search.error}</span>}
        </div>

        {showResults && !search.searching && !search.error && (
          <ul className="search-results">
            {search.results.length === 0 && (
              <li className="search-results__empty">No Fockis users found.</li>
            )}

            {search.results.map((user) => (
              <li className="search-results__row" key={user.id}>
                <Avatar name={user.name} tone="blue" size="sm" src={user.avatarUrl} />
                <span className="search-results__name">
                  {user.name}
                  {user.username && <span>@{user.username}</span>}
                </span>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => void handleInvite(user)}
                  disabled={!isLive || invitingId !== null}
                  title={isLive ? `Invite ${user.name}` : "Go live to send invitations"}
                >
                  {invitingId === user.id ? "Sending…" : "Invite"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="guest-card__section">
        <span className="guest-card__label" id="fls-layout-label">Layout</span>

        <div className="layout-picker" role="radiogroup" aria-labelledby="fls-layout-label">
          {LAYOUTS.map((option) => {
            const Icon = option.icon;
            const active = guestLayout === option.id;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`layout-tile ${active ? "layout-tile--active" : ""}`}
                onClick={() => setGuestLayout(option.id)}
              >
                <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>

        {!hasConnectedGuest && guestLayout !== "solo" && (
          <p className="guest-card__hint">This layout applies when a guest is connected.</p>
        )}
      </div>

      {removing && (
        <ConfirmDialog
          title={
            removing.status === "connected" || removing.status === "muted"
              ? `Remove ${removing.name} from your live?`
              : `Cancel ${removing.name}'s invitation?`
          }
          description={
            removing.status === "connected" || removing.status === "muted"
              ? "They will be disconnected from your stage. You can invite them again later."
              : "They will no longer be able to join with this invitation."
          }
          confirmLabel={
            removing.status === "connected" || removing.status === "muted"
              ? "Remove guest"
              : "Cancel invitation"
          }
          cancelLabel="Keep"
          icon={<UserMinus size={18} />}
          busy={removeBusy}
          error={removeError}
          onConfirm={() => void handleRemove()}
          onCancel={() => setRemoving(null)}
        />
      )}
    </section>
  );
}
