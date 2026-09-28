interface Props {
  value: string;
  onChange: (
    value: string,
  ) => void;
}

export default function AdPlacementSelector({
  value,
  onChange,
}: Props) {
  return (
    <div className="fk-form-field">
      <label>
        Ad placement
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
      >
        <option value="FEED">
          Feed
        </option>

        <option value="FEED_VIDEO_END">
          Video End Card
        </option>

        <option value="STORY">
          Stories
        </option>

        <option value="SIDEBAR">
          Sidebar
        </option>

        <option value="MARKETPLACE">
          Marketplace
        </option>
      </select>
    </div>
  );
}