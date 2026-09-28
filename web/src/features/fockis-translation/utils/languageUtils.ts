import {
  DEFAULT_FOCKIS_LANGUAGE,
  FOCKIS_LANGUAGES,
  getFockisLanguage,
} from "../constants/languages";

export function normalizeLanguageCode(
  language?: string | null,
): string {
  if (!language) {
    return DEFAULT_FOCKIS_LANGUAGE;
  }

  const normalized = language.trim();

  if (!normalized) {
    return DEFAULT_FOCKIS_LANGUAGE;
  }

  const exact = getFockisLanguage(normalized);

  if (exact) {
    return exact.code;
  }

  const base = normalized.split("-")[0].toLowerCase();

  const baseMatch = FOCKIS_LANGUAGES.find(
    (languageEntry) => languageEntry.code.toLowerCase() === base,
  );

  if (baseMatch) {
    return baseMatch.code;
  }

  return normalized;
}

export function getBrowserLanguage(): string {
  if (typeof navigator === "undefined") {
    return DEFAULT_FOCKIS_LANGUAGE;
  }

  const languages = Array.isArray(navigator.languages)
    ? navigator.languages
    : [];

  for (const language of languages) {
    const normalized = normalizeLanguageCode(language);

    if (normalized) {
      return normalized;
    }
  }

  return normalizeLanguageCode(navigator.language);
}

export function getLanguageDisplayName(
  languageCode: string,
  displayLanguage = "en",
): string {
  const language = getFockisLanguage(languageCode);

  if (language) {
    if (displayLanguage.toLowerCase().startsWith("en")) {
      return language.englishName;
    }

    return language.nativeName;
  }

  try {
    const DisplayNames = Intl.DisplayNames;

    if (DisplayNames) {
      const displayNames = new DisplayNames([displayLanguage], {
        type: "language",
      });

      return (
        displayNames.of(languageCode) ??
        languageCode
      );
    }
  } catch {
    // Older browsers may not support Intl.DisplayNames.
  }

  return languageCode;
}

export function isRightToLeftLanguage(languageCode: string): boolean {
  const language = getFockisLanguage(languageCode);

  if (language?.rtl) {
    return true;
  }

  const base = languageCode.toLowerCase().split("-")[0];

  return ["ar", "fa", "he", "ur", "ps", "sd", "yi"].includes(base);
}

export function areLanguagesEqual(
  first?: string | null,
  second?: string | null,
): boolean {
  if (!first || !second) {
    return false;
  }

  return (
    normalizeLanguageCode(first).toLowerCase() ===
    normalizeLanguageCode(second).toLowerCase()
  );
}

export function getBaseLanguage(languageCode: string): string {
  return languageCode.split("-")[0].toLowerCase();
}