interface Props {
  value: number;
  onChange: (value: number) => void;
}
const options = [15, 30, 60, 120, 300, 600, 1200];

export default function VideoDurationSelector({ value, onChange }: Props) {
  return (
    <label className="fockis-ai-field">
      <span>Project duration</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((seconds) => (
          <option key={seconds} value={seconds}>
            {seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds / 60 === 1 ? "" : "s"}`}
          </option>
        ))}
      </select>
    </label>
  );
}
