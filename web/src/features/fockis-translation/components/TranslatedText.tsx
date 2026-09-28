import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import {
  getLanguageDisplayName,
} from "../utils/languageUtils";

import {
  useFockisTranslation,
} from "../context/FockisTranslationContext";

import "../styles/TranslatedText.scss";

export interface TranslatedTextProps
  extends Omit<
    HTMLAttributes<HTMLSpanElement>,
    "children"
  > {
  /**
   * Original content.
   */
  text: string;

  /**
   * Known source language.
   * Leave undefined/"auto" to let the backend detect it.
   */
  sourceLanguage?: string;

  /**
   * Override the global Fockis target language.
   */
  targetLanguage?: string;

  /**
   * Automatically translate when the component
   * is rendered and languages differ.
   *
   * Defaults to the global autoTranslateContent setting.
   */
  autoTranslate?: boolean;

  /**
   * Show a small Translate / Show original control.
   */
  showControls?: boolean;

  /**
   * Show "Translated from Haitian Creole" information.
   */
  showSourceLanguage?: boolean;

  /**
   * Render custom loading content.
   */
  loadingContent?: ReactNode;

  /**
   * Render custom error content.
   */
  errorContent?: ReactNode;

  /**
   * Callback after successful translation.
   */
  onTranslated?: (
    translatedText: string,
    sourceLanguage: string,
  ) => void;

  /**
   * If true, the component starts by showing the
   * translated version when possible.
   */
  initiallyTranslated?: boolean;
}

