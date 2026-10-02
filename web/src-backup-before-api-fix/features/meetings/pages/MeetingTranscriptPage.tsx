import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  Link,
} from "react-router-dom";

import { ArrowLeft } from "lucide-react";

import { useMeetingsStore } from "../store/meetingsStore";

import {
  meetingsApi,
  type MeetingTranscriptLine,
} from "../services/meetingsApi";

import { MeetingTranscriptPanel } from "../components/transcript/MeetingTranscriptPanel";
import { EmptyState } from "../components/common/EmptyState";

import { MEETING_ROUTES } from "../constants";

import "../styles/global.scss";
import "../styles/pages.scss";

/* ============================================================================
 * TYPES
 * ========================================================================== */

/**
 * Shape expected by MeetingTranscriptPanel.
 *
 * IMPORTANT:
 * MeetingTranscriptPanel requires timestamp to be a string.
 */
interface PanelTranscriptLine {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  startTime?: number;
  endTime?: number;
  timestamp: string;
}

/* ============================================================================
 * TIMESTAMP HELPERS
 * ========================================================================== */

/**
 * Converts API timestamp values into numbers when possible.
 *
 * Used for startTime/endTime because those fields are numeric
 * in the transcript panel's expected shape.
 */
function toNumberTimestamp(
  value: string | number | undefined,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const numeric = Number(trimmed);

  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const date = Date.parse(trimmed);

  if (!Number.isNaN(date)) {
    return date;
  }

  return undefined;
}

/**
 * Converts any API timestamp value into the string required
 * by MeetingTranscriptPanel.
 */
function toStringTimestamp(
  value: string | number | undefined,
  index: number,
): string {
  if (value === undefined || value === null) {
    return `line-${index}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length > 0) {
      return trimmed;
    }

    return `line-${index}`;
  }

  if (Number.isFinite(value)) {
    return String(value);
  }

  return `line-${index}`;
}

/* ============================================================================
 * TRANSCRIPT NORMALIZATION
 * ========================================================================== */

/**
 * Converts the API transcript shape into the exact shape expected
 * by MeetingTranscriptPanel.
 */
function toPanelTranscriptLine(
  line: MeetingTranscriptLine,
  index: number,
): PanelTranscriptLine {
  const id =
    typeof line.id === "string" &&
    line.id.trim().length > 0
      ? line.id
      : `transcript-line-${index}`;

  const speakerId =
    typeof line.speakerId === "string" &&
    line.speakerId.trim().length > 0
      ? line.speakerId
      : `speaker-${index}`;

  const speakerName =
    typeof line.speakerName === "string" &&
    line.speakerName.trim().length > 0
      ? line.speakerName
      : "Unknown speaker";

  /**
   * ALWAYS return a string here.
   *
   * This fixes:
   *
   * Type 'string | number' is not assignable to type 'string'
   */
  const timestamp = toStringTimestamp(
    line.timestamp,
    index,
  );

  return {
    id,

    speakerId,

    speakerName,

    text:
      typeof line.text === "string"
        ? line.text
        : "",

    startTime:
      toNumberTimestamp(
        line.startTime,
      ),

    endTime:
      toNumberTimestamp(
        line.endTime,
      ),

    timestamp,
  };
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export function MeetingTranscriptPage() {
  const { id } =
    useParams<{ id: string }>();

  const meeting =
    useMeetingsStore((s) =>
      s.getById(id ?? ""),
    );

  const [
    lines,
    setLines,
  ] = useState<
    PanelTranscriptLine[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  /* ==========================================================================
   * LOAD TRANSCRIPT
   * ======================================================================== */

  useEffect(() => {
    if (!id) {
      setLoading(false);

      setError(
        "Meeting ID is missing.",
      );

      return;
    }

    let cancelled = false;

    const loadTranscript =
      async () => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await meetingsApi.getTranscript(
              id,
            );

          if (cancelled) {
            return;
          }

          if (!result.ok) {
            setError(result.error);
            setLines([]);
            setLoading(false);

            return;
          }

          /**
           * The API returns MeetingTranscriptLine[].
           *
           * Normalize every record before giving it
           * to MeetingTranscriptPanel.
           */
          const apiLines =
            Array.isArray(result.data)
              ? result.data
              : [];

          const normalizedLines =
            apiLines.map(
              toPanelTranscriptLine,
            );

          setLines(
            normalizedLines,
          );

          setLoading(false);
        } catch (err) {
          if (cancelled) {
            return;
          }

          setLines([]);

          setError(
            err instanceof Error
              ? err.message
              : "Failed to load transcript.",
          );

          setLoading(false);
        }
      };

    void loadTranscript();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">
      <div className="fm-subpage">

        {/* --------------------------------------------------------------------
         * BACK
         * ------------------------------------------------------------------ */}

        <Link
          to={MEETING_ROUTES.details(
            id ?? "",
          )}
          className="fm-back-link"
        >
          <ArrowLeft size={14} />
          Back to meeting
        </Link>

        {/* --------------------------------------------------------------------
         * HEADER
         * ------------------------------------------------------------------ */}

        <div className="fm-subpage-header">
          <div>
            <h1>
              Transcript —{" "}
              {meeting?.topic ??
                "Meeting"}
            </h1>

            <p
              style={{
                color: "#5b5f76",
                marginTop: 6,
              }}
            >
              AI Secretary meeting
              transcript
            </p>
          </div>
        </div>

        {/* --------------------------------------------------------------------
         * LOADING
         * ------------------------------------------------------------------ */}

        {loading ? (
          <div className="fm-dashboard-loading">
            Loading transcript...
          </div>

        /* --------------------------------------------------------------------
         * ERROR
         * ------------------------------------------------------------------ */

        ) : error ? (
          <EmptyState
            title="Transcript unavailable"
            description={error}
          />

        /* --------------------------------------------------------------------
         * EMPTY
         * ------------------------------------------------------------------ */

        ) : lines.length === 0 ? (
          <EmptyState
            title="No transcript yet"
            description="The AI Secretary has not generated any transcript lines for this meeting yet."
          />

        /* --------------------------------------------------------------------
         * TRANSCRIPT
         * ------------------------------------------------------------------ */

        ) : (
          <MeetingTranscriptPanel
            lines={lines}
            status="complete"
          />
        )}

      </div>
    </div>
  );
}

export default MeetingTranscriptPage;