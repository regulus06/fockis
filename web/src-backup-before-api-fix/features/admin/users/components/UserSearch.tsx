import React, { useEffect, useState } from "react";

interface UserSearchProps {
value?: string;
onChange: (value: string) => void;
placeholder?: string;
disabled?: boolean;
onSearch?: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({
value = "",
onChange,
placeholder = "Search by Fockis ID, username, email, name, or phone",
disabled = false,
onSearch,
}) => {
const [search, setSearch] = useState(value);

useEffect(() => {
setSearch(value);
}, [value]);

const updateSearch = (nextValue: string) => {
setSearch(nextValue);
onChange(nextValue);
};

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
event.preventDefault();
onSearch?.();
};

const clearSearch = () => {
setSearch("");
onChange("");
onSearch?.();
};

return (
<form className="admin-users-search" onSubmit={handleSubmit} role="search" aria-label="Search users" >
<div className="admin-users-search__field">
<span className="admin-users-search__icon" aria-hidden="true" >
⌕
</span>

    <input
      type="search"
      value={search}
      onChange={(event) => updateSearch(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete="off"
      spellCheck={false}
      aria-label="Search users"
    />

    {search.trim() && (
      <button
        type="button"
        className="admin-users-search__clear"
        onClick={clearSearch}
        disabled={disabled}
        aria-label="Clear user search"
        title="Clear search"
      >
        ×
      </button>
    )}
  </div>

  <button
    type="submit"
    className="admin-users-search__button"
    disabled={disabled}
  >
    Search
  </button>
</form>

);
};

export default UserSearch;