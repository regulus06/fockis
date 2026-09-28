import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import { ArrowLeft } from "lucide-react";

import { FormField } from "../components/scheduling/FormField";
import { ToggleRow } from "../components/scheduling/ToggleRow";
import { AgendaEditor } from "../components/scheduling/AgendaEditor";
import { SecretaryConsentCard } from "../components/scheduling/SecretaryConsentCard";
import { Button } from "../components/common/Button";

import type {
  MeetingAgendaItem,
  MeetingSecuritySettings,
  AiSecretaryConfig,
} from "../types";

import { meetingsApi } from "../services/meetingsApi";
import { MEETING_ROUTES } from "../constants";

import "../styles/global.scss";
import "../styles/pages.scss";

const DEFAULT_SECURITY: MeetingSecuritySettings = {
  waitingRoomEnabled: true,
  allowJoinBeforeHost: false,
  muteParticipantsOnEntry: true,
  screenShareWhoCanShare: "host_only",
  locked: false,
};

const DEFAULT_SECRETARY: AiSecretaryConfig = {
  enabled: true,
  takeNotes: true,
  generateTranscript: true,
  identifyMainPoints: true,
  identifyDecisions: true,
  identifyActionItems: true,
  identifyQuestions: true,
  generateSummary: true,
  generatePdfReport: true,
};

function formatDateForInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatTimeForInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
}

