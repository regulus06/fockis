import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Copy, Hash, Link2, Search, Share2, Users } from 'lucide-react';

import { ParticipantListItem } from './ParticipantListItem';
import { Avatar } from '../common/Avatar';
import type { RoomParticipant } from '../../types';
import type { MeetingParticipant } from '../../services/meetingsApi';

import '../../styles/components/participants.scss';

interface ParticipantsPanelProps {
  isHost: boolean;
  /** Admitted participants, already de-duplicated. */
  participants: RoomParticipant[];
  /** Decides which row is the viewer ("You"). */
  isSelf: (participant: RoomParticipant) => boolean;
  /** People waiting to be admitted (host only). */
  waiting: MeetingParticipant[];
  onToggleMic: () => void;
  onToggleCamera: () => void;
  /** Primary "Invite people" action: copies the invite link. */
  onInvite: () => void;
  onCopyMeetingId: () => void;
  /** Present only when the browser supports the native share sheet. */
  onShare?: () => void;
  onManageWaitingRoom: () => void;
}

function waitingName(person: MeetingParticipant) {
  return person.displayName?.trim() || person.email?.trim() || 'Guest';
}

export function ParticipantsPanel({
  isHost,
  participants,
  isSelf,
  waiting,
  onToggleMic,
  onToggleCamera,
  onInvite,
  onCopyMeetingId,
  onShare,
  onManageWaitingRoom,
}: ParticipantsPanelProps) {
  const [query, setQuery] = useState('');
  const [inviteMenuOpen, setInviteMenuOpen] = useState(false);
  const inviteRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!inviteMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!inviteRef.current?.contains(event.target as Node)) setInviteMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [inviteMenuOpen]);

  // You first, then hosts, then everyone else in join order.
  const ordered = useMemo(() => {
    const rank = (p: RoomParticipant) =>
      isSelf(p) ? 0 : p.role === 'host' ? 1 : p.role === 'co-host' ? 2 : 3;
    return participants
      .map((participant, index) => ({ participant, index }))
      .sort((a, b) => rank(a.participant) - rank(b.participant) || a.index - b.index)
      .map(({ participant }) => participant);
  }, [participants, isSelf]);

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? ordered.filter((p) => p.user.displayName.toLowerCase().includes(needle))
    : ordered;
  const visibleWaiting = needle
    ? waiting.filter((p) => waitingName(p).toLowerCase().includes(needle))
    : waiting;

  return (
    <div className="fm-people">
      <div className="fm-people__invite" ref={inviteRef}>
        <button type="button" className="fm-people__invite-main" onClick={onInvite}>
          <Link2 size={18} />
          <span>Invite people</span>
        </button>
        <button
          type="button"
          className="fm-people__invite-toggle"
          aria-label="More invite options"
          aria-haspopup="menu"
          aria-expanded={inviteMenuOpen}
          onClick={() => setInviteMenuOpen((v) => !v)}
        >
          <ChevronDown size={18} />
        </button>

        {inviteMenuOpen && (
          <div className="fm-people__invite-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setInviteMenuOpen(false); onInvite(); }}>
              <Copy size={15} /> Copy invite link
            </button>
            <button type="button" role="menuitem" onClick={() => { setInviteMenuOpen(false); onCopyMeetingId(); }}>
              <Hash size={15} /> Copy meeting ID
            </button>
            {onShare && (
              <button type="button" role="menuitem" onClick={() => { setInviteMenuOpen(false); onShare(); }}>
                <Share2 size={15} /> Share…
              </button>
            )}
          </div>
        )}
      </div>

      <label className="fm-people__search">
        <Search size={17} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search participants..."
          aria-label="Search participants"
        />
      </label>

      <div className="fm-people__scroll">
        <h3 className="fm-people__heading">In this meeting ({participants.length})</h3>

        <div className="fm-people__list">
          {visible.length === 0 ? (
            <p className="fm-people__none">
              {needle ? 'No one matches your search.' : 'No one has joined yet.'}
            </p>
          ) : (
            visible.map((participant) => {
              const self = isSelf(participant);
              return (
                <ParticipantListItem
                  key={participant.id}
                  participant={participant}
                  isHost={isHost}
                  isSelf={self}
                  onToggleMic={self ? onToggleMic : undefined}
                  onToggleCamera={self ? onToggleCamera : undefined}
                />
              );
            })
          )}
        </div>

        {isHost && (
          <section className="fm-people__waiting" aria-label="Waiting room">
            <div className="fm-people__waiting-head">
              <h3 className="fm-people__heading">Waiting room ({waiting.length})</h3>
              <button type="button" className="fm-people__manage" onClick={onManageWaitingRoom}>
                Manage
              </button>
            </div>

            {visibleWaiting.length === 0 ? (
              <div className="fm-people__empty">
                <Users size={44} strokeWidth={1.6} />
                <strong>{needle && waiting.length ? 'No match in the waiting room' : 'No one is waiting'}</strong>
                <span>When someone requests to join, they will appear here.</span>
              </div>
            ) : (
              <ul className="fm-people__waiting-list">
                {visibleWaiting.map((person) => {
                  const name = waitingName(person);
                  return (
                    <li key={person.userId || person.id} className="fm-people__waiting-row">
                      <Avatar name={name} size="md" imageUrl={person.avatarUrl ?? undefined} />
                      <span className="fm-people__waiting-name">{name}</span>
                      <button type="button" className="fm-people__admit" onClick={onManageWaitingRoom}>
                        Review
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
