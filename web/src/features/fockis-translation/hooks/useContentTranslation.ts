import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  translateContent,
} from "../services/translationApi";

import type {
  TranslationLanguageCode,
} from "../types/translation.types";

import {
  getCachedTranslation,
} from "../utils/translationCache";

import {
  areLanguagesEqual,
  normalizeLanguageCode,
} from "../utils/languageUtils";

import {
  useFockisLanguage,
} from "./useFockisLanguage";

// ============================================================================
// TYPES
// ============================================================================

interface UseContentTranslationOptions {
  targetLanguage?: TranslationLanguageCode;
  sourceLanguage?: TranslationLanguageCode;
  autoTranslate?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useContentTranslation(
  text: string,
  options: UseContentTranslationOptions = {},
) {
  const {
    language: currentFockisLanguage,
  } = useFockisLanguage();

  // --------------------------------------------------------------------------
  // LANGUAGE
  // --------------------------------------------------------------------------

  const targetLanguage = normalizeLanguageCode(
    options.targetLanguage ||
      currentFockisLanguage,
  );

  const sourceLanguage = options.sourceLanguage
    ? normalizeLanguageCode(
        options.sourceLanguage,
      )
    : "auto";

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------

  const [translatedText, setTranslatedText] =
    useState<string | null>(null);

  const [
    detectedSourceLanguage,
    setDetectedSourceLanguage,
  ] = useState<string | null>(
    sourceLanguage !== "auto"
      ? sourceLanguage
      : null,
  );

  const [isTranslating, setIsTranslating] =
    useState(false);

  const [isTranslated, setIsTranslated] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // --------------------------------------------------------------------------
  // REFS
  // --------------------------------------------------------------------------

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const mountedRef =
    useRef(true);

  // --------------------------------------------------------------------------
  // MOUNT / UNMOUNT
  // --------------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  // --------------------------------------------------------------------------
  // RESET WHEN CONTENT OR LANGUAGE CHANGES
  // --------------------------------------------------------------------------

  useEffect(() => {
    abortControllerRef.current?.abort();

    setTranslatedText(null);
    setIsTranslated(false);
    setError(null);

    if (sourceLanguage !== "auto") {
      setDetectedSourceLanguage(
        sourceLanguage,
      );
    } else {
      setDetectedSourceLanguage(null);
    }
  }, [
    text,
    sourceLanguage,
    targetLanguage,
  ]);

  // --------------------------------------------------------------------------
  // TRANSLATE
  // --------------------------------------------------------------------------

  const translate = useCallback(async () => {
    const cleanText = text.trim();

    if (!cleanText) {
      setError(
        "There is no text to translate.",
      );

      return null;
    }

    if (!mountedRef.current) {
      return null;
    }

    setError(null);

    // ------------------------------------------------------------------------
    // SAME LANGUAGE
    // ------------------------------------------------------------------------

    if (
      sourceLanguage !== "auto" &&
      areLanguagesEqual(
        sourceLanguage,
        targetLanguage,
      )
    ) {
      setTranslatedText(cleanText);

      setDetectedSourceLanguage(
        sourceLanguage,
      );

      setIsTranslated(true);
      setIsTranslating(false);

      return {
        translatedText: cleanText,
        sourceLanguage,
        targetLanguage,
      };
    }

    // ------------------------------------------------------------------------
    // BROWSER CACHE
    // ------------------------------------------------------------------------

    if (sourceLanguage !== "auto") {
      const cached =
        getCachedTranslation(
          cleanText,
          sourceLanguage,
          targetLanguage,
        );

      if (cached) {
        setTranslatedText(
          cached.translatedText,
        );

        setDetectedSourceLanguage(
          cached.sourceLanguage,
        );

        setIsTranslated(true);
        setIsTranslating(false);

        return {
          translatedText:
            cached.translatedText,
          sourceLanguage:
            cached.sourceLanguage,
          targetLanguage,
        };
      }
    }

    // ------------------------------------------------------------------------
    // CANCEL PREVIOUS REQUEST
    // ------------------------------------------------------------------------

    abortControllerRef.current?.abort();

    const controller =
      new AbortController();

    abortControllerRef.current =
      controller;

    setIsTranslating(true);

    try {
      const result =
        await translateContent(
          {
            text: cleanText,
            targetLanguage,
            sourceLanguage,
          },
          controller.signal,
        );

      // ----------------------------------------------------------------------
      // COMPONENT UNMOUNTED
      // ----------------------------------------------------------------------

      if (!mountedRef.current) {
        return null;
      }

      // ----------------------------------------------------------------------
      // REQUEST WAS CANCELLED
      // ----------------------------------------------------------------------

      if (controller.signal.aborted) {
        return null;
      }

      // ----------------------------------------------------------------------
      // APPLY RESULT
      // ----------------------------------------------------------------------

      setTranslatedText(
        result.translatedText,
      );

      setDetectedSourceLanguage(
        result.sourceLanguage,
      );

      setIsTranslated(true);
      setError(null);

      return {
        translatedText:
          result.translatedText,

        sourceLanguage:
          result.sourceLanguage,

        targetLanguage:
          result.targetLanguage,
      };
    } catch (translationError) {
      // ----------------------------------------------------------------------
      // ABORT
      // ----------------------------------------------------------------------

      if (
        translationError instanceof
          DOMException &&
        translationError.name ===
          "AbortError"
      ) {
        return null;
      }

      if (
        translationError instanceof Error &&
        translationError.name ===
          "AbortError"
      ) {
        return null;
      }

      // ----------------------------------------------------------------------
      // COMPONENT UNMOUNTED
      // ----------------------------------------------------------------------

      if (!mountedRef.current) {
        return null;
      }

      // ----------------------------------------------------------------------
      // ERROR
      // ----------------------------------------------------------------------

      const message =
        translationError instanceof Error
          ? translationError.message
          : "Translation failed.";

      setError(message);
      setIsTranslated(false);
      setTranslatedText(null);

      return null;
    } finally {
      if (
        mountedRef.current &&
        abortControllerRef.current ===
          controller
      ) {
        setIsTranslating(false);
      }
    }
  }, [
    text,
    sourceLanguage,
    targetLanguage,
  ]);

  // --------------------------------------------------------------------------
  // SHOW ORIGINAL
  // --------------------------------------------------------------------------

  const showOriginal = useCallback(() => {
    abortControllerRef.current?.abort();

    setTranslatedText(null);
    setIsTranslated(false);
    setIsTranslating(false);
    setError(null);

    if (sourceLanguage !== "auto") {
      setDetectedSourceLanguage(
        sourceLanguage,
      );
    } else {
      setDetectedSourceLanguage(null);
    }
  }, [
    sourceLanguage,
  ]);

  // --------------------------------------------------------------------------
  // TOGGLE TRANSLATION
  // --------------------------------------------------------------------------

  const toggleTranslation =
    useCallback(async () => {
      if (isTranslated) {
        showOriginal();

        return null;
      }

      return translate();
    }, [
      isTranslated,
      showOriginal,
      translate,
    ]);

  // --------------------------------------------------------------------------
  // AUTOMATIC TRANSLATION
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!options.autoTranslate) {
      return;
    }

    void translate();
  }, [
    options.autoTranslate,
    translate,
  ]);

  // --------------------------------------------------------------------------
  // RETURN
  // --------------------------------------------------------------------------

  return {
    translatedText,

    detectedSourceLanguage,

    targetLanguage,

    sourceLanguage,

    isTranslating,

    isTranslated,

    error,

    translate,

    showOriginal,

    toggleTranslation,
  };
}