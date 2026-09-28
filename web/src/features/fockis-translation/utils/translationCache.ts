import type {
  TranslationCacheEntry,
  TranslationLanguageCode,
} from "../types/translation.types";

const CACHE_PREFIX = "fockis_translation:";
const MAX_CACHE_ENTRIES = 200;
const CACHE_VERSION = "v1";

function createCacheKey(
  text: string,
  sourceLanguage: TranslationLanguageCode,
  targetLanguage: TranslationLanguageCode,
): string {
  return [
    CACHE_PREFIX,
    CACHE_VERSION,
    sourceLanguage.toLowerCase(),
    targetLanguage.toLowerCase(),
    text.trim(),
  ].join("|");
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function safeParse(
  value: string | null,
): TranslationCacheEntry | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as TranslationCacheEntry;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.translatedText !== "string" ||
      typeof parsed.text !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getTranslationCacheKey(
  text: string,
  sourceLanguage: TranslationLanguageCode,
  targetLanguage: TranslationLanguageCode,
): string {
  return createCacheKey(text, sourceLanguage, targetLanguage);
}

export function getCachedTranslation(
  text: string,
  sourceLanguage: TranslationLanguageCode,
  targetLanguage: TranslationLanguageCode,
): TranslationCacheEntry | null {
  if (!canUseStorage()) {
    return null;
  }

  const key = createCacheKey(
    text,
    sourceLanguage,
    targetLanguage,
  );

  try {
    return safeParse(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function setCachedTranslation(
  text: string,
  sourceLanguage: TranslationLanguageCode,
  targetLanguage: TranslationLanguageCode,
  translatedText: string,
): void {
  if (!canUseStorage()) {
    return;
  }

  const key = createCacheKey(
    text,
    sourceLanguage,
    targetLanguage,
  );

  const entry: TranslationCacheEntry = {
    key,
    text,
    sourceLanguage,
    targetLanguage,
    translatedText,
    createdAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(entry),
    );

    trimTranslationCache();
  } catch {
    // Storage may be disabled/full. Translation still works without cache.
  }
}

export function removeCachedTranslation(
  text: string,
  sourceLanguage: TranslationLanguageCode,
  targetLanguage: TranslationLanguageCode,
): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(
      createCacheKey(
        text,
        sourceLanguage,
        targetLanguage,
      ),
    );
  } catch {
    // Ignore storage failures.
  }
}

export function clearTranslationCache(): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    const keys: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (key?.startsWith(CACHE_PREFIX)) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures.
  }
}

function trimTranslationCache(): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    const entries: Array<{
      key: string;
      createdAt: number;
    }> = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key?.startsWith(CACHE_PREFIX)) {
        continue;
      }

      const entry = safeParse(
        window.localStorage.getItem(key),
      );

      if (entry) {
        entries.push({
          key,
          createdAt: entry.createdAt,
        });
      }
    }

    if (entries.length <= MAX_CACHE_ENTRIES) {
      return;
    }

    entries.sort(
      (a, b) => a.createdAt - b.createdAt,
    );

    const removeCount =
      entries.length - MAX_CACHE_ENTRIES;

    for (let index = 0; index < removeCount; index += 1) {
      window.localStorage.removeItem(
        entries[index].key,
      );
    }
  } catch {
    // Ignore storage failures.
  }
}