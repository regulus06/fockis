import AiVoiceGenerator from "../components/voice/AiVoiceGenerator";
import "../styles/ai.scss";
export default function AiVoicePage() { return <main className="fockis-ai-page"><header className="fockis-ai-page__header"><a href="/create/ai">← AI Studio</a></header><section className="fockis-ai-page__hero"><span className="fockis-ai-eyebrow">AI VOICE</span><h1>Create narration from text.</h1></section><AiVoiceGenerator /></main>; }
