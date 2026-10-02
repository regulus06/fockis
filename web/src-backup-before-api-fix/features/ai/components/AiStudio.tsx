import { Link } from "react-router-dom";
import AiCreditsBadge from "./AiCreditsBadge";
import AiToolCard from "./AiToolCard";

const tools = [
  ["🎬", "AI Video", "Create scenes, storyboards, narration, captions, and long-form video projects.", "/create/ai/video", "VIDEO"],
  ["🎵", "AI Music", "Generate original music for videos, creators, playlists, and projects.", "/create/ai/music", "MUSIC"],
  ["🖼️", "AI Image", "Create images, edit existing images, remove backgrounds, and enhance visuals.", "/create/ai/image", "IMAGE"],
  ["🎨", "AI Design", "Generate flyers, logos, badges, posters, thumbnails, banners, and social graphics.", "/create/ai/design", "DESIGN"],
  ["🎙️", "AI Voice", "Create narration and voice audio from text.", "/create/ai/voice", "VOICE"],
];

export default function AiStudio() {
  return (
    <section className="fockis-ai-studio">
      <div className="fockis-ai-studio__hero">
        <div>
          <span className="fockis-ai-eyebrow">FOCKIS AI</span>
          <h2>Create more with AI.</h2>
          <p>One AI workspace for video, music, images, design, voice, and creative projects.</p>
        </div>
        <div className="fockis-ai-studio__actions">
          <AiCreditsBadge />
          <Link className="fockis-ai-primary-button" to="/create/ai">Open AI Studio</Link>
        </div>
      </div>

      <div className="fockis-ai-tools-grid">
        {tools.map(([icon, title, description, href, badge]) => (
          <AiToolCard key={href} icon={icon} title={title} description={description} href={href} badge={badge} />
        ))}
      </div>
    </section>
  );
}