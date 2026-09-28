import type { VideoScene } from "../../types/aiVideoTypes";

export default function VideoSceneCard({ scene }: { scene: VideoScene }) {
  return (
    <article className="fockis-video-scene">
      <div className="fockis-video-scene__number">{scene.index}</div>
      {scene.thumbnailUrl ? <img src={scene.thumbnailUrl} alt="" /> : <div className="fockis-video-scene__placeholder">Scene {scene.index}</div>}
      <div>
        <strong>{scene.title}</strong>
        <p>{scene.description}</p>
        <small>{scene.durationSeconds}s · {scene.status || "pending"}</small>
      </div>
    </article>
  );
}
