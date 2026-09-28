import type { AiJob } from "../../types/aiTypes";
import AiGenerationProgress from "../AiGenerationProgress";
export default function MusicGenerationProgress({ job }: { job?: AiJob }) {
  return <AiGenerationProgress job={job} />;
}
