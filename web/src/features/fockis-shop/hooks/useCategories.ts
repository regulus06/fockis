import { useEffect, useState } from 'react';
import type { Category } from '../types/category.types';
import { listCategories } from '../services/categoryApi';

export function useCategories(): { categories: Category[]; loading: boolean; error: string | null } {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCategories()
      .then((res) => {
        if (!cancelled) setCategories(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load categories');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}
