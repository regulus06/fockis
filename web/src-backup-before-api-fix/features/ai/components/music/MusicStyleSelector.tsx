interface Props { value: string; onChange: (value: string) => void; }
const styles = ["Cinematic", "Afrobeats", "Hip-Hop", "R&B", "Pop", "Lo-fi", "Gospel", "Acoustic", "Electronic"];

export default function MusicStyleSelector({ value, onChange }: Props) {
  return (
    <label className="fockis-ai-field">
      <span>Music style</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {styles.map((style) => <option key={style}>{style}</option>)}
      </select>
    </label>
  );
}
