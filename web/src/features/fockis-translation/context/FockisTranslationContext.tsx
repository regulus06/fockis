import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_FOCKIS_LANGUAGE,
  FOCKIS_LANGUAGES,
} from "../constants/languages";

import {
  getFockisStoredLanguage,
  setFockisStoredLanguage,
  useFockisLanguage,
} from "../hooks/useFockisLanguage";

import {
  normalizeLanguageCode,
  getLanguageDisplayName,
} from "../utils/languageUtils";

import {
  clearTranslationCache,
  getCachedTranslation,
} from "../utils/translationCache";

import {
  detectContentLanguage,
  translateContent,
} from "../services/translationApi";

import type {
  TranslationLanguageCode,
  TranslationResponse,
} from "../types/translation.types";

// ============================================================================
// CONSTANTS
// ============================================================================

const LANGUAGE_CHANGE_EVENT =
  "fockis-translation-language-change";

const AUTO_TRANSLATE_STORAGE_KEY =
  "fockis_translation_auto_translate";

const AUTO_TRANSLATE_DEFAULT = true;

// ============================================================================
// TYPES
// ============================================================================

export interface TranslateTextOptions {
  sourceLanguage?: TranslationLanguageCode | "auto";
  targetLanguage?: TranslationLanguageCode;
  force?: boolean;
  signal?: AbortSignal;
}

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
  provider?: string;
}

export interface FockisTranslationContextValue {
  /**
   * Current global translation target language.
   */
  language: TranslationLanguageCode;

  /**
   * Alias for language.
   */
  targetLanguage: TranslationLanguageCode;

  /**
   * Human-readable name of the current target language.
   */
  languageName: string;

  /**
   * Whether user-generated content should automatically
   * translate when the source language differs.
   */
  autoTranslateContent: boolean;

  /**
   * Global supported Fockis languages.
   */
  supportedLanguages: typeof FOCKIS_LANGUAGES;

  /**
   * Change the global translation language.
   */
  setLanguage: (
    language: TranslationLanguageCode,
  ) => void;

  /**
   * Enable/disable automatic content translation.
   */
  setAutoTranslateContent: (
    enabled: boolean,
  ) => void;

  /**
   * Translate arbitrary user-generated content.
   */
  translateText: (
    text: string,
    options?: TranslateTextOptions,
  ) => Promise<TranslationResult>;

  /**
   * Detect the language of arbitrary content.
   */
  detectLanguage: (
    text: string,
    signal?: AbortSignal,
  ) => Promise<string>;

  /**
   * Read a translation directly from the browser cache.
   */
  getCachedText: (
    text: string,
    sourceLanguage: TranslationLanguageCode,
    targetLanguage?: TranslationLanguageCode,
  ) => string | null;

  /**
   * Clear all browser-side translation cache entries.
   */
  clearCache: () => void;

  /**
   * Determine whether translation is required.
   */
  isTranslationNeeded: (
    sourceLanguage?: TranslationLanguageCode | "auto",
  ) => boolean;
}

interface FockisTranslationProviderProps {
  children: ReactNode;

  /**
   * Optional initial target language.
   *
   * If omitted, the existing Fockis language preference
   * or browser language will be used.
   */
  initialLanguage?: TranslationLanguageCode;

