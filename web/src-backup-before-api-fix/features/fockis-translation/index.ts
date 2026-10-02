/**
 * Fockis Translation Feature
 *
 * Public exports for the complete user-content translation system.
 *
 * Architecture:
 *
 *   FockisTranslationProvider
 *          ↓
 *   useFockisTranslation()
 *          ↓
 *   TranslatedText / TranslateButton
 *          ↓
 *   translationApi
 *          ↓
 *   NestJS Translation API
 *          ↓
 *   OpenAI + MongoDB translation cache
 */

// ============================================================================
// GLOBAL TRANSLATION PROVIDER
// ============================================================================

export {
  default as FockisTranslationProvider,
  useFockisTranslation,
} from "./context/FockisTranslationContext";

export type {
  TranslateTextOptions,
  TranslationResult,
  FockisTranslationContextValue,
} from "./context/FockisTranslationContext";

// ============================================================================
// CONTENT TRANSLATION COMPONENTS
// ============================================================================

export {
  default as TranslatedText,
} from "./components/TranslatedText";

export {
  default as TranslateButton,
} from "./components/TranslateButton";

export {
  default as LanguageSelector,
} from "./components/LanguageSelector";

// ============================================================================
// HOOKS
// ============================================================================

export {
  useContentTranslation,
} from "./hooks/useContentTranslation";

export {
  useFockisLanguage,
  getFockisStoredLanguage,
  setFockisStoredLanguage,
} from "./hooks/useFockisLanguage";

// ============================================================================
// TRANSLATION API
// ============================================================================

export {
  translateContent,
  detectContentLanguage,
  getTranslationApiUrl,
  getTranslationApiBaseUrl,
} from "./services/translationApi";

// ============================================================================
// LANGUAGES
// ============================================================================

export {
  FOCKIS_LANGUAGES,
  DEFAULT_FOCKIS_LANGUAGE,
  getFockisLanguage,
  isFockisLanguageSupported,
} from "./constants/languages";

export type {
  FockisLanguage,
} from "./constants/languages";

// ============================================================================
// LANGUAGE REGIONS
// ============================================================================

export {
  FOCKIS_LANGUAGE_REGIONS,
} from "./constants/languageRegions";

export type {
  LanguageRegion,
} from "./constants/languageRegions";

// ============================================================================
// LANGUAGE UTILITIES
// ============================================================================

export {
  getBrowserLanguage,
  getLanguageDisplayName,
  normalizeLanguageCode,
  isRightToLeftLanguage,
  areLanguagesEqual,
  getBaseLanguage,
} from "./utils/languageUtils";

// ============================================================================
// TRANSLATION CACHE
// ============================================================================

export {
  getCachedTranslation,
  setCachedTranslation,
  removeCachedTranslation,
  clearTranslationCache,
  getTranslationCacheKey,
} from "./utils/translationCache";

// ============================================================================
// TRANSLATION TYPES
// ============================================================================

export type {
  TranslationLanguageCode,
  TranslationProvider,
  TranslationRequest,
  TranslationResponse,
  TranslationErrorResponse,
  TranslationCacheEntry,
  ContentTranslationState,
  TranslateButtonProps,
  LanguageSelectorProps,
} from "./types/translation.types";
