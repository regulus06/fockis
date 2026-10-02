import type { AiJob } from "../../types/aiTypes";
import AiGenerationProgress from "../AiGenerationProgress";
export default function ImageGenerationProgress({ job }: { job?: AiJob }) { return <AiGenerationProgress job={job} />; }