  /**
   * Controls the initial automatic content translation
   * preference.
   */
  defaultAutoTranslate?: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const FockisTranslationContext =
  createContext<FockisTranslationContextValue | null>(
    null,
  );

// ============================================================================
// LOCAL STORAGE
// ============================================================================

function readStoredAutoTranslate(
  fallback: boolean,
): boolean {
  try {
    const stored = localStorage.getItem(
      AUTO_TRANSLATE_STORAGE_KEY,
    );

    if (stored === null) {
      return fallback;
    }

    return stored === "true";
  } catch {
    return fallback;
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

export function FockisTranslationProvider({
  children,
  initialLanguage,
  defaultAutoTranslate = AUTO_TRANSLATE_DEFAULT,
}: FockisTranslationProviderProps) {
  /**
   * IMPORTANT:
   *
   * useFockisLanguage() returns an object:
   *
   * {
   *   language,
   *   setLanguage
   * }
   *
   * It does NOT return the language string directly.
   */
  const fockisLanguage = useFockisLanguage();

  const hookLanguage =
    fockisLanguage?.language;

  // --------------------------------------------------------------------------
  // GLOBAL LANGUAGE
  // --------------------------------------------------------------------------

  const [language, setLanguageState] =
    useState<TranslationLanguageCode>(() => {
      const initial =
        initialLanguage ||
        getFockisStoredLanguage() ||
        hookLanguage ||
        DEFAULT_FOCKIS_LANGUAGE;

      return normalizeLanguageCode(initial);
    });

  // --------------------------------------------------------------------------
  // AUTO TRANSLATION
  // --------------------------------------------------------------------------

  const [
    autoTranslateContent,
    setAutoTranslateContentState,
  ] = useState<boolean>(() =>
    readStoredAutoTranslate(
      defaultAutoTranslate,
    ),
  );

  // --------------------------------------------------------------------------
  // SYNCHRONIZE WITH EXISTING FOCKIS LANGUAGE HOOK
  // --------------------------------------------------------------------------

  useEffect(() => {
    const normalized = normalizeLanguageCode(
      hookLanguage ||
        DEFAULT_FOCKIS_LANGUAGE,
    );

    setLanguageState((current) => {
      if (
        current.toLowerCase() ===
        normalized.toLowerCase()
      ) {
        return current;
      }

      return normalized;
    });
  }, [hookLanguage]);

  // --------------------------------------------------------------------------
  // LISTEN FOR GLOBAL LANGUAGE EVENTS
  // --------------------------------------------------------------------------

  useEffect(() => {
    const handleLanguageChange = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<{
          language?: string;
        }>;

      const nextLanguage =
        customEvent.detail?.language;

      if (!nextLanguage) {
        return;
      }

      const normalized =
        normalizeLanguageCode(
          nextLanguage,
        );

      if (!normalized) {
        return;
      }

      setLanguageState(normalized);
    };

    window.addEventListener(
      LANGUAGE_CHANGE_EVENT,
      handleLanguageChange,
    );

    return () => {
      window.removeEventListener(
        LANGUAGE_CHANGE_EVENT,
        handleLanguageChange,
      );
    };
  }, []);

  // --------------------------------------------------------------------------
  // SET GLOBAL LANGUAGE
  // --------------------------------------------------------------------------

  const setLanguage = useCallback(
    (nextLanguage: TranslationLanguageCode) => {
      const normalized =
        normalizeLanguageCode(
          nextLanguage,
        );

      if (!normalized) {
        return;
      }

      // Update provider immediately.
      setLanguageState(normalized);

      // Keep the existing language system synchronized.
      setFockisStoredLanguage(
        normalized,
      );

      /**
       * Also update the existing useFockisLanguage hook
       * when its setter is available.
       */
      if (
        typeof fockisLanguage?.setLanguage ===
        "function"
      ) {
        fockisLanguage.setLanguage(
          normalized,
        );
      }

      /**
       * Notify the rest of Fockis.
       */
      window.dispatchEvent(
        new CustomEvent(
          LANGUAGE_CHANGE_EVENT,
          {
            detail: {
              language: normalized,
            },
          },
        ),
      );
    },
    [fockisLanguage],
  );

  // --------------------------------------------------------------------------
  // SET AUTO TRANSLATION
  // --------------------------------------------------------------------------

  const setAutoTranslateContent =
    useCallback(
      (enabled: boolean) => {
        setAutoTranslateContentState(
          enabled,
        );

        try {
          localStorage.setItem(
            AUTO_TRANSLATE_STORAGE_KEY,
            String(enabled),
          );
        } catch {
          // Ignore localStorage failures.
        }
      },
      [],
    );

  // --------------------------------------------------------------------------
  // TRANSLATE TEXT
  // --------------------------------------------------------------------------

  const translateText = useCallback(
    async (
      text: string,
      options: TranslateTextOptions = {},
    ): Promise<TranslationResult> => {
      const trimmedText =
        text.trim();

      if (!trimmedText) {
        throw new Error(
          "There is no content to translate.",
        );
      }

      const targetLanguage =
        normalizeLanguageCode(
          options.targetLanguage ||
            language,
        );

      const sourceLanguage =
        options.sourceLanguage &&
        options.sourceLanguage !== "auto"
          ? normalizeLanguageCode(
              options.sourceLanguage,
            )
          : "auto";

      if (!targetLanguage) {
        throw new Error(
          "A target language is required.",
        );
      }

      // ----------------------------------------------------------------------
      // SAME LANGUAGE
      // ----------------------------------------------------------------------

      if (
        sourceLanguage !== "auto" &&
        sourceLanguage.toLowerCase() ===
          targetLanguage.toLowerCase()
      ) {
        return {
          translatedText: text,
          sourceLanguage,
          targetLanguage,
          cached: true,
          provider: "openai",
        };
      }

      // ----------------------------------------------------------------------
      // FRONTEND CACHE
      // ----------------------------------------------------------------------

      if (
        sourceLanguage !== "auto" &&
        !options.force
      ) {
        const cached =
          getCachedTranslation(
            trimmedText,
            sourceLanguage,
            targetLanguage,
          );

        if (cached) {
          return {
            translatedText:
              cached.translatedText,
            sourceLanguage:
              cached.sourceLanguage,
            targetLanguage:
              cached.targetLanguage,
            cached: true,
          };
        }
      }

      // ----------------------------------------------------------------------
      // API REQUEST
      // ----------------------------------------------------------------------

      const result: TranslationResponse =
        await translateContent(
          {
            text: trimmedText,
            sourceLanguage,
            targetLanguage,
          },
          options.signal,
        );

      return {
        translatedText:
          result.translatedText,

        sourceLanguage:
          result.sourceLanguage ||
          (sourceLanguage !== "auto"
            ? sourceLanguage
            : "unknown"),

        targetLanguage:
          result.targetLanguage ||
          targetLanguage,

        cached: Boolean(
          result.cached,
        ),

        provider:
          result.provider,
      };
    },
    [language],
  );

  // --------------------------------------------------------------------------
  // DETECT LANGUAGE
  // --------------------------------------------------------------------------

  const detectLanguage =
    useCallback(
      async (
        text: string,
        signal?: AbortSignal,
      ): Promise<string> => {
        return detectContentLanguage(
          text,
          signal,
        );
      },
      [],
    );

  // --------------------------------------------------------------------------
  // GET CACHED TRANSLATION
  // --------------------------------------------------------------------------

  const getCachedText =
    useCallback(
      (
        text: string,
        sourceLanguage: TranslationLanguageCode,
        targetLanguage?: TranslationLanguageCode,
      ): string | null => {
        const target =
          targetLanguage ||
          language;

        const cached =
          getCachedTranslation(
            text,
            normalizeLanguageCode(
              sourceLanguage,
            ),
            normalizeLanguageCode(
              target,
            ),
          );

        return (
          cached?.translatedText ||
          null
        );
      },
      [language],
    );

  // --------------------------------------------------------------------------
  // CLEAR CACHE
  // --------------------------------------------------------------------------

  const clearCache = useCallback(
    () => {
      clearTranslationCache();
    },
    [],
  );

  // --------------------------------------------------------------------------
  // CHECK IF TRANSLATION IS NEEDED
  // --------------------------------------------------------------------------

  const isTranslationNeeded =
    useCallback(
      (
        sourceLanguage?:
          | TranslationLanguageCode
          | "auto",
      ): boolean => {
        /**
         * Unknown source language means we need to
         * allow detection/translation.
         */
        if (
          !sourceLanguage ||
          sourceLanguage === "auto"
        ) {
          return true;
        }

        return (
          normalizeLanguageCode(
            sourceLanguage,
          ).toLowerCase() !==
          normalizeLanguageCode(
            language,
          ).toLowerCase()
        );
      },
      [language],
    );

  // --------------------------------------------------------------------------
  // LANGUAGE DISPLAY NAME
  // --------------------------------------------------------------------------

  const languageName = useMemo(
    () =>
      getLanguageDisplayName(
        language,
        language,
      ),
    [language],
  );

  // --------------------------------------------------------------------------
  // CONTEXT VALUE
  // --------------------------------------------------------------------------

  const value =
    useMemo<FockisTranslationContextValue>(
      () => ({
        language,

        targetLanguage:
          language,

        languageName,

        autoTranslateContent,

        supportedLanguages:
          FOCKIS_LANGUAGES,

        setLanguage,

        setAutoTranslateContent,

        translateText,

        detectLanguage,

        getCachedText,

        clearCache,

        isTranslationNeeded,
      }),
      [
        language,
        languageName,
        autoTranslateContent,
        setLanguage,
        setAutoTranslateContent,
        translateText,
        detectLanguage,
        getCachedText,
        clearCache,
        isTranslationNeeded,
      ],
    );

  // --------------------------------------------------------------------------
  // PROVIDER
  // --------------------------------------------------------------------------

  return (
    <FockisTranslationContext.Provider
      value={value}
    >
      {children}
    </FockisTranslationContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useFockisTranslation(): FockisTranslationContextValue {
  const context = useContext(
    FockisTranslationContext,
  );

  if (!context) {
    throw new Error(
      "useFockisTranslation must be used inside FockisTranslationProvider.",
    );
  }

  return context;
}

export default FockisTranslationProvider;