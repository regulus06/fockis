/**
 * LiveAttendanceTabs.tsx — the Live Services and Attendance tabs of
 * Events, Live & Attendance.
 * -----------------------------------------------------------------------------
 * Same APIs and behaviour as before (organizationLiveApi, attendanceApi,
 * membersApi), restyled for the dashboard. Attendance adds a CSV export of
 * the summaries. Opening a meeting link never records attendance: attendance
 * is recorded here, by QR / manual check-in on the registrations pages, or by
 * the existing live-service join flow.
 * -----------------------------------------------------------------------------
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ExternalLink, Radio, Search, UserCheck } from "lucide-react";

import { deleteLiveEvent, endLiveEvent, getLiveEvents, scheduleLiveEvent, startLiveEvent } from "../api/organizationLiveApi";
import { getAttendanceSummaries, recordAttendance } from "../api/attendanceApi";
import { listMembers } from "../api/membersApi";
import {
  AttendanceType,
  LiveEventState,
  LiveEventVisibility,
  type AttendanceSummary,
  type LiveEvent,
  type Member,
} from "../types/organization.types";
import { errorMessage } from "../ui/orgUi";
import { downloadCsv } from "./csv";

const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";

export function LiveTab({ organizationId, servicesWord }: { organizationId: string; servicesWord: string }): React.JSX.Element {
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [title, setTitle] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [visibility, setVisibility] = useState<LiveEventVisibility>(LiveEventVisibility.Members);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    getLiveEvents(organizationId, { pageSize: 50 }, controller.signal)
      .then((result) => setLiveEvents(result.items))
      .catch((err) => !isAbort(err) && setError(errorMessage(err, "Unable to load live services.")))
      .finally(() => !controller.signal.aborted && setIsLoading(false));
    return () => controller.abort();
  }, [organizationId]);

  const handleSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !scheduledStart) return;
    setIsSaving(true);
    setError(null);
    try {
      const created = await scheduleLiveEvent({ organizationId, title: title.trim(), visibility, scheduledStart: new Date(scheduledStart).toISOString() });
      setLiveEvents((items) => [created, ...items]);
      setTitle("");
      setScheduledStart("");
    } catch (err) {
      setError(errorMessage(err, "Unable to schedule this live service."));
    } finally {
      setIsSaving(false);
    }
  };

  async function act(id: string, fn: () => Promise<void>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, "That didn't work. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="oe-stack">
      {error && <div className="oe-alert oe-alert--error">{error}</div>}
      <section className="oe-card">
        <header className="oe-card__head">
          <h2>
            <Radio aria-hidden="true" /> Schedule a live {servicesWord.toLowerCase().replace(/s$/, "")}
          </h2>
          <Link className="oe-btn oe-btn--outline oe-btn--sm" to={`/organizations/${encodeURIComponent(organizationId)}/admin/live`}>
            <ExternalLink aria-hidden="true" /> Open Live studio
          </Link>
        </header>
        <form className="oe-grid oe-grid--3" onSubmit={handleSchedule}>
          <label className="oe-field">
            <span>Title</span>
            <input value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label className="oe-field">
            <span>Scheduled start</span>
            <input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} required />
          </label>
          <label className="oe-field">
            <span>Visibility</span>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as LiveEventVisibility)}>
              <option value={LiveEventVisibility.Public}>Public</option>
              <option value={LiveEventVisibility.Members}>Members only</option>
              <option value={LiveEventVisibility.Private}>Private / invitation</option>
            </select>
          </label>
          <div className="oe-span oe-right">
            <button type="submit" className="oe-btn oe-btn--primary" disabled={isSaving}>
              {isSaving ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </section>

      <section className="oe-card">
        <header className="oe-card__head">
          <h2>Live {servicesWord}</h2>
        </header>
        {isLoading ? (
          <p className="oe-empty">Loading…</p>
        ) : liveEvents.length === 0 ? (
          <p className="oe-empty">No live {servicesWord.toLowerCase()} scheduled yet.</p>
        ) : (
          <div className="oe-table-wrap">
            <table className="oe-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">State</th>
                  <th scope="col">Scheduled</th>
                  <th scope="col" className="oe-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {liveEvents.map((live) => (
                  <tr key={live.id}>
                    <td data-label="Title">
                      <strong>{live.title}</strong>
                    </td>
                    <td data-label="State">
                      <span className={`oe-status oe-status--${live.state === LiveEventState.Live ? "ongoing" : live.state === LiveEventState.Scheduled ? "upcoming" : "past"}`}>{live.state}</span>
                    </td>
                    <td data-label="Scheduled">{new Date(live.scheduledStart).toLocaleString()}</td>
                    <td className="oe-right">
                      <div className="oe-actions">
                        {live.state === LiveEventState.Scheduled && (
                          <button
                            type="button"
                            className="oe-btn oe-btn--primary oe-btn--sm"
                            disabled={busy === live.id}
                            onClick={() =>
                              act(live.id, async () => {
                                const updated = await startLiveEvent(organizationId, live.id);
                                setLiveEvents((items) => items.map((item) => (item.id === live.id ? updated : item)));
                              })
                            }
                          >
                            Go live
                          </button>
                        )}
                        {live.state === LiveEventState.Live && (
                          <button
                            type="button"
                            className="oe-btn oe-btn--outline oe-btn--sm"
                            disabled={busy === live.id}
                            onClick={() =>
                              window.confirm("End this broadcast for everyone?") &&
                              act(live.id, async () => {
                                const updated = await endLiveEvent(organizationId, live.id);
                                setLiveEvents((items) => items.map((item) => (item.id === live.id ? updated : item)));
                              })
                            }
                          >
                            End broadcast
                          </button>
                        )}
                        {live.state === LiveEventState.Scheduled && (
                          <button
                            type="button"
                            className="oe-btn oe-btn--ghost oe-btn--sm"
                            disabled={busy === live.id}
                            onClick={() =>
                              window.confirm(`Cancel "${live.title}"?`) &&
                              act(live.id, async () => {
                                await deleteLiveEvent(organizationId, live.id);
                                setLiveEvents((items) => items.filter((item) => item.id !== live.id));
                              })
                            }
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
    </div>
  );
}

export function AttendanceTab({ organizationId, peopleWord }: { organizationId: string; peopleWord: string }): React.JSX.Element {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const person = peopleWord.toLowerCase().replace(/s$/, "");

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    getAttendanceSummaries(organizationId, { pageSize: 50 }, controller.signal)
      .then((result) => {
        setSummaries(result.items);
        setSelectedEventId(result.items[0]?.eventId ?? "");
      })
      .catch((err) => !isAbort(err) && setError(errorMessage(err, "Unable to load attendance summaries.")))
      .finally(() => !controller.signal.aborted && setIsLoading(false));
    return () => controller.abort();
  }, [organizationId]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      if (!memberSearch.trim()) {
        setMemberResults([]);
        return;
      }
      try {
        const result = await listMembers(organizationId, { search: memberSearch.trim(), pageSize: 8 }, controller.signal);
        setMemberResults(result.items);
      } catch {
        // Non-fatal; leave previous results in place.
      }
    }, 250);
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
      setStatusMessage("Attendance recorded.");
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
      setError(errorMessage(err, "Unable to record attendance."));
    }
  };

  function exportCsv() {
    downloadCsv(
      `attendance-summaries-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Event", "Date", "In person", "Online", "Absences", "Expected"],
      summaries.map((s) => [s.eventTitle, new Date(s.startsAt).toISOString(), s.inPersonCount, s.onlineCount, s.absenceCount, s.totalExpected ?? ""]),
    );
  }

  return (
    <div className="oe-stack">
      {error && <div className="oe-alert oe-alert--error">{error}</div>}
      {statusMessage && <div className="oe-alert oe-alert--ok">{statusMessage}</div>}
      <section className="oe-card">
        <header className="oe-card__head">
          <h2>
            <UserCheck aria-hidden="true" /> Record attendance
          </h2>
        </header>
        {summaries.length === 0 && !isLoading ? (
          <p className="oe-empty">There are no services or gatherings to record attendance for yet. For events with registration, use QR or manual check-in from the event's Registrations page.</p>
        ) : (
          <div className="oe-grid">
            <label className="oe-field">
              <span>Event</span>
              <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                {summaries.map((summary) => (
                  <option key={summary.eventId} value={summary.eventId}>
                    {summary.eventTitle} — {new Date(summary.startsAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>
            <label className="oe-field">
              <span>Find a {person}</span>
              <div className="oe-input-icon">
                <Search aria-hidden="true" />
                <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search by name…" />
              </div>
            </label>
          </div>
        )}
        {memberResults.length > 0 && (
          <ul className="oe-members">
            {memberResults.map((member) => (
              <li key={member.id}>
                <span>{member.profile.displayName}</span>
                <div className="oe-actions">
                  <button type="button" className="oe-btn oe-btn--outline oe-btn--sm" onClick={() => handleRecord(member.id, AttendanceType.InPerson)}>
                    Check in (in person)
                  </button>
                  <button type="button" className="oe-btn oe-btn--ghost oe-btn--sm" onClick={() => handleRecord(member.id, AttendanceType.Online)}>
                    Check in (online)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="oe-card">
        <header className="oe-card__head">
          <h2>Attendance summaries</h2>
          <button type="button" className="oe-btn oe-btn--outline oe-btn--sm" onClick={exportCsv} disabled={!summaries.length}>
            <Download aria-hidden="true" /> Export CSV
          </button>
        </header>
        {isLoading ? (
          <p className="oe-empty">Loading…</p>
        ) : summaries.length === 0 ? (
          <p className="oe-empty">No attendance recorded yet.</p>
        ) : (
          <div className="oe-table-wrap">
            <table className="oe-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Date</th>
                  <th scope="col">In person</th>
                  <th scope="col">Online</th>
                  <th scope="col">Absences</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary) => (
                  <tr key={summary.eventId}>
                    <td data-label="Event">
                      <strong>{summary.eventTitle}</strong>
                    </td>
                    <td data-label="Date">{new Date(summary.startsAt).toLocaleDateString()}</td>
                    <td data-label="In person">{summary.inPersonCount}</td>
                    <td data-label="Online">{summary.onlineCount}</td>
                    <td data-label="Absences">{summary.absenceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
