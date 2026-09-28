import React, {
  useMemo,
} from "react";

import {
  FOCKIS_LANGUAGES,
} from "../constants/languages";

import {
  useFockisLanguage,
} from "../hooks/useFockisLanguage";

import {
  getLanguageDisplayName,
} from "../utils/languageUtils";

import type {
  LanguageSelectorProps,
} from "../types/translation.types";

import "./LanguageSelector.scss";

const LanguageSelector: React.FC<
  LanguageSelectorProps
> = ({
  value,
  onChange,
  languages,
  className = "",
  disabled = false,
  label = "Translation language",
}) => {
  const {
    language: storedLanguage,
    setLanguage,
  } = useFockisLanguage();

  const selectedLanguage =
    value || storedLanguage;

  const availableLanguages =
    useMemo(() => {
      if (!languages?.length) {
        return [...FOCKIS_LANGUAGES];
      }

      const requested =
        new Set(
          languages.map((item) =>
            item.toLowerCase(),
          ),
        );

      return FOCKIS_LANGUAGES.filter(
        (language) =>
          requested.has(
            language.code.toLowerCase(),
          ),
      );
    }, [languages]);

  const handleChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextLanguage =
      event.target.value;

    setLanguage(nextLanguage);
    onChange?.(nextLanguage);
  };

  return (
    <div
      className={[
        "fockis-language-selector",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label
        className="fockis-language-selector__label"
        htmlFor="fockis-translation-language"
      >
        {label}
      </label>

      <div className="fockis-language-selector__control">
        <span
          className="fockis-language-selector__globe"
          aria-hidden="true"
        >
          🌐
        </span>

        <select
          id="fockis-translation-language"
          value={selectedLanguage}
          onChange={handleChange}
          disabled={disabled}
          className="fockis-language-selector__select"
        >
          {availableLanguages.map(
            (language) => (
              <option
                key={language.code}
                value={language.code}
              >
                {language.nativeName} —{" "}
                {getLanguageDisplayName(
                  language.code,
                  "en",
                )}
              </option>
            ),
          )}
        </select>
      </div>
    </div>
  );
};

export default LanguageSelector;