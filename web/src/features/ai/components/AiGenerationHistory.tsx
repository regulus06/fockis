import { useState } from "react";
import { Link } from "react-router-dom";

import { useAiHistory } from "../hooks/useAiHistory";
import { formatAiDate } from "../utils/aiFormatters";

const API_BASE = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    `http://${window.location.hostname}:3000`,
).replace(/\/+$/, "");

function getAccessToken(): string | null {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt")
  );
}

interface MediaUrlResponse {
  url?: string;
  signedUrl?: string;
  jobId?: string;
  bucket?: string;
  objectName?: string;
}

export default function AiGenerationHistory() {
  const { jobs, loading, error } = useAiHistory();

  const [openingJobId, setOpeningJobId] =
    useState<string | null>(null);

  const [openError, setOpenError] =
    useState<string | null>(null);

  async function openResult(jobId: string) {
    if (!jobId) {
      return;
    }

    try {
      setOpeningJobId(jobId);
      setOpenError(null);

      const token = getAccessToken();

      if (!token) {
        throw new Error(
          "Your login session could not be found. Please sign in again.",
        );
      }

      const endpoint =
        `${API_BASE}/ai/jobs/${encodeURIComponent(
          jobId,
        )}/media-url`;

      console.log(
        "[FOCKIS AI HISTORY] Requesting signed video URL:",
        endpoint,
      );

      const response = await fetch(endpoint, {
        method: "GET",

        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },

        credentials: "include",
      });

      console.log(
        "[FOCKIS AI HISTORY] Media URL response:",
        response.status,
      );

      if (!response.ok) {
        let message =
          `Unable to open the AI result. HTTP ${response.status}.`;

        try {
          const contentType =
            response.headers.get("content-type") || "";

          if (
            contentType.includes(
              "application/json",
            )
          ) {
            const body =
              await response.json();

            if (body?.message) {
              message =
                String(body.message);
            }
          } else {
            const text =
              await response.text();

            if (text.trim()) {
              message = text.trim();
            }
          }
        } catch {
          // Keep default error.
        }

        throw new Error(message);
      }

      const data =
        (await response.json()) as MediaUrlResponse;

      const signedUrl =
        typeof data.signedUrl === "string"
          ? data.signedUrl
          : typeof data.url === "string"
            ? data.url
            : null;

      console.log(
        "[FOCKIS AI HISTORY] Signed URL received:",
        {
          hasSignedUrl: Boolean(
            data.signedUrl,
          ),
          hasUrl: Boolean(data.url),
          isHttps:
            typeof signedUrl === "string" &&
            signedUrl.startsWith("https://"),
        },
      );

      if (!signedUrl) {
        throw new Error(
          "The server did not return a video URL.",
        );
      }

      if (
        !signedUrl.startsWith(
          "https://",
        )
      ) {
        throw new Error(
          "The server returned an invalid video URL.",
        );
      }

      // IMPORTANT:
      // Never open job.resultUrl here.
      // job.resultUrl contains gs://...
      //
      // Open the temporary HTTPS signed URL instead.
      window.open(
        signedUrl,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (err) {
      console.error(
        "[FOCKIS AI HISTORY] Failed to open result:",
        err,
      );

      setOpenError(
        err instanceof Error
          ? err.message
          : "Unable to open the AI result.",
      );
    } finally {
      setOpeningJobId(null);
    }
  }

  return (
    <section className="fockis-ai-history">
      <div className="fockis-ai-section-heading">
        <div>
          <span>YOUR WORK</span>

          <h2>
            Recent AI generations
          </h2>
        </div>

        <Link to="/create/ai/history">
          View history
        </Link>
      </div>

      {loading && (
        <p>
          Loading your generations…
        </p>
      )}

      {error && (
        <p className="fockis-ai-error">
          {error}
        </p>
      )}

      {openError && (
        <p className="fockis-ai-error">
          {openError}
        </p>
      )}

      {!loading && !jobs.length && (
        <p>
          No AI generations yet.
        </p>
      )}

      <div className="fockis-ai-history__grid">
        {jobs.slice(0, 6).map((job) => {
          const jobId =
            String(job.id);

          const status =
            String(
              job.status ?? "",
            ).toLowerCase();

          const completed =
            status === "completed" ||
            status === "complete" ||
            status === "succeeded" ||
            status === "success";

          const isOpening =
            openingJobId === jobId;

          return (
            <article
              key={jobId}
              className="fockis-ai-history-card"
            >
              <span>
                {job.type}
              </span>

              <strong>
                {job.prompt ||
                  "Untitled generation"}
              </strong>

              <small>
                {job.status} ·{" "}
                {formatAiDate(
                  job.createdAt,
                )}
              </small>

              {completed && (
                <button
                  type="button"
                  onClick={() =>
                    void openResult(
                      jobId,
                    )
                  }
                  disabled={isOpening}
                  style={{
                    marginTop: 12,
                    border: "none",
                    borderRadius: 8,
                    padding:
                      "9px 14px",
                    background:
                      "#ff9900",
                    color: "#ffffff",
                    fontWeight: 800,
                    cursor: isOpening
                      ? "wait"
                      : "pointer",
                    opacity: isOpening
                      ? 0.7
                      : 1,
                  }}
                >
                  {isOpening
                    ? "Opening..."
                    : "Open result"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}