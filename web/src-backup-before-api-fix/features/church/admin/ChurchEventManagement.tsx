/**
 * ChurchEventManagement.tsx
 * -----------------------------------------------------------------------------
 * Admin screen covering Event management, Live management, and Attendance
 * management as three tabs — these three are grouped together because they
 * all revolve around a scheduled occurrence (an event or a live broadcast)
 * and who attended it.
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createEvent, deleteEvent, listEvents, updateEvent } from '../api/eventsApi';
import {
  deleteLiveEvent,
  endLiveEvent,
  getLiveEvents,
  scheduleLiveEvent,
  startLiveEvent,
} from '../api/churchLiveApi';
import { getAttendanceSummaries, recordAttendance } from '../api/attendanceApi';
import { listMembers } from '../api/membersApi';
import {
  AttendanceType,
  EVENT_TYPE_LABELS,
  EventType,
  LiveEventState,
  LiveEventVisibility,
  type AttendanceSummary,
  type ChurchEvent,
  type CreateEventInput,
  type LiveEvent,
  type Member,
} from '../types/church.types';
import '../styles/ChurchAdmin.scss';

type Tab = 'events' | 'live' | 'attendance';

const EMPTY_EVENT_DRAFT: CreateEventInput = {
  organizationId: '',
  title: '',
  eventType: EventType.ChurchService,
  startsAt: '',
  requiresRsvp: true,
};

export default function ChurchEventManagement(): React.JSX.Element {
  const { organizationId = '' } = useParams<{ organizationId: string }>();
  const [tab, setTab] = useState<Tab>('events');

  return (
    <div className="church-admin-page">
      <header className="church-admin-header">
        <div>
          <span className="church-admin-eyebrow">Admin console</span>
          <h1>Events, Live &amp; Attendance</h1>
        </div>
      </header>

      <div className="church-admin-tab-group" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'events'}
          className={`church-admin-tab ${tab === 'events' ? 'church-admin-tab--active' : ''}`}
          onClick={() => setTab('events')}
        >
          Events
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'live'}
          className={`church-admin-tab ${tab === 'live' ? 'church-admin-tab--active' : ''}`}
          onClick={() => setTab('live')}
        >
          Live services
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'attendance'}
          className={`church-admin-tab ${tab === 'attendance' ? 'church-admin-tab--active' : ''}`}
          onClick={() => setTab('attendance')}
        >
          Attendance
        </button>
      </div>

      {tab === 'events' && <EventsTab organizationId={organizationId} />}
      {tab === 'live' && <LiveTab organizationId={organizationId} />}
      {tab === 'attendance' && <AttendanceTab organizationId={organizationId} />}
    </div>
  );
}

function EventsTab({ organizationId }: { organizationId: string }): React.JSX.Element {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [draft, setDraft] = useState<CreateEventInput>({ ...EMPTY_EVENT_DRAFT, organizationId });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listEvents(organizationId, { pageSize: 50 }, controller.signal);
        setEvents(result.items);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Unable to load events.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    if (organizationId) load();
    return () => controller.abort();
  }, [organizationId]);

  const resetDraft = () => {
    setDraft({ ...EMPTY_EVENT_DRAFT, organizationId });
    setEditingId(null);
  };

  const handleEdit = (event: ChurchEvent) => {
    setEditingId(event.id);
    setDraft({
      organizationId,
      title: event.title,
      eventType: event.eventType,
      startsAt: event.startsAt.slice(0, 16),
      endsAt: event.endsAt?.slice(0, 16),
      description: event.description ?? '',
      location: event.location ?? '',
      isOnline: event.isOnline,
      capacity: event.capacity ?? undefined,
      requiresRsvp: event.requiresRsvp,
    });
  };

  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload = { ...draft, startsAt: new Date(draft.startsAt).toISOString() };
      if (editingId) {
        const updated = await updateEvent(organizationId, editingId, payload);
        setEvents((items) => items.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createEvent({ ...payload, organizationId });
        setEvents((items) => [created, ...items]);
      }
      resetDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save this event.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    setError(null);
    try {
      await deleteEvent(organizationId, eventId);
      setEvents((items) => items.filter((item) => item.id !== eventId));
      if (editingId === eventId) resetDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete this event.');
    }
  };

  return (
    <>
      {error && <div className="church-admin-alert church-admin-alert--error">{error}</div>}

      <section className="church-admin-panel">
        <h2>{editingId ? 'Edit event' : 'Create event'}</h2>
        <form className="church-admin-form church-admin-form--inline" onSubmit={handleSubmit}>
          <div className="church-admin-field-row">
            <label className="church-admin-field">
              <span>Title</span>
              <input
                className="church-admin-input"
                value={draft.title}
                onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
                required
              />
            </label>
            <label className="church-admin-field">
              <span>Type</span>
              <select
                className="church-admin-select"
                value={draft.eventType}
                onChange={(event) => setDraft((d) => ({ ...d, eventType: event.target.value as EventType }))}
              >
                {Object.values(EventType).map((value) => (
                  <option key={value} value={value}>
                    {EVENT_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="church-admin-field-row">
            <label className="church-admin-field">
              <span>Starts at</span>
              <input
                type="datetime-local"
                className="church-admin-input"
                value={draft.startsAt}
                onChange={(event) => setDraft((d) => ({ ...d, startsAt: event.target.value }))}
                required
              />
            </label>
            <label className="church-admin-field">
              <span>Location</span>
              <input
                className="church-admin-input"
                value={draft.location ?? ''}
                onChange={(event) => setDraft((d) => ({ ...d, location: event.target.value }))}
              />
            </label>
            <label className="church-admin-field">
              <span>Capacity</span>
              <input
                type="number"
                min={0}
                className="church-admin-input"
                value={draft.capacity ?? ''}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, capacity: event.target.value ? Number(event.target.value) : undefined }))
                }
              />
            </label>
          </div>

          <label className="church-admin-field">
            <span>Description</span>
            <textarea
              className="church-admin-textarea"
              rows={2}
              value={draft.description ?? ''}
              onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
            />
          </label>

          <label className="church-admin-field church-admin-field--checkbox">
            <input
              type="checkbox"
              checked={draft.requiresRsvp ?? true}
              onChange={(event) => setDraft((d) => ({ ...d, requiresRsvp: event.target.checked }))}
            />
            <span>Require RSVP</span>
          </label>

          <div className="church-admin-form-actions">
            <button type="submit" className="church-admin-btn church-admin-btn--primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create event'}
            </button>
            {editingId && (
              <button type="button" className="church-admin-btn church-admin-btn--ghost" onClick={resetDraft}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="church-admin-panel">
        <h2>All events</h2>
        {isLoading ? (
          <p className="church-admin-empty">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="church-admin-empty">No events yet.</p>
        ) : (
          <div className="church-admin-table-wrap">
            <table className="church-admin-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Type</th>
                  <th scope="col">Starts</th>
                  <th scope="col">RSVPs</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.title}</td>
                    <td>{EVENT_TYPE_LABELS[event.eventType]}</td>
                    <td>{new Date(event.startsAt).toLocaleString()}</td>
                    <td>{event.rsvpCount}</td>
                    <td>
                      <div className="church-admin-table__actions">
                        <button
                          type="button"
                          className="church-admin-btn church-admin-btn--secondary church-admin-btn--sm"
                          onClick={() => handleEdit(event)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                          onClick={() => handleDelete(event.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function LiveTab({ organizationId }: { organizationId: string }): React.JSX.Element {
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [title, setTitle] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [visibility, setVisibility] = useState<LiveEventVisibility>(LiveEventVisibility.Members);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getLiveEvents(organizationId, { pageSize: 50 }, controller.signal);
        setLiveEvents(result.items);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Unable to load live services.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    if (organizationId) load();
    return () => controller.abort();
  }, [organizationId]);

  const handleSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const created = await scheduleLiveEvent({
        organizationId,
        title,
        visibility,
        scheduledStart: new Date(scheduledStart).toISOString(),
      });
      setLiveEvents((items) => [created, ...items]);
      setTitle('');
      setScheduledStart('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to schedule this live service.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart = async (liveEventId: string) => {
    const updated = await startLiveEvent(organizationId, liveEventId);
    setLiveEvents((items) => items.map((item) => (item.id === liveEventId ? updated : item)));
  };

  const handleEnd = async (liveEventId: string) => {
    const updated = await endLiveEvent(organizationId, liveEventId);
    setLiveEvents((items) => items.map((item) => (item.id === liveEventId ? updated : item)));
  };

  const handleDelete = async (liveEventId: string) => {
    await deleteLiveEvent(organizationId, liveEventId);
    setLiveEvents((items) => items.filter((item) => item.id !== liveEventId));
  };

  return (
    <>
      {error && <div className="church-admin-alert church-admin-alert--error">{error}</div>}

      <section className="church-admin-panel">
        <h2>Schedule a live service</h2>
        <form className="church-admin-form church-admin-form--inline" onSubmit={handleSchedule}>
          <div className="church-admin-field-row">
            <label className="church-admin-field">
              <span>Title</span>
              <input className="church-admin-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </label>
            <label className="church-admin-field">
              <span>Scheduled start</span>
              <input
                type="datetime-local"
                className="church-admin-input"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                required
              />
            </label>
            <label className="church-admin-field">
              <span>Visibility</span>
              <select
                className="church-admin-select"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as LiveEventVisibility)}
              >
                <option value={LiveEventVisibility.Public}>Public</option>
                <option value={LiveEventVisibility.Members}>Members only</option>
                <option value={LiveEventVisibility.Private}>Private / invitation</option>
              </select>
            </label>
          </div>
          <div className="church-admin-form-actions">
            <button type="submit" className="church-admin-btn church-admin-btn--primary" disabled={isSaving}>
              {isSaving ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </section>

      <section className="church-admin-panel">
        <h2>Live services</h2>
        {isLoading ? (
          <p className="church-admin-empty">Loading…</p>
        ) : liveEvents.length === 0 ? (
          <p className="church-admin-empty">No live services scheduled yet.</p>
        ) : (
          <div className="church-admin-table-wrap">
            <table className="church-admin-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">State</th>
                  <th scope="col">Scheduled</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveEvents.map((live) => (
                  <tr key={live.id}>
                    <td>{live.title}</td>
                    <td>
                      <span className={`church-admin-chip church-admin-chip--${live.state}`}>{live.state}</span>
                    </td>
                    <td>{new Date(live.scheduledStart).toLocaleString()}</td>
                    <td>
                      <div className="church-admin-table__actions">
                        {live.state === LiveEventState.Scheduled && (
                          <button
                            type="button"
                            className="church-admin-btn church-admin-btn--primary church-admin-btn--sm"
                            onClick={() => handleStart(live.id)}
                          >
                            Go live
                          </button>
                        )}
                        {live.state === LiveEventState.Live && (
                          <button
                            type="button"
                            className="church-admin-btn church-admin-btn--secondary church-admin-btn--sm"
                            onClick={() => handleEnd(live.id)}
                          >
                            End broadcast
                          </button>
                        )}
                        {live.state === LiveEventState.Scheduled && (
                          <button
                            type="button"
                            className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                            onClick={() => handleDelete(live.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function AttendanceTab({ organizationId }: { organizationId: string }): React.JSX.Element {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAttendanceSummaries(organizationId, { pageSize: 20 }, controller.signal);
        setSummaries(result.items);
        setSelectedEventId(result.items[0]?.eventId ?? '');
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Unable to load attendance summaries.');
        }
      } finally {
        setIsLoading(false);
      }
    }
    if (organizationId) load();
    return () => controller.abort();
  }, [organizationId]);

  useEffect(() => {
    const controller = new AbortController();
    async function search() {
      if (!memberSearch) {
        setMemberResults([]);
        return;
      }
      try {
        const result = await listMembers(organizationId, { search: memberSearch, pageSize: 8 }, controller.signal);
        setMemberResults(result.items);
      } catch {
        // Non-fatal; leave previous results in place.
      }
    }
    const timeout = setTimeout(search, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [organizationId, memberSearch]);

  const handleRecord = async (memberId: string, attendanceType: AttendanceType) => {
    if (!selectedEventId) return;
    setStatusMessage(null);
    setError(null);
    try {
      await recordAttendance({ organizationId, eventId: selectedEventId, memberId, attendanceType });
      setStatusMessage('Attendance recorded.');
      setSummaries((items) =>
        items.map((item) =>
          item.eventId === selectedEventId
            ? {
                ...item,
                inPersonCount: attendanceType === AttendanceType.InPerson ? item.inPersonCount + 1 : item.inPersonCount,
                onlineCount: attendanceType === AttendanceType.Online ? item.onlineCount + 1 : item.onlineCount,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record attendance.');
    }
  };

  return (
    <>
      {error && <div className="church-admin-alert church-admin-alert--error">{error}</div>}
      {statusMessage && <div className="church-admin-alert church-admin-alert--success">{statusMessage}</div>}

      <section className="church-admin-panel">
        <h2>Record attendance</h2>
        <label className="church-admin-field">
          <span>Event</span>
          <select className="church-admin-select" value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
            {summaries.map((summary) => (
              <option key={summary.eventId} value={summary.eventId}>
                {summary.eventTitle} — {new Date(summary.startsAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>

        <label className="church-admin-field">
          <span>Find a member</span>
          <input
            className="church-admin-input"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search by name…"
          />
        </label>

        {memberResults.length > 0 && (
          <ul className="church-admin-member-results">
            {memberResults.map((member) => (
              <li key={member.id}>
                <span>{member.profile.displayName}</span>
                <div className="church-admin-table__actions">
                  <button
                    type="button"
                    className="church-admin-btn church-admin-btn--secondary church-admin-btn--sm"
                    onClick={() => handleRecord(member.id, AttendanceType.InPerson)}
                  >
                    Check in (in person)
                  </button>
                  <button
                    type="button"
                    className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                    onClick={() => handleRecord(member.id, AttendanceType.Online)}
                  >
                    Check in (online)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="church-admin-panel">
        <h2>Attendance summaries</h2>
        {isLoading ? (
          <p className="church-admin-empty">Loading…</p>
        ) : summaries.length === 0 ? (
          <p className="church-admin-empty">No attendance recorded yet.</p>
        ) : (
          <div className="church-admin-table-wrap">
            <table className="church-admin-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">In person</th>
                  <th scope="col">Online</th>
                  <th scope="col">Absences</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                  <tr key={summary.eventId}>
                    <td>{summary.eventTitle}</td>
                    <td>{summary.inPersonCount}</td>
                    <td>{summary.onlineCount}</td>
                    <td>{summary.absenceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
