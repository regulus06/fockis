
import { useState, type FormEvent } from 'react';

import styles from '../styles/CareersSearchBar.module.scss';

interface CareersSearchBarProps {
  onSearch: (params: {
    keyword: string;
    location: string;
    arrangement: string;
  }) => void;
  keywordPlaceholder?: string;
}

export function CareersSearchBar({
  onSearch,
  keywordPlaceholder = 'Job title, keyword, or company',
}: CareersSearchBarProps) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [arrangement, setArrangement] = useState('');

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSearch({
      keyword: keyword.trim(),
      location: location.trim(),
      arrangement,
    });
  };

  return (
    <form className={styles.panel} onSubmit={handleSearch}>
      <div className={styles.field}>
        <span className={styles.icon} aria-hidden="true">
          ⌕
        </span>

        <input
          type="search"
          placeholder={keywordPlaceholder}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          aria-label="Job title, keyword, or company"
        />
      </div>

      <div className={styles.field}>
        <span className={styles.icon} aria-hidden="true">
          📍
        </span>

        <input
          type="text"
          placeholder="City, state, or remote"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          aria-label="Job location"
        />
      </div>

      <div className={styles.field}>
        <span className={styles.icon} aria-hidden="true">
          ⇄
        </span>

        <select
          value={arrangement}
          onChange={(event) => setArrangement(event.target.value)}
          aria-label="Work arrangement"
        >
          <option value="">Any arrangement</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="on-site">On-site</option>
        </select>
      </div>

      <button type="submit" className={styles.searchBtn}>
        Search jobs
      </button>
    </form>
  );
}