export function MeetingEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);

  const [timezone, setTimezone] = useState(
    "America/New_York",
  );

  const [passcode, setPasscode] = useState("");

  const [agenda, setAgenda] =
    useState<MeetingAgendaItem[]>([]);

  const [security, setSecurity] =
    useState<MeetingSecuritySettings>(
      DEFAULT_SECURITY,
    );

  const [secretary, setSecretary] =
    useState<AiSecretaryConfig>(
      DEFAULT_SECRETARY,
    );

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMeeting() {
      if (!id) {
        setError("Meeting ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const result =
        await meetingsApi.getById(id);

      if (!mounted) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const meeting = result.data;

      setTopic(meeting.topic ?? "");

      setDescription(
        meeting.description ?? "",
      );

      setDate(
        formatDateForInput(
          meeting.startTime,
        ),
      );

      setTime(
        formatTimeForInput(
          meeting.startTime,
        ),
      );

      setDuration(
        typeof meeting.durationMinutes ===
          "number"
          ? meeting.durationMinutes
          : Math.max(
              15,
              Math.round(
                (
                  new Date(
                    meeting.endTime,
                  ).getTime() -
                  new Date(
                    meeting.startTime,
                  ).getTime()
                ) / 60000,
              ),
            ),
      );

      setTimezone(
        meeting.timezone ||
          "America/New_York",
      );

      setPasscode(
        meeting.passcode ?? "",
      );

      setAgenda(
        Array.isArray(meeting.agenda)
          ? meeting.agenda
          : [],
      );

      setSecurity({
        ...DEFAULT_SECURITY,
        ...(meeting.security ?? {}),
      });

      setSecretary({
        ...DEFAULT_SECRETARY,
        ...(meeting.secretary ?? {}),
      });

      setLoading(false);
    }

    loadMeeting();

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleSubmit = async () => {
    if (!id || saving) {
      return;
    }

    if (!topic.trim()) {
      setError(
        "Please enter a meeting topic.",
      );
      return;
    }

    if (!date || !time) {
      setError(
        "Please select a date and start time.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    /*
     * IMPORTANT:
     *
     * Send the complete MeetingAgendaItem[]
     * here.
     *
     * meetingsApi.update() is responsible for
     * converting the agenda into the backend
     * format { title, order }.
     */
    const result =
      await meetingsApi.update(id, {
        topic: topic.trim(),

        description:
          description.trim(),

        date,

        startTime: time,

        durationMinutes:
          duration,

        timezone,

        passcode,

        agenda,

        security,

        secretary,
      });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigate(
      MEETING_ROUTES.details(id),
    );
  };

  if (loading) {
    return (
      <div className="fockis-meetings-root fm-page fm-page--light">
        <div className="fm-subpage">
          <div className="fm-subpage-header">
            <h1>Loading meeting...</h1>
          </div>

          <p>
            Loading the meeting information.
          </p>
        </div>
      </div>
    );
  }

  if (error && !topic) {
    return (
      <div className="fockis-meetings-root fm-page fm-page--light">
        <div className="fm-subpage">
          <Link
            to={
              id
                ? MEETING_ROUTES.details(id)
                : MEETING_ROUTES.root
            }
            className="fm-back-link"
          >
            <ArrowLeft size={14} />
            Back to Meeting
          </Link>

          <div className="fm-subpage-header">
            <h1>
              Unable to load meeting
            </h1>
          </div>

          <div className="fm-form-error">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">
      <div className="fm-subpage">

        <Link
          to={
            id
              ? MEETING_ROUTES.details(id)
              : MEETING_ROUTES.root
          }
          className="fm-back-link"
        >
          <ArrowLeft size={14} />
          Back to Meeting
        </Link>

        <div className="fm-subpage-header">
          <h1>Edit meeting</h1>
        </div>

        {error && (
          <div className="fm-form-error">
            {error}
          </div>
        )}

        <FormField label="Meeting topic">
          <input
            className="fm-input"
            placeholder="e.g. Project Planning"
            value={topic}
            onChange={(e) =>
              setTopic(e.target.value)
            }
          />
        </FormField>

        <FormField
          label="Description"
          hint="Optional context for invitees"
        >
          <textarea
            className="fm-textarea"
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value,
              )
            }
          />
        </FormField>

        <div className="fm-field-row">
          <FormField label="Date">
            <input
              type="date"
              className="fm-input"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
            />
          </FormField>

          <FormField label="Start time">
            <input
              type="time"
              className="fm-input"
              value={time}
              onChange={(e) =>
                setTime(e.target.value)
              }
            />
          </FormField>

          <FormField label="Duration (minutes)">
            <input
              type="number"
              min={15}
              step={15}
              className="fm-input"
              value={duration}
              onChange={(e) =>
                setDuration(
                  Number(e.target.value),
                )
              }
            />
          </FormField>
        </div>

        <div className="fm-field-row">
          <FormField label="Timezone">
            <select
              className="fm-select"
              value={timezone}
              onChange={(e) =>
                setTimezone(
                  e.target.value,
                )
              }
            >
              <option value="America/New_York">
                Eastern Time
              </option>

              <option value="America/Chicago">
                Central Time
              </option>

              <option value="America/Los_Angeles">
                Pacific Time
              </option>

              <option value="UTC">
                UTC
              </option>
            </select>
          </FormField>

          <FormField
            label="Meeting ID"
            hint="Cannot be changed"
          >
            <input
              className="fm-input mono"
              disabled
              value={id ?? ""}
              readOnly
            />
          </FormField>

          <FormField
            label="Passcode"
            hint="Optional"
          >
            <input
              className="fm-input"
              value={passcode}
              onChange={(e) =>
                setPasscode(
                  e.target.value,
                )
              }
              placeholder="6 digits"
            />
          </FormField>
        </div>

        <AgendaEditor
          items={agenda}
          onChange={setAgenda}
        />

        <SecretaryConsentCard
          config={secretary}
          onChange={setSecretary}
        />

        <div className="fm-field">
          <span className="fm-field__label">
            Meeting options
          </span>

          <ToggleRow
            label="Waiting room"
            description="Participants wait until the host admits them"
            checked={
              security.waitingRoomEnabled
            }
            onChange={(value) =>
              setSecurity((current) => ({
                ...current,
                waitingRoomEnabled:
                  value,
              }))
            }
          />

          <ToggleRow
            label="Allow participants to join before host"
            checked={
              security.allowJoinBeforeHost
            }
            onChange={(value) =>
              setSecurity((current) => ({
                ...current,
                allowJoinBeforeHost:
                  value,
              }))
            }
          />

          <ToggleRow
            label="Mute participants on entry"
            checked={
              security.muteParticipantsOnEntry
            }
            onChange={(value) =>
              setSecurity((current) => ({
                ...current,
                muteParticipantsOnEntry:
                  value,
              }))
            }
          />

          <ToggleRow
            label="Only host can share screen"
            checked={
              security.screenShareWhoCanShare ===
              "host_only"
            }
            onChange={(value) =>
              setSecurity((current) => ({
                ...current,
                screenShareWhoCanShare:
                  value
                    ? "host_only"
                    : "everyone",
              }))
            }
          />
        </div>

        <div className="fm-form-actions">
          <Button
            variant="secondary"
            onClick={() =>
              navigate(
                id
                  ? MEETING_ROUTES.details(id)
                  : MEETING_ROUTES.root,
              )
            }
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={
              !topic.trim() ||
              !date ||
              !time ||
              saving
            }
          >
            {saving
              ? "Saving..."
              : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MeetingEditPage;