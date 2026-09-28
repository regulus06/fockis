export default function VideoRenderProgress({ progress = 0 }: { progress?: number }) {
  return (
    <section className="fockis-ai-progress">
      <div className="fockis-ai-progress__header"><strong>Rendering final video</strong><span>{progress}%</span></div>
      <div className="fockis-ai-progress__bar"><span style={{ width: `${progress}%` }} /></div>
      <p>Scenes, voice, music, captions, and transitions are assembled into the final export.</p>
    </section>
  );
}
