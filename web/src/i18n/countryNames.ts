import type { FockisLanguage } from "./language";

function normalizeLocale(language: FockisLanguage): string {
  switch (language) {
    case "ht":
      return "ht";
    case "fr":
      return "fr";
    case "es":
      return "es";
    case "en":
    default:
      return "en";
  }
}

export function getLocalizedCountryName(
  countryCode: string,
  language: FockisLanguage,
  fallback: string,
): string {
  try {
    const locale = normalizeLocale(language);

    const displayNames = new Intl.DisplayNames([locale], {
      type: "region",
    });

    return displayNames.of(countryCode.toUpperCase()) ?? fallback;
  } catch {
    return fallback;
  }
}

export function normalizeCountrySearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}