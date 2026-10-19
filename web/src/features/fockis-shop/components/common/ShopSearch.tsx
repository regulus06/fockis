import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ShopSearchProps {
  initialValue?: string;
  placeholder?: string;
  variant?: "hero" | "compact" | "header";
  id?: string;
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function ShopSearch({
  initialValue = "",
  placeholder = "Search Fockis Shop",
  variant = "hero",
  id,
}: ShopSearchProps) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();

  // Keep the field in sync when the query in the URL changes.
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const query = value.trim();
    navigate(
      query ? `/shop/search?q=${encodeURIComponent(query)}` : "/shop/search",
    );
  }

  return (
    <form
      className={`fk-search fk-search--${variant}`}
      onSubmit={handleSubmit}
      role="search"
    >
      <span className="fk-search__icon">
        <SearchIcon />
      </span>

      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Search products, stores and categories"
        enterKeyHint="search"
        autoComplete="off"
      />

      <button type="submit" aria-label="Search">
        <SearchIcon />
        <span className="fk-search__button-label">Search</span>
      </button>
    </form>
  );
}
