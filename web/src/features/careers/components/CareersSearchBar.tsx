import { useState } from 'react';
import styles from '../styles/CareersSearchBar.module.scss';

interface CareersSearchBarProps {
  onSearch: (params: { keyword: string; location: string; arrangement: string }) => void;
  keywordPlaceholder?: string;
}

export function CareersSearchBar({
  onSearch,
  keywordPlaceholder = 'Job title, keyword, or company',
}: CareersSearchBarProps) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [arrangement, setArrangement] = useState('');

  return (
    <div className={styles.panel}>
      <div className={styles.field}>
        <span className={styles.icon}>⌕</span>
        <input
          placeholder={keywordPlaceholder}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <span className={styles.icon}>📍</span>
        <input
          placeholder="City, state, or remote"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <span className={styles.icon}>⇄</span>
        <select value={arrangement} onChange={(e) => setArrangement(e.target.value)}>
          <option value="">Any arrangement</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="on-site">On-site</option>
        </select>
      </div>
      <button className={styles.searchBtn} onClick={() => onSearch({ keyword, location, arrangement })}>
        Search jobs
      </button>
    </div>
  );
}
