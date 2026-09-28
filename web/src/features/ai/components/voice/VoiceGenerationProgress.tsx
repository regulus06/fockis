import type { AiJob } from "../../types/aiTypes";
import AiGenerationProgress from "../AiGenerationProgress";
export default function VoiceGenerationProgress({ job }: { job?: AiJob }) { return <AiGenerationProgress job={job} />; }
