import { Search } from 'lucide-react';
import ui from '../../styles/EmployerShared.module.scss';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}

export function SearchInput({ value, onChange, placeholder, label }: SearchInputProps) {
  return (
    <label className={ui.search}>
      <span className={ui.srOnly}>{label ?? placeholder}</span>
      <Search size={16} aria-hidden="true" />
      <input
        className={ui.input}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default SearchInput;
