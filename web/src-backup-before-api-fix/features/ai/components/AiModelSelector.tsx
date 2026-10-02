import type { AiModel } from "../types/aiTypes";

const defaultModels: AiModel[] = [
  { id: "auto", name: "Auto", description: "Choose the best available model." },
  { id: "standard", name: "Standard", description: "Balanced quality and speed." },
  { id: "quality", name: "High Quality", description: "Prioritize output quality." },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  models?: AiModel[];
}

export default function AiModelSelector({ value, onChange, models = defaultModels }: Props) {
  return (
    <label className="fockis-ai-field">
      <span>AI model</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </select>
    </label>
  );
}
