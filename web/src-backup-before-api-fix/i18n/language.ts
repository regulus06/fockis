export type FockisLanguage = "en" | "ht" | "fr" | "es";

export const DEFAULT_LANGUAGE: FockisLanguage = "en";

export const LANGUAGE_STORAGE_KEY = "fockis_language";

export interface FockisLanguageOption {
  code: FockisLanguage;
  nativeName: string;
  englishName: string;
  flag: string;
}

export const LANGUAGES: FockisLanguageOption[] = [
  {
    code: "en",
    nativeName: "English",
    englishName: "English",
    flag: "🇺🇸",
  },
  {
    code: "ht",
    nativeName: "Kreyòl Ayisyen",
    englishName: "Haitian Creole",
    flag: "🇭🇹",
  },
  {
    code: "fr",
    nativeName: "Français",
    englishName: "French",
    flag: "🇫🇷",
  },
  {
    code: "es",
    nativeName: "Español",
    englishName: "Spanish",
    flag: "🇪🇸",
  },
];

export function isFockisLanguage(
  value: string | null | undefined,
): value is FockisLanguage {
  return value === "en" || value === "ht" || value === "fr" || value === "es";
}

export function normalizeLanguage(
  value: string | null | undefined,
): FockisLanguage {
  if (!value) {
    return DEFAULT_LANGUAGE;
  }

  const normalized = value.toLowerCase().replace("_", "-");

  if (normalized.startsWith("ht")) {
    return "ht";
  }

  if (normalized.startsWith("fr")) {
    return "fr";
  }

  if (normalized.startsWith("es")) {
    return "es";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return DEFAULT_LANGUAGE;
}

export function getStoredLanguage(): FockisLanguage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (isFockisLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore localStorage errors.
  }

  return null;
}

export function getBrowserLanguage(): FockisLanguage {
  if (typeof navigator === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const language of languages) {
    const normalized = normalizeLanguage(language);

    if (
      language &&
      ["en", "ht", "fr", "es"].some((supported) =>
        language.toLowerCase().startsWith(supported),
      )
    ) {
      return normalized;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function getInitialLanguage(): FockisLanguage {
  return getStoredLanguage() ?? getBrowserLanguage();
}

export function saveLanguage(language: FockisLanguage): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore localStorage errors.
  }
}