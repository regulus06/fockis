interface Props { value: string; onChange: (value: string) => void; }
const voices = ["default", "narrator", "warm", "energetic", "calm"];
export default function VoiceSelector({ value, onChange }: Props) {
  return <label className="fockis-ai-field"><span>Voice</span><select value={value} onChange={(e) => onChange(e.target.value)}>{voices.map(v => <option key={v}>{v}</option>)}</select></label>;
}
