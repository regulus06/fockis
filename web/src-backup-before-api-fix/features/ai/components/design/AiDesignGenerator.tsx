import { useState } from "react";
import AiPromptBox from "../AiPromptBox";
import AiModelSelector from "../AiModelSelector";
import AiGenerationProgress from "../AiGenerationProgress";
import type { AiDesignType } from "../../types/aiDesignTypes";
import { aiDesignApi } from "../../services/aiDesignApi";
import { useAiJob } from "../../hooks/useAiJob";

export default function AiDesignGenerator() {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState<AiDesignType>("flyer");
  const [model, setModel] = useState("auto");
  const [jobId, setJobId] = useState<string>();
  const [error, setError] = useState<string>();
  const { job } = useAiJob(jobId);

  async function generate() {
    if (!prompt.trim()) { setError("Describe the design you want."); return; }
    try {
      setError(undefined);
      const created = await aiDesignApi.generate({ prompt, type, model });
      setJobId(created.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Design generation failed."); }
  }

  return (
    <div className="fockis-ai-generator">
      <AiPromptBox value={prompt} onChange={setPrompt} onSubmit={generate} loading={job?.status === "processing"} placeholder="Describe the design, text, branding, audience, layout, and style…" />
      <div className="fockis-ai-inline-fields">
        <label className="fockis-ai-field"><span>Design type</span><select value={type} onChange={(e) => setType(e.target.value as AiDesignType)}>{["flyer","logo","badge","poster","thumbnail","banner","business-card","social-media"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <AiModelSelector value={model} onChange={setModel} />
      </div>
      {error && <p className="fockis-ai-error">{error}</p>}
      <AiGenerationProgress job={job} />
    </div>
  );
}
