import type { VideoScene } from "../../types/aiVideoTypes";
import VideoSceneCard from "./VideoSceneCard";

export default function VideoStoryboard({ scenes }: { scenes: VideoScene[] }) {
  return (
    <section className="fockis-video-storyboard">
      <div className="fockis-ai-section-heading">
        <div><span>VIDEO PLAN</span><h2>Storyboard</h2></div>
      </div>
      <div className="fockis-video-storyboard__grid">
        {scenes.map((scene) => <VideoSceneCard key={scene.id} scene={scene} />)}
      </div>
    </section>
  );
}
