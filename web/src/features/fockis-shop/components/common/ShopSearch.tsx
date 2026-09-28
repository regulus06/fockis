import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShopSearchProps {
  initialValue?: string;
  placeholder?: string;
  variant?: 'hero' | 'compact';
}

export function ShopSearch({ initialValue = '', placeholder = 'Search products, stores, brands, categories…', variant = 'hero' }: ShopSearchProps) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    navigate(q ? `/shop/search?q=${encodeURIComponent(q)}` : '/shop/search');
  }

  return (
    <form className={variant === 'hero' ? 'hero-search' : 'hero-search hero-search-compact'} onSubmit={handleSubmit} role="search">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
      />
      <button type="submit">Search</button>
    </form>
  );
}
