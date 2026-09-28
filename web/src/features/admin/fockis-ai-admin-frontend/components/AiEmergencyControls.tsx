interface Props {
  online: boolean;
  onDisable: () => void;
}

export default function AiEmergencyControls({ online, onDisable }: Props) {
  return (
    <section className="ai-emergency">
      <div>
        <span className={`ai-live-dot ${online ? "online" : "offline"}`} />
        <div>
          <strong>AI system {online ? "online" : "disabled"}</strong>
          <p>Emergency controls affect AI services globally.</p>
        </div>
      </div>
      <button className="ai-btn ai-btn-danger" onClick={onDisable}>
        Disable all AI
      </button>
    </section>
  );
}
