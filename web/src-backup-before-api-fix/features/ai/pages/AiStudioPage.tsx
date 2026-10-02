import { Link } from "react-router-dom";

import AiCreditsBadge from "../components/AiCreditsBadge";
import AiToolCard from "../components/AiToolCard";
import AiGenerationHistory from "../components/AiGenerationHistory";

import "../styles/ai.scss";

const tools = [
  [
    "🎬",
    "AI Video",
    "Long-form video projects with scenes, storyboard, voice, music, and captions.",
    "/create/ai/video",
  ],
  [
    "🎵",
    "AI Music",
    "Original music and sound ideas.",
    "/create/ai/music",
  ],
  [
    "🖼️",
    "AI Image",
    "Generate and edit visual assets.",
    "/create/ai/image",
  ],
  [
    "🎨",
    "AI Design",
    "Flyers, logos, posters, badges, banners, and thumbnails.",
    "/create/ai/design",
  ],
  [
    "🎙️",
    "AI Voice",
    "Narration and voice generation.",
    "/create/ai/voice",
  ],
];

export default function AiStudioPage() {
  return (
    <main className="fockis-ai-page">
      <header className="fockis-ai-page__header">
        <Link to="/create">
          ← Fockis Create
        </Link>

        <AiCreditsBadge />
      </header>

      <section className="fockis-ai-page__hero">
        <span className="fockis-ai-eyebrow">
          FOCKIS AI STUDIO
        </span>

        <h1>
          Turn ideas into finished creative work.
        </h1>

        <p>
          Generate video, music, images, designs, and voice
          from one workspace.
        </p>
      </section>

      {/* AI TOOLS */}
      <section className="fockis-ai-tools-grid">
        {tools.map(
          ([icon, title, description, href]) => (
            <AiToolCard
              key={href}
              icon={icon}
              title={title}
              description={description}
              href={href}
            />
          )
        )}
      </section>

      {/* VIDEO RESULTS */}
      <section className="fockis-ai-video-results">
        <div className="fockis-ai-video-results__content">
          <div>
            <span className="fockis-ai-eyebrow">
              AI VIDEO
            </span>

            <h2>
              Your Video Results
            </h2>

            <p>
              View your generated AI videos, open completed
              projects, download results, and continue editing.
            </p>
          </div>

          <Link
            to="/create/ai/history"
            className="fockis-ai-video-results__button"
          >
            🎬 View Video Results
          </Link>
        </div>
      </section>

      {/* GENERATION HISTORY */}
      <AiGenerationHistory />
    </main>
  );
}