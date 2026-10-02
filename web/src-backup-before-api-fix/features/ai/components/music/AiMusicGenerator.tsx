import { useState } from "react";
import AiPromptBox from "../AiPromptBox";
import AiModelSelector from "../AiModelSelector";
import AiGenerationProgress from "../AiGenerationProgress";
import MusicStyleSelector from "./MusicStyleSelector";
import { aiMusicApi } from "../../services/aiMusicApi";
import { useAiJob } from "../../hooks/useAiJob";

export default function AiMusicGenerator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Cinematic");
  const [model, setModel] = useState("auto");
  const [duration, setDuration] = useState(60);
  const [jobId, setJobId] = useState<string>();
  const [error, setError] = useState<string>();
  const { job } = useAiJob(jobId);

  async function generate() {
    if (!prompt.trim()) { setError("Describe the music you want."); return; }
    try {
      setError(undefined);
      const created = await aiMusicApi.generate({ prompt, style, model, durationSeconds: duration, instrumental: true });
      setJobId(created.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Music generation failed."); }
  }

  return (
    <div className="fockis-ai-generator">
      <AiPromptBox value={prompt} onChange={setPrompt} onSubmit={generate} loading={job?.status === "processing"} placeholder="Describe the sound, instruments, mood, tempo, and purpose…" />
      <div className="fockis-ai-inline-fields">
        <MusicStyleSelector value={style} onChange={setStyle} />
        <label className="fockis-ai-field"><span>Duration</span><select value={duration} onChange={(e) => setDuration(Number(e.target.value))}><option value={30}>30 seconds</option><option value={60}>1 minute</option><option value={120}>2 minutes</option><option value={300}>5 minutes</option></select></label>
        <AiModelSelector value={model} onChange={setModel} />
      </div>
      {error && <p className="fockis-ai-error">{error}</p>}
      <AiGenerationProgress job={job} />
    </div>
  );
}
