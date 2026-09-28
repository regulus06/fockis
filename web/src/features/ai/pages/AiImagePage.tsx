import AiImageGenerator from "../components/image/AiImageGenerator";
import ImageEditor from "../components/image/ImageEditor";
import BackgroundRemover from "../components/image/BackgroundRemover";
import "../styles/ai.scss";
export default function AiImagePage() { return <main className="fockis-ai-page"><header className="fockis-ai-page__header"><a href="/create/ai">← AI Studio</a></header><section className="fockis-ai-page__hero"><span className="fockis-ai-eyebrow">AI IMAGE</span><h1>Create and edit images.</h1></section><AiImageGenerator /><div className="fockis-ai-two-col"><ImageEditor /><BackgroundRemover /></div></main>; }
