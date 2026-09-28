import type { VideoScene } from "../../types/aiVideoTypes";

export default function VideoTimeline({ scenes }: { scenes: VideoScene[] }) {
  return (
    <section className="fockis-video-timeline">
      <div className="fockis-ai-section-heading">
        <div><span>EDIT</span><h2>Timeline</h2></div>
      </div>
      <div className="fockis-video-timeline__track">
        {scenes.map((scene) => (
          <div key={scene.id} style={{ flex: Math.max(scene.durationSeconds, 1) }}>
            <span>#{scene.index}</span>
            <small>{scene.durationSeconds}s</small>
          </div>
        ))}
      </div>
    </section>
  );
}
