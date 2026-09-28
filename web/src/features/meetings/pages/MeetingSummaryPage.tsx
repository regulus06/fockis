import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileDown,
  Users2,
} from "lucide-react";

import { useMeetingsStore } from "../store/meetingsStore";
import { meetingsApi } from "../services/meetingsApi";

import { SummarySection } from "../components/summary/SummarySection";
import { ActionItemCard } from "../components/summary/ActionItemCard";
import { Button } from "../components/common/Button";
import { Avatar } from "../components/common/Avatar";
import { EmptyState } from "../components/common/EmptyState";

import { MEETING_ROUTES } from "../constants";

import "../styles/global.scss";
import "../styles/pages.scss";
import "../styles/components/summary.scss";

export function MeetingSummaryPage() {
  const { id } = useParams<{ id: string }>();

  const meeting = useMeetingsStore((s) =>
    s.getById(id ?? ""),
  );

  const [summary, setSummary] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const result =
        await meetingsApi.getSummary(id);

      if (cancelled) return;

      if (!result.ok) {
        setError(result.error);
      } else {
        setSummary(result.data);
      }

      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="fockis-meetings-root fm-page fm-page--light">
        <div className="fm-subpage">
          <div className="fm-dashboard-loading">
            Generating meeting summary...
          </div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="fockis-meetings-root fm-page fm-page--light">
        <div className="fm-subpage">
          <EmptyState
            title="Summary not available"
            description={
              error ??
              "The AI Secretary has not generated a summary yet."
            }
          />
        </div>
      </div>
    );
  }

  const start = meeting
    ? new Date(meeting.startTime)
    : null;

  const end = meeting
    ? new Date(meeting.endTime)
    : null;

  return (
    <div className="fockis-meetings-root fm-page fm-page--light">
      <div className="fm-subpage">

        <Link
          to={MEETING_ROUTES.details(id ?? "")}
          className="fm-back-link"
        >
          <ArrowLeft size={14} />
          Back to meeting
        </Link>

        <div className="fm-subpage-header">
          <div>
            <h1>
              {meeting?.topic ??
                "Meeting Summary"}
            </h1>

            {start && end && (
              <p
                style={{
                  color: "#5b5f76",
                  marginTop: 6,
                }}
              >
                {start.toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                ·{" "}
                {start.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                –{" "}
                {end.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <Link
              to={MEETING_ROUTES.attendance(
                id ?? "",
              )}
            >
              <Button
                variant="secondary"
                icon={<Users2 size={15} />}
              >
                Attendance
              </Button>
            </Link>

            <Button
              variant="primary"
              icon={<FileDown size={15} />}
            >
              PDF report
            </Button>
          </div>
        </div>

        {summary.overview && (
          <SummarySection title="Overview">
            <p
              style={{
                fontSize: 15.5,
                lineHeight: 1.65,
                color: "#2b2e42",
              }}
            >
              {summary.overview}
            </p>
          </SummarySection>
        )}

        {summary.mainPoints?.length > 0 && (
          <SummarySection title="Main points">
            <ul className="fm-summary-list">
              {summary.mainPoints.map(
                (point: string) => (
                  <li key={point}>
                    {point}
                  </li>
                ),
              )}
            </ul>
          </SummarySection>
        )}

        {summary.decisions?.length > 0 && (
          <SummarySection title="Decisions">
            <ul className="fm-summary-list fm-summary-list--decisions">
              {summary.decisions.map(
                (decision: any) => (
                  <li key={decision.id}>
                    {decision.text}
                  </li>
                ),
              )}
            </ul>
          </SummarySection>
        )}

        {summary.actionItems?.length > 0 && (
          <SummarySection title="Action items">
            {summary.actionItems.map(
              (item: any) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                />
              ),
            )}
          </SummarySection>
        )}

        {summary.questions?.length > 0 && (
          <SummarySection title="Questions">
            <ul className="fm-summary-list">
              {summary.questions.map(
                (question: any) => (
                  <li key={question.id}>
                    {question.text}
                  </li>
                ),
              )}
            </ul>
          </SummarySection>
        )}

        {summary.nextSteps?.length > 0 && (
          <SummarySection title="Next steps">
            <ul className="fm-summary-list">
              {summary.nextSteps.map(
                (step: string) => (
                  <li key={step}>
                    {step}
                  </li>
                ),
              )}
            </ul>
          </SummarySection>
        )}

        {meeting &&
          meeting.participants?.length > 0 && (
            <SummarySection title="Participants">
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {meeting.participants.map(
                  (participant) => (
                    <div
                      key={participant.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "white",
                        border:
                          "1px solid #e2e5ef",
                        borderRadius: 999,
                        padding:
                          "5px 12px 5px 5px",
                      }}
                    >
                      <Avatar
                        name={
                          participant.displayName
                        }
                        size="sm"
                      />

                      <span
                        style={{
                          fontSize: 13.5,
                        }}
                      >
                        {
                          participant.displayName
                        }
                      </span>
                    </div>
                  ),
                )}
              </div>
            </SummarySection>
          )}
      </div>
    </div>
  );
}

export default MeetingSummaryPage;