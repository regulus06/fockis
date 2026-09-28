import React from "react";
import "./SearchInput.scss";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
}: SearchInputProps) => {

  return (
    <div className="search-input-wrapper">

      <span className="search-input-icon">
        🔍
      </span>

      <input
        type="text"
        className="search-input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />

      {value && (
        <button
          className="search-input-clear"
          onClick={() => onChange("")}
          type="button"
        >
          ×
        </button>
      )}

    </div>
  );
};

export default SearchInput;