import { KeyboardEvent, useState } from 'react';
import { useAcademyToast } from '../../lib/academyToastStore';

export default function LibrarySearch() {
  const [value, setValue] = useState('');
  const showToast = useAcademyToast((s) => s.showToast);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && value.trim()) {
      showToast(`Searching library for "${value}"...`);
    }
  }

  return (
    <div className="field" style={{ maxWidth: 520, marginBottom: 36 }}>
      <label>Search the Library</label>
      <input
        type="text"
        placeholder="Search e-books, journals, databases..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
