import {
  useEffect,
  useState,
} from "react";

import {
  changeLanguage,
  getLanguage,
  subscribeToLanguage,
} from "../index";

import { useFockisTranslation } from "../useFockisTranslation";

import {
  LANGUAGES,
  type FockisLanguage,
} from "../language";

import "./LanguageSelector.scss";

export default function LanguageSelector() {
  const { t } = useFockisTranslation();

  const [language, setLanguage] =
    useState<FockisLanguage>(getLanguage());

  useEffect(() => {
    return subscribeToLanguage((nextLanguage) => {
      setLanguage(nextLanguage);
    });
  }, []);

  function handleChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const nextLanguage =
      event.target.value as FockisLanguage;

    changeLanguage(nextLanguage);
  }

  const selectedLanguage = LANGUAGES.find(
    (item) => item.code === language,
  );

  return (
    <div className="fockis-language-selector">
      <label htmlFor="fockis-language">
        <span aria-hidden="true">
          🌐
        </span>

        <span className="fockis-language-selector__label">
          {t("common.language")}
        </span>
      </label>

      <select
        id="fockis-language"
        value={language}
        onChange={handleChange}
        aria-label={t("common.language")}
      >
        {LANGUAGES.map((item) => (
          <option
            key={item.code}
            value={item.code}
          >
            {item.flag} {item.nativeName}
          </option>
        ))}
      </select>

      {selectedLanguage && (
        <span
          className="fockis-language-selector__current"
          aria-hidden="true"
        >
          {selectedLanguage.flag}
        </span>
      )}
    </div>
  );
}