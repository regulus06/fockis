/*
 * ============================================================================
 * FOCKIS FRIEND SEARCH
 * ============================================================================
 */

import React, {
  useRef,
  useState,
} from "react";

import {
  Search,
} from "lucide-react";

import {
  fockisFriendsApi,
} from "../service/fockisFriendsApi";

import "../../../../styles/FockisFriendSearch.scss";

/*
 * ============================================================================
 * TYPES
 * ============================================================================
 */

interface SearchResult {
  id: string;
  fullName: string;
  username?: string;
  avatar?: string;
}

/*
 * ============================================================================
 * NORMALIZE SEARCH RESULT
 * ============================================================================
 */

function normalize(
  item: any,
): SearchResult | null {
  const id =
    item?._id ||
    item?.id;

  if (!id) {
    return null;
  }

  const fullName =
    [
      item?.firstName,
      item?.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    item?.fullName ||
    item?.username ||
    "User";

  return {
    id: String(id),

    fullName,

    username:
      item?.username
        ? String(item.username)
        : undefined,

    avatar:
      item?.avatar ||
      item?.profileImage ||
      undefined,
  };
}

/*
 * ============================================================================
 * COMPONENT
 * ============================================================================
 */

export default function FockisFriendSearch() {
  const [text, setText] =
    useState("");

  const [results, setResults] =
    useState<SearchResult[]>([]);

  const [loading, setLoading] =
    useState(false);

  const debounceRef =
    useRef<
      ReturnType<typeof setTimeout> | null
    >(null);

  /*
   * ==========================================================================
   * HANDLE SEARCH INPUT
   * ==========================================================================
   */

  function handleChange(
    value: string,
  ): void {
    setText(value);

    if (debounceRef.current) {
      clearTimeout(
        debounceRef.current,
      );

      debounceRef.current = null;
    }

    if (
      value.trim() === ""
    ) {
      setResults([]);
      setLoading(false);
      return;
    }

    debounceRef.current =
      setTimeout(
        () => {
          void runSearch(value);
        },
        300,
      );
  }

  /*
   * ==========================================================================
   * SEARCH USERS
   * ==========================================================================
   */

  async function runSearch(
    value: string,
  ): Promise<void> {
    const searchValue =
      value.trim();

    if (!searchValue) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);

      const response =
        await fockisFriendsApi.searchUsers(
          searchValue,
        );

      const items =
        Array.isArray(response)
          ? response
          : (response as any)?.users ||
            (response as any)?.items ||
            [];

      const normalized: SearchResult[] =
        [];

      for (
        let i = 0;
        i < items.length;
        i += 1
      ) {
        const normalizedItem =
          normalize(items[i]);

        if (
          normalizedItem !== null
        ) {
          normalized.push(
            normalizedItem,
          );
        }
      }

      setResults(normalized);
    } catch (err) {
      console.error(
        "Fockis friend search failed:",
        err,
      );

      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * ==========================================================================
   * RESULT ROW
   * ==========================================================================
   */

  function renderResultRow(
    result: SearchResult,
  ): React.ReactNode {
    const profileUrl =
      `/profile/${encodeURIComponent(
        result.id,
      )}`;

    return (
      <a
        key={result.id}
        href={profileUrl}
        className="fk-friend-search__row"
      >
        <div className="fk-friend-search__avatar">
          {result.avatar ? (
            <img
              src={result.avatar}
              alt={result.fullName}
            />
          ) : (
            <span>
              {result.fullName
                .charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>

        <div className="fk-friend-search__info">
          <h4>
            {result.fullName}
          </h4>

          {result.username ? (
            <span>
              @{result.username}
            </span>
          ) : null}
        </div>
      </a>
    );
  }

  /*
   * ==========================================================================
   * UI CONDITIONS
   * ==========================================================================
   */

  const trimmedText =
    text.trim();

  const showEmptyMessage =
    trimmedText !== "" &&
    !loading &&
    results.length === 0;

  const showResults =
    trimmedText !== "" &&
    results.length > 0;

  /*
   * ==========================================================================
   * RENDER
   * ==========================================================================
   */

  return (
    <div className="fk-friend-search">
      <Search
        size={17}
        className="fk-friend-search__icon"
      />

      <input
        value={text}
        placeholder="Search people..."
        onChange={(event) =>
          handleChange(
            event.target.value,
          )
        }
        type="search"
        autoComplete="off"
        aria-label="Search people"
      />

      {loading && (
        <div className="fk-friend-search__loading">
          Searching...
        </div>
      )}

      {showResults ? (
        <div className="fk-friend-search__results">
          {results.map(
            renderResultRow,
          )}
        </div>
      ) : null}

      {showEmptyMessage ? (
        <div className="fk-friend-search__results">
          <p className="fk-friend-search__empty">
            No people found.
          </p>
        </div>
      ) : null}
    </div>
  );
}
