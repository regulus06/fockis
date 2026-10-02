import React from "react";

import {
  useContentTranslation,
} from "../hooks/useContentTranslation";

import {
  getLanguageDisplayName,
} from "../utils/languageUtils";

import "./TranslateButton.scss";

interface TranslateButtonProps {
  text: string;
  targetLanguage?: string;
  sourceLanguage?: string;
  className?: string;
  disabled?: boolean;
  showLanguage?: boolean;
  onTranslated?: (
    translatedText: string,
    sourceLanguage: string,
  ) => void;
  onError?: (error: Error) => void;
}

const TranslateButton: React.FC<
  TranslateButtonProps
> = ({
  text,
  targetLanguage,
  sourceLanguage,
  className = "",
  disabled = false,
  showLanguage = true,
  onTranslated,
  onError,
}) => {
  const translation =
    useContentTranslation(text, {
      targetLanguage,
      sourceLanguage,
    });

  const handleClick = async () => {
    if (disabled || translation.isTranslating) {
      return;
    }

    try {
      const result =
        await translation.toggleTranslation();

      if (
        result &&
        translation.isTranslated === false
      ) {
        onTranslated?.(
          result.translatedText,
          result.sourceLanguage,
        );
      }
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error(
              "Translation failed.",
            );

      onError?.(normalizedError);
    }
  };

  const buttonLabel =
    translation.isTranslating
      ? "Translating..."
      : translation.isTranslated
        ? "Show original"
        : showLanguage
          ? `Translate to ${getLanguageDisplayName(
              translation.targetLanguage,
              "en",
            )}`
          : "Translate";

  const sourceLanguageLabel =
    translation.detectedSourceLanguage
      ? getLanguageDisplayName(
          translation.detectedSourceLanguage,
          "en",
        )
      : null;

  return (
    <div
      className={[
        "fockis-translate",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="fockis-translate__button"
        onClick={handleClick}
        disabled={
          disabled ||
          translation.isTranslating ||
          !text.trim()
        }
        aria-label={buttonLabel}
        aria-busy={
          translation.isTranslating
        }
      >
        <span
          className="fockis-translate__icon"
          aria-hidden="true"
        >
          {translation.isTranslating
            ? "◌"
            : translation.isTranslated
              ? "↩"
              : "文A"}
        </span>

        <span className="fockis-translate__label">
          {buttonLabel}
        </span>
      </button>

      {translation.isTranslated &&
        sourceLanguageLabel && (
          <span className="fockis-translate__meta">
            Translated from{" "}
            {sourceLanguageLabel}
          </span>
        )}

      {translation.error && (
        <div
          className="fockis-translate__error"
          role="alert"
        >
          {translation.error}
        </div>
      )}

      {translation.isTranslated &&
        translation.translatedText && (
          <div
            className="fockis-translate__result"
            lang={
              translation.targetLanguage
            }
          >
            {translation.translatedText}
          </div>
        )}
    </div>
  );
};

export default TranslateButton;