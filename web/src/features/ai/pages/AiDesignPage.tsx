import AiDesignGenerator from "../components/design/AiDesignGenerator";
import "../styles/ai.scss";
export default function AiDesignPage() { return <main className="fockis-ai-page"><header className="fockis-ai-page__header"><a href="/create/ai">← AI Studio</a></header><section className="fockis-ai-page__hero"><span className="fockis-ai-eyebrow">AI DESIGN</span><h1>Generate designs for Fockis Create.</h1></section><AiDesignGenerator /></main>; }