export function TranslatedText({
  text,
  sourceLanguage = "auto",
  targetLanguage,
  autoTranslate,
  showControls = true,
  showSourceLanguage = false,
  loadingContent = "Translating...",
  errorContent,
  onTranslated,
  initiallyTranslated = false,
  className,
  ...spanProps
}: TranslatedTextProps) {
  const {
    language,
    languageName,
    autoTranslateContent,
    translateText,
    detectLanguage,
    isTranslationNeeded,
  } = useFockisTranslation();

  const effectiveTargetLanguage =
    targetLanguage || language;

  const shouldAutoTranslate =
    autoTranslate ??
    autoTranslateContent;

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
    useState(initiallyTranslated);

  const [error, setError] =
    useState<string | null>(null);

  const mountedRef = useRef(true);

  const requestIdRef = useRef(0);

  const controllerRef =
    useRef<AbortController | null>(null);

  const originalText = useMemo(
    () => text ?? "",
    [text],
  );

  const translationNeeded = useMemo(
    () =>
      isTranslationNeeded(
        sourceLanguage === "auto"
          ? undefined
          : sourceLanguage,
      ),
    [
      sourceLanguage,
      effectiveTargetLanguage,
      isTranslationNeeded,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      controllerRef.current?.abort();
    };
  }, []);

  /**
   * Reset the translated state whenever the underlying
   * content or target language changes.
   */
  useEffect(() => {
    controllerRef.current?.abort();

    setTranslatedText(null);
    setError(null);

    setDetectedSourceLanguage(
      sourceLanguage !== "auto"
        ? sourceLanguage
        : null,
    );

    setIsTranslated(
      initiallyTranslated &&
        translationNeeded,
    );
  }, [
    originalText,
    sourceLanguage,
    effectiveTargetLanguage,
    initiallyTranslated,
    translationNeeded,
  ]);

  const translate = useCallback(async () => {
    const trimmedText =
      originalText.trim();

    if (!trimmedText) {
      return;
    }

    if (!translationNeeded) {
      setTranslatedText(
        originalText,
      );

      setDetectedSourceLanguage(
        sourceLanguage !== "auto"
          ? sourceLanguage
          : effectiveTargetLanguage,
      );

      setIsTranslated(false);
      setError(null);

      return;
    }

    controllerRef.current?.abort();

    const controller =
      new AbortController();

    controllerRef.current =
      controller;

    const requestId =
      ++requestIdRef.current;

    setIsTranslating(true);
    setError(null);

    try {
      /**
       * If the source language is unknown,
       * the translation endpoint can detect it.
       */
      const result =
        await translateText(
          trimmedText,
          {
            sourceLanguage:
              sourceLanguage || "auto",
            targetLanguage:
              effectiveTargetLanguage,
            signal:
              controller.signal,
          },
        );

      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        requestId !==
          requestIdRef.current
      ) {
        return;
      }

      setTranslatedText(
        result.translatedText,
      );

      setDetectedSourceLanguage(
        result.sourceLanguage,
      );

      setIsTranslated(true);

      onTranslated?.(
        result.translatedText,
        result.sourceLanguage,
      );
    } catch (translationError) {
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        requestId !==
          requestIdRef.current
      ) {
        return;
      }

      const message =
        translationError instanceof Error
          ? translationError.message
          : "Translation failed.";

      setError(message);
      setIsTranslated(false);
    } finally {
      if (
        mountedRef.current &&
        requestId ===
          requestIdRef.current
      ) {
        setIsTranslating(false);
      }
    }
  }, [
    originalText,
    translationNeeded,
    sourceLanguage,
    effectiveTargetLanguage,
    translateText,
    onTranslated,
  ]);

  const detectSourceLanguage =
    useCallback(async () => {
      if (
        sourceLanguage !== "auto"
      ) {
        return sourceLanguage;
      }

      if (!originalText.trim()) {
        return null;
      }

      try {
        const detected =
          await detectLanguage(
            originalText,
          );

        if (mountedRef.current) {
          setDetectedSourceLanguage(
            detected,
          );
        }

        return detected;
      } catch {
        return null;
      }
    }, [
      sourceLanguage,
      originalText,
      detectLanguage,
    ]);

  const showOriginal = useCallback(() => {
    controllerRef.current?.abort();

    requestIdRef.current += 1;

    setIsTranslating(false);
    setIsTranslated(false);
    setError(null);
  }, []);

  const toggleTranslation =
    useCallback(() => {
      if (isTranslated) {
        showOriginal();
        return;
      }

      void translate();
    }, [
      isTranslated,
      showOriginal,
      translate,
    ]);

  /**
   * Automatically translate when the global setting
   * says content should be translated.
   */
  useEffect(() => {
    if (
      !shouldAutoTranslate ||
      !translationNeeded ||
      !originalText.trim() ||
      isTranslated ||
      isTranslating
    ) {
      return;
    }

    void translate();
  }, [
    shouldAutoTranslate,
    translationNeeded,
    originalText,
    isTranslated,
    isTranslating,
    translate,
  ]);

  /**
   * Detect the source language separately when requested
   * by the UI state. This is useful for showing:
   *
   * "Translated from Haitian Creole"
   */
  useEffect(() => {
    if (
      !showSourceLanguage ||
      sourceLanguage !== "auto" ||
      detectedSourceLanguage
    ) {
      return;
    }

    void detectSourceLanguage();
  }, [
    showSourceLanguage,
    sourceLanguage,
    detectedSourceLanguage,
    detectSourceLanguage,
  ]);

  if (!originalText) {
    return null;
  }

  const displayedText =
    isTranslated &&
    translatedText
      ? translatedText
      : originalText;

  const sourceLanguageName =
    detectedSourceLanguage
      ? getLanguageDisplayName(
          detectedSourceLanguage,
          language,
        )
      : null;

  const mergedClassName = [
    "fockis-translated-text",
    isTranslated
      ? "fockis-translated-text--translated"
      : "",
    isTranslating
      ? "fockis-translated-text--loading"
      : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      {...spanProps}
      className={mergedClassName}
    >
      <span className="fockis-translated-text__content">
        {isTranslating
          ? loadingContent
          : displayedText}
      </span>

      {showSourceLanguage &&
        isTranslated &&
        sourceLanguageName && (
          <span className="fockis-translated-text__source">
            Translated from{" "}
            {sourceLanguageName}
          </span>
        )}

      {error && (
        <span className="fockis-translated-text__error">
          {errorContent || error}
        </span>
      )}

      {showControls &&
        translationNeeded && (
          <button
            type="button"
            className="fockis-translated-text__button"
            onClick={
              toggleTranslation
            }
            disabled={isTranslating}
            aria-label={
              isTranslated
                ? "Show original text"
                : `Translate to ${languageName}`
            }
          >
            {isTranslated
              ? "Show original"
              : isTranslating
                ? "Translating..."
                : `Translate to ${languageName}`}
          </button>
        )}
    </span>
  );
}

export default TranslatedText;