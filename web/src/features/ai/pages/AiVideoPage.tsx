import { Link } from "react-router-dom";
import AiVideoGenerator from "../components/video/AiVideoGenerator";
import "../styles/ai.scss";

export default function AiVideoPage() {
  return (
    <main className="fockis-ai-page">
      <header className="fockis-ai-page__header">
        <Link to="/create/ai">← AI Studio</Link>
      </header>

      <section className="fockis-ai-page__hero">
        <span className="fockis-ai-eyebrow">AI VIDEO</span>

        <h1>Create a video project.</h1>

        <p>
          Plan scenes first, then render the final video asynchronously.
        </p>
      </section>

      <AiVideoGenerator />
    </main>
  );
}