import { useState } from "react";
import AiPromptBox from "../AiPromptBox";
import AiModelSelector from "../AiModelSelector";
import VoiceSelector from "./VoiceSelector";
import AiGenerationProgress from "../AiGenerationProgress";
import { aiVoiceApi } from "../../services/aiVoiceApi";
import { useAiJob } from "../../hooks/useAiJob";

export default function AiVoiceGenerator() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("narrator");
  const [model, setModel] = useState("auto");
  const [jobId, setJobId] = useState<string>();
  const [error, setError] = useState<string>();
  const { job } = useAiJob(jobId);

  async function generate() {
    if (!text.trim()) { setError("Enter text for narration."); return; }
    try {
      setError(undefined);
      const created = await aiVoiceApi.generate({ text, voice, model, language: "en" });
      setJobId(created.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Voice generation failed."); }
  }

  return (
    <div className="fockis-ai-generator">
      <AiPromptBox value={text} onChange={setText} onSubmit={generate} loading={job?.status === "processing"} buttonLabel="Generate Voice" placeholder="Write the narration or voice script…" />
      <div className="fockis-ai-inline-fields"><VoiceSelector value={voice} onChange={setVoice} /><AiModelSelector value={model} onChange={setModel} /></div>
      {error && <p className="fockis-ai-error">{error}</p>}
      <AiGenerationProgress job={job} />
    </div>
  );
}
