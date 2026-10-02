import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  DEFAULT_FOCKIS_LANGUAGE,
} from "../constants/languages";

import {
  getBrowserLanguage,
  normalizeLanguageCode,
} from "../utils/languageUtils";

const STORAGE_KEY =
  "fockis_translation_language";

const LANGUAGE_EVENT =
  "fockis-translation-language-change";

function readStoredLanguage(): string {
  if (typeof window === "undefined") {
    return DEFAULT_FOCKIS_LANGUAGE;
  }

  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (stored) {
      return normalizeLanguageCode(stored);
    }
  } catch {
    // Ignore storage errors.
  }

  return getBrowserLanguage();
}

export function useFockisLanguage() {
  const [language, setLanguageState] =
    useState<string>(
      readStoredLanguage,
    );

  useEffect(() => {
    const handleLanguageChange =
      (event: Event) => {
        const customEvent =
          event as CustomEvent<{
            language?: string;
          }>;

        const nextLanguage =
          customEvent.detail?.language;

        if (nextLanguage) {
          setLanguageState(
            normalizeLanguageCode(
              nextLanguage,
            ),
          );
          return;
        }

        setLanguageState(
          readStoredLanguage(),
        );
      };

    window.addEventListener(
      LANGUAGE_EVENT,
      handleLanguageChange,
    );

    return () => {
      window.removeEventListener(
        LANGUAGE_EVENT,
        handleLanguageChange,
      );
    };
  }, []);

  const setLanguage = useCallback(
    (nextLanguage: string) => {
      const normalized =
        normalizeLanguageCode(
          nextLanguage,
        );

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          normalized,
        );
      } catch {
        // Translation still works if storage is unavailable.
      }

      setLanguageState(normalized);

      window.dispatchEvent(
        new CustomEvent(
          LANGUAGE_EVENT,
          {
            detail: {
              language: normalized,
            },
          },
        ),
      );
    },
    [],
  );

  return {
    language,
    setLanguage,
  };
}

export function getFockisStoredLanguage(): string {
  return readStoredLanguage();
}

export function setFockisStoredLanguage(
  language: string,
): void {
  const normalized =
    normalizeLanguageCode(language);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      normalized,
    );
  } catch {
    // Ignore storage errors.
  }

  window.dispatchEvent(
    new CustomEvent(
      LANGUAGE_EVENT,
      {
        detail: {
          language: normalized,
        },
      },
    ),
  );
}