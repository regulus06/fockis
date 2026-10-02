import type { AiJob } from "../types/aiTypes";

interface Props {
  job?: AiJob;
}

export default function AiGenerationProgress({ job }: Props) {
  if (!job) return null;
  const progress = Math.max(0, Math.min(100, job.progress ?? (job.status === "completed" ? 100 : 0)));

  return (
    <section className="fockis-ai-progress">
      <div className="fockis-ai-progress__header">
        <strong>{job.status === "completed" ? "Complete" : "Creating your result…"}</strong>
        <span>{progress}%</span>
      </div>
      <div className="fockis-ai-progress__bar">
        <span style={{ width: `${progress}%` }} />
      </div>
      {job.error && <p className="fockis-ai-error">{job.error}</p>}
      {job.resultUrl && (
        <a href={job.resultUrl} target="_blank" rel="noreferrer">
          Open result
        </a>
      )}
    </section>
  );
}
