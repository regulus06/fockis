import { useEffect, useState } from 'react';
import { getContent, ContentItem } from './academyApi';

/**
 * Fetches an editorial content section (see academy/content/* on the
 * backend) and returns { items, loading, error } — used by every page that
 * renders a manager-editable list of cards (About's leadership, Admissions'
 * steps/FAQ, Career Center's service list, etc.) instead of a hardcoded
 * array in the component.
 */
export function useContentSection(section: string) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getContent(section)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        console.error(`Failed to load content section "${section}"`, err);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  return { items, loading, error };
}
