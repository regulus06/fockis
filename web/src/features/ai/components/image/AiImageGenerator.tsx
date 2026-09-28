import { useState } from "react";
import AiPromptBox from "../AiPromptBox";
import AiModelSelector from "../AiModelSelector";
import AiGenerationProgress from "../AiGenerationProgress";
import { aiImageApi } from "../../services/aiImageApi";
import { useAiJob } from "../../hooks/useAiJob";

export default function AiImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("auto");
  const [ratio, setRatio] = useState<"1:1" | "16:9" | "9:16" | "4:5">("1:1");
  const [jobId, setJobId] = useState<string>();
  const [error, setError] = useState<string>();
  const { job } = useAiJob(jobId);

  async function generate() {
    if (!prompt.trim()) { setError("Describe the image you want."); return; }
    try {
      setError(undefined);
      const created = await aiImageApi.generate({ prompt, model, aspectRatio: ratio, count: 1 });
      setJobId(created.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Image generation failed."); }
  }

  return (
    <div className="fockis-ai-generator">
      <AiPromptBox value={prompt} onChange={setPrompt} onSubmit={generate} loading={job?.status === "processing"} placeholder="Describe the subject, composition, lighting, camera, style, and details…" />
      <div className="fockis-ai-inline-fields">
        <AiModelSelector value={model} onChange={setModel} />
        <label className="fockis-ai-field"><span>Aspect ratio</span><select value={ratio} onChange={(e) => setRatio(e.target.value as typeof ratio)}><option>1:1</option><option>16:9</option><option>9:16</option><option>4:5</option></select></label>
      </div>
      {error && <p className="fockis-ai-error">{error}</p>}
      <AiGenerationProgress job={job} />
    </div>
  );
}
