import { useState } from "react";
import { Link } from "react-router-dom";
import { useAiHistory } from "../hooks/useAiHistory";
import { formatAiDate } from "../utils/aiFormatters";
import "../styles/ai.scss";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `http://${window.location.hostname}:3000`;

function getToken(): string | null {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken")
  );
}

interface MediaUrlResponse {
  url?: string;
  signedUrl?: string;
  jobId?: string;
  bucket?: string;
  objectName?: string;
}

export default function AiHistoryPage() {
  const { jobs, loading, error } = useAiHistory();

  const [openingJobId, setOpeningJobId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const openResult = async (jobId: string) => {
    try {
      setOpeningJobId(jobId);
      setOpenError(null);

      const token = getToken();

      if (!token) {
        throw new Error("You are not authenticated. Please log in again.");
      }

      const response = await fetch(
        `${API_BASE}/ai/jobs/${jobId}/media-url`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        let message = `Unable to open video (${response.status})`;

        try {
          const data = await response.json();

          if (typeof data?.message === "string") {
            message = data.message;
          }
        } catch {
          // Ignore JSON parsing errors.
        }

        throw new Error(message);
      }

      const data: MediaUrlResponse = await response.json();

      const signedUrl = data.signedUrl || data.url;

      if (!signedUrl) {
        throw new Error("The server did not return a video URL.");
      }

      if (!signedUrl.startsWith("https://")) {
        throw new Error("The server returned an invalid video URL.");
      }

      // Open the signed Google Cloud Storage URL.
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[AI History] Failed to open result:", err);

      setOpenError(
        err instanceof Error
          ? err.message
          : "Unable to open the generated video."
      );
    } finally {
      setOpeningJobId(null);
    }
  };

  return (
    <main className="fockis-ai-page">
      <header className="fockis-ai-page__header">
        <Link to="/create/ai">← AI Studio</Link>
      </header>

      <section className="fockis-ai-page__hero">
        <span className="fockis-ai-eyebrow">HISTORY</span>

        <h1>Your AI generations.</h1>
      </section>

      {loading && <p>Loading…</p>}

      {error && (
        <p className="fockis-ai-error">
          {error}
        </p>
      )}

      {openError && (
        <div className="fockis-ai-error">
          {openError}
        </div>
      )}

      {!loading && !jobs.length && (
        <p>No AI generations yet.</p>
      )}

      <div className="fockis-ai-history__grid">
        {jobs.map((job) => (
          <article
            className="fockis-ai-history-card"
            key={job.id}
          >
            <span>{job.type}</span>

            <strong>
              {job.prompt || "Untitled"}
            </strong>

            <small>
              {job.status} · {formatAiDate(job.createdAt)}
            </small>

            {job.resultUrl && job.status === "completed" && (
              <button
                type="button"
                onClick={() => openResult(job.id)}
                disabled={openingJobId === job.id}
              >
                {openingJobId === job.id
                  ? "Opening…"
                  : "Open result"}
              </button>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}