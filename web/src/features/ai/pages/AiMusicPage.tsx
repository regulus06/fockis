import AiMusicGenerator from "../components/music/AiMusicGenerator";
import "../styles/ai.scss";
export default function AiMusicPage() { return <main className="fockis-ai-page"><header className="fockis-ai-page__header"><a href="/create/ai">← AI Studio</a></header><section className="fockis-ai-page__hero"><span className="fockis-ai-eyebrow">AI MUSIC</span><h1>Create original music.</h1></section><AiMusicGenerator /></main>; }
