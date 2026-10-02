import { useId } from "react";

import "../../styles/components/lobby.scss";

export interface DeviceSelectOption {
  deviceId: string;
  label: string;
}

export interface DeviceSelectProps {
  label: string;
  options: DeviceSelectOption[];
  emptyLabel: string;
  /**
   * Currently selected device id. Pass an empty string (or omit) to mean
   * "system default".
   */
  value?: string;
  onChange?: (deviceId: string) => void;
  disabled?: boolean;
}

export function DeviceSelect({
  label,
  options,
  emptyLabel,
  value,
  onChange,
  disabled,
}: DeviceSelectProps) {
  const id = useId();
  const hasOptions = options.length > 0;

  return (
    <div className="fm-device-select">
      <label className="fm-device-select__label" htmlFor={id}>
        {label}
      </label>

      <select
        id={id}
        className="fm-select"
        disabled={disabled || !hasOptions}
        value={hasOptions ? value ?? "" : ""}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label={label}
      >
        {hasOptions ? (
          options.map((option) => (
            <option key={option.deviceId} value={option.deviceId}>
              {option.label}
            </option>
          ))
        ) : (
          <option value="">{emptyLabel}</option>
        )}
      </select>
    </div>
  );
}

export default DeviceSelect;